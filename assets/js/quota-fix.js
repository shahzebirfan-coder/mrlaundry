/* ============================================================
   Mr Laundry POS — localStorage Quota Fix
   ------------------------------------------------------------
   Problem:  After many orders, the 'mrLaundryDB' localStorage
             entry exceeds the browser's ~5MB quota. When the
             user clicks "Next → Payment", DB.save() throws
             QuotaExceededError, which kills the click handler
             BEFORE it can open the payment dialog.

   Fix:      Wrap DB.save() to NEVER throw on quota errors.
             1. Try normal save chain (cloudsync-wrapped).
             2. If QuotaExceededError → auto-trim large tables
                (auditLog, messages, inventoryMovements, etc.)
                and retry.
             3. If still full → keep only last 100 orders
                (last-resort aggressive trim).
             4. If still full → save to IndexedDB only.
             5. Show a clear toast so the admin knows to backup.

   Install:  Add ONE line to index.html, BEFORE the sw.js
             registration block (at end of <body>):
             <script src="assets/js/quota-fix.js?v=FIXDATE"></script>
   ============================================================ */

(function installDbQuotaFix() {
  // Wait until DB is defined (db.js loads after this file? no — db.js
  // loads BEFORE this file, but we double-check anyway for safety).
  if (typeof DB === 'undefined' || typeof DB.save !== 'function') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', installDbQuotaFix);
      return;
    }
    setTimeout(installDbQuotaFix, 50);
    return;
  }

  // Capture whatever DB.save currently is. By the time this script
  // runs, cloudsync.js has already wrapped DB.save, so wrappedSave
  // is the cloudsync version (which calls the original DB.save from
  // db.js — THAT is the one that throws QuotaExceededError).
  const wrappedSave = DB.save.bind(DB);

  // Helper: progressive auto-trim
  function autoTrimLight() {
    let trimmed = 0;
    const trim = (arr, keep) => {
      if (Array.isArray(arr) && arr.length > keep) {
        trimmed += arr.length - keep;
        // Keep the most-recent N entries (end of array)
        arr.splice(0, arr.length - keep);
      }
    };
    trim(DB._data && DB._data.auditLog,            500);
    trim(DB._data && DB._data.messages,            200);
    trim(DB._data && DB._data.inventoryMovements,  500);
    trim(DB._data && DB._data.paymentProofs,       100);
    trim(DB._data && DB._data.refundLog,           200);
    return trimmed;
  }

  function autoTrimAggressive() {
    let trimmed = 0;
    const trim = (arr, keep) => {
      if (Array.isArray(arr) && arr.length > keep) {
        trimmed += arr.length - keep;
        arr.splice(0, arr.length - keep);
      }
    };
    // Keep last 50 of everything
    trim(DB._data && DB._data.auditLog,            50);
    trim(DB._data && DB._data.messages,            50);
    trim(DB._data && DB._data.inventoryMovements,  50);
    trim(DB._data && DB._data.paymentProofs,       50);
    trim(DB._data && DB._data.orders,              100);  // Keep last 100 orders
    return trimmed;
  }

  function showQuotaToast(msg, type) {
    try {
      if (typeof toast === 'function') toast(msg, type || 'warn');
    } catch (_) {}
  }

  // Replace DB.save with a quota-safe version.
  DB.save = function quotaSafeSave() {
    // 1. Try the normal save chain (cloudsync wrapper → db.js save → localStorage)
    try {
      wrappedSave();
      return { ok: true, where: 'localStorage' };
    } catch (e) {
      // Detect quota error across browsers
      const isQuota = e && (
        e.name === 'QuotaExceededError' ||
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        e.code === 22 || e.code === 1014 ||
        /quota/i.test(String(e.message || ''))
      );
      if (!isQuota) {
        // Not a quota error — re-throw so caller knows
        console.error('[QuotaFix] save failed (non-quota):', e);
        throw e;
      }

      // 2. Quota exceeded → light auto-trim & retry once
      let trimmed = autoTrimLight();
      try {
        localStorage.setItem('mrLaundryDB', JSON.stringify(DB._data));
        console.warn(`[QuotaFix] localStorage quota hit — trimmed ${trimmed} old entries to fit`);
        showQuotaToast(`⚠️ Storage tight — auto-cleaned ${trimmed} old log entries to keep your POS working. Please backup soon!`, 'warn');
        return { ok: true, where: 'localStorage', trimmed };
      } catch (e2) {
        // 3. Still full → aggressive trim (keep only last 100 orders)
        trimmed += autoTrimAggressive();
        try {
          localStorage.setItem('mrLaundryDB', JSON.stringify(DB._data));
          console.warn(`[QuotaFix] Aggressive trim saved ${trimmed} entries — kept last 100 orders only`);
          showQuotaToast('⚠️ Storage was critically full — kept only the last 100 orders. BACKUP your data NOW and clear history!', 'error');
          return { ok: true, where: 'localStorage-aggressive', trimmed };
        } catch (e3) {
          // 4. Still full → save to IndexedDB only (via persistent.js)
          try {
            if (typeof Persistent !== 'undefined' && typeof Persistent.idbSet === 'function') {
              Persistent.idbSet('mrLaundryDB', JSON.stringify(DB._data));
              console.error('[QuotaFix] localStorage completely full. Data saved to IndexedDB backup only.');
              showQuotaToast('🚨 Storage FULL! Data saved to backup only. Go to Settings → Backup & Clear old orders immediately!', 'error');
              return { ok: true, where: 'indexedDB-fallback' };
            }
          } catch (e4) {
            console.error('[QuotaFix] IndexedDB fallback failed:', e4);
          }
          // 5. All paths failed — DO NOT throw (so the click handler completes).
          //    The in-memory DB._data still has all unsaved changes.
          console.error('[QuotaFix] All save paths failed. In-memory data is intact but not persisted.');
          showQuotaToast('❌ Storage completely full — data NOT saved! Backup & clear old orders NOW.', 'error');
          return { ok: false, error: e };
        }
      }
    }
  };

  // ============================================================
  // Storage diagnostic helper — call from console: DB.storageStats()
  // ============================================================
  DB.storageStats = function () {
    try {
      const raw = localStorage.getItem('mrLaundryDB') || '';
      const bytes = raw.length;
      const totalLS = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        const v = localStorage.getItem(k) || '';
        totalLS[k] = Math.round(v.length / 1024) + ' KB';
      }
      return {
        mrLaundryDB_kb: Math.round(bytes / 1024),
        mrLaundryDB_mb: (bytes / 1024 / 1024).toFixed(2),
        estimatedFullPercent: Math.round((bytes / (5 * 1024 * 1024)) * 100),
        allLocalStorage: totalLS,
        tableSizes: (() => {
          if (!DB._data) return null;
          const out = {};
          Object.keys(DB._data).forEach(k => {
            try {
              const s = JSON.stringify(DB._data[k] || []).length;
              out[k] = Math.round(s / 1024) + ' KB (' + (Array.isArray(DB._data[k]) ? DB._data[k].length : '-') + ' rows)';
            } catch (_) {}
          });
          return out;
        })()
      };
    } catch (e) { return { error: e.message }; }
  };

  // ============================================================
  // Manual trim helper — call from console: DB.trimOldLogs(500)
  // ============================================================
  DB.trimOldLogs = function (keepAuditLog = 500) {
    if (!DB._data) { DB.load(); }
    let removed = 0;
    const trim = (arr, keep) => {
      if (Array.isArray(arr) && arr.length > keep) {
        removed += arr.length - keep;
        arr.splice(0, arr.length - keep);
      }
    };
    trim(DB._data.auditLog, keepAuditLog);
    trim(DB._data.messages, 200);
    trim(DB._data.inventoryMovements, 500);
    trim(DB._data.paymentProofs, 100);
    DB.save();
    console.log(`[QuotaFix] Manual trim removed ${removed} old entries`);
    return removed;
  };

  console.log('%c[QuotaFix] ✓ Quota-safe DB.save installed', 'color:#4f7cff;font-weight:bold');
  console.log('[QuotaFix] Run DB.storageStats() in console to see storage usage');
  console.log('[QuotaFix] Run DB.trimOldLogs(N) to manually trim old log entries');
})();
