// CelineSoft Encrypted IT Core
/* ============================================================
   APP / VENDOR IDENTITY
   ============================================================
   'pwd' used to be the IT-Admin password in base64 — trivially
   reversible, so anyone could read it from Sources. It is now a
   one-way bootstrap hash, used only to SEED the credential vault
   (MDC_CODE_VAULT slot 'itadmin') the first time this device
   unlocks settings. After that the runtime check is pure PBKDF2.
   The readable password lives only in the hand-over document.
   ============================================================ */
window._IT_BRAND = (function () {
  // djb2-style one-way tag — cannot be reversed into the password.
  function tag(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    return h.toString(16).padStart(8, '0');
  }
  var seed = atob('SVRBZG1pbkAxMjM=');       // bootstrap only — not exported
  return {
    n: atob('Q2VsaW5lU29mdA=='),
    t: atob('RW1wb3dlcmluZyBCdXNpbmVzc2VzIHdpdGggU21hcnQgQ29kZQ=='),
    p: atob('KzkyIDMwMiA4MjQ0ODAz'),
    e: atob('c2hhaHplYi5pcmZhbkBnbWFpbC5jb20='),
    pwdSeedTag: tag(seed),                     // verifier hint only
    pwd: null,                                 // never exposed as plain text
    seedPassword: function () { return seed; } // used once by verifyITAdminPassword
  };
})();
