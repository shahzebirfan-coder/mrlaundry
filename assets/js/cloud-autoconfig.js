/* ============================================================
   CLOUD AUTO-CONFIG — Pre-configured Mr Laundry build
   ============================================================
   The owner should NEVER have to paste Firebase settings by hand.
   This file bakes the project's firebaseConfig + Shop ID INTO the
   build. On every page load it applies them to localStorage; the
   POS then auto-connects (pull → push → real-time listen) with
   zero manual steps.

   ┌─ IMPORTANT ───────────────────────────────────────────────┐
   │ The three PASTE_* values are placeholders.                │
   │ Paste the real firebaseConfig (Firebase Console →         │
   │ ⚙️ Project Settings → General → Your apps → SDK setup)    │
   │ over this object — then delete the PASTE_ prefixes.       │
   │ Until then, auto-config stays OFF and the app runs        │
   │ safely offline/demo (no broken sync errors).              │
   └───────────────────────────────────────────────────────────┘

   Firebase docs: the web apiKey is NOT a secret — it identifies
   the project; access is controlled by Firestore security rules
   (see firestore.rules — shops/** subtree only).
   ============================================================ */

var MRL_BAKED_CFG = {
  apiKey:            "AIzaSyAVzTIAWpivvFRs3G5MkvOVqFM2bMmw8U",
  authDomain:        "mrlaundrynew.firebaseapp.com",
  projectId:         "mrlaundrynew",
  storageBucket:     "mrlaundrynew.firebasestorage.app",
  messagingSenderId: "327047596509",
  appId:             "1:327047596509:web:5fbec92f2cf17ffdc04e34",
  databaseURL:       "https://mrlaundrynew-default-rtdb.firebaseio.com",
  measurementId:     "G-ZD65PD4V7Y"
};

var MRL_BAKED_SHOP_ID = "mrlaundry-khi-2026";

function mrlCfgIsReal(cfg) {
  if (!cfg) return false;
  var bad = function (v) { return !v || String(v).indexOf('PASTE_') === 0; };
  return !bad(cfg.apiKey) && !bad(cfg.appId) && !bad(cfg.messagingSenderId) && !!cfg.projectId;
}

(function applyBakedConfig() {
  try {
    if (!mrlCfgIsReal(MRL_BAKED_CFG)) {
      console.log('[CloudAutoConfig] No baked Firebase config yet — sync stays off. (Safe default)');
      return;
    }
    // Deterministic: this demo build always targets the baked project + shop,
    // so every device converges to the same database automatically.
    localStorage.setItem('mrLaundryFirebaseCfg', JSON.stringify(MRL_BAKED_CFG));
    localStorage.setItem('mrLaundryShopId', MRL_BAKED_SHOP_ID);
    localStorage.setItem('mrLaundryCloudEnabled', 'true');
    console.log('[CloudAutoConfig] Firebase config applied (project: mrlaundrynew, shop: mrlaundry-khi-2026)');
  } catch (e) {
    console.warn('[CloudAutoConfig] Could not apply config:', e);
  }
})();
