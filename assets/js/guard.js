/* ============================================================
   ANTI-TAMPER / DEV-TOOLS DETERRENT  —  Modern Dry Cleaners POS
   ============================================================
   READ THIS FIRST (honest scope)
   ------------------------------
   No web page can truly block F12. DevTools can be opened from the
   browser menu, and anyone can copy a file and read it elsewhere.
   What this layer does is close the easy, casual paths:

     • F12 / Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C / Ctrl+U /
       Ctrl+S / Ctrl+P shortcut keys are swallowed
     • right-click context menu is disabled on the app
     • text of the credential areas cannot be selected/dragged
     • console output is muted for casual snooping (log/table dumps)
     • if devtools IS opened, a soft "lock" pauses the session and
       asks for the password again (never destroys data)

   The real protection is the hashed vault (assets/js/vault.js):
   passwords simply are not in storage any more. A server-side
   backend is the only complete answer.
   ============================================================ */

window.MDC_GUARD = (function () {
  'use strict';

  var enabled = true;
  var devtoolsOpen = false;
  var onRelock = null;

  /* ---------- 1) keyboard shortcuts ---------- */
  function blockKeys(e) {
    if (!enabled) return;
    var k = (e.key || '').toLowerCase();
    var ctrl = e.ctrlKey || e.metaKey;
    var shift = e.shiftKey;

    // F12
    if (e.key === 'F12' || e.keyCode === 123) { e.preventDefault(); e.stopPropagation(); return false; }
    // Ctrl/Cmd + Shift + I / J / C  (devtools + console + inspect)
    if (ctrl && shift && (k === 'i' || k === 'j' || k === 'c')) { e.preventDefault(); e.stopPropagation(); return false; }
    // Ctrl/Cmd + U (view source) and Ctrl/Cmd + S (save page)
    if (ctrl && (k === 'u' || k === 's')) { e.preventDefault(); e.stopPropagation(); return false; }
    // Ctrl/Cmd + Shift + K (Firefox console)
    if (ctrl && shift && k === 'k') { e.preventDefault(); e.stopPropagation(); return false; }
  }

  /* ---------- 2) context menu ---------- */
  function blockContext(e) {
    if (!enabled) return;
    // allow right-click inside real inputs so staff can still paste/undo
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    e.preventDefault();
    return false;
  }

  /* ---------- 3) devtools heuristic (size gap) ---------- */
  function watchDevtools() {
    var threshold = 170;
    function check() {
      var wGap = window.outerWidth - window.innerWidth;
      var hGap = window.outerHeight - window.innerHeight;
      var isOpen = wGap > threshold || hGap > threshold;
      if (isOpen && !devtoolsOpen) {
        devtoolsOpen = true;
        if (typeof onRelock === 'function') onRelock();
      } else if (!isOpen) {
        devtoolsOpen = false;
      }
    }
    setInterval(check, 900);
  }

  /* ---------- 4) mute casual console snooping ---------- */
  function muteConsole() {
    try {
      var noop = function () {};
      // keep `error`/`warn` for support, silence data dumps
      console.log = noop;
      console.table = noop;
      console.dir = noop;
      console.debug = noop;
    } catch (e) {}
  }

  /* ---------- 5) keep secrets out of the page title / clipboard drags ---------- */
  function hardenDom() {
    document.addEventListener('dragstart', function (e) {
      var t = e.target;
      if (t && (t.classList && t.classList.contains('lg-input')) ) e.preventDefault();
    }, true);
  }

  /* ---------- public ---------- */
  return {
    start: function (opts) {
      opts = opts || {};
      onRelock = opts.onDevtools || null;
      muteConsole();
      window.addEventListener('keydown', blockKeys, true);
      window.addEventListener('contextmenu', blockContext, true);
      hardenDom();
      if (opts.watchDevtools !== false) watchDevtools();
      return true;
    },
    setEnabled: function (v) { enabled = !!v; },
    isDevtoolsOpen: function () { return devtoolsOpen; },
    /* Soft lock used when devtools is detected: sign out of the session but
       keep every record. The cashier just has to log in again. */
    softLock: function (reason) {
      try {
        if (typeof MDC_AUDIT_GUARD === 'function') MDC_AUDIT_GUARD(reason || 'devtools');
      } catch (e) {}
      try {
        sessionStorage.removeItem('mrLaundrySession');
        if (window.toast) toast('Session locked for security — please sign in again', 'error');
        if (window.app) app.go('login');
      } catch (e) {}
    }
  };
})();

/* Wire the soft lock to the login screen once the app is up. */
document.addEventListener('DOMContentLoaded', function () {
  if (!window.MDC_GUARD) return;
  MDC_GUARD.start({
    onDevtools: function () {
      // only re-lock when a user is actually signed in
      try {
        if (sessionStorage.getItem('mrLaundrySession')) {
          MDC_GUARD.softLock('devtools-opened');
        }
      } catch (e) {}
    }
  });
});
