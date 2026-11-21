/* ============================================================
   CLOUD SYNC v4 — Chunked storage for unlimited data size
   - Splits data across multiple Firestore documents
   - Each table → its own doc; large tables → chunked further
   - Bypasses Firestore 1MB-per-doc limit
   - Maintains backward compat with old single-doc format
   - Bulletproof MERGE — no data loss
   ============================================================ */

const MAX_DOC_SIZE = 800000; // 800KB — safe margin under Firestore 1MB limit

function parseFirebaseConfig(text) {
  if (!text) throw new Error('Empty config');
  let s = String(text);
  /* paste ki ghaltiyan khud theek karte hain: BOM, smart quotes, non-breaking space,
     aage/peeche ka label text, trailing comma */
  s = s.replace(/\uFEFF/g, '').replace(/[\u2018\u2019\u201A\u201B]/g, "'").replace(/[\u201C\u201D\u201E]/g, '"')
       .replace(/\u00A0/g, ' ');
  s = s.trim();
  const first = s.indexOf('{'), last = s.lastIndexOf('}');
  if (first > -1 && last > first) s = s.slice(first, last + 1);
  s = s.replace(/^(const|let|var)\s+\w+\s*=\s*/, '').replace(/;\s*$/, '').replace(/^export\s+default\s*/, '').trim();
  s = s.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
  try { return JSON.parse(s); } catch(e) {}
  try { return (new Function('return (' + s + ')'))(); } catch(e) {
    throw new Error('Config parse nahi hui. Poora block { se } tak copy karein (ya "♻️ Default config wapas laayein" dabayein).');
  }
}

/* Stable per-install device ID */
function getDeviceId() {
  let id = localStorage.getItem('mrLaundryDeviceId');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-6);
    localStorage.setItem('mrLaundryDeviceId', id);
  }
  return id;
}
function getDeviceLabel() {
  let label = localStorage.getItem('mrLaundryDeviceLabel');
  if (!label) {
    const ua = navigator.userAgent;
    if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) label = '📱 Mobile';
    else if (/Mac/i.test(ua)) label = '💻 Mac';
    else if (/Windows/i.test(ua)) label = '🖥️ Windows PC';
    else label = '💻 Computer';
    localStorage.setItem('mrLaundryDeviceLabel', label);
  }
  return label;
}

