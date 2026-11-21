/* ============================================================
   Modern Dry Cleaners — Database (localStorage abstraction)
   Swap functions in this file later to use real backend (PHP/MySQL).
   ============================================================ */

const DB_KEY = 'mrLaundryDB';
const SESSION_KEY = 'mrLaundrySession';

/* ============================================================
   BRAND IDENTITY  —  Modern Dry Cleaners
   ============================================================
   The shop's own brand assets ship inside the app, so a fresh
   install is branded with no manual logo upload needed.

   "Locking" rule: the logo is genuinely editable in
   Settings → Shop Information (owner choice), but it falls back
   to the bundled art whenever it is empty or was never changed.
   ============================================================ */
const LEGACY_LOGOS = ['assets/img/logo.jpeg', 'assets/img/logo.png'];
const LEGACY_NAMES = ['Modern Dry Cleaners', 'Mr Laundry'];

const BRAND = (function () {
  const cfg = (typeof CLIENT_CONFIG !== 'undefined') ? CLIENT_CONFIG : {};
  return {
    version:    '2026.11.19-mdc1',
    shopName:   cfg.shopName   || 'Modern Dry Cleaners',
    tagline:    cfg.tagline    || 'Quality Dry Cleaner Service',
    address:    cfg.address    || 'Z-45, Memon Co-operative Housing Society, Karachi',
    phone:      cfg.phone      || '021-34388398',
    whatsapp:   cfg.whatsapp   || '03428096622',
    facebook:   cfg.facebook   || '',
    logoImage:  'assets/img/brand-logo.png',   // bundled Modern Dry Cleaners lockup
    logoSquare: 'assets/img/logo.png',         // square icon (app / PWA)
    timingText: cfg.shopTimingText || '',
    color:      cfg.brandColor       || '#0b3f80',
    accent:     cfg.brandColorAccent || '#0e9ad2'
  };
})();
window.BRAND_INFO = BRAND;

