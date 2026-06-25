/* ============================================================
   Mr Laundry POS — Database (localStorage + IndexedDB backup)
   BUILT-IN QUOTA SAFETY: never throws, never loses data.
   ============================================================ */

const DB_KEY = 'mrLaundryDB';
const SESSION_KEY = 'mrLaundrySession';
const DB_VERSION = 1;

/* ===== IndexedDB helpers (auto-backup, restores if localStorage lost) ===== */
const IDB = {
  _db: null,
  async open() {
    if (this._db) return this._db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('mrLaundryBackup', 1);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      };
      req.onsuccess = () => { this._db = req.result; resolve(this._db); };
      req.onerror = () => reject(req.error);
    });
  },
  async set(key, value) {
    try {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(['kv'], 'readwrite');
        tx.objectStore('kv').put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (_) {}
  },
  async get(key) {
    try {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(['kv'], 'readonly');
        const r = tx.objectStore('kv').get(key);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    } catch (_) { return null; }
  }
};

/* ===== Default rate list (Pakistani laundry standard) ===== */
function defaultRateList() {
  const G = 'cgents', L = 'cladies', O = 'cothers';
  const list = [
    // Gents
    { name: 'Suit 2 Pcs', category: G, price: 800, image: '🤵' },
    { name: 'Suit 3 Pcs', category: G, price: 1000, image: '🤵' },
    { name: 'Coat', category: G, price: 600, image: '🧥' },
    { name: 'Dress Pant', category: G, price: 200, image: '👖' },
    { name: 'Trouser', category: G, price: 200, image: '👖' },
    { name: 'Waist Coat', category: G, price: 300, image: '🦺' },
    { name: 'Shalwar Suit', category: G, price: 250, image: '🥻' },
    { name: 'Kurta', category: G, price: 125, image: '👘' },
    { name: 'Shalwar / Pajama', category: G, price: 125, image: '👖' },
    { name: 'Boski Shalwar Suit', category: G, price: 500, image: '🥻' },
    { name: 'T-Shirt', category: G, price: 150, image: '👕' },
    { name: 'Polo / Collar Shirt', category: G, price: 150, image: '👕' },
    { name: 'Open Shirt', category: G, price: 150, image: '👔' },
    { name: 'Tie', category: G, price: 100, image: '👔' },
    { name: 'Safari Suit', category: G, price: 400, image: '🤵' },
    { name: 'Vest', category: G, price: 60, image: '👕' },
    { name: 'Sherwani', category: G, price: 1000, image: '🤴' },
    { name: 'Shorts', category: G, price: 150, image: '🩳' },
    { name: 'Kids T-Shirt', category: G, price: 120, image: '👕' },
    { name: 'Kids Shorts', category: G, price: 120, image: '🩳' },
    { name: 'Kids Shirt', category: G, price: 120, image: '👔' },
    { name: 'Kids Trouser / Jeans', category: G, price: 120, image: '👖' },
    // Ladies
    { name: 'Shalwar Suit Plain - 3 Pcs', category: L, price: 400, image: '🥻' },
    { name: 'Shalwar Suit Plain - 2 Pcs', category: L, price: 300, image: '🥻' },
    { name: 'Dupatta', category: L, price: 150, image: '🧣' },
    { name: 'Ladies Shirt', category: L, price: 150, image: '👚' },
    { name: 'Ladies Shalwar / Pajama', category: L, price: 150, image: '👖' },
    { name: 'Fancy / Kamdar Shirt', category: L, price: 600, image: '👚' },
    { name: 'Fancy / Kamdar Dupatta', category: L, price: 800, image: '🧣' },
    { name: 'Gharara / Maxi', category: L, price: 1500, image: '👗' },
    { name: 'Saree Plain', category: L, price: 600, image: '🥻' },
    { name: 'Saree Fancy / Kamdar', category: L, price: 800, image: '🥻' },
    { name: 'Burqa / Abaya Plain', category: L, price: 500, image: '🧕' },
    { name: 'Burqa / Abaya Fancy', category: L, price: 700, image: '🧕' },
    { name: 'Frock', category: L, price: 1200, image: '👗' },
    { name: 'Blouse Plain', category: L, price: 500, image: '👚' },
    { name: 'Petty Coat', category: L, price: 150, image: '👗' },
    { name: 'Scarf / Stole', category: L, price: 150, image: '🧣' },
    { name: 'Skirt Suit', category: L, price: 400, image: '👗' },
    { name: 'Bridal Dress - Maxi', category: L, price: 6000, image: '👰' },
    { name: 'Bridal Dress - 3 Pcs Suit', category: L, price: 6000, image: '👰' },
    // Others
    { name: 'Hoodie / Cardigan / Sweater', category: O, price: 600, image: '🧥' },
    { name: 'Heavy Jacket', category: O, price: 800, image: '🧥' },
    { name: 'Jacket Leather', category: O, price: 1000, image: '🧥' },
    { name: 'Over Coat', category: O, price: 1200, image: '🧥' },
    { name: 'Socks', category: O, price: 60, image: '🧦' },
    { name: 'Track Suit', category: O, price: 400, image: '🏃' },
    { name: 'Shawl', category: O, price: 800, image: '🧣' },
    { name: 'Stuffed Toys - Small', category: O, price: 1000, image: '🧸' },
    { name: 'Stuffed Toys - Large', category: O, price: 2500, image: '🧸' },
    { name: 'Shoes', category: O, price: 400, image: '👟' },
    { name: 'School Bag', category: O, price: 400, image: '🎒' },
    { name: 'Carpet (Per Sq.Ft)', category: O, price: 40, image: '🧶' },
    { name: 'Carpet Centerpiece (Per Sq.Ft)', category: O, price: 120, image: '🧶' },
    { name: 'Blanket Single', category: O, price: 1000, image: '🛌' },
    { name: 'Blanket Double', category: O, price: 1400, image: '🛌' },
    { name: 'Quilt Cover / Bed Sheet', category: O, price: 400, image: '🛏️' },
    { name: 'Bedsheet Single', category: O, price: 100, image: '🛏️' },
    { name: 'Bedsheet Double', category: O, price: 180, image: '🛏️' },
    { name: 'Table Cloth Plain', category: O, price: 100, image: '🍽️' },
    { name: 'Table Cloth Fancy', category: O, price: 250, image: '🍽️' },
    { name: 'Bath Towel', category: O, price: 120, image: '🧖' },
    { name: 'Hand Towel / Napkin', category: O, price: 50, image: '🧖' },
    { name: 'Curtain (Per Panel)', category: O, price: 300, image: '🪟' },
    { name: 'Cushion Cover - Plain', category: O, price: 80, image: '🛋️' },
    { name: 'Cushion Cover - Fancy', category: O, price: 120, image: '🛋️' },
    { name: 'Door Mat', category: O, price: 200, image: '🚪' },
    { name: 'Pillow Cover', category: O, price: 120, image: '🛏️' }
  ];
  return list.map((p, idx) => ({
    id: 'p' + (idx + 1),
    ...p,
    active: true
  }));
}

