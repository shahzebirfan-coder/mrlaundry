/* ============================================================
   FIREBASE DEFAULTS — Cloud Sync (Multi-Device pre-configured)

   Ye project maalik ka apna Firebase project hai. Is file mein
   sirf PUBLIC config hai (apiKey public hota hai — Firebase isi
   liye "web apiKey" kehta hai). Asal hifazat Firestore RULES se
   hoti hai, is liye rules strong rakhna zaroori hai.

   File khaali kar dein ya FIREBASE_DEFAULT_CFG = null kar dein
   to Cloud Sync dobara "manual setup" mode mein chala jayega
   (Settings → Cloud Sync → paste config).
   ============================================================ */

const FIREBASE_DEFAULT_CFG = {
  apiKey:            "AIzaSyDENRfrIpq0cEQJokXQcRFTNv7ldcVxLiw",
  authDomain:        "maundrylaundrypos.firebaseapp.com",
  projectId:         "maundrylaundrypos",
  storageBucket:     "maundrylaundrypos.firebasestorage.app",
  messagingSenderId: "194444859124",
  appId:             "1:194444859124:web:d01c1fa1038e896fd9f0a1",
  measurementId:     "G-VPWTRXT56V",

  /* Realtime Database (client ka chuna hua rasta — Option B).
     Agar aap ke project ka URL kuch aur hai to sirf yeh line badal dein. */
  databaseURL:       "https://maundrylaundrypos-default-rtdb.asia-southeast1.firebasedatabase.app"
};

/* Shop ID — jis naam se ye dukaan ka data cloud mein rehta hai.
   Har device (PC / mobile / tablet) par SAME hona chahiye. */
const FIREBASE_DEFAULT_SHOP_ID = 'modern-laundry-main';

/* Build tag — client is se confirm kar sakta hai ke naya code chal raha hai */
const MRL_BUILD_TAG = '2026-11-19 · cloud v19 (RTDB+Firestore)';

if (typeof window !== 'undefined') {
  window.MRL_BUILD_TAG = MRL_BUILD_TAG;
  window.FIREBASE_DEFAULT_CFG = FIREBASE_DEFAULT_CFG;
  window.FIREBASE_DEFAULT_SHOP_ID = FIREBASE_DEFAULT_SHOP_ID;
}