const DB = {
  _data: null,

  load() {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      try { this._data = JSON.parse(raw); }
      catch(e){ this._data = this._seed(); this.save(); }
      // Migration: ensure new top-level tables exist
      const seed = this._seed();
    const now = '2024-01-01T00:00:00.000Z'; // Fixed date so remote data always overwrites local defaults on a fresh device!
      // Ensure default Hanger & Shopper inventory items exist (auto-add if missing)
      const inv = this._data.inventory;
      if (!inv.find(i => i.autoDeduct === 'hanger')) {
        inv.push({ id: 'inv_hanger', name: 'Hangers', unit: 'pcs', stock: 100, minStock: 20, unitCost: 5, autoDeduct: 'hanger', createdAt: '2024-01-01T00:00:00.000Z' });
      }
      if (!inv.find(i => i.autoDeduct === 'shopper')) {
        inv.push({ id: 'inv_shopper', name: 'Shoppers (Plastic Bags)', unit: 'pcs', stock: 100, minStock: 20, unitCost: 3, autoDeduct: 'shopper', createdAt: '2024-01-01T00:00:00.000Z' });
      }
      ['vendors_dummy_skip'].forEach(t => { if (!this._data[t]) this._data[t] = seed[t]; });
      this._data.settings = Object.assign({}, seed.settings, this._data.settings);
      // Smart fill: if payment fields are empty/missing, copy defaults from seed
      ['portalTerms'].forEach(k => {
        if (!this._data.settings[k] || this._data.settings[k] === '') {
          this._data.settings[k] = seed.settings[k];
        }
      });
      this._data._counters = this._data._counters || { loyalty: 1000, invoice: 1000, po: 1000, claim: 1000, voucher: 1000 };
      if (!this._data.branches || !this._data.branches.length) {
        this._data.branches = [{ id: 'main', name: 'Main Branch', address: '', phone: '', color: '#0b3f80', isActive: true, createdAt: '2024-01-01T00:00:00.000Z' }];
      }
      
      
      // Client Migration: align the admin username with client-config
      if (this._data.users) {
        let adminUser = this._data.users.find(u => u.username === 'demo' || u.role === 'admin');
        if (adminUser && typeof CLIENT_CONFIG !== 'undefined') {
          adminUser.username = CLIENT_CONFIG.adminUsername;
          adminUser.name = CLIENT_CONFIG.adminName;
        }
      }

      /* Credential scrub (security):
         older builds stored users[].password in plain text — and mirrored the
         whole DB into IndexedDB every 30 seconds. Move every readable password
         into the hashed vault once, then delete the plaintext everywhere. */
      if (this._data.users) {
        let scrubbed = false;
        this._data.users.forEach(u => {
          if (u && Object.prototype.hasOwnProperty.call(u, 'password')) {
            if (u.password && window.MDC_VAULT && MDC_VAULT.has(u.username) === false) {
              try { MDC_VAULT.set(u.username, u.password); } catch (e) {}
            }
            delete u.password;
            scrubbed = true;
          }
        });
        if (scrubbed) this.save();
      }
      const isLegacyBrand = this._data.settings &&
        (LEGACY_NAMES.includes(this._data.settings.shopName) ||
         this._data.settings.shopName === BRAND.shopName);
      const logoIsBundled = this._data.settings &&
        (!this._data.settings.logoImage || LEGACY_LOGOS.includes(String(this._data.settings.logoImage).trim()));

      // Brand migration: pull the shop identity + bundled brand logo from CLIENT_CONFIG.
      // Runs on every load (idempotent) so an old browser profile converges to
      // the Modern Dry Cleaners brand instead of keeping a stale name/logo.
      if (this._data.settings && isLegacyBrand) {
        this._data.settings.shopName  = BRAND.shopName;
        this._data.settings.tagline   = BRAND.tagline;
        this._data.settings.phone     = BRAND.phone;
        this._data.settings.address   = BRAND.address;
        this._data.settings.facebook  = BRAND.facebook;
        this._data.settings.whatsapp  = BRAND.whatsapp;
      }
      if (this._data.settings && logoIsBundled) {
        this._data.settings.logoImage = BRAND.logoImage;
      }
      if (this._data.settings && BRAND.timingText) {
        this._data.settings.shopTimingText = this._data.settings.shopTimingText || BRAND.timingText;
      }
      // Always refresh the bundled (un-locked) brand assets
      if (this._data.settings) {
        this._data.settings.brandBundleVersion = BRAND.version;
      }

      /* Invoice numbering — start at 001, and keep counting from wherever the
         shop already is. Old builds began at 1001, so an existing profile is
         carried over from its highest invoice instead of jumping backwards. */
      if (this._data.settings && this._data.settings.invoiceNextNumber == null) {
        this._data.settings.invoiceNextNumber = this._highestInvoiceNo() + 1;
        if (this._data.settings.invoicePrefix == null) this._data.settings.invoicePrefix = 'INV-';
        if (this._data.settings.invoicePad == null) this._data.settings.invoicePad = 3;
        this.save();
      }

      if (this._data._counters.po == null) this._data._counters.po = 1000;
      if (this._data._counters.expense == null) this._data._counters.expense = 1000;

      // Expense categories became editable — seed the table for older installs
      if (!Array.isArray(this._data.expenseCategories) || !this._data.expenseCategories.length) {
        this._data.expenseCategories = [
          { id:'rent',        label:'🏠 Rent',                        color:'#ef4444', createdAt:'2024-01-01T00:00:00.000Z' },
          { id:'salary',      label:'👤 Salary / Wages',              color:'#f59e0b', createdAt:'2024-01-01T00:00:00.000Z' },
          { id:'utilities',   label:'💡 Utilities (Bills)',           color:'#3b82f6', createdAt:'2024-01-01T00:00:00.000Z' },
          { id:'supplies',    label:'🧴 Supplies (Detergent, etc.)',  color:'#06b6d4', createdAt:'2024-01-01T00:00:00.000Z' },
          { id:'maintenance', label:'🔧 Maintenance / Repair',        color:'#8b5cf6', createdAt:'2024-01-01T00:00:00.000Z' },
          { id:'transport',   label:'🚚 Transport / Fuel',            color:'#ec4899', createdAt:'2024-01-01T00:00:00.000Z' },
          { id:'marketing',   label:'📢 Marketing / Ads',             color:'#10b981', createdAt:'2024-01-01T00:00:00.000Z' },
          { id:'tax',         label:'🧾 Tax / Govt Fee',              color:'#dc2626', createdAt:'2024-01-01T00:00:00.000Z' },
          { id:'food',        label:'🍵 Food / Tea for Staff',        color:'#eab308', createdAt:'2024-01-01T00:00:00.000Z' },
          { id:'rawmaterial', label:'🧺 Raw Material',                color:'#0ea5e9', createdAt:'2024-01-01T00:00:00.000Z' },
          { id:'other',       label:'📦 Other',                       color:'#6b7280', createdAt:'2024-01-01T00:00:00.000Z' }
        ];
        this.save();
      }

      // Thermal printer defaults — applied once, never overrides a client's own choice.
      // This makes an existing install plug & play with a receipt printer too.
      const st = this._data.settings;
      if (st && !st._thermalDefaults) {
        if (st.invoicePaper == null)    st.invoicePaper = '80';
        if (st.invoiceLogoSize == null) st.invoiceLogoSize = 70;
        if (st.invoiceLogoMono == null) st.invoiceLogoMono = true;
        if (st.invoiceMarginMm == null) st.invoiceMarginMm = 2;
        if (st.invoiceShowLogo == null) st.invoiceShowLogo = true;
        st._thermalDefaults = 1;
        this.save();
      }

      /* Print defaults v2 — "print comes out too big" fix.
         Saves a sane, shop-ready print setup once: 80mm roll, 70% logo width,
         20mm logo height cap, 2mm margin. Everything stays editable in
         Settings → Invoice Customizer. */
      if (st && (+st._printDefaultsVersion || 0) < 2) {
        st.invoicePaper        = st.invoicePaper || '80';
        st.invoiceLogoSize     = 70;                    // 70% of paper width
        st.invoiceLogoMaxMm    = st.invoiceLogoMaxMm || 20;
        st.invoiceLogoThreshold = st.invoiceLogoThreshold || 185;
        if (st.invoiceMarginMm == null) st.invoiceMarginMm = 2;
        if (st.invoiceFontSize == null) st.invoiceFontSize = 13;
        if (st.invoiceWidth == null)    st.invoiceWidth = 360;
        st._printDefaultsVersion = 2;
        this.save();
      }
    } else {
      this._data = this._seed();
      this.save();
    }
    return this._data;
  },

  save() {
    localStorage.setItem(DB_KEY, JSON.stringify(this._data));
  },

  reset() {
    this._data = this._seed();
    this.save();
  },

  _seed() {
    const now = new Date().toISOString();
    return {
      expenseCategories: [
        { id:'rent',        label:'🏠 Rent',                        color:'#ef4444', createdAt:'2024-01-01T00:00:00.000Z' },
        { id:'salary',      label:'👤 Salary / Wages',              color:'#f59e0b', createdAt:'2024-01-01T00:00:00.000Z' },
        { id:'utilities',   label:'💡 Utilities (Bills)',           color:'#3b82f6', createdAt:'2024-01-01T00:00:00.000Z' },
        { id:'supplies',    label:'🧴 Supplies (Detergent, etc.)',  color:'#06b6d4', createdAt:'2024-01-01T00:00:00.000Z' },
        { id:'maintenance', label:'🔧 Maintenance / Repair',        color:'#8b5cf6', createdAt:'2024-01-01T00:00:00.000Z' },
        { id:'transport',   label:'🚚 Transport / Fuel',            color:'#ec4899', createdAt:'2024-01-01T00:00:00.000Z' },
        { id:'marketing',   label:'📢 Marketing / Ads',             color:'#10b981', createdAt:'2024-01-01T00:00:00.000Z' },
        { id:'tax',         label:'🧾 Tax / Govt Fee',              color:'#dc2626', createdAt:'2024-01-01T00:00:00.000Z' },
        { id:'food',        label:'🍵 Food / Tea for Staff',        color:'#eab308', createdAt:'2024-01-01T00:00:00.000Z' },
        { id:'rawmaterial', label:'🧺 Raw Material',                color:'#0ea5e9', createdAt:'2024-01-01T00:00:00.000Z' },
        { id:'other',       label:'📦 Other',                       color:'#6b7280', createdAt:'2024-01-01T00:00:00.000Z' }
      ],
      _counters: { loyalty: 1000, invoice: 1000, po: 1000, claim: 1000, voucher: 1000, expense: 1000 },
      users: [
        // No password field on purpose — credentials live in the hashed vault
        // (assets/js/vault.js). A readable password never enters storage again.
        { id: 'u1', name: typeof CLIENT_CONFIG !== 'undefined' ? CLIENT_CONFIG.adminName : 'Admin', username: typeof CLIENT_CONFIG !== 'undefined' ? CLIENT_CONFIG.adminUsername : 'admin', role: 'admin', createdAt: now },
        { id: 'u2', name: 'AI Bot Cashier', username: 'aibot', role: 'cashier', createdAt: now }
      ],
      categories: [
        { id: 'cgents',  name: 'Gents Wear',  icon: '👔' },
        { id: 'cladies', name: 'Ladies Wear', icon: '🥻' },
        { id: 'cothers', name: 'Others',      icon: '🧺' },
        { id: 'cpress',  name: 'Press / Ironing', icon: '♨️' }
      ],
      products: getMrLaundryRateList(),
      customers: [
        { id: 'cu1', name: 'Walk-in Customer', phone: '', address: '', loyaltyNo: '', loyaltyDiscountPercent: 0, loyaltyActive: false, createdAt: now }
      ],
      orders: [],
      expenses: [],
      ownerDrawings: [],     // Owner's personal withdrawals from shop money
      vendors: [
        { id: 'v1', name: 'Sample Laundry Vendor', contactPerson: '', phone: '', address: '', openingBalance: 0, createdAt: now }
      ],
      branches: [
        { id: 'main', name: 'Main Branch', address: '', phone: '', color: '#0b3f80', isActive: true, createdAt: '2024-01-01T00:00:00.000Z' }
      ],
      purchaseOrders: [],
      inventory: [
        { id: 'inv_hanger',  name: 'Hangers',  unit: 'pcs', stock: 100, minStock: 20, unitCost: 5,  autoDeduct: 'hanger',  createdAt: '2024-01-01T00:00:00.000Z' },
        { id: 'inv_shopper', name: 'Shoppers (Plastic Bags)', unit: 'pcs', stock: 100, minStock: 20, unitCost: 3, autoDeduct: 'shopper', createdAt: '2024-01-01T00:00:00.000Z' }
      ],
      inventoryMovements: [],
      dayClosures: [],
      auditLog: [],
      messages: [],
      paymentProofs: [],
      promoCodes: [],
      reviews: [],
      pushSubs: [],
      claims: [],
      vouchers: [],
      drivers: [],
      pickupRequests: [],
      refundReasons: [],
      autoReplyRules: [
        { id:'ar1', trigger:'order|status|where', reply:'Thank you for contacting us! Please share your invoice number and we will check the status immediately.', active:true },
        { id:'ar2', trigger:'price|rate|cost|kitna', reply:'For pricing, please visit our portal or send us the item name. Standard rates: Shirt Rs.150, Pant Rs.150, Suit Rs.1000.', active:true },
        { id:'ar3', trigger:'closed|hours|timing|open', reply:'We are open Mon-Sat: 9:00 AM - 1:00 PM & 2:00 PM - 8:00 PM (Friday 2:00 PM - 8:00 PM / winter 2:00 PM - 7:30 PM). Sunday Closed. Thank you!', active:true }
      ],
      reportTemplates: [],
      settings: {
        shopName: typeof CLIENT_CONFIG !== 'undefined' ? CLIENT_CONFIG.shopName : 'Modern Dry Cleaners',
        tagline: typeof CLIENT_CONFIG !== 'undefined' ? (CLIENT_CONFIG.tagline || '') : '',
        address: typeof CLIENT_CONFIG !== 'undefined' ? (CLIENT_CONFIG.address || '') : '',
        phone: typeof CLIENT_CONFIG !== 'undefined' ? (CLIENT_CONFIG.phone || '') : '',
        facebook: typeof CLIENT_CONFIG !== 'undefined' ? (CLIENT_CONFIG.facebook || '') : '',
        currency: 'Rs.',
        // === Invoice numbering ===
        invoicePrefix: 'INV-',        // printed before the number → INV-001
        invoicePad: 3,                // digits → 001
        invoiceNextNumber: 1,         // next number that will be issued
        taxPercent: 0,
        logo: '🧺',
        logoImage: BRAND.logoImage,
        invoiceFooter: 'Thank you for choosing Modern Dry Cleaners!',
        baseUrl: '',
        defaultDeliveryDays: 2,
        loyaltyPrefix: 'MRL',
        defaultLoyaltyDiscountPercent: 10,
        autoBackupReminder: true,
        poPrefix: 'PO',
        // ===== INVOICE CUSTOMIZATION =====
        invoiceFontSize: 13,           // base font size in px
        invoiceWidth: 360,             // max width in px (thermal=300, A6=420, A5=560)
        // ===== THERMAL RECEIPT DEFAULTS (plug & play) =====
        invoicePaper: '80',            // '58' = 58mm roll, '80' = 80mm roll
        invoiceLogoSize: 70,           // logo width as % of paper width (70 = tidy header)
        invoiceLogoMono: true,         // 1-bit black & white for thermal heads
        invoiceLogoMaxMm: 20,          // max logo height on paper (mm) — stops huge logos
        invoiceLogoThreshold: 185,     // 1-bit cut-off: higher = bolder / keeps hairlines
        invoiceMarginMm: 2,            // page margin in mm
        _thermalDefaults: 1,           // marks that defaults were applied
        invoiceQtyCircle: true,        // show big quantity circle
        invoiceShowLogo: true,
        invoiceShowAddress: true,
        invoiceShowPhone: true,
        invoiceShowTagline: true,
        invoiceShowCashier: true,
        invoiceShowQR: true,
        invoiceShowDeliveryType: true, // Hanger/Fold
        invoiceShowItemBreakdown: true,
        invoiceShowPaymentMethod: true,
        invoiceShowDiscount: true,
        invoiceShowNotes: true,
        invoiceShowFooter: true,
        invoiceShowEditedBadge: true,
        invoiceTerms: 'Items not collected within 30 days are non-refundable.',
        invoiceShowTerms: false,
        // Office-copy & WhatsApp settings
        printDualCopy: true,           // when true, prints customer + office copy together
        officeCopyWidth: 280,          // small slip for office
        officeCopyFontSize: 11,
        photoRetentionDays: 30,        // auto-cleanup photos older than X days after delivery
        photoAutoCleanup: true,
        // === Portal-specific settings ===
        shopHours: (typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.shopHours)
          ? CLIENT_CONFIG.shopHours
          : 'Mon-Sat: 9:00 AM - 8:00 PM\nSunday: Closed',
        shopTimingText: (typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.shopTimingText) || '',
        // === Pickup & Delivery scheduling ===
        pickupLeadHours: 2,              // slots start at least this many hours from now
        pickupSlotCapacity: 1,           // ONE order per slot (rider can be at one door only)
        pickupSlotMinutes: 120,          // slot length
        pickupDayStart: '10:00',
        pickupDayEnd: '20:00',
        pickupOpenDays: [1, 2, 3, 4, 5, 6],  // Mon–Sat (0 = Sunday)
        pickupFridayBreak: true,         // 1:30–2:00 PM Friday break
        autoWhatsAppCaptain: true,       // message the captain on assignment
        autoWhatsAppCustomer: true,      // confirm to the customer too
        // === Occasion themes (Pakistan gazetted holidays on the login screen) ===
        occasionThemes: true,            // automatic festive login / portal look
        occasionLeadDays: 4,             // start this many days before the occasion
        occasionPortal: true,            // show it on the customer portal too
        occasionLang: 'both',            // 'both' | 'en' | 'ur'
        occasionPlan: [],                // shop's edits (dates / on-off / own events)
        occasionPlanRemoved: [],         // built-in occasions the shop switched off
        // === Pickup & Delivery charges (charged AFTER discount) ===
        deliveryChargeEnabled: true,     // show the field on the booking screen
        deliveryChargeLabel: 'Delivery Charges',
        defaultDeliveryCharge: 0,        // pre-filled amount (0 = blank)
        deliveryChargeMin: 0,            // guard rails on what a cashier can enter
        deliveryChargeMax: 5000,
        deliveryChargeTaxable: false,    // keep tax on items only (default)
        shopLocation: '',
        shopMapUrl: '',
        portalLang: 'en',
        // === Payment settings ===
        bankName: '',
        bankAccountTitle: '',
        bankAccountNumber: '',
        jazzcashName: '',
        jazzcashNumber: '',
        easypaisaName: '',
        easypaisaNumber: '',
        paymentInstructions: 'Please pay to the above account and upload screenshot below. We will verify and mark your invoice as PAID within 30 minutes.',
        // === Loyalty / Referral ===
        referralDiscountPercent: 10,
        // === Claims Policy ===
        claimPolicyPercent: 30,
        claimVoucherFreeCount: 7,
        claimVoucherValidDays: 180,
        claimPrefix: 'CLM',
        voucherPrefix: 'VCH',
        // === Cash close lock ===
        forceCashClose: true,             // require day close before logout
        // === Sound effects ===
        soundEffects: true,
        // === Suspicious alerts ===
        suspiciousAlerts: true,
        largeDiscountThreshold: 500,      // alert if discount > Rs.500
        largeRefundThreshold: 1000,
        // === Auto-reply ===
        autoReplyEnabled: true,
        // === Public reviews ===
        showPublicReviews: true,
        minReviewStars: 4,                // only show reviews with 4+ stars publicly
        claimTerms: 'Claim valid only with original purchase slip. Voucher valid for 7 free wash services within 6 months from issue date. Non-transferable. Cannot be exchanged for cash.',
        portalTerms: '1. Customer is requested to check articles before delivery; complaints will not be entertained afterwards.\n2. Articles not collected within 30 days from delivery date will not be the responsibility of Modern Dry Cleaners.\n3. We are not responsible for shrinkage, color fading, or damage to delicate fabrics (silk, wool, embroidery, beads, sequins, leather).\n4. Buttons, beads, or any decorative items that come off during washing/cleaning are not our responsibility.\n5. In case of any loss or damage caused by us, compensation will be limited to a maximum of 5 times the laundry charge of that article, OR as per our Claim Policy (30% of original purchase price with valid receipt).\n6. Pre-existing stains, tears, color bleeding, or hidden damage are NOT our liability.\n7. We take all reasonable care, but articles are accepted at the owner\'s risk.\n8. Payment must be made at the time of delivery unless agreed otherwise.\n9. Pickup & delivery timing may vary on Sundays, public holidays, and during heavy load.\n10. Cash on Delivery (COD) orders must be paid in full to the rider.\n11. By giving us your articles for service, you agree to these Terms & Conditions.\n12. Management reserves the right to update these terms at any time without prior notice.',
        // === Push notifications ===
        pushVapidPublicKey: '',
        whatsappTemplate: 'Hello {name}, thank you for your order at {shop}!\n\nInvoice: {invoice}\nTotal Pcs: {pcs}\nAmount: {total}\nPaid: {paid}\nDue: {due}\nDelivery: {delivery} ({type})\n\n{footer}'
      }
    };
  },

  all(table)  { return this._data[table] || []; },
  get(table, id) { return (this._data[table] || []).find(r => r.id === id); },
  insert(table, record) {
    record.id = record.id || (table[0] + Date.now().toString(36) + Math.floor(Math.random()*1000));
    record.createdAt = record.createdAt || new Date().toISOString();
    this._data[table].push(record);
    this.save();
    return record;
  },
  update(table, id, patch) {
    const i = this._data[table].findIndex(r => r.id === id);
    if (i === -1) return null;
    this._data[table][i] = { ...this._data[table][i], ...patch };
    this.save();
    return this._data[table][i];
  },
  remove(table, id) {
    const i = this._data[table].findIndex(r => r.id === id);
    if (i === -1) return false;
    this._data[table].splice(i, 1);
    this.save();
    return true;
  },

  nextLoyaltyNumber() {
    if (!this._data._counters) this._data._counters = { loyalty: 1000, invoice: 1000, po: 1000, claim: 1000, voucher: 1000 };
    this._data._counters.loyalty += 1;
    this.save();
    const prefix = (this._data.settings.loyaltyPrefix || 'MRL').toUpperCase();
    return `${prefix}-${this._data._counters.loyalty}`;
  },
  
  /* ---------- INVOICE NUMBERING ----------
     Everything is driven by Settings → Invoice Numbering:
       invoicePrefix      'INV-'  → printed before the number
       invoicePad         3       → 001, 002, 003 …
       invoiceNextNumber  1       → the next number this shop will issue

     The counter only moves when an invoice is actually issued, so previews,
     print tests and "customer only" re-prints never burn a number. If the shop
     ever needs to restart (e.g. sample invoices were entered before hand-over)
     they set the next number back to 1 in Settings → Invoice Numbering. */

  invoicePrefix() {
    const p = (this._data && this._data.settings && this._data.settings.invoicePrefix);
    return (p == null ? 'INV-' : String(p));
  },

  invoicePad() {
    const p = +((this._data && this._data.settings && this._data.settings.invoicePad) || 3);
    return Math.max(1, Math.min(8, p));
  },

  formatInvoiceNo(n) {
    const num = Math.max(0, parseInt(n, 10) || 0);
    return this.invoicePrefix() + String(num).padStart(this.invoicePad(), '0');
  },

  /* Highest numeric invoice already used (or 0 on a fresh install). */
  _highestInvoiceNo() {
    let max = 0;
    (this._data && this._data.orders ? this._data.orders : []).forEach(o => {
      if (o && o.invoiceNo != null) {
        const digits = String(o.invoiceNo).replace(/\D/g, '');
        if (digits && +digits > max) max = +digits;
      }
    });
    return max;
  },

  /* Next number that would be issued — safe to show, nothing is consumed. */
  peekInvoiceNumber() {
    const st = this._data.settings || {};
    let n = +st.invoiceNextNumber;
    if (!isFinite(n) || n < 1) n = this._highestInvoiceNo() + 1;
    return this.formatInvoiceNo(n);
  },

  /* Pretty label for an existing order (handles old numeric-only records). */
  invoiceLabel(o) {
    const raw = (o && o.invoiceNo != null) ? String(o.invoiceNo).trim() : '';
    if (!raw) return '#' + String((o && o.id) || '').slice(-6).toUpperCase();
    if (/[A-Za-z]/.test(raw)) return raw;          // already 'INV-001' / 'MDC/24/07'
    const digits = raw.replace(/\D/g, '');
    return digits ? this.formatInvoiceNo(+digits) : raw;
  },

  /* Counter summary for the Settings screen. */
  invoiceCounterInfo() {
    const st = this._data.settings || {};
    const used = this._highestInvoiceNo();
    return {
      prefix: this.invoicePrefix(),
      pad: this.invoicePad(),
      next: this.peekInvoiceNumber(),
      nextNumber: (+st.invoiceNextNumber > 0) ? +st.invoiceNextNumber : used + 1,
      highest: used,
      issued: (this._data.orders || []).length
    };
  },

  /* Set where numbering continues from. Returns true on success. */
  setInvoiceNextNumber(n) {
    const num = parseInt(n, 10);
    if (!isFinite(num) || num < 1) return false;
    this._data.settings.invoiceNextNumber = num;
    this._data._counters = this._data._counters || {};
    this._data._counters.invoice = num - 1;
    this.save();
    return true;
  },

  /* Deleting the HIGHEST invoice gives its number back, so a test invoice made
     just before hand-over does not silently eat INV-001. Numbers in the middle
     of the run are never recycled (that would create duplicates). */
  reclaimInvoiceNo(invoiceNo) {
    if (invoiceNo == null) return false;
    const digits = parseInt(String(invoiceNo).replace(/\D/g, ''), 10);
    if (!isFinite(digits) || digits < 1) return false;
    const st = this._data.settings;
    if (!st) return false;
    const highest = this._highestInvoiceNo();
    const next = +st.invoiceNextNumber || (highest + 1);
    if (digits === next - 1 && digits > highest) {
      st.invoiceNextNumber = digits;
      if (this._data._counters) this._data._counters.invoice = digits - 1;
      this.save();
      return true;
    }
    return false;
  },

  nextInvoiceNumber() {
    const st = this._data.settings || {};
    if (!this._data._counters) this._data._counters = { loyalty: 1000, invoice: 0, po: 1000, claim: 1000, voucher: 1000 };

    let n = +st.invoiceNextNumber;
    if (!isFinite(n) || n < 1) n = this._highestInvoiceNo() + 1;

    // Never issue a number that is already on a live invoice.
    const taken = new Set();
    (this._data.orders || []).forEach(o => {
      if (o && o.invoiceNo != null) {
        const d = String(o.invoiceNo).replace(/\D/g, '');
        if (d) taken.add(+d);
      }
    });
    while (taken.has(n)) n++;

    st.invoiceNextNumber = n + 1;
    this._data._counters.invoice = n;
    this.save();
    return this.formatInvoiceNo(n);
  },

  nextClaimNumber() {
    if (!this._data._counters) this._data._counters = { loyalty: 1000, invoice: 1000, po: 1000, claim: 1000, voucher: 1000 };
    this._data._counters.claim = (this._data._counters.claim || 1000) + 1;
    this.save();
    const prefix = (this._data.settings.claimPrefix || 'CLM').toUpperCase();
    return `${prefix}-${this._data._counters.claim}`;
  },
  nextVoucherNumber() {
    if (!this._data._counters) this._data._counters = { loyalty: 1000, invoice: 1000, po: 1000, claim: 1000, voucher: 1000 };
    this._data._counters.voucher = (this._data._counters.voucher || 1000) + 1;
    this.save();
    const prefix = (this._data.settings.voucherPrefix || 'VCH').toUpperCase();
    return `${prefix}-${this._data._counters.voucher}`;
  },
  nextPONumber() {
    if (!this._data._counters) this._data._counters = { loyalty: 1000, invoice: 1000, po: 1000, claim: 1000, voucher: 1000 };
    this._data._counters.po = (this._data._counters.po || 1000) + 1;
    this.save();
    const prefix = (this._data.settings.poPrefix || 'PO').toUpperCase();
    return `${prefix}-${this._data._counters.po}`;
  },

  /* Keep the shop identity on-brand and non-empty.
     The logo is bundled with the app (locked brand asset) — if the owner
     removes it, the clean Modern Dry Cleaners artwork comes back instead of
     leaving invoices / boot screen / portal with a blank mark. */
  _enforceBrand(st) {
    if (!st) return st;
    if (!st.shopName || LEGACY_NAMES.includes(st.shopName)) st.shopName = BRAND.shopName;
    if (!st.tagline) st.tagline = BRAND.tagline;
    if (!st.address) st.address = BRAND.address;
    if (!st.phone)   st.phone   = BRAND.phone;
    if (!st.whatsapp) st.whatsapp = BRAND.whatsapp;
    if (!st.logoImage || LEGACY_LOGOS.includes(String(st.logoImage).trim())) {
      st.logoImage = BRAND.logoImage;
    }
    if (!st.invoiceFooter || /Laundry POS/i.test(st.invoiceFooter)) {
      st.invoiceFooter = 'Thank you for choosing ' + BRAND.shopName + '!';
    }
    return st;
  },

  settings() { return this._data.settings; },

  /* ============================================================
     PICKUP & DELIVERY CHARGES  (added AFTER discount, never inside it)
     ------------------------------------------------------------
     Order money model:
        subtotal  = items
        discount  = manual + loyalty      (discount % applies to items only)
        tax       = on (subtotal - discount)
        deliveryCharge  ← pickup/delivery charges, added after everything
        total     = (subtotal - discount) + tax + deliveryCharge
     ============================================================ */
  orderCharges(o) {
    const charge = Math.max(0, Math.round(+(o && (o.deliveryCharge != null ? o.deliveryCharge : o.deliveryFee)) || 0));
    const sub = +(o && o.subtotal) || 0;
    const disc = +(o && o.discount) || 0;
    const tax = +(o && o.tax) || 0;
    let total = +(o && o.total);
    /* legacy rows saved before charges existed: derive the same way */
    if (!isFinite(total)) total = sub - disc + tax;
    return { charge, total, gross: sub - disc + tax };
  },

  /* Total of a freshly-calculated cart (shared by POS cart + booking form). */
  totalWithCharges(t) {
    const charge = Math.max(0, Math.round(+(t && t.deliveryCharge) || 0));
    return Math.max(0, (+(t && t.total) || 0) + charge);
  },

  /* Default pickup & delivery charge (Settings → Delivery). 0 = counter pick. */
  defaultDeliveryCharge(kind) {
    const s = this._data.settings || {};
    if (kind === 'delivery' && s.defaultDeliveryCharge != null) return +s.defaultDeliveryCharge || 0;
    if (kind === 'pickup' && s.defaultPickupCharge != null) return +s.defaultPickupCharge || 0;
    return 0;
  },

  /* Human label used on slips: "Pickup & Delivery" or the custom name. */
  /* ---------- Order status mastery (levels) ----------
     Work flow: pending → washing → ironing(Press) → ready → delivered.
     Level = kitna kaam ho chuka hai (1..4). Isi se "washing list" jaise
     filters decide hote hain, is liye naya status (Press) add karna safe hai. */
  ORDER_STATUS_LEVEL: { pending: 1, washing: 2, ironing: 3, ready: 4, delivered: 5, cancelled: 0 },

  statusLevel(status) {
    const lv = DB.ORDER_STATUS_LEVEL[status];
    return lv == null ? 1 : lv;
  },

  /* Kya order abhi bhi washing/ironing line mein hai? (kaam baqi) */
  isInWork(status) {
    return ['pending', 'washing', 'ironing'].includes(status);
  },

  /* Press ki line — sirf "mojooda status" ke barabar (ready ke baad Press nahi) */
  isAtPress(status) {
    return status === 'ironing';
  },

  deliveryChargeLabel() {
    const s = this._data.settings || {};
    return (s.deliveryChargeLabel || 'Delivery Charges').trim();
  },
  saveSettings(patch) { 
    patch._settingsUpdatedAt = new Date().toISOString();
    this._data.settings = { ...this._data.settings, ...patch }; 
    this._data.settings = this._enforceBrand(this._data.settings);
    this.save(); 
    // Brand logo / paper settings changed → rebuild the thermal print logo
    if (window.THERMAL && ('logoImage' in patch || 'invoicePaper' in patch ||
        'invoiceLogoSize' in patch || 'invoiceLogoMono' in patch ||
        'invoiceLogoMaxMm' in patch || 'invoiceLogoThreshold' in patch)) {
      try {
        THERMAL.clearCache();
        THERMAL.prime();                 // rebuild the 1-bit bitmap immediately
        window._thermalLogoReady = true; // ready flag for the print path
      } catch (e) {}
    }
  },

  /* Resolve a user record by username (used by the vault + recovery). */
  userByUsername(username) {
    const un = String(username || '').trim().toLowerCase();
    return (this._data.users || []).find(x => String(x.username || '').toLowerCase() === un) || null;
  },

  /* Async login — the password is verified against the hashed vault,
     never compared with a stored plaintext value. */
  login(username, password) {
    const un = String(username || '').trim().toLowerCase();
    const u = this.userByUsername(un);
    if (!u) return Promise.resolve(null);

    const vault = window.MDC_VAULT;
    const check = vault
      ? vault.verify(un, password)
      : Promise.resolve({ ok: false });   // no vault → no login (fail closed)

    return check.then(res => {
      if (!res || !res.ok) return this._loginFailed(username);
      return this._loginOk(u, res.legacy);
    });
  },

  _loginOk(u, wasLegacy) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: u.id, name: u.name, username: u.username, role: u.role }));
    if (wasLegacy && window.MDC_VAULT) MDC_VAULT.retireSeed();
    try {
      this._data.auditLog = this._data.auditLog || [];
      this._data.auditLog.push({
        id: 'a'+Date.now().toString(36),
        action: 'login',
        details: '',
        userId: u.id, username: u.username, userName: u.name, role: u.role,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });
      this.save();
    } catch(e){}
    return u;
  },

  _loginFailed(username) {
      // Log failed attempt
      try {
        this._data.auditLog = this._data.auditLog || [];
        this._data.auditLog.push({
          id: 'a'+Date.now().toString(36),
          action: 'login.failed',
          details: 'Username: '+username,
          username, userName: username, role: 'unknown',
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString()
        });
        this.save();
      } catch(e){}
      return null;
    },

  logout() {
    const u = this.currentUser();
    if (u) {
      try {
        this._data.auditLog = this._data.auditLog || [];
        this._data.auditLog.push({
          id: 'a'+Date.now().toString(36),
          action: 'logout',
          details: '',
          userId: u.id, username: u.username, userName: u.name, role: u.role,
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString()
        });
        this.save();
      } catch(e){}
    }
    sessionStorage.removeItem(SESSION_KEY);
  },
  currentUser() {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch(e){ return null; }
  },

  exportJSON() { return JSON.stringify(this._data, null, 2); },
  importJSON(json) {
    const parsed = typeof json === 'string' ? JSON.parse(json) : json;
    this._data = parsed; this.save();
  }
};