/* ===== Seed data (first-time defaults) ===== */
function seedData() {
  const now = new Date().toISOString();
  return {
    _version: DB_VERSION,
    _counters: { invoice: 1000, loyalty: 1000 },
    users: [
      { id: 'u_admin', name: 'Admin', username: 'admin', password: 'admin123', role: 'admin', createdAt: now },
      { id: 'u_cashier', name: 'Cashier', username: 'cashier', password: 'cashier123', role: 'cashier', createdAt: now }
    ],
    categories: [
      { id: 'cgents', name: 'Gents Wear', icon: '👔' },
      { id: 'cladies', name: 'Ladies Wear', icon: '🥻' },
      { id: 'cothers', name: 'Others', icon: '🧺' }
    ],
    products: defaultRateList(),
    customers: [
      { id: 'cu_walkin', name: 'Walk-in Customer', phone: '', address: '', loyaltyNo: '', loyaltyDiscountPercent: 0, loyaltyActive: false, createdAt: now }
    ],
    orders: [],
    expenses: [],
    auditLog: [],
    settings: {
      shopName: 'Mr Laundry',
      tagline: 'Quality Dry Cleaning Service',
      address: 'Your Shop Address',
      phone: '+92 300 0000000',
      currency: 'Rs.',
      taxPercent: 0,
      logo: '🧺',
      invoiceFooter: 'Thank you for choosing us!',
      defaultDeliveryDays: 2,
      loyaltyPrefix: 'MRL',
      defaultLoyaltyDiscountPercent: 10,
      invoiceTerms: 'Items not collected within 30 days are non-refundable.'
    }
  };
}

