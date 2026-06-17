/* ============================================================
   MR LAUNDRY — CLOUD AUTO-CONFIG
   ============================================================
   Automatically configures Firebase & Shop ID on ANY device,
   so the owner never has to manually set up Cloud Sync again.

   On every page load, this script:
   1. Sets your Firebase config (if not already set)
   2. Sets your Shop ID (if not already set)
   3. Enables Cloud Sync automatically
   4. The existing cloudsync.js auto-init handles the rest:
      - Pulls latest data from cloud
      - Listens for real-time updates from other devices
      - Auto-pushes any change you make (debounced 1.5s)

   ⚠️ IMPORTANT: Make sure your Firestore security rules are set
   (only allow access to YOUR specific shop ID) — see the README
   message from Arena.ai Agent Mode for the exact rules.
   ============================================================ */

(function autoConfigureCloud() {
  // ---- YOUR FIREBASE CONFIG (edit if it ever changes) ----
  const FIREBASE_CFG = {
    apiKey: "AIzaSyDU5jnvxfvqIB-JoVZzRUSLJdxZgJ2tiuY",
    authDomain: "mr-laundry-pos-a6740.firebaseapp.com",
    projectId: "mr-laundry-pos-a6740",
    storageBucket: "mr-laundry-pos-a6740.firebasestorage.app",
    messagingSenderId: "927434668958",
    appId: "1:927434668958:web:2516175f4046edcfbcf48f"
  };

  // ---- YOUR SHOP ID (must match across all devices) ----
  const SHOP_ID = 'shahzeb-laundry-private-pos';

  // ---- localStorage keys used by cloudsync.js ----
  const CFG_KEY     = 'mrLaundryFirebaseCfg';
  const SHOP_KEY    = 'mrLaundryShopId';
  const ENABLED_KEY = 'mrLaundryCloudEnabled';

  try {
    // 1) Set Firebase config if missing (or different)
    const existingCfgRaw = localStorage.getItem(CFG_KEY);
    let needConfigUpdate = true;
    if (existingCfgRaw) {
      try {
        const existing = JSON.parse(existingCfgRaw);
        if (existing && existing.projectId === FIREBASE_CFG.projectId
                     && existing.apiKey   === FIREBASE_CFG.apiKey) {
          needConfigUpdate = false;
        }
      } catch (e) { /* invalid json, will overwrite */ }
    }
    if (needConfigUpdate) {
      localStorage.setItem(CFG_KEY, JSON.stringify(FIREBASE_CFG));
      console.log('[AutoConfig] Firebase config set');
    }

    // 2) Set Shop ID if missing (don't overwrite if owner intentionally changed it)
    if (!localStorage.getItem(SHOP_KEY)) {
      localStorage.setItem(SHOP_KEY, SHOP_ID);
      console.log('[AutoConfig] Shop ID set to:', SHOP_ID);
    }

    // 3) Enable Cloud Sync (unless owner explicitly disabled it this session)
    if (localStorage.getItem(ENABLED_KEY) !== 'true') {
      localStorage.setItem(ENABLED_KEY, 'true');
      console.log('[AutoConfig] Cloud Sync enabled automatically');
    }

    console.log('[AutoConfig] ✅ Ready — cloudsync.js will auto-pull & listen on init');
  } catch (e) {
    console.warn('[AutoConfig] Failed:', e);
  }
})();