/* ============================================================
   MR LAUNDRY OFFICIAL RATE LIST
   Update prices here, then click "Import/Reset Price List" in admin Products page.
   ============================================================ */
function getMrLaundryRateList() {
  const G = 'cgents', L = 'cladies', O = 'cothers', P = 'cpress';
  const list = [
    // ===== GENTS WEAR =====
    { name: 'Suit 2 Pcs',            category: G, price: 800,  image: '🤵' },
    { name: 'Suit 3 Pcs',            category: G, price: 1000, image: '🤵' },
    { name: 'Coat',                  category: G, price: 600,  image: '🧥' },
    { name: 'Dress Pant',            category: G, price: 200,  image: '👖' },
    { name: 'Trouser',               category: G, price: 200,  image: '👖' },
    { name: 'Waist Coat',            category: G, price: 300,  image: '🦺' },
    { name: 'Shalwar Suit',          category: G, price: 250,  image: '🥻' },
    { name: 'Kurta',                 category: G, price: 125,  image: '👘' },
    { name: 'Shalwar / Pajama',      category: G, price: 125,  image: '👖' },
    { name: 'Boski Shalwar Suit',    category: G, price: 500,  image: '🥻' },
    { name: 'T-Shirt',               category: G, price: 150,  image: '👕' },
    { name: 'Polo / Collar Shirt',   category: G, price: 150,  image: '👕' },
    { name: 'Open Shirt',            category: G, price: 150,  image: '👔' },
    { name: 'Tie',                   category: G, price: 100,  image: '👔' },
    { name: 'Safari Suit',           category: G, price: 400,  image: '🤵' },
    { name: 'Vest',                  category: G, price: 60,   image: '👕' },
    { name: 'Under Wear',            category: G, price: 60,   image: '🩲' },
    { name: 'Sherwani',              category: G, price: 1000, image: '🤴' },
    { name: 'Kurta Saya / Lab Coat', category: G, price: 200,  image: '🥼' },
    { name: 'Kandurah',              category: G, price: 200,  image: '👘' },
    { name: 'Shorts',                category: G, price: 150,  image: '🩳' },
    { name: 'Kids T-Shirt',          category: G, price: 120,  image: '👕' },
    { name: 'Kids Shorts',           category: G, price: 120,  image: '🩳' },
    { name: 'Kids Shirt',            category: G, price: 120,  image: '👔' },
    { name: 'Kids Trouser / Jeans',  category: G, price: 120,  image: '👖' },

    // ===== LADIES WEAR =====
    { name: 'Shalwar Suit Plain - 3 Pcs', category: L, price: 400, image: '🥻' },
    { name: 'Shalwar Suit Plain - 2 Pcs', category: L, price: 300, image: '🥻' },
    { name: 'Dupatta',                    category: L, price: 150, image: '🧣' },
    { name: 'Ladies Shirt',               category: L, price: 150, image: '👚' },
    { name: 'Ladies Shalwar / Pajama',    category: L, price: 150, image: '👖' },
    { name: 'Fancy / Kamdar Shirt',       category: L, price: 600, image: '👚' },
    { name: 'Fancy / Kamdar Dupatta',     category: L, price: 800, image: '🧣' },
    { name: 'Gharara / Maxi',             category: L, price: 1500, image: '👗' },
    { name: 'Saree Plain',                category: L, price: 600,  image: '🥻' },
    { name: 'Saree Fancy / Kamdar',       category: L, price: 800,  image: '🥻' },
    { name: 'Burqa / Abaya Plain',        category: L, price: 500,  image: '🧕' },
    { name: 'Burqa / Abaya Fancy / Kamdar', category: L, price: 700, image: '🧕' },
    { name: 'Frock',                      category: L, price: 1200, image: '👗' },
    { name: 'Blouse Plain',               category: L, price: 500,  image: '👚' },
    { name: 'Petty Coat',                 category: L, price: 150,  image: '👗' },
    { name: 'Scarf / Stole',              category: L, price: 150,  image: '🧣' },
    { name: 'Skirt Suit',                 category: L, price: 400,  image: '👗' },
    { name: 'Short Coat',                 category: L, price: 400,  image: '🧥' },
    { name: 'Bridal Dress - Maxi',        category: L, price: 6000, image: '👰' },
    { name: 'Bridal Dress - 3 Pcs Suit',  category: L, price: 6000, image: '👰' },
    { name: 'Ladies Undergarments (BRA)', category: L, price: 80,   image: '🩲' },

    // ===== OTHERS =====
    { name: 'Hoodie / Cardigan / Sweater', category: O, price: 600,  image: '🧥' },
    { name: 'Heavy Jacket',               category: O, price: 800,  image: '🧥' },
    { name: 'Jacket Leather',             category: O, price: 1000, image: '🧥' },
    { name: 'Over Coat',                  category: O, price: 1200, image: '🧥' },
    { name: 'Socks',                      category: O, price: 60,   image: '🧦' },
    { name: 'Track Suit',                 category: O, price: 400,  image: '🏃' },
    { name: 'Shawl',                      category: O, price: 800,  image: '🧣' },
    { name: 'Ajrak',                      category: O, price: 300,  image: '🧣' },
    { name: 'Apron',                      category: O, price: 100,  image: '🥼' },
    { name: 'Stuffed Toys - Small',       category: O, price: 1000, image: '🧸' },
    { name: 'Stuffed Toys - Large',       category: O, price: 2500, image: '🧸' },
    { name: 'Shoes',                      category: O, price: 400,  image: '👟' },
    { name: 'School Bag',                 category: O, price: 400,  image: '🎒' },
    { name: 'Carpet Woolen / Synthetic (Per Sq.Ft)',       category: O, price: 40,  image: '🧶' },
    { name: 'Carpet Centerpiece / Hand Knotted (Per Sq.Ft)', category: O, price: 120, image: '🧶' },
    { name: 'Vertical Blinds',            category: O, price: 1000, image: '🪟' },
    { name: 'Blanket Single',             category: O, price: 1000, image: '🛌' },
    { name: 'Blanket Double',             category: O, price: 1400, image: '🛌' },
    { name: 'Quilt / Comforter',          category: O, price: 0,    image: '🛌' },
    { name: 'Quilt Cover / Bed Sheet',    category: O, price: 400,  image: '🛏️' },
    { name: 'Bedsheet Single',            category: O, price: 100,  image: '🛏️' },
    { name: 'Bedsheet Double',            category: O, price: 180,  image: '🛏️' },
    { name: 'Table Cloth Plain',          category: O, price: 100,  image: '🍽️' },
    { name: 'Table Cloth Fancy',          category: O, price: 250,  image: '🍽️' },
    { name: 'Bath Gown / Bath Robe',      category: O, price: 250,  image: '🛁' },
    { name: 'Bath Towel',                 category: O, price: 120,  image: '🧖' },
    { name: 'Hand Towel / Napkin',        category: O, price: 50,   image: '🧖' },
    { name: 'Curtain (Per Panel)',        category: O, price: 300,  image: '🪟' },
    { name: 'Palmets (Per Running Ft)',   category: O, price: 150,  image: '🪟' },
    { name: 'Cushion Cover - Plain',      category: O, price: 80,   image: '🛋️' },
    { name: 'Cushion Cover - Fancy',      category: O, price: 120,  image: '🛋️' },
    { name: 'Door Mat',                   category: O, price: 200,  image: '🚪' },
    { name: 'Ja Namaz',                   category: O, price: 0,    image: '🕌' },
    { name: 'Daree Small',                category: O, price: 600,  image: '🧶' },
    { name: 'Daree Large',                category: O, price: 800,  image: '🧶' },
    { name: 'Sweater Full Sleeve',        category: O, price: 300,  image: '🧶' },
    { name: 'Sleeveless Sweater',         category: O, price: 200,  image: '🧶' },
    { name: 'Membership Card',            category: O, price: 1000, image: '💳' },
    { name: 'Pillow Cover',               category: O, price: 120,  image: '🛏️' },
    { name: 'Rafooh',                     category: O, price: 0,    image: '🧵' },
    { name: 'Sofa',                       category: O, price: 0,    image: '🛋️' },

    // ===== PRESS / IRONING ONLY (rates can be set later) =====
    { name: 'Suit 2 Pcs (Press)',           category: P, price: 0, image: '🤵' },
    { name: 'Suit 3 Pcs (Press)',           category: P, price: 0, image: '🤵' },
    { name: 'Coat (Press)',                 category: P, price: 0, image: '🧥' },
    { name: 'Dress Pant (Press)',           category: P, price: 0, image: '👖' },
    { name: 'Trouser (Press)',              category: P, price: 0, image: '👖' },
    { name: 'Waist Coat (Press)',           category: P, price: 0, image: '🦺' },
    { name: 'Shalwar Suit (Press)',         category: P, price: 0, image: '🥻' },
    { name: 'Kurta (Press)',                category: P, price: 0, image: '👘' },
    { name: 'Shalwar / Pajama (Press)',     category: P, price: 0, image: '👖' },
    { name: 'Boski Shalwar Suit (Press)',   category: P, price: 0, image: '🥻' },
    { name: 'T-Shirt (Press)',              category: P, price: 0, image: '👕' },
    { name: 'Polo / Collar Shirt (Press)',  category: P, price: 0, image: '👕' },
    { name: 'Open Shirt (Press)',           category: P, price: 0, image: '👔' },
    { name: 'Tie (Press)',                  category: P, price: 0, image: '👔' },
    { name: 'Safari Suit (Press)',          category: P, price: 0, image: '🤵' },
    { name: 'Sherwani (Press)',             category: P, price: 0, image: '🤴' },
    { name: 'Kurta Saya / Lab Coat (Press)',category: P, price: 0, image: '🥼' },
    { name: 'Kandurah (Press)',             category: P, price: 0, image: '👘' },
    { name: 'Vest (Press)',                 category: P, price: 0, image: '👕' },
    { name: 'Scarf / Stole (Press)',        category: P, price: 0, image: '🧣' },
    { name: 'Skirt Suit (Press)',           category: P, price: 0, image: '👗' },
    { name: 'Ladies Short Coat (Press)',    category: P, price: 0, image: '🧥' },
    { name: 'Bridal Dress - Maxi (Press)',  category: P, price: 0, image: '👰' },
    { name: 'Bridal Dress - 3 Pcs Suit (Press)', category: P, price: 0, image: '👰' },
    { name: 'Ladies Shalwar Suit Plain - 3 Pcs (Press)', category: P, price: 0, image: '🥻' },
    { name: 'Ladies Shalwar Suit Plain - 2 Pcs (Press)', category: P, price: 0, image: '🥻' },
    { name: 'Ladies Dupatta (Press)',       category: P, price: 0, image: '🧣' },
    { name: 'Ladies Shirt (Press)',         category: P, price: 0, image: '👚' },
    { name: 'Ladies Shalwar / Pajama (Press)', category: P, price: 0, image: '👖' },
    { name: 'Ladies Fancy / Kamdar Shirt (Press)', category: P, price: 0, image: '👚' },
    { name: 'Ladies Fancy / Kamdar Dupatta (Press)', category: P, price: 0, image: '🧣' },
    { name: 'Ladies Gharara / Maxi (Press)',category: P, price: 0, image: '👗' },
    { name: 'Ladies Saree Plain (Press)',   category: P, price: 0, image: '🥻' },
    { name: 'Ladies Saree Fancy / Kamdar (Press)', category: P, price: 0, image: '🥻' },
    { name: 'Burqa / Abaya Plain (Press)',  category: P, price: 0, image: '🧕' },
    { name: 'Burqa / Abaya Fancy / Kamdar (Press)', category: P, price: 0, image: '🧕' },
    { name: 'Frock (Press)',                category: P, price: 0, image: '👗' },
    { name: 'Blouse Plain (Press)',         category: P, price: 0, image: '👚' }
  ];
  return list.map((p, idx) => ({
    id: 'p' + (idx + 1),
    ...p,
    active: true
  }));
}
DB.load();

