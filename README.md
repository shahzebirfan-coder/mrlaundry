# 🧺 Laundry Shop POS System

A complete, modern, **offline-first Point of Sale system** built specifically for laundry businesses. Built with **Next.js 14**, **TypeScript**, **TailwindCSS**, and **Zustand**. Designed with **Material Design 3 + Glassmorphism** aesthetics.

## ✨ Features

### 📊 Dashboard
- Today's Orders, Pending, Ready, Delivered stats
- Total Sales & Monthly Revenue graphs
- Top Customers & Branch Performance
- Recent Activities Timeline
- Quick Action Buttons (New Order, Walk-in, Pickup, etc.)

### 👥 Customer Management
- Complete customer profiles (Name, Mobile, WhatsApp, Address, Location, Membership)
- Customer Photo & History
- Previous Orders, Total Spending, Loyalty Points
- Smart features: Birthday reminders, VIP tagging, Frequent customer ID

### 📝 Order Creation
- Items: Shirt, Pant, Suit, Coat, Curtain, Blanket, Carpet, Sofa Cover, Custom
- Service Types: Dry Clean, Wash & Fold, Wash & Iron, Iron Only, Express, Premium
- Garment Condition Checklist (Torn, Stained, Missing Button, etc.)
- Photo Upload for garments
- **AI Stain Recognition** (Mock with predefined categories)

### 📦 Garment Tracking
- 8-stage status pipeline (Received → Washing → Drying → Ironing → QC → Ready → Out → Delivered)
- Live customer portal status

### 🔲 Barcode / QR System
- Unique QR code per order
- Printable on Receipt & Garment Tags

### 💳 Membership & Loyalty
- Silver, Gold, Platinum tiers
- Discounts, Loyalty Points, Free Services
- 100 Rs = 1 Point redeemable

### 💬 WhatsApp Integration
- Auto messages: Order Received, Ready, Out for Delivery, Feedback

### 🚚 Pickup & Delivery
- Driver assignment (Name, Vehicle, Route)
- Live tracking via Map
- Delivery app interface

### 📦 Inventory Management
- Track Detergent, Chemicals, Hangers, Packing, Tags
- Low stock alerts

### 👨‍💼 Employee Management
- Roles: Admin, Manager, Cashier, Washer, Iron Man, Delivery Rider
- Attendance & Performance

### 💰 Accounting
- Income (Cash, Bank, Online)
- Expenses (Salaries, Rent, Utilities)
- Profit & Loss dashboard

### 🏢 Multi-Branch Support
- Centralized dashboard for franchises
- Branch-wise reports & inventory transfer

### 📱 Customer & Owner Apps (UI Stubs)
- Place Order, Track Status, View Invoices, Membership Card

### 📈 Advanced Reports
- Daily / Monthly / Service-wise / Customer-wise / Branch-wise / Employee-wise
- Export PDF, Excel

### 📣 Marketing
- SMS & WhatsApp campaigns
- Coupon codes (EID30, SUMMER20, VIP50)

### ⭐ Customer Feedback
- 5-star rating, Comments

### 🎨 UI/UX
- Material Design 3 + Glassmorphism
- Dark Mode + Light Mode
- Royal Blue primary, Emerald Green secondary
- Smooth animations, loading skeletons, interactive cards

## 🚀 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS (custom theme)
- **State**: Zustand (with localStorage persistence for offline mode)
- **Icons**: Lucide React
- **Charts**: Recharts
- **QR Codes**: qrcode library
- **Animations**: Framer Motion + Tailwind transitions

## 💰 Cost: 100% FREE

- Next.js: Open source
- Vercel hosting: Free tier
- All dependencies: Open source
- Database: Browser localStorage (offline-first, no server costs)

## 📦 Deployment

### GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/laundry-pos.git
git push -u origin main
```

### Vercel
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Click Deploy
4. Your POS is live! 🎉

## 💻 Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🌐 Offline Mode

All data is stored in **browser localStorage** via Zustand persistence middleware.
- Works without internet
- Data persists across browser sessions
- No backend required for basic POS operations

## 📝 License

MIT - Free to use for your laundry business!
