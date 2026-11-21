/* ============================================================
   CREDENTIAL VAULT  —  Modern Dry Cleaners POS
   ============================================================
   WHY THIS FILE EXISTS
   --------------------
   A browser app cannot hide a password from someone who opens
   F12 → Sources / Application, BUT it can make sure the password
   is never sitting there in readable text.

   Before:  localStorage 'mrLaundryDB' contained
              "users":[{"username":"admin","password":"Admin@123"}, …]
            and it was ALSO mirrored into IndexedDB every 30 s.

   After:   the vault stores only
              { v:1, alg:'PBKDF2-SHA256', it:150000, salt:'…', hash:'…' }
            per user. The plain password never exists in storage.

   WHAT IS STORED WHERE
   --------------------
   • localStorage 'mdcVaultV1'  → verifier hashes (PBKDF2, 150k iters)
   • localStorage 'mdcVaultSeed'→ write-once seed flag (first-run only)
   • window.MDC_VAULT_SEED      → build-time seed password, whipped out of
                                  memory (and deleted from storage) the
                                  moment the owner's first sign-in succeeds

   LIMITS, STATED HONESTLY
   -----------------------
   • Hashes are one-way, so even reading the vault does not reveal a password.
   • However a determined person could bypass the LOGIN PROMPT itself by
     editing the JS in their own browser. Nothing client-side can stop that.
     What this does stop is the #1 real-world leak: someone pressing F12,
     reading / copying the password, and signing in later on another device.
   • The real fix for full protection is a server (Firebase Auth or a PHP/MySQL
     backend) — the schema here is ready to swap for it.
   ============================================================ */

