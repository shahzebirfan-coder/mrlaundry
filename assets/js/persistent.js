/* ============================================================
   Persistent Storage System
   1. Requests "persistent storage" permission (browser wont auto-clear)
   2. Backs up critical settings to IndexedDB (survives cache clears)
   3. Auto-restores from IndexedDB on every page load if storage is empty
   ============================================================ */

const Persistent = {
  /* === 1. Request browser to mark storage as persistent === */
  async requestPersistence() {
    if (!navigator.storage || !navigator.storage.persist) return false;
    try {
      const isAlreadyPersistent = await navigator.storage.persisted();
      if (isAlreadyPersistent) {
        console.log('[Persistent] Storage already persistent ✓');
        return true;
      }
      const granted = await navigator.storage.persist();
      if (granted) {
        console.log('[Persistent] Storage now persistent ✓');
      } else {
        console.warn('[Persistent] Storage NOT persistent — browser may clear data');
      }
      return granted;
    } catch (e) {
      console.warn('[Persistent] Persistence check failed:', e);
      return false;
    }
  },

  /* === 2. Show storage quota info === */
  async getStorageInfo() {
    if (!navigator.storage || !navigator.storage.estimate) return null;
    try {
      const est = await navigator.storage.estimate();
      const used = Math.round((est.usage || 0) / 1024);
      const quota = Math.round((est.quota || 0) / 1024 / 1024);
      const isPersistent = await navigator.storage.persisted();
      return { used, quota, isPersistent };
    } catch (e) { return null; }
  },

  /* === 3. Backup critical settings to IndexedDB === */
  CRITICAL_KEYS: [
    'mrLaundryDB',
    'mrLaundryFirebaseCfg',
    'mrLaundryShopId',
    'mrLaundryCloudEnabled',
    'mrLaundryGDriveClientId',
    'mrLaundrySession',
    'mrLaundryTheme',
    'mrLaundryLang',
    'mrLaundryPortalLang',
    'mrLaundryActiveBranch'
  ],

  _db: null,
  async openIDB() {
    if (this._db) return this._db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('mrLaundryBackup', 1);
      req.onerror = () => reject(req.error);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      };
      req.onsuccess = () => { this._db = req.result; resolve(req.result); };
    });
  },
  async idbSet(key, value) {
    try {
      const db = await this.openIDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(['kv'], 'readwrite');
        tx.objectStore('kv').put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) { console.warn('[Persistent] idbSet failed:', e); }
  },
  async idbGet(key) {
    try {
      const db = await this.openIDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(['kv'], 'readonly');
        const r = tx.objectStore('kv').get(key);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    } catch (e) { return null; }
  },

  /* Backup all critical localStorage keys to IndexedDB */
  async backupAll() {
    for (const key of this.CRITICAL_KEYS) {
      const val = localStorage.getItem(key);
      if (val !== null) await this.idbSet(key, val);
    }
    await this.idbSet('_lastBackup', new Date().toISOString());
    console.log('[Persistent] Backup to IndexedDB complete');
  },

  /* Restore from IndexedDB if localStorage is empty — BUT skip if restore was just in progress */
  async restoreIfNeeded() {
    // NEW: If a restore was just performed, don't overwrite it with IndexedDB data
    const restoring = sessionStorage.getItem('mrLaundryRestoring');
    if (restoring) {
      console.log('[Persistent] Restore flag detected — skipping auto-restore to prevent overwrite');
      sessionStorage.removeItem('mrLaundryRestoring');
      // Backup the restored data to IndexedDB immediately
      await this.backupAll();
      return 0;
    }

    let restored = 0;
    for (const key of this.CRITICAL_KEYS) {
      if (localStorage.getItem(key) === null) {
        const val = await this.idbGet(key);
        if (val !== null && val !== undefined) {
          localStorage.setItem(key, val);
          restored++;
        }
      }
    }
    if (restored > 0) {
      console.log(`[Persistent] Restored ${restored} keys from IndexedDB`);
      return restored;
    }
    return 0;
  }
};

/* === Auto-run on page load === */
(async function initPersistent() {
  if (typeof window === 'undefined') return;
  // Step 1: Try to restore lost settings from IndexedDB BEFORE app loads
  try {
    const restored = await Persistent.restoreIfNeeded();
    if (restored > 0) {
      console.log('[Persistent] Restored lost settings — reloading page...');
      setTimeout(() => location.reload(), 300);
      return;
    }
  } catch (e) { }
  // Step 2: Request persistent storage permission
  await Persistent.requestPersistence();
  // Step 3: Backup every 30 seconds (in case settings change)
  setInterval(() => Persistent.backupAll(), 30000);
  // Step 4: Backup before window closes
  window.addEventListener('beforeunload', () => {
    Persistent.CRITICAL_KEYS.forEach(key => {
      const val = localStorage.getItem(key);
      if (val !== null) Persistent.idbSet(key, val);
    });
  });
  // Step 5: Backup on visibility change (when user switches tab/app)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') Persistent.backupAll();
  });
  // Initial backup after 5 seconds
  setTimeout(() => Persistent.backupAll(), 5000);
})();

/* === Helper: show storage status to admin === */
function showStorageStatus() {
  Persistent.getStorageInfo().then(info => {
    if (!info) return alert('Storage API not available');
    const msg = `📊 Browser Storage Status:\n\n` +
      `Quota: ${info.quota} MB\n` +
      `Used: ~${info.used} KB\n` +
      `Persistent: ${info.isPersistent ? '✅ Yes' : '❌ No (data may be cleared by browser)'}`;
    alert(msg);
  });
}
