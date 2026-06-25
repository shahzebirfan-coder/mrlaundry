# 🧺 Mr Laundry POS

A complete, bug-free Point-of-Sale system for laundry businesses.

## ✨ Features

- 🛒 **POS** — Fast cart, customer picker, discounts, loyalty cards
- 💳 **Payment** — Cash / Card / Bank / JazzCash / Easypaisa / Credit
- 🧾 **Invoice** — Thermal-printer-friendly receipt with QR code
- 👥 **Customers** — Database with auto-suggest, loyalty tracking
- 📦 **Products** — Pre-loaded Pakistani laundry rate list
- 📊 **Dashboard** — Today's sales, orders, top customers
- 📜 **Orders** — Filter by date, status, payment type
- ⚙️ **Settings** — Shop name, currency, taxes, etc.
- 💾 **Backup** — Export/import JSON, IndexedDB auto-backup
- 📱 **Mobile-friendly** — Works on phone, tablet, desktop
- 🌐 **PWA** — Install as app, works offline

## 🔐 Default Login

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Cashier | `cashier` | `cashier123` |

**⚠️ Change these immediately after first login** (Settings → Users).

## 🚀 Deploy to Vercel

1. Upload ALL files (preserve folder structure)
2. Vercel auto-detects static site
3. Done!

## 📂 File Structure

```
mrlaundry-pos/
├── index.html              Main entry point
├── manifest.json           PWA manifest
├── sw.js                   Service worker (offline)
└── assets/
    ├── css/style.css       All styles
    └── js/
        ├── db.js           Data layer (with quota safety)
        ├── auth.js         Login system
        ├── app.js          Router
        ├── utils.js        Helpers
        ├── toast.js        Notifications
        ├── modal.js        Modal manager
        └── pages/
            ├── login.js
            ├── dashboard.js
            ├── pos.js
            ├── orders.js
            ├── customers.js
            ├── products.js
            ├── settings.js
            └── invoice.js
```

## 🛠️ Tech

- Vanilla JavaScript (no framework)
- localStorage + IndexedDB (no cloud sync, no quota issues)
- Mobile-first responsive design
- PWA — works offline after first load