const CLOUD = {
  CFG_KEY: 'mrLaundryFirebaseCfg',
  SHOP_KEY: 'mrLaundryShopId',
  ENABLED_KEY: 'mrLaundryCloudEnabled',
  LAST_SYNC_KEY: 'mrLaundryLastSync',

  _app: null, _db: null, _unsub: null,
  _syncing: false, _pendingPush: false,
  _suppressPush: false,
  _initialMergeDone: false,
  _lastAppliedVersion: 0,
  _lastPushedJson: {},
  _toastDebounceTimer: null,

  /* Bundled defaults (assets/js/firebase-defaults.js) — is se naye device par
     kuch type kiye baghair Cloud Sync on ho jata hai. */
  getDefaultConfig() {
    const d = (typeof window !== 'undefined' && window.FIREBASE_DEFAULT_CFG)
      || (typeof FIREBASE_DEFAULT_CFG !== 'undefined' ? FIREBASE_DEFAULT_CFG : null);
    return (d && d.apiKey) ? d : null;
  },
  getDefaultShopId() {
    return (typeof window !== 'undefined' && window.FIREBASE_DEFAULT_SHOP_ID)
      || (typeof FIREBASE_DEFAULT_SHOP_ID !== 'undefined' ? FIREBASE_DEFAULT_SHOP_ID : '');
  },
  hasDefaults() { return !!this.getDefaultConfig(); },

  getConfig() {
    const raw = localStorage.getItem(this.CFG_KEY);
    if (raw) { try { const c = JSON.parse(raw); if (c && c.apiKey) return c; } catch(e) {} }
    return this.getDefaultConfig();      // fallback: bundled project
  },
  setConfig(cfg) { localStorage.setItem(this.CFG_KEY, JSON.stringify(cfg)); },
  getShopId() {
    const saved = localStorage.getItem(this.SHOP_KEY);
    if (saved) return saved;
    const def = this.getDefaultShopId();
    if (def) { localStorage.setItem(this.SHOP_KEY, def); return def; }
    return '';
  },
  setShopId(id) { localStorage.setItem(this.SHOP_KEY, id); },
  BACKEND_KEY: 'mrlCloudBackend',
  /* Realtime Database ka URL: config mein ho to wohi, warna project ka default */
  getDatabaseURL() {
    const cfg = this.getConfig() || {};
    if (cfg.databaseURL) return cfg.databaseURL;
    if (window.FIREBASE_DEFAULT_CFG && window.FIREBASE_DEFAULT_CFG.databaseURL) return window.FIREBASE_DEFAULT_CFG.databaseURL;
    if (cfg.projectId) return 'https://' + cfg.projectId + '-default-rtdb.firebaseio.com';
    return null;
  },
  _preferRTDB() { return localStorage.getItem('mrlCloudBackend') === 'rtdb'; },
  isEnabled() { return localStorage.getItem(this.ENABLED_KEY) === 'true'; },
  setEnabled(v) { localStorage.setItem(this.ENABLED_KEY, v?'true':'false'); },
  isReady() { return !!(this.getConfig() && this.getShopId()); },

  async loadSDK() {
    if (window.firebase && typeof window.firebase.firestore === 'function') return;
    const scripts = [
      'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
      'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js'
    ];
    for (const src of scripts) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src; s.onload = resolve; s.onerror = reject;
        (document.head || document.body || document.documentElement).appendChild(s);
      });
    }
  },

  async init() {
    if (this._db) return this._db;
    const cfg = this.getConfig();
    if (!cfg) throw new Error('Firebase not configured');
    await this.loadSDK();
    if (!window.firebase || typeof firebase.firestore !== 'function') {
      throw new Error('Firebase SDK load nahi hua — internet / firewall check karein (gstatic.com block ho sakta hai)');
    }
    if (!firebase.apps.length) this._app = firebase.initializeApp(cfg);
    else this._app = firebase.app();

    /* Firestore instance sirf tab banate hain jab zaroorat ho — warna
       Realtime Database wale project mein "client is offline" ke gher-zaroori
       attempts aur 8 second ka intezaar hota hai. */
    const fsdb = () => {
      if (!this._db) this._db = firebase.firestore();
      return this._db;
    };

    const probe = () => new Promise((resolve) => {
      let done = false;
      const finish = (okdb) => { if (done) return; done = true; try { unsub && unsub(); } catch(e){} resolve(okdb); };
      let unsub = null;
      try {
        unsub = fsdb().collection('shops').doc(this.getShopId() || '_probe')
          .onSnapshot(() => finish(true), () => finish(false));
      } catch (e) { return finish(false); }
      setTimeout(() => finish(false), 8000);   // 8s tak jawab nahi = offline
    });

    /* databaseURL = project mein Realtime Database mojood hai (aur client ne wohi
       rakha hai). Aise mein pehle RTDB try karte hain — 6 second ke andar jawab
       aa jata hai — taake Firestore ke 8-second wait ke baad aane wala
       "client is offline" error na dikhe. */
    if ((this.getDatabaseURL() || this._preferRTDB()) && !this._rtdbSkip) {
      const first = await this._probeRealtimeDB(cfg);
      if (first) { this._mode = 'rtdb'; localStorage.setItem(this.BACKEND_KEY, 'rtdb'); return first; }
      this._rtdbSkip = true;   // is page load mein dobara 5 second zaya na karein
    }
    try { fsdb().enablePersistence({ synchronizeTabs: true }).catch(() => {}); } catch (e) {}
    this._triedFirestore = true;
    if (await probe()) { localStorage.setItem(this.BACKEND_KEY, 'firestore'); return this._db; }

    /* Firestore jawab nahi de raha → kya sirf Realtime Database bana hua hai?
       (Logon ne Firestore ki jagah Realtime Database create kar diya hota hai —
       us surat mein bhi sync chalna chahiye.) */
    const rtdb = this._rtdbSkip ? null : await this._probeRealtimeDB(cfg);
    if (rtdb) { this._mode = 'rtdb'; localStorage.setItem(this.BACKEND_KEY, 'rtdb'); return rtdb; }
    this._rtdbSkip = true;

    /* ---- REST fallback (SDK na chale to bhi sync chalta rahe) ---- */
    try {
      const restUrl = await this._restPickUrl();
      if (restUrl) {
        this._mode = 'rest';
        this._db = null;
        localStorage.setItem(this.BACKEND_KEY, 'rest');
        console.log('[CloudSync] Realtime Database (REST) mode active:', restUrl);
        return { _rest: true };
      }
    } catch (e) { this._lastRTDBError = (e && e.message) || String(e); }

    this._db = null;
    const onLine = (typeof navigator !== 'undefined') ? navigator.onLine !== false : true;
    const rtErr = this._lastRTDBError || '';
    if (!onLine) throw new Error('Internet offline hai — pehle network connect karein, phir dobara koshish karein.');
    if (/permission_denied|Permission denied/i.test(rtErr)) {
      throw new Error('Realtime Database ne ijazat nahi di. Firebase Console → Realtime Database → Rules mein FIREBASE-RULES-REALTIME.txt (JSON) paste kar ke Publish karein.');
    }
    if (/not found|404|invalid|does not exist/i.test(rtErr)) {
      throw new Error('Realtime Database mojood nahi. Firebase Console → Realtime Database → "Create Database" dabayein, ya config mein sahi databaseURL likhein.');
    }
    /* auto-detect: Firestore zyada behtar (chunked, rules sambhalne layak) — lekin
       sirf tab jab hum usay test kar chuke hon. */
    if (!this._triedFirestore) {
      this._triedFirestore = true;
      try { fsdb().enablePersistence({ synchronizeTabs: true }).catch(() => {}); } catch (e) {}
      if (await probe()) { localStorage.setItem(this.BACKEND_KEY, 'firestore'); return this._db; }
    }
    throw new Error('Realtime Database se connection nahi bana'
      + (rtErr ? ' (' + rtErr + ')' : '')
      + '. Check karein: 1) internet/firewall, 2) Firebase Console → Realtime Database bana hua hai, 3) cloud fires abhi kuch second pehle OFF tha to dobara try karein.');
  },

  /* ---- Realtime Database support (agar client ne wohi banaya ho) ---- */
  async loadRTDBSDK() {
    if (window.firebase && typeof window.firebase.database === 'function') return;
    if (!window.firebase || typeof window.firebase.firestore !== 'function') {
      try { await this.loadSDK(); } catch (e) { /* neeche phir check */ }
    }
    if (window.firebase && typeof window.firebase.database === 'function') return;
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      let settled = false;
      const done = (fn, v) => { if (settled) return; settled = true; fn(v); };
      s.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js';
      s.onload = () => done(resolve);
      s.onerror = () => done(reject, new Error('Realtime Database SDK load nahi hua'));
      // 5s se zyada intezaar nahi — warna UI atak jati hai
      setTimeout(() => done(reject, new Error('Realtime Database SDK timeout')), 5000);
      (document.head || document.body || document.documentElement).appendChild(s);
    });
  },
  /* Realtime Database ke mumkin URLs — jo bhi chal jaye wohi use hota hai.
     (Project asia-southeast1 mein bana ho to URL .firebasedatabase.app hota hai,
     US mein bana ho to .firebaseio.com — galat URL = "client is offline".) */
  getDatabaseURLCandidates() {
    const cfg = this.getConfig() || {};
    const saved = localStorage.getItem('mrlCloudDatabaseURL');
    const pid = cfg.projectId || (window.FIREBASE_DEFAULT_CFG && window.FIREBASE_DEFAULT_CFG.projectId) || 'maundrylaundrypos';
    const list = [
      saved,
      cfg.databaseURL,
      window.FIREBASE_DEFAULT_CFG && window.FIREBASE_DEFAULT_CFG.databaseURL,
      'https://' + pid + '-default-rtdb.asia-southeast1.firebasedatabase.app',
      'https://' + pid + '-default-rtdb.firebaseio.com',
      'https://' + pid + '.firebaseio.com'
    ];
    return [...new Set(list.filter(Boolean).map(u => u.replace(/\/+$/, '')))];
  },

  async _probeRealtimeDB(cfg) {
    try {
      await this.loadRTDBSDK();
      if (!window.firebase || typeof firebase.database !== 'function') return null;
      for (const url of this.getDatabaseURLCandidates()) {
        const got = await this._probeOneRTDB(cfg, url);
        if (got) return got;
      }
      return null;
    } catch (e) {
      this._lastRTDBError = (e && e.message) || String(e);
      console.warn('[CloudSync] RTDB probe failed', this._lastRTDBError);
      return null;
    }
  },

  async _probeOneRTDB(cfg, url) {
    try {
      /* har URL ke liye alag (named) Firebase app — warna SDK pehli databaseURL
         par hi atak jata hai */
      const appName = 'rtdb-' + url.replace(/[^a-z0-9]/gi, '').slice(-16);
      let app;
      const existing = (firebase.apps || []).find(a => a && a.name === appName);
      if (existing) app = existing; else app = firebase.initializeApp(Object.assign({}, cfg, { databaseURL: url }), appName);
      const rdb = firebase.database(app);
      const ok = await new Promise((resolve) => {
        let done = false;
        const finish = (v) => { if (done) return; done = true; resolve(v); };
        const ref = rdb.ref('.info/connected');
        const cb = (snap) => { if (snap.val() === true) finish(true); };
        try { ref.on('value', cb); } catch (e) { return finish(false); }
        setTimeout(() => { try { ref.off('value', cb); } catch (e) {} finish(false); }, 10000);
      });
      if (!ok) return null;
      this._rdb = rdb;
      this._rdbUrl = url;
      localStorage.setItem('mrlCloudDatabaseURL', url);
      console.log('[CloudSync] Realtime Database connected:', url);
      return { _rtdb: rdb };
    } catch (e) {
      this._lastRTDBError = (e && e.message) || String(e);
      console.warn('[CloudSync] RTDB probe failed for', url, this._lastRTDBError);
      return null;
    }
  },

  /* ------------------------------------------------------------
     REST fallback — agar Firebase SDK connect na ho jaye magar network
     theek ho, to seedha Realtime Database ke REST endpoint se kaam lete hain.
     (Rules public hain, is liye yeh bina login chalta hai.)
     ------------------------------------------------------------ */
  async _restPickUrl() {
    if (typeof fetch !== 'function') return null;
    for (const url of this.getDatabaseURLCandidates()) {
      try {
        const res = await fetch(url + '/.json?shallow=true', { cache: 'no-store' });
        if (res.ok) {
          this._restUrl = url;
          localStorage.setItem('mrlCloudDatabaseURL', url);
          return url;
        }
      } catch (e) { this._lastRTDBError = (e && e.message) || String(e); }
    }
    return null;
  },
  async _restPull() {
    const url = this._restUrl || await this._restPickUrl();
    if (!url) return null;
    const res = await fetch(url + '/shops/' + this.getShopId() + '.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('REST read failed (' + res.status + ')');
    const v = await res.json();
    if (!v || !v.data) return null;
    this._lastRestVersion = v.version || 0;
    return JSON.parse(v.data);
  },
  async _restPush(data) {
    const url = this._restUrl || await this._restPickUrl();
    if (!url) throw new Error('Realtime Database reachable nahi');
    const payload = {
      data: JSON.stringify(data),
      version: Date.now(),
      deviceId: getDeviceId(),
      deviceLabel: getDeviceLabel(),
      updatedBy: DB.currentUser()?.username || 'unknown',
      updatedAt: new Date().toISOString()
    };
    const res = await fetch(url + '/shops/' + this.getShopId() + '.json', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('REST write failed (' + res.status + ')');
    return payload.version;
  },

  /* RTDB path: shops/<shopId> mein poora data (ek hi JSON) */
  async _rtdbPush(data) {
    const rdb = this._rdb;
    const shop = this.getShopId();
    const payload = {
      data: JSON.stringify(data),
      version: Date.now(),
      deviceId: getDeviceId(),
      deviceLabel: getDeviceLabel(),
      updatedBy: DB.currentUser()?.username || 'unknown',
      updatedAt: new Date().toISOString()
    };
    await rdb.ref('shops/' + shop).set(payload);
    return payload.version;
  },
  async _rtdbPull() {
    const rdb = this._rdb;
    const shop = this.getShopId();
    const snap = await rdb.ref('shops/' + shop).get();
    if (!snap.exists()) return null;
    try { return JSON.parse(snap.val().data || 'null'); } catch (e) { return null; }
  },

  /* ============== MERGE LOGIC ============== */
  mergeData(local, remote) {
    if (!remote) return local;
    if (!local) return remote;
    const merged = JSON.parse(JSON.stringify(local));

    for (const tbl of Object.keys(remote)) {
      const r = remote[tbl];
      const l = merged[tbl];

      if (Array.isArray(r)) {
        const byId = {};
        (l || []).forEach(rec => { if (rec && rec.id) byId[rec.id] = rec; });
        for (const rec of r) {
          if (!rec || !rec.id) continue;
          const existing = byId[rec.id];
          if (!existing) { byId[rec.id] = rec; continue; }
          const lTs = +new Date(existing.updatedAt || existing.createdAt || 0) || 0;
          const rTs = +new Date(rec.updatedAt || rec.createdAt || 0) || 0;
          if (rTs >= lTs) byId[rec.id] = rec;
        }
        merged[tbl] = Object.values(byId).filter(rec => !rec._deleted);
      } else if (tbl === 'settings' && typeof r === 'object') {
        const lTs = +new Date((l && l._settingsUpdatedAt) || 0) || 0;
        const rTs = +new Date((r && r._settingsUpdatedAt) || 0) || 0;
        if (rTs >= lTs) merged.settings = Object.assign({}, l || {}, r);
        else merged.settings = Object.assign({}, r || {}, l || {});
      } else if (tbl === '_counters' && typeof r === 'object') {
        merged._counters = Object.assign({}, l || {});
        for (const k of Object.keys(r || {})) {
          merged._counters[k] = Math.max(+(l?.[k] || 0), +(r[k] || 0));
        }
      } else if (l == null) {
        merged[tbl] = r;
      }
    }
    return merged;
  },

  /* ============== PUSH (CHUNKED) ============== */
  async push() {
    if (this._suppressPush) return;
    if (!this.isEnabled() || !this.isReady()) return;
    if (this._syncing) { this._pendingPush = true; return; }
    this._syncing = true;
    try {
      const db = await this.init();
      if (this._mode === 'rest') {
        const v = await this._restPush(DB._data);
        this._lastAppliedVersion = v;
        localStorage.setItem(this.LAST_SYNC_KEY, new Date().toISOString());
        console.log('[CloudSync] Pushed via REST');
        return;
      }
      if (this._mode === 'rtdb') {
        const v = await this._rtdbPush(DB._data);
        this._lastAppliedVersion = v;
        localStorage.setItem(this.LAST_SYNC_KEY, new Date().toISOString());
        console.log('[CloudSync] Pushed to Realtime Database');
        return;
      }
      const shopId = this.getShopId();
      const data = DB._data;
      const version = Date.now();
      const myDeviceId = getDeviceId();
      const username = DB.currentUser()?.username || 'unknown';
      const serverTs = firebase.firestore.FieldValue.serverTimestamp();

      const tablesRef = db.collection('shops').doc(shopId).collection('tables');
      const tableMeta = {};
      let totalSize = 0;

      // Write each table — single doc OR chunked
      for (const tbl of Object.keys(data)) {
        const json = JSON.stringify(data[tbl] ?? null);
        totalSize += json.length;
        
        // OPTIMIZATION: Only push if data actually changed to save Firebase Quota
        if (this._lastPushedJson[tbl] === json) {
          // Keep existing meta for the main doc
          if (this._lastPushedMeta && this._lastPushedMeta[tbl]) {
            tableMeta[tbl] = this._lastPushedMeta[tbl];
          } else {
             const num = Math.ceil(json.length / MAX_DOC_SIZE) || 1;
             tableMeta[tbl] = { chunks: num, size: json.length, skipped: true };
          }
          continue;
        }
        
        this._lastPushedJson[tbl] = json;

        if (json.length < MAX_DOC_SIZE) {
          tableMeta[tbl] = { chunks: 1, size: json.length };
          await tablesRef.doc(tbl).set({
            data: json,
            chunks: 1,
            version,
            deviceId: myDeviceId,
            updatedAt: serverTs
          });
        } else {
          const numChunks = Math.ceil(json.length / MAX_DOC_SIZE);
          tableMeta[tbl] = { chunks: numChunks, size: json.length };
          for (let i = 0; i < numChunks; i++) {
            const chunkData = json.substr(i * MAX_DOC_SIZE, MAX_DOC_SIZE);
            await tablesRef.doc(`${tbl}__c${i}`).set({
              data: chunkData,
              chunkIndex: i,
              totalChunks: numChunks,
              parent: tbl,
              version,
              deviceId: myDeviceId,
              updatedAt: serverTs
            });
          }
        }
      }

      this._lastPushedMeta = tableMeta;
      // Write main meta doc — triggers listen() on other devices
      await db.collection('shops').doc(shopId).set({
        tables: tableMeta,
        totalSize,
        version,
        deviceId: myDeviceId,
        deviceLabel: getDeviceLabel(),
        updatedBy: username,
        updatedAt: serverTs,
        _format: 'chunked-v1'
      });

      this._lastAppliedVersion = version;
      localStorage.setItem(this.LAST_SYNC_KEY, new Date().toISOString());
      console.log(`[CloudSync] Pushed ${Object.keys(tableMeta).length} tables (${Math.round(totalSize/1024)}KB)`);
    } finally {
      this._syncing = false;
      if (this._pendingPush) { this._pendingPush = false; setTimeout(() => this.push(), 200); }
    }
  },

  /* ============== PULL & MERGE (CHUNKED) ============== */
  async pullAndMerge() {
    const db = await this.init();
    if (this._mode === 'rest') {
      const remote = await this._restPull();
      if (!remote) return false;
      const merged = this.mergeData(DB._data, remote);
      DB._data = merged;
      this._suppressPush = true;
      try { DB.save(); } finally { this._suppressPush = false; }
      localStorage.setItem(this.LAST_SYNC_KEY, new Date().toISOString());
      return true;
    }
    if (this._mode === 'rtdb') {
      const remote = await this._rtdbPull();
      if (!remote) return false;
      const merged = this.mergeData(DB._data, remote);
      DB._data = merged;
      this._suppressPush = true;
      try { DB.save(); } finally { this._suppressPush = false; }
      localStorage.setItem(this.LAST_SYNC_KEY, new Date().toISOString());
      return true;
    }
    const shopId = this.getShopId();
    const mainDoc = await db.collection('shops').doc(shopId).get();
    if (!mainDoc.exists) return false;

    const meta = mainDoc.data();
    let remoteData = null;

    // New chunked format
    if (meta._format === 'chunked-v1' && meta.tables) {
      remoteData = {};
      const tablesRef = db.collection('shops').doc(shopId).collection('tables');

      for (const tbl of Object.keys(meta.tables)) {
        const info = meta.tables[tbl];
        if (info.chunks === 1) {
          const doc = await tablesRef.doc(tbl).get();
          if (doc.exists) {
            try { remoteData[tbl] = JSON.parse(doc.data().data); }
            catch(e) { console.warn(`parse ${tbl}`, e); }
          }
        } else {
          // Reassemble chunks in order
          const chunks = [];
          for (let i = 0; i < info.chunks; i++) {
            const doc = await tablesRef.doc(`${tbl}__c${i}`).get();
            if (doc.exists) chunks[i] = doc.data().data;
          }
          if (chunks.length === info.chunks) {
            try { remoteData[tbl] = JSON.parse(chunks.join('')); }
            catch(e) { console.warn(`parse chunked ${tbl}`, e); }
          }
        }
      }
    } else if (meta.data) {
      // Legacy single-doc format
      try { remoteData = JSON.parse(meta.data); }
      catch(e) { console.warn('Bad remote data', e); return false; }
    } else {
      return false;
    }

    const merged = this.mergeData(DB._data, remoteData);
    DB._data = merged;
    this._suppressPush = true;
    try { DB.save(); } finally { this._suppressPush = false; }
    this._lastAppliedVersion = meta.version || Date.now();
    localStorage.setItem(this.LAST_SYNC_KEY, new Date().toISOString());
    return true;
  },

  /* ============== REAL-TIME LISTEN ============== */
  async listen() {
    if (this._unsub) this._unsub();
    const db = await this.init();
    if (this._mode === 'rest') {
      const myDeviceId = getDeviceId();
      const poll = async () => {
        try {
          const remote = await this._restPull();
          if (!remote) return;
          const remoteVersion = this._lastRestVersion || 0;
          if (remoteVersion && remoteVersion <= this._lastAppliedVersion) return;
          this._lastAppliedVersion = remoteVersion;
          const merged = this.mergeData(DB._data, remote);
          DB._data = merged;
          this._suppressPush = true;
          try { DB.save(); } finally { this._suppressPush = false; }
          if (typeof app !== 'undefined' && app.current && document.visibilityState === 'visible') {
            setTimeout(() => app.go(app.current), 600);
          }
        } catch (e) { console.warn('[CloudSync] REST poll failed', e && e.message); }
      };
      this._restTimer = setInterval(poll, 20000);
      this._unsub = () => clearInterval(this._restTimer);
      setTimeout(poll, 3000);
      console.log('[CloudSync] REST polling every 20s');
      return;
    }
    if (this._mode === 'rtdb') {
      const myDeviceId = getDeviceId();
      const ref = this._rdb.ref('shops/' + this.getShopId());
      const cb = async (snap) => {
        if (!snap.exists()) return;
        const v = snap.val();
        if (v.deviceId === myDeviceId) return;
        if (v.version && v.version <= this._lastAppliedVersion) return;
        try {
          await this.pullAndMerge();
          clearTimeout(this._toastDebounceTimer);
          this._toastDebounceTimer = setTimeout(() => {
            if (typeof toast === 'function') toast(`☁️ Synced from ${v.deviceLabel || 'another device'} (${v.updatedBy || 'user'})`, 'success');
          }, 300);
          if (typeof app !== 'undefined' && app.current && document.visibilityState === 'visible') {
            setTimeout(() => app.go(app.current), 400);
          }
        } catch (e) { console.warn('RTDB merge failed', e); }
      };
      ref.on('value', cb);
      this._unsub = () => { try { ref.off('value', cb); } catch (e) {} };
      return;
    }
    const shopId = this.getShopId();
    const myDeviceId = getDeviceId();

    // Listen only on main meta doc — small, efficient
    this._unsub = db.collection('shops').doc(shopId).onSnapshot(async (doc) => {
      if (!doc.exists) return;
      const remote = doc.data();
      if (remote.deviceId === myDeviceId) return; // anti-echo
      if (remote.version && remote.version <= this._lastAppliedVersion) return; // dedupe

      try {
        await this.pullAndMerge();
        clearTimeout(this._toastDebounceTimer);
        this._toastDebounceTimer = setTimeout(() => {
          if (typeof toast === 'function') {
            toast(`☁️ Synced from ${remote.deviceLabel || 'another device'} (${remote.updatedBy || 'user'})`, 'success');
          }
        }, 300);
        if (typeof app !== 'undefined' && app.current && document.visibilityState === 'visible') {
          setTimeout(() => app.go(app.current), 400);
        }
      } catch(e) { console.warn('Sync merge failed:', e); }
    }, err => console.warn('Cloud listen error:', err));
  },

  /* Legacy force-pull (returns plain data, used by "Force Pull" button) */
  async pull() {
    const db = await this.init();
    const shopId = this.getShopId();
    const mainDoc = await db.collection('shops').doc(shopId).get();
    if (!mainDoc.exists) return null;
    const meta = mainDoc.data();
    if (meta._format === 'chunked-v1' && meta.tables) {
      const result = {};
      const tablesRef = db.collection('shops').doc(shopId).collection('tables');
      for (const tbl of Object.keys(meta.tables)) {
        const info = meta.tables[tbl];
        if (info.chunks === 1) {
          const doc = await tablesRef.doc(tbl).get();
          if (doc.exists) {
            try { result[tbl] = JSON.parse(doc.data().data); } catch(e){}
          }
        } else {
          const chunks = [];
          for (let i = 0; i < info.chunks; i++) {
            const doc = await tablesRef.doc(`${tbl}__c${i}`).get();
            if (doc.exists) chunks[i] = doc.data().data;
          }
          if (chunks.length === info.chunks) {
            try { result[tbl] = JSON.parse(chunks.join('')); } catch(e){}
          }
        }
      }
      return result;
    } else if (meta.data) {
      return JSON.parse(meta.data);
    }
    return null;
  },

  stop() {
    if (this._unsub) { this._unsub(); this._unsub = null; }
  }
};

/* ============================================================
   ensureCloudConnected(auto)
   ------------------------------------------------------------------
   Naya device / naya system: login hote hi Cloud Sync khud ON.
   Kuch bhi dabane ki zaroorat nahi. Push pehle, phir merge (data safe),
   phir real-time listen (ya REST polling) — aur agar network gir jaye to
   page wapas aane par khud dobara connect.
   ============================================================ */
let _cloudConnectPromise = null;
async function ensureCloudConnected(auto) {
  if (!CLOUD.isReady()) {
    const cfg = CLOUD.getDefaultConfig();
    if (!cfg) return false;
    CLOUD.setConfig(cfg);
    if (!CLOUD.getShopId()) CLOUD.setShopId(CLOUD.getDefaultShopId() || 'modern-laundry-main');
  }
  if (_cloudConnectPromise) return _cloudConnectPromise;
  _cloudConnectPromise = (async () => {
    let stage = 'init';
    try {
      await CLOUD.init();                 // firestore / rtdb / rest — jo chale
      stage = 'push';
      CLOUD.setEnabled(true);             // ON sirf connect ke BAAD
      await CLOUD.push();                 // is device ka data cloud par
      CLOUD._dirty = false;
      stage = 'merge';
      await CLOUD.pullAndMerge();         // phir cloud se merge
      stage = 'listen';
      await CLOUD.listen();
      CLOUD._initialMergeDone = true;
      CLOUD._lastAutoError = null;
      console.log('[CloudSync] auto-connected (' + CLOUD._mode + ')');
      if (auto && typeof toast === 'function') toast('☁️ Cloud Sync ON — data cloud par mehfooz', 'success');
      return true;
    } catch (e) {
      CLOUD._lastAutoError = (e && e.message) || String(e);
      console.warn('[CloudSync] auto-connect failed at ' + stage + ':', CLOUD._lastAutoError);
      /* ⚠️ AGAR data cloud par ja chuka hai (push ho gaya) to sync ko OFF na karein —
         warna user ka naya data chup chaap upload hona band ho jata hai.
         Sirf tab OFF karein jab shuru mein hi connect na hua ho. */
      if (stage === 'init') {
        CLOUD.setEnabled(false);
        return false;
      }
      CLOUD._initialMergeDone = true;
      CLOUD._retryTimer = CLOUD._retryTimer || setInterval(() => {
        if (!CLOUD.isEnabled()) return;
        CLOUD.push().then(() => { CLOUD._dirty = false; }).catch(e => console.warn('[CloudSync] retry push failed', e && e.message));
      }, 30000);
      return true;
    } finally {
      _cloudConnectPromise = null;
    }
  })();
  return _cloudConnectPromise;
}
window.ensureCloudConnected = ensureCloudConnected;

/* ============== AUTO-INIT ============== */
(function cloudAutoInit() {
  if (typeof DB === 'undefined') return;
  setTimeout(async () => {
    if (CLOUD.isEnabled() && CLOUD.isReady()) {
      try {
        await CLOUD.init();
        await CLOUD.pullAndMerge();
        await CLOUD.push();
        await CLOUD.listen();
        CLOUD._initialMergeDone = true;
        console.log('[Modern Dry Cleaners] Cloud sync active — chunked storage');
        setTimeout(() => {
          if (typeof toast === 'function') toast('☁️ Cloud Sync active', 'success');
        }, 1500);
      } catch(e) {
        console.warn('Cloud init failed:', e);
        showCloudRecoveryPrompt('Cloud sync failed to start: ' + e.message);
      }
      return;
    }
    // Pehli dafa / naya device: bundled config ho to khud connect ho jaye
    if (CLOUD.hasDefaults() && !CLOUD.isEnabled()) {
      const okConnected = await ensureCloudConnected(true);
      if (!okConnected) {
        showCloudRecoveryPrompt('Cloud sync could not start: ' + (CLOUD._lastAutoError || 'unknown'));
      }
      return;
    }
    if (CLOUD.isReady() && !CLOUD.isEnabled()) {
      showCloudRecoveryPrompt('Cloud Sync is paused. Re-enable to sync your data?');
    }
  }, 2500);
})();

function showCloudRecoveryPrompt(msg) {
  if (typeof openModal !== 'function') return;
  if (sessionStorage.getItem('mrLaundryCloudPrompted')) return;
  /* agar user pehle se kisi window (Settings → Cloud Sync) mein hai to usay
     recovery popup se na cheerein — wahan pura UI mojood hai */
  const root = typeof document !== 'undefined' ? document.getElementById('modal-root') : null;
  if (root && root.children.length > 0 && root.innerHTML.trim() !== '') return;
  sessionStorage.setItem('mrLaundryCloudPrompted', '1');
  setTimeout(() => {
    openModal('<div style="text-align:center;padding:20px;">' +
      '<div style="font-size:60px;margin-bottom:14px;">☁️</div>' +
      '<h3 style="margin-bottom:10px;">Cloud Sync Needs Attention</h3>' +
      '<p style="color:var(--text-soft);margin-bottom:16px;font-size:14px;">' + escapeHtml(msg) + '</p>' +
      '<p style="font-size:13px;color:var(--text-soft);margin-bottom:16px;">Your data is safe — we just need to re-connect to your cloud database.</p>' +
      '<div style="display:flex;gap:8px;justify-content:center;">' +
      '<button class="btn btn-ghost" onclick="closeModal()">Later</button>' +
      '<button class="btn btn-primary" onclick="closeModal();enableCloudSyncQuick();">☁️ Cloud Sync ON karein</button>' +
      '</div></div>');
  }, 2000);
}

/* ============================================================
   ONE-CLICK CONNECT — bundled Firebase config ke sath
   (Settings → Cloud Sync → "Cloud Sync On karein")
   ============================================================ */
async function enableCloudSyncQuick(shopId) {
  const toast2 = (m, ty) => { if (typeof toast === 'function') toast(m, ty || 'success'); };
  const cfg = CLOUD.getDefaultConfig();
  if (!cfg) { toast2('Cloud config nahi mili — Settings se Firebase config paste karein', 'error'); return false; }
  try {
    CLOUD.setConfig(cfg);
    CLOUD.setShopId((shopId || CLOUD.getDefaultShopId() || 'modern-laundry-main').trim());
    toast2('☁️ Cloud se connect ho rahe hain…');
    await CLOUD.init();              // connect fail ho to yahin ruk jate hain
    CLOUD.setEnabled(true);          // ON sirf connect ke BAAD — warna push() skip ho jata hai
    try {
      await CLOUD.push();            // is device ka data cloud par
    } catch (pushErr) {
      CLOUD.setEnabled(false);
      CLOUD._db = null;
      throw new Error('Data cloud par nahi gaya: ' + pushErr.message);
    }
    await CLOUD.pullAndMerge();      // phir cloud se merge
    await CLOUD.listen();
    CLOUD._initialMergeDone = true;
    if (typeof logAction === 'function') logAction('cloud.enable', CLOUD.getShopId());
    toast2('✅ Cloud Sync ON — sab devices ab sync honge', 'success');
    setTimeout(() => location.reload(), 1200);
    return true;
  } catch (e) {
    console.warn('[CloudSync] quick connect failed', e);
    toast2('Connect nahi hua: ' + e.message, 'error');
    return false;
  }
}
window.enableCloudSyncQuick = enableCloudSyncQuick;

async function reconnectCloudSync() {
  if (!CLOUD.isReady()) {
    if (typeof toast === 'function') toast('No saved config. Please go to Settings.', 'error');
    if (typeof app !== 'undefined') app.go('settings');
    return;
  }
  if (typeof toast === 'function') toast('Re-connecting...', 'success');
  try {
    await CLOUD.init();
    CLOUD.setEnabled(true);
    await CLOUD.pullAndMerge();
    await CLOUD.push();
    await CLOUD.listen();
    if (typeof toast === 'function') toast('✅ Cloud sync re-enabled!', 'success');
    setTimeout(() => location.reload(), 1000);
  } catch (e) {
    if (typeof toast === 'function') toast('Failed: ' + e.message, 'error');
  }
}

/* ---- SAFETY NET: agar koi push fail ho jaye to data chhoota nahi ----
   (client ke case mein invoice bane the magar cloud par nahi pohnche) */
(function cloudSafetyPush() {
  if (typeof window === 'undefined') return;
  setInterval(() => {
    if (!CLOUD.isReady()) return;
    if (!CLOUD.isEnabled()) return;
    if (!CLOUD._dirty) return;
    CLOUD.push().then(() => { CLOUD._dirty = false; }).catch(() => {});
  }, 30000);

  /* tab band / reload hone se pehle bacha hua data bhejne ki koshish (REST) */
  window.addEventListener('pagehide', () => {
    if (!CLOUD._dirty || !CLOUD.isReady()) return;
    try {
      const url = CLOUD._restUrl || CLOUD.getDatabaseURL();
      if (!url || typeof fetch !== 'function') return;
      const body = JSON.stringify({
        data: JSON.stringify(DB._data), version: Date.now(),
        deviceId: getDeviceId(), deviceLabel: getDeviceLabel(),
        updatedBy: (DB.currentUser() && DB.currentUser().username) || 'unknown',
        updatedAt: new Date().toISOString()
      });
      fetch(url + '/shops/' + CLOUD.getShopId() + '.json', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body, keepalive: true
      }).catch(() => {});
    } catch (e) {}
  });
})();

