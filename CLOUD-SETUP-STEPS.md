# ☁️ Cloud Sync — 5 minute setup (ek dafa)

**Error:** `Failed to get document because the client is offline`
**Matlab:** browser Firebase (Firestore) tak pohnch nahi pa raha — ya Firestore database hi nahi bana.

## ⚠️ SAB SE PEHLE: Aap ne "Realtime Database" khole hain, "Firestore" nahi
Console mein left menu par do alag cheezein hoti hain:

| Menu item | Kya hai | Rules kaisa |
|---|---|---|
| **Firestore Database** | ✅ software yeh use karta hai | `rules_version = '2'; service cloud.firestore {...}` (`FIREBASE-RULES.txt`) |
| **Realtime Database** | ❌ alag product — yahan Firestore rules paste karne se **"Line 1: Parse error"** aata hai | JSON: `{ "rules": { ... } }` (`FIREBASE-RULES-REALTIME.txt`) |

Screenshot mein aap ne **Realtime Database → Rules** khola hua tha, is liye `rules_version = '2'` par error aaya — woh rules sirf Firestore ke liye hain.

**Do hal hain (koi ek):**
- **A (behtar):** Left menu → **Build → Firestore Database** → *Create database* → us ke **Rules** tab mein `FIREBASE-RULES.txt` paste karein → Publish.
- **B:** Sirf Realtime Database use karna ho to us ke Rules tab mein `FIREBASE-RULES-REALTIME.txt` (JSON) paste karein. Naye build mein software khud detect kar leta hai aur Realtime Database par bhi sync chala deta hai.

Neeche tarteeb se check karein, phir **Connection test** dabayein.

## 🩺 Agar phir bhi connect na ho: `cloud-check.html` kholein
Yeh ek alag chhota page hai jo **khud batata hai** masla kahan hai (koi setting badalne ki zaroorat nahi):

| Check | Pass hone par | Fail hone par matlab |
|---|---|---|
| Internet | Online | internet/Wi-Fi |
| Firebase SDK (CDN) | Load ho gaya | `gstatic.com` block — ad-blocker/antivirus/VPN |
| Realtime Database | Connected + URL | databaseURL/firewall |
| Rules (likhne ki ijazat) | Likhne ki ijazat hai | Rules publish karein (JSON) |
| Data parhna | data / khali | rules ya data masla |

Neeche "📋 Report copy karein" button se poori report copy ho jati hai — wohi bhej dein.

---

## Step 1 — Firestore database banayein (sab se aam wajah)
1. https://console.firebase.google.com/ → project **maundrylaundrypos** kholein
2. Left menu → **Build → Firestore Database**
3. Agar **"Create database"** likha hai to usay banayein:
   - Location: **asia-south1** (ya jo bhi de, baad mein badalna mushkil hota hai)
   - Mode: **Production mode** chunein
4. Ban jane ke baad hi data save ho sakta hai.

## Step 2 — Rules publish karein
1. Firestore → **Rules** tab
2. Poora content delete kar ke `FIREBASE-RULES.txt` ka content paste karein:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /shops/{shopId} {
      allow read, write: if true;
      match /tables/{tableId} {
        allow read, write: if true;
      }
    }
  }
}
```
3. **Publish** dabayein (30–60 second lagte hain).

> ⚠️ `/tables/{tableId}` wali line zaroori hai — data chunks wahin save hote hain.

## Step 3 — Network check
- Internet chal raha hai? (doosri website khol ke dekhein)
- Office/school Wi-Fi ya antivirus `firestore.googleapis.com` block kar raha ho to **mobile hotspot** se try karein
- VPN / ad-blocker / Brave shields band karein

## Step 4 — POS mein connect karein
1. Page refresh: **Ctrl + Shift + R**
2. **Settings → Cloud Sync (Multi-Device)**
3. **🔌 Connection test karein** → "✅ Connection OK" aana chahiye
4. **☁️ Cloud Sync ON karein (1 click)** → data upload + page reload

## Step 5 — Doosre device par
Wahi software kholein → Settings → Cloud Sync → **☁️ Cloud Sync ON karein**.
(Wahi Shop ID: `modern-laundry-main` — pehle se bhara hua hai.)

---

### Error ke mutabiq hal
| Message | Hal |
|---|---|
| `client is offline` | Step 1 + Step 3 (database bana hai? internet/firewall?) |
| `Missing or insufficient permissions` | Step 2 (Rules paste + Publish) |
| `API key not valid` | Config dobara copy karein (Project settings → Web app) |
| `QUOTA_EXCEEDED` | Agle din try karein (free plan ki daily limit) |