/* === Auto-cleanup photos from delivered orders older than X days === */
function cleanupOldPhotos(force) {
  const s = DB.settings();
  if (!force && s.photoAutoCleanup === false) return { removed: 0, freed: 0 };
  const retentionDays = +s.photoRetentionDays || 30;
  const cutoff = new Date(Date.now() - retentionDays * 86400000);
  let removed = 0, freed = 0;
  DB.all('orders').forEach(o => {
    if (o.status !== 'delivered') return;
    if (!o.photos || !o.photos.length) return;
    const d = new Date(o.createdAt);
    if (d < cutoff) {
      freed += (o.photos || []).reduce((s,p) => s + (p.size||0), 0);
      removed += o.photos.length;
      DB.update('orders', o.id, { photos: [], photoCleanupAt: new Date().toISOString() });
    }
  });
  return { removed, freed };
}

/* Run auto-cleanup once per day */
(function autoCleanupCheck() {
  const lastRun = localStorage.getItem('mrLaundryLastPhotoCleanup');
  if (lastRun && Date.now() - new Date(lastRun).getTime() < 24*60*60*1000) return;
  const result = cleanupOldPhotos(false);
  if (result.removed > 0) console.log(`[Modern Dry Cleaners] Auto-cleanup: removed ${result.removed} old photos (${Math.round(result.freed/1024)} KB freed)`);
  localStorage.setItem('mrLaundryLastPhotoCleanup', new Date().toISOString());
})();

function brandLogoHTML(size = 40, rounded = true) {
  const s = DB.settings();
  const radius = Math.max(10, Math.round(size * 0.2));
  if (s.logoImage) {
    return `<img class="logo" src="${s.logoImage}" alt="logo" style="width:${size}px;height:${size}px;object-fit:contain;${rounded?'border-radius:'+radius+'px;':''}background:#000;padding:${Math.round(size*0.07)}px;box-shadow:0 8px 22px rgba(0,0,0,0.18);" onerror="this.outerHTML='<div class=\\'logo\\' style=\\'width:${size}px;height:${size}px;border-radius:${radius}px;background:linear-gradient(135deg,#0b3f80,#0e9ad2);display:flex;align-items:center;justify-content:center;color:#fff;font-size:${Math.round(size*0.55)}px;\\'>${s.logo||'🧺'}</div>'"/>`;
  }
  return `<div class="logo" style="width:${size}px;height:${size}px;border-radius:${radius}px;background:linear-gradient(135deg,#0b3f80,#0e9ad2);display:flex;align-items:center;justify-content:center;color:#fff;font-size:${Math.round(size*0.55)}px;box-shadow:0 8px 22px rgba(79,124,255,0.35);">${s.logo||'🧺'}</div>`;
}