/* ---- network wapas aaye ya tab dobara saamne aaye to chup chaap reconnect ---- */
(function cloudAutoReconnect() {
  if (typeof window === 'undefined') return;
  let lastTry = 0;
  const tryReconnect = async (why) => {
    if (!CLOUD.hasDefaults()) return;
    if (CLOUD.isEnabled() && CLOUD._initialMergeDone && CLOUD._mode !== 'rest') return;
    if (Date.now() - lastTry < 30000) return;   // 30s se zyada baar nahi
    lastTry = Date.now();
    console.log('[CloudSync] reconnect (' + why + ')');
    await ensureCloudConnected(false);
  };
  window.addEventListener('online', () => tryReconnect('online'));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') tryReconnect('visible');
  });
})();

/* ============== HOOK DB OPERATIONS ============== */
(function hookDB() {
  if (typeof DB === 'undefined') return;
  const origInsert = DB.insert?.bind(DB);
  const origUpdate = DB.update?.bind(DB);
  const origRemove = DB.remove?.bind(DB);

  if (origInsert) {
    DB.insert = function(table, rec) {
      rec = rec || {};
      const stamp = new Date().toISOString();
      if (!rec.updatedAt) rec.updatedAt = stamp;
      if (!rec.createdAt) rec.createdAt = stamp;
      return origInsert(table, rec);
    };
  }
  if (origUpdate) {
    DB.update = function(table, id, patch) {
      patch = patch || {};
      patch.updatedAt = new Date().toISOString();
      return origUpdate(table, id, patch);
    };
  }
  if (origRemove) {
    DB.remove = function(table, id) {
      const rows = DB._data[table] || [];
      const i = rows.findIndex(r => r.id === id);
      if (i === -1) return false;
      rows[i] = { id, _deleted: true, updatedAt: new Date().toISOString() };
      DB.save();
      return true;
    };
  }

  const origAll = DB.all?.bind(DB);
  const origGet = DB.get?.bind(DB);
  if (origAll) {
    DB.all = function(table) {
      const rows = origAll(table) || [];
      return rows.filter(r => r && !r._deleted);
    };
  }
  if (origGet) {
    DB.get = function(table, id) {
      const r = origGet(table, id);
      return (r && r._deleted) ? undefined : r;
    };
  }

  const origSave = DB.save.bind(DB);
  let pushTimer = null;
  DB.save = function() {
    origSave();
    localStorage.setItem('mrLaundryLocalVersion', Date.now());
    if (CLOUD._suppressPush) return;

    /* har save ko "dirty" mark karein — chahe abhi connect na ho.
       Cloud connect hone par yeh khud push ho jayega (koi data chhoota nahi). */
    CLOUD._dirty = true;
    CLOUD._dirtyAt = Date.now();

    if (!CLOUD.isReady()) {
      if (CLOUD.hasDefaults()) ensureCloudConnected(false);
      return;
    }
    if (!CLOUD.isEnabled()) {
      /* sync OFF tha magar config mojood hai → khud connect kar ke data bhejne ki koshish */
      ensureCloudConnected(false);
      return;
    }
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      CLOUD.push()
        .then(() => { CLOUD._dirty = false; })
        .catch(e => console.warn('Push failed:', e));
    }, 1500);
  };
})();

