# Modern Dry Cleaners — POS
## Hand-over credentials (CONFIDENTIAL)

Print this page, give it to the shop owner, then **delete the file** from the project folder.
These values are **not** present in the code. They only work until you change them.

| Purpose | Where it is used | Value |
|---|---|---|
| POS login — Administrator | `index.html` login screen | username `admin` · password `Admin@123` |
| POS login — Cashier (optional) | `index.html` | username `aibot` · password `aibot123` |
| IT Admin password | Settings save, subscription, Google Drive, Cloud Sync, logo change | `ITAdmin@123` |
| Live Dashboard PIN | `live.html` (secret owner dashboard) | owner sets it on first visit |
| Master Recovery Code | forgotten-password recovery | not set — set it in Settings → 🔑 Master Recovery Code |
| Customer portal / reviews | `portal.html`, `reviews.html` | no login (customer enters phone or invoice no.) |

---

### Change these on day one

1. **POS password** → Users page → ✏️ edit the admin user → set a new password → Save.
   *The new password is hashed immediately; the old one is gone.*
2. **IT Admin password** → Settings → 🔐 Password & Credential Security → *Change IT Admin Password*.
3. **Live Dashboard PIN** → open `live.html`, enter a PIN — that first PIN becomes the verifier.
4. **Master Recovery Code** → Settings → 🔑 Master Recovery Code → Set up (min 6 characters).

### Forgot a password?

1. Admin is signed in → Users page → 🔑 **Reset Pass** next to the user (no old password needed).
2. Signed out → login screen → *Forgot password* → Master Recovery Code **or** the user's
   security question (name / phone / city, as set in Users).
3. Last resort → Settings → Data → restore a backup, or reset the browser storage
   (**this erases data — back up first**).

### Security notes to tell the owner

* Passwords are stored **hashed (PBKDF2, one-way)**. Even if someone opens F12 → Application,
  they only see a verifier hash — not the password.
* The app blocks F12 / Ctrl+Shift+I / right-click and mutes the console; if someone opens
  DevTools while signed in, the app returns to the login screen (no data is lost).
* Anyone with physical access to an unlocked device, or an admin-level browser profile, can
  still interfere with the page — keep the counter PC locked when unattended and give each
  cashier their own login (never share the admin password).
* For bank-grade protection the login must live on a server (Firebase Auth / PHP+MySQL).
  The code is already prepared for that: `DB.login()` is the only place that checks credentials.