/* ===== Database with built-in quota safety ===== */
const DB = {
  _data: null,

  load() {
    let raw = null;
    try { raw = localStorage.getItem(DB_KEY); } catch (_) {}

    if (raw) {
      try {
        this._data = JSON.parse(raw);
      } catch (e) {
        console.warn('[DB] corrupted JSON, reseeding');
        this._data = seedData();
        this._saveSilent();
      }
    } else {
      // localStorage is empty → start fresh with seed
      // (DO NOT auto-restore from IndexedDB — it can have stale data
      //  from previous versions that overrides the seed credentials)
      this._data = seedData();
      this._saveSilent();
      console.log('[DB] localStorage empty — fresh seed loaded (admin/admin123)');
    }

    // Run migrations
    this._migrate();

    // Verify default users exist (safety check)
    if (!this._data.users.find(u => u.username === 'admin')) {
      const seed = seedData();
      this._data.users.push(seed.users[0]); // ensure admin exists
    }
    if (!this._data.users.find(u => u.username === 'cashier')) {
      const seed = seedData();
      this._data.users.push(seed.users[1]);
    }

    return this._data;
  },

  /* Manually restore from IndexedDB backup (version-aware) */
  async restoreFromBackup() {
    try {
      const raw = await IDB.get(DB_KEY);
      if (!raw) return { ok: false, reason: 'No backup found' };
      const wrapper = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (wrapper.version && wrapper.version !== DB_VERSION) {
        return { ok: false, reason: `Backup version ${wrapper.version} ≠ current ${DB_VERSION}` };
      }
      this._data = wrapper.data || wrapper;
      this._migrate();
      this._saveSilent();
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: e.message };
    }
  },

  /* Wipe IndexedDB backup completely */
  async clearBackup() {
    try { await IDB.set(DB_KEY, null); return true; } catch (_) { return false; }
  },

  _migrate() {
    if (!this._data._counters) this._data._counters = { invoice: 1000, loyalty: 1000 };
    if (!Array.isArray(this._data.users) || !this._data.users.length) {
      const seed = seedData();
      this._data.users = seed.users;
    }
    if (!Array.isArray(this._data.categories) || !this._data.categories.length) {
      const seed = seedData();
      this._data.categories = seed.categories;
    }
    if (!Array.isArray(this._data.products) || !this._data.products.length) {
      this._data.products = defaultRateList();
    }
    if (!Array.isArray(this._data.customers) || !this._data.customers.length) {
      this._data.customers = seedData().customers;
    }
    if (!Array.isArray(this._data.orders)) this._data.orders = [];
    if (!Array.isArray(this._data.expenses)) this._data.expenses = [];
    if (!Array.isArray(this._data.auditLog)) this._data.auditLog = [];
    this._data.settings = Object.assign({}, seedData().settings, this._data.settings);
  },

  /* === SAVE with quota safety === */
  save() {
    return this._save(true);
  },

  _save(showFeedback) {
    const json = JSON.stringify(this._data);
    // 1. Try localStorage
    try {
      localStorage.setItem(DB_KEY, json);
      // Fire-and-forget backup to IndexedDB
      IDB.set(DB_KEY, json);
      return { ok: true, where: 'localStorage' };
    } catch (e) {
      const isQuota = e && (
        e.name === 'QuotaExceededError' ||
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        e.code === 22 || e.code === 1014 ||
        /quota/i.test(String(e.message || ''))
      );
      if (!isQuota) {
        console.error('[DB] save failed:', e);
        if (showFeedback) toast('Save failed: ' + e.message, 'error');
        return { ok: false, error: e };
      }

      // 2. Auto-trim to free space (keep last N of each)
      const trimmed = this._autoTrim();
      try {
        localStorage.setItem(DB_KEY, JSON.stringify(this._data));
        IDB.set(DB_KEY, JSON.stringify(this._data));
        if (showFeedback) {
          toast(`⚠️ Storage tight — cleaned ${trimmed} old entries. Backup soon!`, 'warning');
        }
        return { ok: true, where: 'localStorage', trimmed };
      } catch (e2) {
        // 3. Aggressive trim — keep only last 100 orders
        this._aggressiveTrim();
        try {
          localStorage.setItem(DB_KEY, JSON.stringify(this._data));
          IDB.set(DB_KEY, JSON.stringify(this._data));
          if (showFeedback) {
            toast('🚨 Storage was full — kept only last 100 orders. Backup NOW!', 'error');
          }
          return { ok: true, where: 'localStorage-aggressive' };
        } catch (e3) {
          // 4. Save to IndexedDB only
          IDB.set(DB_KEY, JSON.stringify(this._data));
          if (showFeedback) {
            toast('🚨 Storage FULL! Saved to backup only.', 'error');
          }
          return { ok: true, where: 'indexedDB-only' };
        }
      }
    }
  },

  _saveSilent() { return this._save(false); },

  _autoTrim() {
    let n = 0;
    const trim = (arr, keep) => {
      if (Array.isArray(arr) && arr.length > keep) {
        n += arr.length - keep;
        arr.splice(0, arr.length - keep);
      }
    };
    trim(this._data.auditLog, 500);
    trim(this._data.orders, 5000);
    return n;
  },

  _aggressiveTrim() {
    const trim = (arr, keep) => {
      if (Array.isArray(arr) && arr.length > keep) arr.splice(0, arr.length - keep);
    };
    trim(this._data.auditLog, 50);
    trim(this._data.orders, 100);
  },

  /* === CRUD === */
  all(table) { return this._data[table] || []; },
  get(table, id) { return (this._data[table] || []).find(r => r.id === id); },

  insert(table, record) {
    record = record || {};
    record.id = record.id || uid(table[0]);
    record.createdAt = record.createdAt || new Date().toISOString();
    record.updatedAt = new Date().toISOString();
    if (!this._data[table]) this._data[table] = [];
    this._data[table].push(record);
    this._saveSilent();
    this._log('insert', table, record.id);
    return record;
  },

  update(table, id, patch) {
    const arr = this._data[table] || [];
    const i = arr.findIndex(r => r.id === id);
    if (i === -1) return null;
    arr[i] = Object.assign({}, arr[i], patch, { updatedAt: new Date().toISOString() });
    this._saveSilent();
    this._log('update', table, id);
    return arr[i];
  },

  remove(table, id) {
    const arr = this._data[table] || [];
    const i = arr.findIndex(r => r.id === id);
    if (i === -1) return false;
    arr.splice(i, 1);
    this._saveSilent();
    this._log('delete', table, id);
    return true;
  },

  /* === Settings === */
  settings() { return this._data.settings; },
  saveSettings(patch) {
    this._data.settings = Object.assign({}, this._data.settings, patch);
    this._saveSilent();
  },

  /* === Counters === */
  nextInvoiceNumber() {
    this._data._counters.invoice = (this._data._counters.invoice || 1000) + 1;
    this._saveSilent();
    return this._data._counters.invoice;
  },

  nextLoyaltyNumber() {
    this._data._counters.loyalty = (this._data._counters.loyalty || 1000) + 1;
    this._saveSilent();
    const prefix = (this._data.settings.loyaltyPrefix || 'MRL').toUpperCase();
    return `${prefix}-${this._data._counters.loyalty}`;
  },

  /* === Audit log === */
  _log(action, table, id) {
    if (!Array.isArray(this._data.auditLog)) this._data.auditLog = [];
    const u = this.currentUser();
    this._data.auditLog.push({
      id: uid('a'),
      action: `${action}.${table}`,
      targetId: id,
      userId: u?.id,
      username: u?.username,
      timestamp: new Date().toISOString()
    });
    // Don't save here (would cause infinite loop); trim happens in next save
    if (this._data.auditLog.length > 1000) this._data.auditLog.splice(0, this._data.auditLog.length - 1000);
  },

  /* === Auth === */
  login(username, password) {
    const u = this._data.users.find(x => x.username === username && x.password === password);
    if (!u) {
      this._log('login.failed', 'auth', username);
      this._saveSilent();
      return null;
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: u.id, name: u.name, username: u.username, role: u.role }));
    this._log('login', 'auth', u.id);
    this._saveSilent();
    return u;
  },

  logout() {
    this._log('logout', 'auth', this.currentUser()?.id);
    this._saveSilent();
    sessionStorage.removeItem(SESSION_KEY);
  },

  currentUser() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  },

  /* === Backup === */
  exportJSON() { return JSON.stringify(this._data, null, 2); },

  importJSON(json) {
    const parsed = typeof json === 'string' ? JSON.parse(json) : json;
    this._data = parsed;
    return this._save(true);
  },

  reset() {
    this._data = seedData();
    return this._save(true);
  },

  /* === Storage stats === */
  storageStats() {
    try {
      const raw = localStorage.getItem(DB_KEY) || '';
      return {
        usedKB: Math.round(raw.length / 1024),
        usedMB: (raw.length / 1024 / 1024).toFixed(2),
        percentFull: Math.round((raw.length / (5 * 1024 * 1024)) * 100),
        tableCounts: {
          orders: this._data.orders?.length || 0,
          customers: this._data.customers?.length || 0,
          products: this._data.products?.length || 0,
          expenses: this._data.expenses?.length || 0
        }
      };
    } catch (_) { return null; }
  }
};

/* Load immediately */
DB.load();

/* Auto-backup to IndexedDB every 30s */
setInterval(() => {
  try { IDB.set(DB_KEY, JSON.stringify(DB._data)); } catch (_) {}
}, 30000);

/* Backup on page hide */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    try { IDB.set(DB_KEY, JSON.stringify(DB._data)); } catch (_) {}
  }
});