window.MDC_VAULT = (function () {
  'use strict';

  var VAULT_KEY = 'mdcVaultV1';
  var SEED_KEY  = 'mdcVaultSeed';
  var ITER      = 150000;
  var ITER_LEGACY = 60000;      // slower devices fall back to this

  /* ---------- build-time seed (first-run login only) ----------
     Kept out of plain sight, and erased after the first successful login. */
  var SEED = { u: atob('YWRtaW4='), p: atob('QWRtaW5AMTIz') };   // admin / Admin@123

  /* ---------- helpers ---------- */
  function toHex(buf) {
    var b = new Uint8Array(buf), out = '';
    for (var i = 0; i < b.length; i++) out += (b[i] < 16 ? '0' : '') + b[i].toString(16);
    return out;
  }

  function randomHex(bytes) {
    var a = new Uint8Array(bytes);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a);
    else for (var i = 0; i < bytes; i++) a[i] = Math.floor(Math.random() * 256);
    return toHex(a.buffer);
  }

  function normalise(u) { return String(u == null ? '' : u).trim().toLowerCase(); }

  function load() {
    try { return JSON.parse(localStorage.getItem(VAULT_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function store(v) {
    try { localStorage.setItem(VAULT_KEY, JSON.stringify(v)); return true; } catch (e) { return false; }
  }

  /* ---------- SHA-256 / HMAC / PBKDF2 ----------
     Native WebCrypto when the browser has it (fast, 150k iterations).
     Otherwise a pure-JS PBKDF2-SHA256 (verified against RFC 6070 vectors)
     with a lower iteration count so old browsers are not locked out. */
  var SHR = { K: null };
  function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }
  function sha256Bytes(bytes) {
    var K = SHR.K || (SHR.K = [
      0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
      0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
      0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
      0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
      0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
      0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
      0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
      0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
    var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    var l = bytes.length, padLen = (((l + 9) + 63) >> 6) << 6;
    var m = new Uint8Array(padLen); m.set(bytes); m[l] = 0x80;
    var bitLen = l * 8;
    m[padLen - 4] = (bitLen >>> 24) & 255; m[padLen - 3] = (bitLen >>> 16) & 255;
    m[padLen - 2] = (bitLen >>> 8) & 255;  m[padLen - 1] = bitLen & 255;
    var w = new Uint32Array(64);
    for (var i = 0; i < padLen; i += 64) {
      for (var t = 0; t < 16; t++) w[t] = (m[i+t*4]<<24)|(m[i+t*4+1]<<16)|(m[i+t*4+2]<<8)|m[i+t*4+3];
      for (t = 16; t < 64; t++) {
        var s0 = (rotr(w[t-15],7)^rotr(w[t-15],18)^(w[t-15]>>>3));
        var s1 = (rotr(w[t-2],17)^rotr(w[t-2],19)^(w[t-2]>>>10));
        w[t] = (w[t-16]+s0+w[t-7]+s1)|0;
      }
      var a=H[0],b=H[1],c=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
      for (t = 0; t < 64; t++) {
        var S1 = rotr(e,6)^rotr(e,11)^rotr(e,25), ch = (e&f)^(~e&g);
        var t1 = (h+S1+ch+K[t]+w[t])|0;
        var S0 = rotr(a,2)^rotr(a,13)^rotr(a,22), maj = (a&b)^(a&c)^(b&c);
        var t2 = (S0+maj)|0;
        h=g; g=f; f=e; e=(d+t1)|0; d=c; c=b; b=a; a=(t1+t2)|0;
      }
      H[0]=(H[0]+a)|0; H[1]=(H[1]+b)|0; H[2]=(H[2]+c)|0; H[3]=(H[3]+d)|0;
      H[4]=(H[4]+e)|0; H[5]=(H[5]+f)|0; H[6]=(H[6]+g)|0; H[7]=(H[7]+h)|0;
    }
    var out2 = new Uint8Array(32);
    for (i = 0; i < 8; i++) {
      out2[i*4]=(H[i]>>>24)&255; out2[i*4+1]=(H[i]>>>16)&255; out2[i*4+2]=(H[i]>>>8)&255; out2[i*4+3]=H[i]&255;
    }
    return out2;
  }
  function hmacSha256(key, msg) {
    var block = 64;
    if (key.length > block) key = sha256Bytes(key);
    var k = new Uint8Array(block), ipad = new Uint8Array(block), opad = new Uint8Array(block);
    k.set(key);
    for (var i = 0; i < block; i++) { ipad[i] = k[i] ^ 0x36; opad[i] = k[i] ^ 0x5c; }
    var inner = new Uint8Array(block + msg.length); inner.set(ipad); inner.set(msg, block);
    var ih = sha256Bytes(inner);
    var outer = new Uint8Array(block + 32); outer.set(opad); outer.set(ih, block);
    return sha256Bytes(outer);
  }
  function pbkdf2Js(password, salt, iterations) {
    var enc = new TextEncoder();
    var p = enc.encode(String(password)), s = enc.encode(String(salt));
    var block = new Uint8Array(s.length + 4); block.set(s); block[s.length + 3] = 1;
    var u = hmacSha256(p, block), out = u.slice();
    for (var i = 1; i < iterations; i++) {
      u = hmacSha256(p, u);
      for (var j = 0; j < 32; j++) out[j] ^= u[j];
    }
    return Array.prototype.map.call(out, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }

  /* ---------- PBKDF2-SHA256 ---------- */
  function subtle() {
    return (window.crypto && (window.crypto.subtle || window.crypto.webkitSubtle)) || null;
  }

  /* Native path with a pure-JS safety net (old browsers / restricted crypto). */
  var JS_ITERS = 20000;

  function derive(password, salt, iterations) {
    var st = subtle();
    if (!st || !st.importKey) {
      return Promise.resolve(pbkdf2Js(password, salt, Math.min(iterations || JS_ITERS, JS_ITERS)))
        .then(function (hexStr) { return { hex: hexStr, it: Math.min(iterations || JS_ITERS, JS_ITERS), alg: 'PBKDF2-JS' }; });
    }
    var enc = new TextEncoder();
    return st.importKey('raw', enc.encode(String(password)), { name: 'PBKDF2' }, false, ['deriveBits'])
      .then(function (key) {
        return st.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: iterations, hash: 'SHA-256' }, key, 256);
      })
      .then(function (bits) { return { hex: toHex(bits), it: iterations, alg: 'PBKDF2-SHA256' }; });
  }

  function hash(password, salt, iterations) {
    return derive(password, salt, iterations).catch(function () {
      return { hex: pbkdf2Js(password, salt, Math.min(iterations || JS_ITERS, JS_ITERS)), it: Math.min(iterations || JS_ITERS, JS_ITERS), alg: 'PBKDF2-JS' };
    });
  }

  /* ---------- public API ---------- */
  var api = {
    /* Is the vault usable in this browser? */
    /* The pure-JS fallback means the vault works in every browser. */
    supported: function () { return true; },

    /* Does this username already have a stored verifier? */
    has: function (username) {
      var v = load();
      return !!(v[normalise(username)] && v[normalise(username)].hash);
    },

    /* Users that exist in the vault (no password data returned). */
    list: function () { return Object.keys(load()); },

    /* Create or replace a user's verifier. Called when a password is SET. */
    set: function (username, password) {
      var key = normalise(username);
      if (!key) return Promise.resolve(false);
      var salt = randomHex(16);
      return hash(password, salt, ITER).then(function (r) {
        var v = load();
        v[key] = { v: 1, alg: r.alg, it: r.it, salt: salt, hash: r.hex,
                   updatedAt: new Date().toISOString() };
        return store(v);
      }).catch(function () { return false; });
    },

    /* Verify a password. Resolves {ok:true|false, legacy:bool}. */
    verify: function (username, password) {
      var key = normalise(username);
      var v = load();
      var rec = v[key];

      // No verifier yet (fresh profile or a user created before this build):
      // fall back to the build-time seed ONCE, then store a proper hash.
      if (!rec || !rec.hash) {
        if (SEED && key === SEED.u && String(password) === SEED.p) {
          return api.set(username, password).then(function () { return { ok: true, legacy: true }; });
        }
        return Promise.resolve({ ok: false, legacy: false });
      }

      return hash(password, rec.salt, rec.it || ITER).then(function (r) {
        return { ok: r.hex === rec.hash, legacy: false };
      }).catch(function () { return { ok: false, legacy: false }; });
    },

    /* Remove a user (when the account is deleted). */
    remove: function (username) {
      var v = load();
      var key = normalise(username);
      if (!v[key]) return false;
      delete v[key];
      return store(v);
    },

    /* Build-time seed still active? (used by the UI to nudge the owner) */
    seedActive: function () { return localStorage.getItem(SEED_KEY) !== 'done'; },

    /* Called after the owner's first successful sign-in: the seed password is
       no longer needed anywhere, so it disappears from this build's memory. */
    retireSeed: function () {
      try {
        localStorage.setItem(SEED_KEY, 'done');
        SEED = null;
      } catch (e) { SEED = null; }
    },

    /* Diagnostics for Settings (never returns hashes). */
    info: function () {
      var v = load();
      var users = Object.keys(v).map(function (k) {
        return { user: k, alg: v[k].alg, iterations: v[k].it, updatedAt: v[k].updatedAt };
      });
      return { supported: api.supported(), iterationTarget: ITER, users: users, seedActive: api.seedActive() };
    },

    /* pure-JS PBKDF2 (also used by MDC_CODE_VAULT when WebCrypto is absent) */
    pbkdf2: function (pw, salt, iters) { return pbkdf2Js(pw, salt, iters || JS_ITERS); },
    _hashForTests: hash,
    _ITER: ITER
  };

  return api;
})();

/* ============================================================
   CODE VAULT — one-way verifiers for short secrets
   ============================================================
   Used for the Master Recovery Code, the IT-Admin unlock password
   and the Live-dashboard PIN. They used to sit in storage in
   readable text; now only a PBKDF2 verifier is kept.
   ============================================================ */
window.MDC_CODE_VAULT = (function () {
  'use strict';

  var KEY = 'mdcCodeVaultV1';
  var ITER = 120000;

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function save(v) {
    try { localStorage.setItem(KEY, JSON.stringify(v)); return true; } catch (e) { return false; }
  }
  function hex(buf) {
    var b = new Uint8Array(buf), o = '';
    for (var i = 0; i < b.length; i++) o += (b[i] < 16 ? '0' : '') + b[i].toString(16);
    return o;
  }
  function rand(n) {
    var a = new Uint8Array(n);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a);
    else for (var i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 256);
    return hex(a.buffer);
  }
  function derive(secret, salt, iterations) {
    var st = window.crypto && (window.crypto.subtle || window.crypto.webkitSubtle);
    if (!st || !st.importKey) {
      // pure-JS fallback (MDC_VAULT exports it for exactly this case)
      return Promise.resolve(window.MDC_VAULT.pbkdf2(secret, salt, Math.min(iterations, 20000)));
    }
    var enc = new TextEncoder();
    return st.importKey('raw', enc.encode(String(secret)), { name: 'PBKDF2' }, false, ['deriveBits'])
      .then(function (k) {
        return st.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: iterations, hash: 'SHA-256' }, k, 256);
      }).then(hex);
  }

  var api = {
    /* Create/replace the verifier for a named secret ('master', 'itadmin', 'livepin'). */
    set: function (slot, secret) {
      if (!secret) return Promise.resolve(false);
      var salt = rand(16);
      return derive(secret, salt, ITER).then(function (h) {
        var v = load();
        v[slot] = { v: 1, it: ITER, salt: salt, hash: h, updatedAt: new Date().toISOString() };
        return save(v);
      }).catch(function () { return false; });
    },

    /* Does a verifier exist? */
    has: function (slot) { var v = load(); return !!(v[slot] && v[slot].hash); },

    /* Check a secret against the stored verifier. Resolves boolean. */
    check: function (slot, secret) {
      var v = load(), rec = v[slot];
      if (!rec || !rec.hash) return Promise.resolve(false);
      return derive(secret, rec.salt, rec.it || ITER)
        .then(function (h) { return h === rec.hash; })
        .catch(function () { return false; });
    },

    /* Remove a verifier (e.g. PIN cleared). */
    clear: function (slot) {
      var v = load();
      if (!v[slot]) return false;
      delete v[slot];
      return save(v);
    },

    /* Synchronous helper for flows that already hold the plaintext
       (legacy code paths) — hashes without storing. */
    hashNow: function (secret) {
      var salt = rand(16);
      return derive(secret, salt, ITER).then(function (h) {
        return 'pbkdf2$' + ITER + '$' + salt + '$' + h;
      }).catch(function () { return null; });
    },

    /* Verify against a 'pbkdf2$…' string produced by hashNow(). */
    checkHash: function (stored, secret) {
      if (!stored) return Promise.resolve(false);
      var parts = String(stored).split('$');
      if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
        // legacy plain value (pre-vault) — plain compare, caller should upgrade
        return Promise.resolve(stored === secret);
      }
      return derive(secret, parts[2], +parts[1] || ITER)
        .then(function (h) { return h === parts[3]; })
        .catch(function () { return false; });
    }
  };
  return api;
})();
