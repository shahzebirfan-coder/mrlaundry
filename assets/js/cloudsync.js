/* ============================================================
   CLOUD SYNC v4 — Chunked storage for unlimited data size
   - Splits data across multiple Firestore documents
   - Each table → its own doc; large tables → chunked further
   - Bypasses Firestore 1MB-per-doc limit
   - Maintains backward compat with old single-doc format
   - Bulletproof MERGE — no data loss
   ============================================================ */

const MAX_DOC_SIZE = 800000; // 800KB — safe margin under Firestore 1MB limit

// Private Firebase sync settings for Shahzeb Laundry POS.
// Firebase web config is not a password, but Firestore rules should still be
// restricted in Firebase Console for production use.
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDU5jnvxfvqIB-JoVZzRUSLJdxZgJ2tiuY',
  authDomain: 'mr-laundry-pos-a6740.firebaseapp.com',
  projectId: 'mr-laundry-pos-a6740',
  storageBucket: 'mr-laundry-pos-a6740.firebasestorage.app',
  messagingSenderId: '927434668958',
  appId: '1:927434668958:web:2516175f4046edcfbcf48f'
};
const DEFAULT_SHOP_ID = 'shahzeb-laundry-private-pos';
const CLOUD_SYNC_LOCKED = true;

function applyLockedCloudDefaults() {
  if (!CLOUD_SYNC_LOCKED) return;
  try {
    localStorage.setItem('mrLaundryFirebaseCfg', JSON.stringify(DEFAULT_FIREBASE_CONFIG));
    localStorage.setItem('mrLaundryShopId', DEFAULT_SHOP_ID);
    localStorage.setItem('mrLaundryCloudEnabled', 'true');
  } catch(e) { console.warn('[CloudSync] Could not apply locked defaults:', e); }
}

function cloudSleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }


function buildLiveDashboardData(data) {
  // Compact copy for live.html. It avoids loading photos, products, inventory,
  // full audit logs, etc. so the live dashboard opens very fast.
  const cleanPayments = (arr) => Array.isArray(arr) ? arr.map(p => ({
    id: p.id,
    amount: +p.amount || 0,
    method: p.method || 'cash',
    note: p.note || '',
    at: p.at || p.createdAt || '',
    by: p.by || '',
    byName: p.byName || ''
  })) : [];

  return {
    _liveCompact: true,
    generatedAt: new Date().toISOString(),
    settings: {
      shopName: data?.settings?.shopName || 'Mr Laundry',
      address: data?.settings?.address || '',
      phone: data?.settings?.phone || '',
      currency: data?.settings?.currency || 'Rs.'
    },
    customers: (data.customers || []).filter(c => !c._deleted).map(c => ({
      id: c.id,
      name: c.name || 'Walk-in',
      phone: c.phone || ''
    })),
    orders: (data.orders || []).filter(o => !o._deleted).map(o => ({
      id: o.id,
      invoiceNo: o.invoiceNo,
      customerId: o.customerId,
      total: +o.total || 0,
      paid: +o.paid || 0,
      due: +o.due || 0,
      status: o.status || 'pending',
      createdAt: o.createdAt || '',
      bookingDate: o.bookingDate || '',
      paymentMethod: o.paymentMethod || 'cash',
      cashierUsername: o.cashierUsername || o.createdBy || '',
      cashierName: o.cashierName || '',
      paymentsLog: cleanPayments(o.paymentsLog)
    })),
    expenses: (data.expenses || []).filter(e => !e._deleted).map(e => ({
      id: e.id,
      amount: +e.amount || 0,
      date: e.date || '',
      createdAt: e.createdAt || '',
      category: e.category || e.type || 'Expense',
      type: e.type || '',
      note: e.note || e.description || '',
      description: e.description || ''
    }))
  };
}