/* ============== UI ============== */
function openCloudSyncManager(opts) {
  opts = opts || {};
  const cfg = CLOUD.getConfig();
  const shopId = CLOUD.getShopId();
  const enabled = CLOUD.isEnabled();
  const lastSync = localStorage.getItem(CLOUD.LAST_SYNC_KEY);
  const deviceId = getDeviceId();
  const deviceLabel = getDeviceLabel();

  openModal(`
    <h3>☁️ Cloud Sync (Multi-Device)</h3>
    <p class="sub">Real-time sync via Firebase. <b>Chunked storage</b> — supports unlimited data size!</p>

    ${(cfg && CLOUD.hasDefaults() && !enabled) ? `
      <div style="background:#dcfce7;border-left:4px solid var(--success);padding:12px;border-radius:8px;margin-bottom:14px;font-size:13px;">
        ✅ <b>Cloud ready hai</b> — project <code>${escapeHtml(cfg.projectId || '')}</code> software ke sath pehle se configured hai.
        Neeche <b>"Cloud Sync ON karein"</b> dabayein, bas.
      </div>
    ` : ''}
    ${!cfg ? `
      <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px;border-radius:8px;margin-bottom:14px;font-size:13px;">
        ⚠️ <b>One-time setup required.</b> You need a free Firebase project (5 minutes).
        <button class="btn btn-primary btn-sm" id="firebaseGuideBtn" style="margin-top:8px;">📖 Show Setup Guide</button>
      </div>
    ` : ''}

    <div class="field">
      <label>Firebase Config JSON ${CLOUD.hasDefaults() ? '<small style="color:var(--text-soft);font-weight:400;">(pehle se bhara hua — chhedne ki zaroorat nahi)</small>' : ''}</label>
      <textarea id="fbCfg" rows="6" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-family:monospace;font-size:11px;">${cfg ? escapeHtml(JSON.stringify(cfg, null, 2)) : ''}</textarea>
      <div style="display:flex;gap:8px;margin-top:6px;">
        <button class="btn btn-outline btn-sm" id="restoreCfgBtn" type="button">♻️ Default config wapas laayein</button>
      </div>
      <div style="font-size:11px;color:var(--text-soft);margin-top:4px;">Sirf public web config (apiKey / projectId / appId). Admin / service-account key yahan NA daalein.</div>
    </div>

    <div class="form-row">
      <div class="field">
        <label>Shop ID (unique to your business)</label>
        <input id="shopId" value="${escapeHtml(shopId)}" placeholder="mr-laundry-main-branch"/>
        <small style="color:var(--text-soft);">⚠️ All devices MUST use the SAME Shop ID</small>
      </div>
      <div class="field">
        <label>Status</label>
        <div style="padding:10px;background:${enabled?'#d1fae5':'#fee2e2'};border-radius:8px;text-align:center;font-weight:700;">
          ${enabled ? '✅ Sync ON' : '❌ Sync OFF'}
        </div>
      </div>
    </div>

    <div style="background:var(--surface-alt);padding:10px;border-radius:8px;font-size:12px;margin-bottom:14px;">
      ${CLOUD._mode === 'rest' ? '🗄️ Backend: <b>Realtime Database (REST)</b><br><small style="opacity:.75;">' + escapeHtml(CLOUD._restUrl || '') + '</small><br>' : ''}
      ${CLOUD._mode === 'rtdb' ? '🗄️ Backend: <b>Realtime Database</b><br><small style="opacity:.75;">' + escapeHtml(CLOUD._rdbUrl || CLOUD.getDatabaseURL() || '') + '</small><br>' : (cfg ? '🗄️ Backend: <b>Firestore</b><br>' : '')}
      ${lastSync ? `🔄 Last sync: ${new Date(lastSync).toLocaleString()}` : '⚠️ Never synced'}
      <br>📱 This device: <b>${escapeHtml(deviceLabel)}</b> <code style="font-size:10px;">${deviceId}</code>
    </div>

    <div style="display:flex;flex-direction:column;gap:8px;">
      ${!enabled ? `
        <button class="btn btn-success btn-block btn-lg" id="enableBtn" style="font-size:16px;padding:14px;">☁️ Cloud Sync ON karein (1 click)</button>
        <small style="color:var(--text-soft);font-size:11px;text-align:center;">Yehi button har naye device (PC / mobile) par dabana hai — data khud aa jayega.</small>
      ` : ''}
      ${(enabled || (opts.advanced && enabled)) ? `
        <button class="btn btn-success" id="mergeNowBtn">🔄 Merge Now (Pull + Push)</button>
        <button class="btn btn-primary" id="pushNowBtn">⬆️ Force Push This Device → Cloud</button>
        <button class="btn btn-warning" id="pullNowBtn">⬇️ Force Pull Cloud → This Device (OVERWRITE)</button>
        <button class="btn btn-danger" id="disableBtn">⏸️ Pause Cloud Sync</button>
      ` : `
        <details style="margin-top:4px;">
          <summary style="cursor:pointer;font-size:12px;color:var(--text-soft);">Advanced options (Merge / Push / Pull / Pause)</summary>
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;">
            <button class="btn btn-success" id="mergeNowBtn">🔄 Merge Now (Pull + Push)</button>
            <button class="btn btn-primary" id="pushNowBtn">⬆️ Force Push This Device → Cloud</button>
            <button class="btn btn-warning" id="pullNowBtn">⬇️ Force Pull Cloud → This Device (OVERWRITE)</button>
            <button class="btn btn-danger" id="disableBtn">⏸️ Pause Cloud Sync</button>
          </div>
        </details>
      `}
      <button class="btn btn-ghost btn-sm" id="testConnBtn" style="margin-top:6px;">🔌 Connection test karein</button>
    </div>

    <div id="syncLog" style="margin-top:10px;font-size:12px;"></div>

    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Close</button>
    </div>
  `, { large: true, onOpen(m) {
    const log = (msg, type='') => {
      const colors = { error:'var(--danger)', success:'var(--success)', '':'var(--text-soft)' };
      $('#syncLog', m).innerHTML = `<div style="padding:8px;background:var(--surface-alt);border-radius:6px;color:${colors[type]};">${msg}</div>`;
    };

    $('#firebaseGuideBtn', m)?.addEventListener('click', () => { closeModal(); openFirebaseSetupGuide(); });

    /* "Default config wapas laayein" — agar config ghalti se badal gayi ho */
    $('#restoreCfgBtn', m)?.addEventListener('click', () => {
      const d = CLOUD.getDefaultConfig();
      if (!d) { log('Bundled config mojood nahi', 'error'); return; }
      const ta = $('#fbCfg', m);
      if (ta) ta.value = JSON.stringify(d, null, 2);
      const si = $('#shopId', m);
      if (si && CLOUD.getDefaultShopId()) si.value = CLOUD.getDefaultShopId();
      log('♻️ Default config wapas daal di — ab "Cloud Sync ON karein" dabayein', 'success');
    });

    $('#enableBtn', m)?.addEventListener('click', async () => {
      const cfgText = $('#fbCfg', m).value.trim();
      const shop = ($('#shopId', m).value || '').trim() || CLOUD.getDefaultShopId();
      if (!cfgText || !shop) { log('Config ya Shop ID khali hai', 'error'); return; }
      /* config ghalti se badal gaya ho to yahin pakar lete hain */
      if (!/^\s*\{/.test(cfgText) || /PRIVATE KEY|service_account/.test(cfgText)) {
        log('❌ Yeh Firebase ki sahi web config nahi hai. "♻️ Default config wapas laayein" dabayein (ya Console → Project settings → Web app ka config paste karein).<br><b>Admin/private key yahan NA daalein.</b>', 'error');
        return;
      }
      try {
        const parsed = parseFirebaseConfig(cfgText);
        if (!parsed.apiKey || !parsed.projectId) throw new Error('Invalid config — apiKey ya projectId nahi mila');
        CLOUD.setConfig(parsed);
        CLOUD.setShopId(shop);
        CLOUD.setEnabled(true);          // pehle ON — warna push() chup chaap kuch nahi karta
        log('☁️ Firebase se connect ho rahe hain…');
        await CLOUD.init();
        log('⬆️ Is device ka data cloud par bheja ja raha hai…');
        await CLOUD.push();
        log('⬇️ Cloud se data merge ho raha hai…');
        await CLOUD.pullAndMerge();
        await CLOUD.listen();
        CLOUD._initialMergeDone = true;
        if (typeof logAction === 'function') logAction('cloud.enable', shop);
        log('✅ Connected! 3 second mein page reload hoga…', 'success');
        if (typeof toast === 'function') toast('✅ Cloud Sync ON — data cloud par mehfooz', 'success');
        setTimeout(() => location.reload(), 1800);
      } catch(e) {
        CLOUD.setEnabled(false);
        const raw = String(e && e.message || e);
        const hint = /permission|insufficient|PERMISSION_DENIED/i.test(raw)
          ? 'Rules publish karein (Firebase → Firestore → Rules → FIREBASE-RULES.txt)'
          : /offline|unavailable|network/i.test(raw)
            ? 'Connection nahi bana — internet / firewall check karein, aur Firestore Database bana hua ho'
            : 'Dobara try karein';
        log('❌ ' + escapeHtml(raw) + '<br><b>👉 ' + hint + '</b>', 'error');
      }
    });

    /* auto-enable mode (Settings → "Cloud Sync ON karein") */
    if (opts.autoEnable && $('#enableBtn', m)) setTimeout(() => $('#enableBtn', m).click(), 150);

    $('#testConnBtn', m)?.addEventListener('click', async () => {
      const show = (html, type) => {
        $('#syncLog', m).innerHTML = `<div style="padding:10px;border-radius:6px;line-height:1.6;background:var(--surface-alt);color:${type === 'error' ? 'var(--danger)' : type === 'success' ? 'var(--success)' : 'var(--text-soft)'};">${html}</div>`;
      };
      const buildTag = (typeof MRL_BUILD_TAG !== 'undefined') ? MRL_BUILD_TAG : (window.MRL_BUILD_TAG || '');
    if (buildTag) log('🧾 Build: ' + escapeHtml(buildTag));
    log('🔌 Firebase se test connection…');
      try {
        /* Config jo box mein likhi hai wohi test karein (saved config se pehle) */
        const boxCfg = ($('#fbCfg', m)?.value || '').trim();
        if (boxCfg) {
          const parsed = parseFirebaseConfig(boxCfg);
          if (parsed && parsed.apiKey) CLOUD.setConfig(parsed);
        }
        const shop = CLOUD.getShopId() || ($('#shopId', m)?.value || '').trim();
        if (!shop) throw new Error('Shop ID khali hai — upar "Shop ID" mein modern-laundry-main likhein');
        const db = await CLOUD.init();          // yahan offline/SDK errors pakre jate hain
        if (CLOUD._mode === 'rest') {
          const remote = await CLOUD._restPull();
          show((remote
            ? '✅ <b>Connection OK</b> (Realtime Database · REST)<br>Cloud par data mojood hai. Ab "Merge Now" ya "Force Pull" use kar sakte hain.'
            : '✅ <b>Connection OK</b> (Realtime Database · REST) — cloud khali hai.<br>Ab <b>☁️ Cloud Sync ON karein</b> dabayein.')
            + '<br><small>' + escapeHtml(CLOUD._restUrl || '') + '</small>', 'success');
          return;
        }
        if (CLOUD._mode === 'rtdb') {
          const remote = await CLOUD._rtdbPull();
          const where = `<br><small>Database: ${escapeHtml(CLOUD._rdbUrl || '')}</small>`;
          show(remote
            ? '✅ <b>Connection OK</b> (Realtime Database)' + where + '<br>Cloud par data mojood hai. Ab "Merge Now" ya "Force Pull" use kar sakte hain.'
            : '✅ <b>Connection OK</b> (Realtime Database)' + where + '<br>Cloud khali hai. Ab <b>☁️ Cloud Sync ON karein</b> dabayein.', 'success');
          return;
        }
        const doc = await db.collection('shops').doc(shop).get();
        if (doc.exists) {
          const d2 = doc.data() || {};
          show('✅ <b>Connection OK</b><br>Cloud par data mojood hai — ' + Math.round((d2.totalSize || 0)/1024) + ' KB, aakhri update: ' + escapeHtml(d2.updatedBy || '?') + '<br>Ab "Merge Now" ya "Force Pull" use kar sakte hain.', 'success');
        } else {
          show('✅ <b>Connection OK</b> — cloud khali hai.<br>Ab <b>☁️ Cloud Sync ON karein</b> dabayein, is device ka data upload ho jayega.', 'success');
        }
      } catch (e) {
        const raw = String(e && e.message || e);
        let msg;
        if (/permission|insufficient|PERMISSION_DENIED/i.test(raw)) {
          msg = '❌ <b>Permission denied</b> — Firebase Console → Firestore Database → <b>Rules</b> mein <code>FIREBASE-RULES.txt</code> ka content paste kar ke <b>Publish</b> karein.';
        } else if (/offline|unavailable|network|timeout|ERR_/i.test(raw)) {
          msg = '❌ <b>Client offline</b> — browser Firestore tak nahi pohnch raha.<br>'
              + '1) Internet chal raha hai? (kisi doosri website se check karein)<br>'
              + '2) Office/school firewall ya antivirus <code>firestore.googleapis.com</code> block to nahi kar raha?<br>'
              + '3) Firebase Console → <b>Firestore Database</b> bana hua hai? (agar "Create database" likha ho to pehle woh banayein)<br>'
              + '4) Browser mein koi ad-blocker / VPN band kar ke dobara try karein.<br>'
              + '<small>(' + escapeHtml(raw) + ')</small>';
        } else if (/api-key|API key|invalid/i.test(raw)) {
          msg = '❌ <b>Config ghalat lagti hai</b> — Firebase Console → Project settings → Web app se <code>firebaseConfig</code> dobara copy kar ke upar paste karein.<br><small>(' + escapeHtml(raw) + ')</small>';
        } else {
          msg = '❌ ' + escapeHtml(raw);
        }
        show(msg, 'error');
      }
    });

    $('#mergeNowBtn', m)?.addEventListener('click', async () => {
      log('Merging...');
      try {
        await CLOUD.pullAndMerge();
        await CLOUD.push();
        log('✅ Merge complete. Reloading...','success');
        setTimeout(() => location.reload(), 1000);
      } catch(e) { log('❌ ' + e.message, 'error'); }
    });

    $('#pushNowBtn', m)?.addEventListener('click', async () => {
      log('Pushing (chunked)...');
      try { await CLOUD.push(); log('✅ Pushed to cloud','success'); }
      catch(e) { log('❌ ' + e.message, 'error'); }
    });

    $('#pullNowBtn', m)?.addEventListener('click', () => {
      confirmDialog('FORCE Pull will OVERWRITE local data with cloud. You probably want "Merge Now" instead. Continue?', async () => {
        try {
          const remote = await CLOUD.pull();
          if (!remote) { log('No data in cloud yet','error'); return; }
          DB._data = remote; DB.save();
          toast('Pulled from cloud. Reloading...','success');
          setTimeout(() => location.reload(), 1000);
        } catch(e) { log('❌ ' + e.message, 'error'); }
      });
    });

    $('#disableBtn', m)?.addEventListener('click', () => {
      CLOUD.setEnabled(false); CLOUD.stop();
      toast('Cloud sync paused','success');
      closeModal(); openCloudSyncManager({ advanced: true });
    });
  }});
}

function openFirebaseSetupGuide() {
  openModal(`
    <h3>📖 Firebase Setup Guide (One-Time, ~5 min)</h3>
    <p class="sub">Firebase gives you a free real-time database for syncing across devices.</p>

    <ol style="font-size:13px;line-height:1.8;padding-left:20px;">
      <li>Go to <a href="https://console.firebase.google.com/" target="_blank"><b>console.firebase.google.com</b></a> → sign in with Gmail</li>
      <li>Click <b>"Add project"</b> → name it <b>"Modern Dry Cleaners"</b> → continue</li>
      <li>On the project home page, click the <b>Web icon</b> <code>&lt;/&gt;</code> to add a web app</li>
      <li>Left menu → <b>Build</b> → <b>Firestore Database</b> → <b>Create database</b></li>
      <li>Go to <b>Rules</b> tab and replace with:
        <pre style="background:#1e293b;color:#fff;padding:10px;border-radius:6px;font-size:11px;overflow-x:auto;">rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /shops/{shopId} {
      allow read, write: if true;
    }
    match /shops/{shopId}/tables/{tableId} {
      allow read, write: if true;
    }
  }
}</pre>
        <small style="color:var(--danger);"><b>⚠️ IMPORTANT:</b> The rules MUST include the <code>/tables/{tableId}</code> path or chunked sync won't work!</small>
      </li>
      <li>Click <b>Publish</b></li>
      <li>Paste the <code>firebaseConfig</code> in the box above</li>
      <li>Choose any <b>Shop ID</b> — use the SAME on all devices</li>
      <li>Click <b>"Enable Cloud Sync"</b> ✅</li>
    </ol>

    <div class="modal-footer">
      <button class="btn btn-primary" onclick="closeModal();openCloudSyncManager()">← Back to Setup</button>
    </div>
  `, { large: true });
}