function parseFirebaseConfig(text) {
  if (!text) throw new Error('Empty config');
  let s = text.trim();
  s = s.replace(/^(const|let|var)\s+\w+\s*=\s*/, '');
  s = s.replace(/;\s*$/, '');
  s = s.replace(/^export\s+default\s*/, '');
  s = s.trim();
  try { return JSON.parse(s); } catch(e) {}
  try { return (new Function('return (' + s + ')'))(); } catch(e) {
    throw new Error('Could not parse config. Make sure you copied the firebaseConfig block correctly (from { to } including braces).');
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
  _syncStartedAt: 0, _syncRunId: 0,
  _suppressPush: false,
  _initialMergeDone: false,
  _lastAppliedVersion: 0,
  _toastDebounceTimer: null,

  getConfig() {
    const raw = localStorage.getItem(this.CFG_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch(e) { return null; }
  },
  setConfig(cfg) { localStorage.setItem(this.CFG_KEY, JSON.stringify(CLOUD_SYNC_LOCKED ? DEFAULT_FIREBASE_CONFIG : cfg)); },
  getShopId() { return localStorage.getItem(this.SHOP_KEY) || (CLOUD_SYNC_LOCKED ? DEFAULT_SHOP_ID : ''); },
  setShopId(id) { localStorage.setItem(this.SHOP_KEY, CLOUD_SYNC_LOCKED ? DEFAULT_SHOP_ID : id); },
  isEnabled() { return CLOUD_SYNC_LOCKED || localStorage.getItem(this.ENABLED_KEY) === 'true'; },
  setEnabled(v) { localStorage.setItem(this.ENABLED_KEY, (CLOUD_SYNC_LOCKED || v)?'true':'false'); },
  isReady() { return !!(this.getConfig() && this.getShopId()); },

  async loadSDK() {
    if (window.firebase?.firestore) return;
    const scripts = [
      'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
      'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js'
    ];
    for (const src of scripts) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src; s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
      });
    }
  },

  async init() {
    if (this._db) return this._db;
    if (CLOUD_SYNC_LOCKED) applyLockedCloudDefaults();
    const cfg = this.getConfig();
    if (!cfg) throw new Error('Firebase not configured');
    await this.loadSDK();
    if (!firebase.apps.length) this._app = firebase.initializeApp(cfg);
    else this._app = firebase.app();
    this._db = firebase.firestore();
    return this._db;
  },

  isFreshSeedData(data) {
    // A brand-new browser has only seed/default records. In that case remote
    // Firebase data must be treated as the source of truth so customers, users,
    // vendors and purchase orders are restored on first open.
    if (!data) return true;
    const orders = (data.orders || []).filter(x => x && !x._deleted);
    const customers = (data.customers || []).filter(x => x && !x._deleted && x.id !== 'cu1');
    const users = (data.users || []).filter(x => x && !x._deleted);
    const purchaseOrders = (data.purchaseOrders || []).filter(x => x && !x._deleted);
    const vendors = (data.vendors || []).filter(x => x && !x._deleted && x.id !== 'v1');
    return orders.length === 0 && customers.length === 0 && purchaseOrders.length === 0 && vendors.length === 0 && users.length <= 2;
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
        if (rTs > lTs) merged.settings = Object.assign({}, l || {}, r);
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
  async push(options = {}) {
    if (this._suppressPush) return false;
    if (!this.isEnabled() || !this.isReady()) return false;

    // Sometimes a previous network request can hang and leave _syncing=true.
    // Manual push should wait longer, and if the lock is stale, safely reset it.
    const staleAfter = options.staleAfter || 90000;  // 90 sec
    const maxWait = options.maxWait || 180000;      // 3 min for large backup
    if (this._syncing && this._syncStartedAt && Date.now() - this._syncStartedAt > staleAfter) {
      console.warn('[CloudSync] Stale sync lock detected — resetting');
      this._syncing = false;
      this._pendingPush = false;
      this._syncStartedAt = 0;
    }

    // If another sync is already running, don't show a fake success. For manual
    // "Push This Device" we wait until the active sync ends, then run a real push.
    if (this._syncing) {
      this._pendingPush = true;
      if (options.wait) {
        let waited = 0;
        while (this._syncing && waited < maxWait) {
          await cloudSleep(500);
          waited += 500;
          if (this._syncStartedAt && Date.now() - this._syncStartedAt > staleAfter) {
            console.warn('[CloudSync] Active sync became stale while waiting — resetting');
            this._syncing = false;
            this._pendingPush = false;
            this._syncStartedAt = 0;
            break;
          }
        }
        if (this._syncing) {
          throw new Error('Cloud sync is taking too long. Please check internet, refresh once, then try Push again.');
        }
        return this.push({ wait: false, manual: options.manual });
      }
      return false;
    }
    this._syncing = true;
    const runId = ++this._syncRunId;
    this._syncStartedAt = Date.now();
    try {
      const db = await this.init();
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

      // Write compact live dashboard doc for live.html. This makes the public
      // live dashboard load one tiny document instead of the full POS database.
      try {
        const liveData = JSON.stringify(buildLiveDashboardData(data));
        await tablesRef.doc('_liveDashboard').set({
          data: liveData,
          version,
          deviceId: myDeviceId,
          updatedAt: serverTs,
          _format: 'live-dashboard-v1'
        });
      } catch (e) { console.warn('[CloudSync] Live dashboard compact write failed:', e); }

      // Write main meta doc — triggers listen() on other devices
      const mainRef = db.collection('shops').doc(shopId);
      await mainRef.set({
        tables: tableMeta,
        totalSize,
        version,
        deviceId: myDeviceId,
        deviceLabel: getDeviceLabel(),
        updatedBy: username,
        updatedAt: serverTs,
        _format: 'chunked-v1'
      });

      // Verify the meta doc was actually written before reporting success.
      const verifyDoc = await mainRef.get();
      const verify = verifyDoc.exists ? verifyDoc.data() : null;
      if (!verify || verify.version !== version) {
        throw new Error('Cloud push verification failed. Data was not confirmed on Firebase.');
      }

      this._lastAppliedVersion = version;
      try { localStorage.setItem(this.LAST_SYNC_KEY, new Date().toISOString()); } catch(e) {}
      console.log(`[CloudSync] Pushed ${Object.keys(tableMeta).length} tables (${Math.round(totalSize/1024)}KB)`);
      return true;
    } finally {
      if (this._syncRunId === runId) {
        this._syncing = false;
        this._syncStartedAt = 0;
        if (this._pendingPush) {
          this._pendingPush = false;
          if (!options.wait) setTimeout(() => this.push().catch(e => console.warn('Pending push failed:', e)), 200);
        }
      }
    }
  },

  /* ============== PULL & MERGE (CHUNKED) ============== */
  async pullAndMerge() {
    const db = await this.init();
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

    const localIsFresh = this.isFreshSeedData(DB._data);
    const merged = localIsFresh
      ? this.mergeData(remoteData, DB._data)   // remote base for new browser/device
      : this.mergeData(DB._data, remoteData);  // normal non-destructive merge
    DB._data = merged;
    if (typeof DB.repairCounters === 'function') DB.repairCounters();
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

/* ============== AUTO-INIT ============== */
(function cloudAutoInit() {
  applyLockedCloudDefaults();
  if (typeof DB === 'undefined') return;
  setTimeout(async () => {
    if (CLOUD.isEnabled() && CLOUD.isReady()) {
      try {
        await CLOUD.init();
        await CLOUD.pullAndMerge();
        await CLOUD.push();
        await CLOUD.listen();
        CLOUD._initialMergeDone = true;
        console.log('[Mr Laundry] Cloud sync active — chunked storage');
        setTimeout(() => {
          if (typeof toast === 'function') toast('☁️ Cloud Sync active', 'success');
        }, 1500);
      } catch(e) {
        console.warn('Cloud init failed:', e);
        showCloudRecoveryPrompt('Cloud sync failed to start: ' + e.message);
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
  sessionStorage.setItem('mrLaundryCloudPrompted', '1');
  setTimeout(() => {
    openModal('<div style="text-align:center;padding:20px;">' +
      '<div style="font-size:60px;margin-bottom:14px;">☁️</div>' +
      '<h3 style="margin-bottom:10px;">Cloud Sync Needs Attention</h3>' +
      '<p style="color:var(--text-soft);margin-bottom:16px;font-size:14px;">' + escapeHtml(msg) + '</p>' +
      '<p style="font-size:13px;color:var(--text-soft);margin-bottom:16px;">Your data is safe — we just need to re-connect to your cloud database.</p>' +
      '<div style="display:flex;gap:8px;justify-content:center;">' +
      '<button class="btn btn-ghost" onclick="closeModal()">Later</button>' +
      '<button class="btn btn-primary" onclick="closeModal();reconnectCloudSync();">🔄 Re-Enable Sync</button>' +
      '</div></div>');
  }, 2000);
}

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
    if (DB._data.settings) DB._data.settings._settingsUpdatedAt = new Date().toISOString();
    origSave();
    try { localStorage.setItem('mrLaundryLocalVersion', Date.now()); } catch(e) {}
    try { if (typeof Persistent !== 'undefined') Persistent.backupAll(); } catch(e) {}
    if (CLOUD._suppressPush) return;
    if (!CLOUD.isEnabled() || !CLOUD.isReady()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      CLOUD.push().catch(e => console.warn('Push failed:', e));
    }, 300);
  };
})();

// Try to flush recent invoice/payment changes before refresh/close. This is
// especially important when cashier presses Ctrl+Shift+R immediately after
// receiving cash. The local save is already complete; this best-effort push
// reduces the cloud sync window too.
(function flushCloudBeforeUnload(){
  if (typeof window === 'undefined') return;
  const flush = () => {
    try { if (CLOUD.isEnabled() && CLOUD.isReady() && DB?._data) CLOUD.push().catch(()=>{}); } catch(e) {}
  };
  window.addEventListener('beforeunload', flush);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
})();

/* ============== UI ============== */
function openCloudSyncManager() {
  const cfg = CLOUD.getConfig();
  const shopId = CLOUD.getShopId();
  const enabled = CLOUD.isEnabled();
  const lastSync = localStorage.getItem(CLOUD.LAST_SYNC_KEY);
  const deviceId = getDeviceId();
  const deviceLabel = getDeviceLabel();

  openModal(`
    <h3>☁️ Cloud Sync (Multi-Device)</h3>
    <p class="sub">Real-time sync via Firebase. <b>Chunked storage</b> — supports unlimited data size!</p>

    ${!cfg ? `
      <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px;border-radius:8px;margin-bottom:14px;font-size:13px;">
        ⚠️ <b>One-time setup required.</b> You need a free Firebase project (5 minutes).
        <button class="btn btn-primary btn-sm" id="firebaseGuideBtn" style="margin-top:8px;">📖 Show Setup Guide</button>
      </div>
    ` : ''}

    <div class="field">
      <label>Firebase Config JSON</label>
      <textarea id="fbCfg" rows="8" ${CLOUD_SYNC_LOCKED ? 'readonly' : ''} style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-family:monospace;font-size:11px;">${cfg ? escapeHtml(JSON.stringify(cfg, null, 2)) : ''}</textarea>
    </div>

    <div class="form-row">
      <div class="field">
        <label>Shop ID (unique to your business)</label>
        <input id="shopId" value="${escapeHtml(shopId)}" placeholder="mr-laundry-main-branch" ${CLOUD_SYNC_LOCKED ? 'readonly' : ''}/>
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
      ${lastSync ? `🔄 Last sync: ${new Date(lastSync).toLocaleString()}` : '⚠️ Never synced'}
      <br>📱 This device: <b>${escapeHtml(deviceLabel)}</b> <code style="font-size:10px;">${deviceId}</code>
    </div>

    <div style="display:flex;flex-direction:column;gap:8px;">
      ${!enabled ? `
        <button class="btn btn-success btn-block" id="enableBtn">✅ Enable Cloud Sync</button>
      ` : `
        <button class="btn btn-success" id="mergeNowBtn">🔄 Merge Now (Pull + Push)</button>
        <button class="btn btn-primary" id="pushNowBtn">⬆️ Force Push This Device → Cloud</button>
        <button class="btn btn-warning" id="pullNowBtn">⬇️ Force Pull Cloud → This Device (OVERWRITE)</button>
        ${CLOUD_SYNC_LOCKED ? '<div style="padding:10px;background:#d1fae5;border-radius:8px;text-align:center;font-weight:700;color:#065f46;">🔒 Cloud Sync locked ON for this shop</div>' : '<button class="btn btn-danger" id="disableBtn">⏸️ Pause Cloud Sync</button>'}
      `}
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

    $('#enableBtn', m)?.addEventListener('click', async () => {
      const cfgText = $('#fbCfg', m).value.trim();
      const shop = $('#shopId', m).value.trim();
      if (!cfgText || !shop) { log('Fill in both Config JSON and Shop ID','error'); return; }
      try {
        const parsed = parseFirebaseConfig(cfgText);
        if (!parsed.apiKey || !parsed.projectId) throw new Error('Invalid config — missing apiKey or projectId');
        CLOUD.setConfig(parsed);
        CLOUD.setShopId(shop);
        log('Connecting to Firebase...');
        await CLOUD.init();
        log('Pulling + merging existing cloud data...');
        await CLOUD.pullAndMerge();
        CLOUD.setEnabled(true);
        log('Pushing merged data (chunked)...');
        await CLOUD.push();
        await CLOUD.listen();
        log('✅ Connected! Real-time sync active.', 'success');
        if (typeof logAction === 'function') logAction('cloud.enable', shop);
        setTimeout(() => { closeModal(); location.reload(); }, 1500);
      } catch(e) { log('❌ ' + e.message, 'error'); }
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
      log('Pushing to Firebase... please wait (large backup can take 1–3 minutes)');
      try {
        const ok = await CLOUD.push({ wait: true, manual: true });
        const last = localStorage.getItem(CLOUD.LAST_SYNC_KEY);
        if (!ok) { log('⚠️ Push was queued because another sync is running. Try again in a few seconds.', 'error'); return; }
        log('✅ Confirmed pushed to Firebase' + (last ? ' at ' + new Date(last).toLocaleString() : ''), 'success');
        setTimeout(() => { closeModal(); openCloudSyncManager(); }, 900);
      }
      catch(e) { log('❌ Push failed: ' + e.message, 'error'); }
    });

    $('#pullNowBtn', m)?.addEventListener('click', () => {
      confirmDialog('FORCE Pull will OVERWRITE local data with cloud. You probably want "Merge Now" instead. Continue?', async () => {
        try {
          const remote = await CLOUD.pull();
          if (!remote) { log('No data in cloud yet','error'); return; }
          DB._data = remote;
          if (typeof DB.repairCounters === 'function') DB.repairCounters();
          DB.save();
          toast('Pulled from cloud. Reloading...','success');
          setTimeout(() => location.reload(), 1000);
        } catch(e) { log('❌ ' + e.message, 'error'); }
      });
    });

    $('#disableBtn', m)?.addEventListener('click', () => {
      if (CLOUD_SYNC_LOCKED) { toast('Cloud sync is locked ON for this POS','error'); return; }
      CLOUD.setEnabled(false); CLOUD.stop();
      toast('Cloud sync paused','success');
      closeModal(); openCloudSyncManager();
    });
  }});
}

function openFirebaseSetupGuide() {
  openModal(`
    <h3>📖 Firebase Setup Guide (One-Time, ~5 min)</h3>
    <p class="sub">Firebase gives you a free real-time database for syncing across devices.</p>

    <ol style="font-size:13px;line-height:1.8;padding-left:20px;">
      <li>Go to <a href="https://console.firebase.google.com/" target="_blank"><b>console.firebase.google.com</b></a> → sign in with Gmail</li>
      <li>Click <b>"Add project"</b> → name it <b>"Mr Laundry POS"</b> → continue</li>
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
