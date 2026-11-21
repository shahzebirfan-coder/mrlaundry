# Modern Dry Cleaners — POS (branded build)

Build date: 19 Nov 2026 · brand bundle version `2026.11.19-mdc1`

---

## 1. What was done

| Area | Change |
|---|---|
| **Brand logo** | Your artwork is now bundled inside the app (no manual upload needed) and is the default everywhere: login screen, boot/loading screen, invoices, thermal receipts, portal, PWA icon. |
| **Brand "lock"** | Settings → Shop Information shows a 🔒 **LOCKED BRAND** badge. "Remove" was replaced by **↺ Restore Brand Logo**, which always brings your official art back. Any custom logo needs the IT Admin password to save, and an empty/legacy logo falls back to your brand automatically. |
| **Shop details** | Name, address, phone, WhatsApp are pre-loaded in every profile (fresh install *and* browsers that already had old data). |
| **Shop timings** | Winter / Summer schedule + Sunday closed, shown on invoices and the customer portal. Editable in Settings → Shop Information → *Shop Timings*. |
| **Portal hours** | The portal's Open/Closed badge parses the daily schedule (Mon–Sat 9:00 AM – 8:00 PM, Sunday Closed). |
| **Theme colours** | App accent recoloured from the generic blue `#4f7cff` to Modern navy `#0B3F80` + teal `#0E9AD2`. |
| **Wording** | "Laundry POS" / "Mr Laundry" / leftover owner names removed from UI, invoices, WhatsApp templates and terms. |
| **PWA** | `manifest.json` + service worker now point at the new icons; cache version bumped so old clients refresh. |

## 2. Shop details used

```
Modern Dry Cleaners
Z-45, Memon Co-operative Housing Society, Karachi
Phone     : 021-34388398
WhatsApp  : 0342 8096622
```

**Timings (printed on invoices / portal)**

```
WINTER TIMINGS
Mon-Sat: 8:00 AM - 1:00 PM  |  2:00 PM - 7:30 PM (Friday)

SUMMER TIMINGS
Mon-Sat: 9:00 AM - 1:00 PM  |  2:00 PM - 8:00 PM (Friday)

Sunday: Closed
```

> Friday's break (1:30 PM – 2:00 PM) is written into the printed timings text.
> The portal's live Open/Closed badge uses the daily line schedule and ignores the
> one-hour break, because the parser handles a single open–close range per day.

## 3. Files that hold the brand

| File | Purpose |
|---|---|
| `assets/img/brand-logo.png` | Official lockup (hanger + "Modern DRY CLEANERS"), white background, 900 px wide — used on login, boot screen, invoices |
| `assets/img/logo.png` | Square 512×512 icon for the PWA / app icon / compact loader |
| `assets/js/client-config.js` | Shop name, tagline, address, phone, WhatsApp, timings, brand colours |
| `assets/js/db.js` → `BRAND` | The locked brand constants + auto-migration of old profiles |
| `Modern Dry Cleaners - Brand Sheet.pdf` | One-page brand sheet (lockup, icon, palette, details, timings) |

### To change the logo later
1. Settings → Shop Information → **📤 Replace Logo** → pick the file → **💾 Save All Settings** (IT Admin password required).
2. To revert: **↺ Restore Brand Logo** → **Save All Settings**.
3. To change the *bundled* default for all new installs: replace `assets/img/brand-logo.png`
   (and `assets/img/logo.png` for the icon), then bump `CACHE_NAME` in `sw.js`.

## 4. Login & credential security

Credentials are **not stored anywhere in readable form**:

| What | Where it lives now |
|---|---|
| POS user passwords | Hashed verifier only, in `localStorage.mdcVaultV1` (PBKDF2-SHA256, 150k iterations, per-user salt) |
| IT Admin password | Hashed verifier in `mdcCodeVaultV1` slot `itadmin` (seeded on first unlock) |
| Master Recovery Code | `pbkdf2$…` verifier in settings (`masterRecoveryCodeHash`) |
| Live Dashboard PIN | Hashed verifier in `mdcCodeVaultV1` slot `livepin` (set on first visit) |
| Session | `sessionStorage` only — never mirrored to IndexedDB |

`DB.login()` is asynchronous and verifies through `MDC_VAULT`; `users[]` records no longer
have a `password` field at all (older profiles are scrubbed on first load, and their plaintext
passwords are moved into the vault automatically).

**First-run credentials are in the separate hand-over document, not in the code.**
Change them right after the first login:
* POS password → Users page → edit user
* IT Admin password → Settings → 🔐 Password & Credential Security → *Change IT Admin Password*
* Live PIN → first visit to `live.html`

### DevTools deterrence (assets/js/guard.js)
* F12, Ctrl+Shift+I/J/C/K, Ctrl+U, Ctrl+S are swallowed; right-click menu is disabled
* console data dumps are muted so nothing sensitive can be read casually
* if a devtools window is detected while signed in, the session is *soft-locked*
  (returns to login, data untouched — staff just sign in again)
* honest limit: a web page cannot truly disable F12; the real protection is that there is no
  readable password left to find. A server-side login (Firebase Auth / PHP+MySQL) is the only
  complete answer, and `DB.login()` is already the single place to swap.

## 5. Running it

It is a static site — no server needed for daily use.

* **Local:** open `index.html` in Chrome/Edge (service worker is skipped on `file://`).
* **Recommended:** host on any static host (GitHub Pages, Netlify, Hostinger) or copy the folder
  to the counter PC and serve it from IIS/XAMPP so the PWA + service worker work.
* **Customer portal:** `portal.html` · **Live owner dashboard:** `live.html` · **Reviews:** `reviews.html`

Data lives in the browser (localStorage / IndexedDB) with optional Google Drive + cloud sync
configured from Settings — no change needed for the rebrand.

---

## 6. Thermal printing (logo + "prints too big" fix)

**Default print setup now saved in the app** (apply on load, no clicking needed):

| Setting | Value |
|---|---|
| Paper | 80 mm roll (576 dots) |
| Logo width | **70 % of paper** → printed 38.8 mm × 20 mm |
| Logo height cap | **20 mm** (stops a tall lockup eating the receipt) |
| Margin | 2 mm |
| 1-bit logo | ON — pure black & white, transparency flattened, thin lines kept |
| Body font | 13 px, receipt width 360 px |

**What was wrong before**

1. The logo was sized as a % of the *printable* width, so "62 %" actually became ~74 % of the roll, and 100 % overflowed the edge.
2. The image was scaled with `max-width:100%` in print CSS, so a 400-dot bitmap was stretched to 576 dots — blurry, oversized, and grey on a 1-bit head.
3. If the processed black-and-white bitmap was not ready yet, the **raw colour logo** printed instead (big + washed out).
4. Logo height was only capped by `width × 0.55`, so tall artwork ran down the slip.

**What changed**

* Logo width is now clamped to the real printable area and sized in **millimetres** (`dots ÷ 8`, 203 dpi), so it is the same size on every receipt.
* A **height cap** (`invoiceLogoMaxMm`, default 20 mm) was added.
* The bitmap is downscaled in two stages (2× → final) before the 1-bit cut-off, which is what keeps `DRY CLEANERS` and the hanger outline crisp at 400 dots.
* Threshold is now 185 (was 165) with a **Print Darkness** selector — raise it for a faded printhead.
* Prints always wait for the processed bitmap (`THERMAL.prepare()` is awaited inside `printElement`), and every `img.inv-logo` in the print clone is replaced with the exact processed PNG at its mm size.
* The office copy now carries the same small logo (55 % of the customer size) so both slips look branded.

**Controls for the shop**

* Settings → **🖨️ Thermal Print Setup** card: shows the live values, plus
  **↺ Reset to Recommended** (70 % / 20 mm) and **↔ Wider Logo** (70 % / 26 mm).
* Settings → Invoice Customizer → *Brand Logo on Invoice (Thermal)*: width %, height cap, and print-darkness selectors, with a preview drawn on a mock **80 mm paper outline** showing the exact `mm × mm` that will print.

**Printer-side checklist (important)**

* In the browser print dialog: **Scale = Default (100 %)**, **Margins = None / Minimum**, and the receipt printer selected — margin/scale overrides are the #1 reason a thermal slip looks oversized.
* Windows driver: paper size = 80 mm (or 58 mm), "fit to page" OFF.

---

## 7. Invoice numbering (starts at 001)

Numbering is fully driven by **Settings → 🔢 Invoice Numbering**:

| Field | Default | Example |
|---|---|---|
| Prefix | `INV-` | can be empty, or `MDC-`, `DC/` etc. |
| Digits | `3` | 3 → `001`, 4 → `0001` |
| Start counting from | `1` | next invoice becomes `INV-001` |

**The counter only moves when an invoice is really created** (POS → confirm order).
Previewing, re-printing, "customer only" print, WhatsApp send, challan and the
thermal print test do **not** consume a number. So sample/demo receipts can never
push the client's live numbering forward — and if samples were entered anyway,
deleting them gives the number back automatically:

* Deleting the **highest** invoice returns its number to the pool (`reclaimInvoiceNo`).
* Middle numbers are never recycled, so duplicates cannot appear.
* **↺ Start Fresh at 001** button in Settings sets the counter back to 1, with a warning
  if invoices already exist.

Every screen (invoice modal, customer/office slips, WhatsApp text, orders list,
dashboard, ledger, claims, refunds, reports, portal search) now renders the number
through `DB.invoiceLabel(order)` / `DB.formatInvoiceNo(n)`, so changing the prefix
or digit count updates the whole system. Old records stored without a prefix
(`1024`) are displayed with the new format (`INV-1024`) and still searchable by
typing `1024`, `INV-1024` or `24`… the portal search accepts numeric input either way.

---

## 8. Pickup & Delivery — slots, captain WhatsApp, customer confirmation

Everything lives in **Pickup & Delivery** (POS) and **Request Home Pickup** (customer portal).

### 8.1 Time slots (portal + POS)

| Rule | Default | Where to change |
|---|---|---|
| Slots start this many hours from now | **2 hours** | Pickup & Delivery → ⚙️ Slot & WhatsApp Setup |
| Orders allowed per slot | **1** | same screen |
| Slot length | 120 min (2 h) | same screen |
| Working window | 10:00 – 20:00 | same screen |
| Open days | Mon–Sat (Sunday closed) | tick boxes on the same screen |
| Friday prayer break | 1:30 – 2:00 PM skipped | same screen |

Behaviour:

* At **10:30** the customer only sees **12 PM - 2 PM, 2 PM - 4 PM, 4 PM - 6 PM, 6 PM - 8 PM** —
  never a slot that starts less than 2 hours away.
* The moment one request is booked in a slot, **that slot disappears** from the portal list
  (and from the POS form). No 3–4 customers in the same 3 PM slot.
* A cancelled request gives its slot back automatically.
* If the whole day is full / closed / already too late, the customer sees a plain
  explanation ("All slots for this day are booked…", "We are closed on this day…").
* The slot is **re-checked again on submit**, so two people filling the form at the
  same time cannot both book the same slot — the second one is told it was just taken.

### 8.2 Captain (driver) gets the full job on WhatsApp

When a pickup request is assigned (**Assign Captain** → pick captain → **Assign & Send**), the
app opens WhatsApp on the **captain's saved number** with the complete job:

```
NEW PICKUP ASSIGNED
Modern Dry Cleaners

Request: #A1B2C3
Contact person: Bilal Khan
Contact number: 0333-1112223
Address: House 12, Street 4, DHA Phase 5
Pickup date: Thu, 19 Nov 2026
Time slot: 2 PM - 4 PM
Items/Notes: 2 suits + 1 coat

Please call the customer before leaving. Thank you!
```

The captain must have a phone number saved in the **Captains** tab — without a number the app
says so instead of opening an empty chat. After assigning, a **🧾 job sheet** window opens with
the same text, a **Copy** button and re-send buttons, so the office can forward it any time
(also available from the 🧾 button on every assigned row).

### 8.3 Customer gets a confirmation with the captain's details

At the same time the customer receives:

```
Hello Bilal Khan,

Your pickup request with Modern Dry Cleaners is *CONFIRMED* ✅

Pickup date: Thu, 19 Nov 2026
Time slot: 2 PM - 4 PM

Our captain will arrive at your door:
Name: Ali Raza
Contact: 0321-9876543
Vehicle: Honda CD70

He will call you before arriving. Thank you for choosing Modern Dry Cleaners! 🙏
```

Both messages are **on by default** and can be switched off per assignment (checkboxes in the
Assign dialog) or globally (⚙️ Slot & WhatsApp Setup). Wording is editable there too, using
placeholders: `{shop} {request} {name} {phone} {address} {date} {slot} {notes}` for the captain,
and `{name} {date} {slot} {captain} {captain_phone} {vehicle} {shop} {shop_phone}` for the customer.

> WhatsApp opens in a new tab with the message already typed — the person sending just presses
> send. Browsers may block two pop-ups in a row; if only one opens, use the 🧾 job sheet to
> re-send the other.

### 8.4 Files

* `assets/js/pickup-ops.js` — slot engine + WhatsApp message builder (new).
* `assets/js/pages/delivery.js` — Assign dialog, job sheet, manual form slots, setup screen.
* `portal.html` — `Request Home Pickup` uses the same engine.

---

## 9. Occasion themes — Pakistan gazetted holidays on screen

Koi bhi bara din aane se pehle **login screen** (aur customer portal) khud-ba-khud us
occasion ke rang mein aa jata hai. Kuch bhi manually on/off karne ki zaroorat nahi.

### 9.1 Kaise chalta hai

* Har occasion ki ek **date**, ek **theme** aur ek **window** hoti hai:
  `window = [date − 4 din … aakhri din]`.
* **Iqbal Day (9 Nov)** → theme **5 Nov se 9 Nov** tak. 10 Nov se normal branding wapas.
* **Eid-ul-Fitr** → Eid ke 4 din pehle se Eid ke aakhri din tak.
* **14 August** → 5 din pehle se; **25 December** → 5 din pehle se.
* Login screen par:
  * hero (left side) ka photo ki jagah occasion ka art + occasion ke rang,
  * sign-in card ke andar **greeting card** — English + اردو,
  * hero par ek **countdown chip**: `🖋️ Allama Iqbal Day · 09 Nov 2026 · 2 days to go`.
* Customer portal + reviews page par ek slim **greeting banner**.

### 9.2 Kaunse din shamil hain (default plan)

| Occasion | Date | Theme |
|---|---|---|
| Kashmir Solidarity Day | 5 Feb | Kashmir — mountains & green |
| Ramadan begins | 19 Feb 2026 · 8 Feb 2027 | Indigo lanterns |
| Eid-ul-Fitr | 20 Mar 2026 · 10 Mar 2027 | Emerald & gold crescent |
| Pakistan Day | 23 Mar | Green flag |
| Labour Day | 1 May | Red & steel |
| Eid-ul-Adha | 26 May 2026 · 17 May 2027 | Teal & sand |
| Youm-e-Takbeer | 28 May | Green rays |
| Ashura | 25 Jun 2026 · 15 Jun 2027 | Charcoal & crimson |
| Independence Day | 14 Aug | Green & white |
| Defence Day | 6 Sep | Olive & steel |
| Eid Milad-un-Nabi | 26 Aug 2026 · 15 Aug 2027 | Emerald & ivory |
| Iqbal Day | 9 Nov | Navy & gold |
| Quaid-e-Azam Day / Christmas | 25 Dec | Red, white & green |
| + New Year & Shab-e-Barat themes | optional | Midnight fireworks / night sky |

Islamic dates har saal ~11 din pehle aa jati hain, is liye 2027 ki dates plan mein
shamil hain aur un par **≈ approx** ka nishan hai — Cabinet Division / Ruet-e-Hilal
ke elaan ke baad Settings se date theek kar dein, theme usi din se shift ho jayega.

### 9.3 Settings → 🎉 Occasion Themes

* **Feature ON/OFF** — poora system band karna ho to yahan se.
* **Start how many days before** — default **4** (2 se 10 tak koi bhi).
* **Language** — English + اردو / sirf English / sirf اردو.
* **Customer portal** — banner portal par dikhana hai ya sirf login screen par.
* **Holiday plan table** — har occasion ka:
  * ✅ checkbox (us occasion ko band karein),
  * **date** (Eid ki date badalne ke liye),
  * **lead** (ye occasion kitne din pehle se),
  * **theme** dropdown (koi bhi theme kisi bhi occasion par),
  * **👁️ preview** (theme wahin dialog mein dikh jata hai),
  * **📄 duplicate** (agle saal ke liye draft).
* **➕ Apna event add karein** — shop anniversary, Eid sale, branch opening — naam,
  date, Urdu naam aur theme ke saath. Koi coding nahi.

### 9.4 Technical notes

* `assets/js/occasions.js` — themes (`THEMES`), holiday plan (`DEFAULT_PLAN`),
  greetings (`GREETINGS`) aur scheduling engine (`activeOn`, `windowOf`, `apply`).
  Sab art **inline SVG** hai — koi image download nahi, offline bhi chalta hai, print
  aur PDF export mein bhi same dikhta hai.
* Login screen ki sirf **styling** badalti hai — form, password check, security,
  invoice numbering aur pickup slots par koi asar nahi (regression tested).
* jab do occasions ki window overlap ho (jaise Ramadan → Eid), zyada ahem
  celebration jeet jati hai (Eid > Ramadan).
* Settings keys: `occasionThemes`, `occasionLeadDays`, `occasionLang`,
  `occasionPortal`, `occasionPlan`, `occasionPlanRemoved`.

---

## 10. Printing & "Save as PDF" — the blank-paper fix

### 10.1 Jo problem thi (client ki report)

Partial Delivery ka record hota tha, **Print Preview** par slip theek dikhti thi,
lekin **PDF save** karne par page **bilkul blank** aata tha.

### 10.2 Wajah

App ki stylesheet mein print ke liye ye rule hai:

```css
@media print {
  body * { visibility: hidden; }                  /* screen chhupa do  */
  #printArea, #printArea * { visibility: visible; }  /* sirf slip dikhao */
}
```

Ye rule live screen print karne ke liye bilkul theek hai. Lekin `printElement()`
ek **alag print window** kholta hai jismein slip akela hota hai — us slip ka
`#printArea` nahi tha. Is liye "sab kuch chhupa do" wala rule lag jata tha:
slip print window mein mojood thi (isi liye preview mein nazar aati thi) magar
paper/PDF par **invisible** thi → blank page.

Ye sirf Partial Delivery par nahi, **payment receipt, challan, purchase order,
claim slip, Z-report** — sab par hota tha.

### 10.3 Kya theek kiya

1. **Slip ab `#printArea` ke andar** print hoti hai + hard override
   `#printArea, #printArea * { visibility: visible !important; }` — koi bhi purana
   rule paper ko blank nahi kar sakta.
2. `printElement()` ab **sirf woh CSS copy karta hai jo paper par lagti hai**
   (`@media screen` blocks skip, `@media print` blocks keep) — print window halka
   aur clean.
3. `html, body` par bhi `visibility: visible !important`.
4. Print window ab **UTF-8** declare karta hai (•, ×, ⏳, اردو theek print hon).
5. Chhoti counter slips (`.inv-slip`) A4 PDF par bhi receipt-shape rehti hain —
   page ke corner mein squeeze nahi hotin.
6. `printElement()` ab `true/false` return karta hai; agar browser ne print window
   **block** ki ho to shop ko saaf message milta hai (pehle chup-chaap kuch nahi hota tha).
7. Partial delivery: record **pehle** save hota hai, phir slip print hoti hai —
   print fail ho jaye to bhi entry zaya nahi hoti.

### 10.4 Bonus — customer ka PDF bhi ab partial delivery dikhata hai

Portal par **📄 Invoice PDF** ab partially-delivered order par yeh bhi likhta hai:

```
PARTIAL DELIVERY — 3 pc diye gaye, 2 pc baqi
✅ DELIVERED TO YOU      • Shirt ×2  • Trouser ×1
⏳ PENDING — STILL IN SHOP • Shirt ×2  • Trouser ×1
🌀 RE-WASH (FREE)        • Trouser ×1
```

Pehle customer ke PDF par sirf poora invoice aata tha, split nahi.

### 10.5 Test

`printElement()` ka asli output PDF mein render kar ke verify kiya gaya:
Partial Delivery slip ka text + items PDF par mojood hain (pehle blank), aur
invoice / challan / PO / receipt paths bhi regression-tested hain.

---

## 11. Pickup & Delivery Charges — discount ke BAAD add hota hai

### 11.1 Client ki requirement (jaisi bataayi gayi)
> "Jab order book karte hain toh ek option ho for Pickup & Delivery Charges.
> Yeh option open rakhein, cashier khud charges add kareyga. Lekin yeh charges
> **after discount** show hon — aisa na ho ke delivery charges add karein aur
> phir total amount ke saath discount mein add ho jaye."

### 11.2 Kya banaya gaya
| Jagah | Kya milta hai |
|---|---|
| **POS cart** | Discount ke neeche alag amber (peeli) box: "Pickup & Delivery Charges" — number likhein, total foran update hota hai |
| **Booking screen (order book karte waqt)** | Wahi open field + quick buttons `Counter Pick (0)`, `Rs. 200 / 300 / 500`. Field khali chhod dein → koi charge nahi |
| **Summary box** | Lines: `Subtotal → Discount → Amount after discount → + Delivery Charges → TOTAL` |
| **Payment screen** | Total pehle se charge ke sath aata hai; charge alag line par bhi dikhta hai |
| **Invoice (customer + office copy)** | `Gross → Discount → Delivery Charges (+) → NET TOTAL` — charge hamesha discount ke **baad** |
| **Partial delivery slip / Payment receipt** | "Bill Total" ke neeche "↳ includes Delivery Charges +Rs.…" |
| **Portal (customer)** | Order card par "Delivery Charges" ki alag line + PDF invoice mein bhi wahi line |
| **Orders → Edit** | Charge ki field; total = (subtotal − discount) + charge, live preview ke sath |
| **Settings** | 🚚 Delivery Charges card: field dikhana/hide karna, default amount, max limit, invoice par label |

### 11.3 Formula (yaad rakhein)
```
total = (subtotal − manualDiscount − loyaltyDiscount) + tax + deliveryCharge
```
- `deliveryCharge` **discount base mein shamil NAHI** hai — 10% discount lagane par bhi charge apni poori value ka rehta hai.
- Discount agar bill se bara bhi ho jaye (subtotal 0 ban jaye) tab bhi charge poora wasool hota hai.
- Charge ko `deliveryChargeMin / deliveryChargeMax` (default 0–5000) ke darmiyan clamp kiya jata hai; galat value daalne par bhi software crash nahi karta.
- Purane orders (jin mein charge nahi) bilkul pehle ki tarah kaam karte hain — charge 0 maana jata hai.

### 11.4 Test (verified)
`tdelcharge.js` — 20 checks green: subtotal 2000 par 10% discount + Rs. 300 charge →
discount sirf items par (Rs. 200), total **2,100** (2,070 nahi), fixed discount 500 par
1,800, 100%+ discount par bhi charge 300 bachta hai, max limit clamp, cart mein charge
field discount ke **baad** render hota hai, booking form ka live total.

`tdcprint.js` — invoice/office copy par charge line discount ke baad, NET TOTAL mein shamil.

Preview sheets: `preview/dc-1-cart.pdf`, `dc-2-booking.pdf`, `dc-3-invoice.pdf`, `dc-4-office.pdf`.

### 11.5 Cashier ke liye 3 line ka tareeqa
1. Items add karein → discount lagayein (agar dena ho).
2. "Pickup & Delivery Charges" mein jo charges lene hain likh dein (ya `Counter Pick (0)` daba dein).
3. Summary mein "Amount after discount" aur "TOTAL" alag alag nazar aayenge — bill par bhi isi tarah print hoga.

---

## 12. Naya Status: "Press" (Ironing) — WhatsApp + Portal dono update

### 12.1 Client ki requirement
> "Jab order status change karte hain us mein **Press** ka option bhi add kia jai.
> Taa ke jab order details update karein Press ki, toh client ke pass WhatsApp par
> message chala jai ke haan kapre press ho gai hain. Aur portal par bhi status
> saath saath update ho jai."

### 12.2 Ab workflow yeh hai
```
Pending  →  Washing  →  🧺 PRESS (Ironing)  →  Ready  →  Delivered
```
**Press** ka matlab: kapre dhul chuke hain, ab istri (press) ho rahi hai. Ye Ready se pehle ka step hai.

### 12.3 Kahan kya mila
| Jagah | Kya hua |
|---|---|
| **Orders → 🔄 Update Status** | Dropdown mein naya option **🧺 Press (Ironing)** — Washing ke bilkul baad |
| **Press select karne par** | Ek amber hint: "Press = kapre dhul chuke, istri ho rahi hai…" |
| **Save karte hi** | Status save + **WhatsApp message ka popup** khul jata hai (message edit kar ke bhej sakte hain) |
| **WhatsApp message** | *"Hello {name}, good news! Your clothes have been washed and are now being pressed (ironed) 🧺 …"* — invoice number, pcs aur delivery date ke sath |
| **Customer Portal** | Timeline mein **PRESS** step (Booked → Washing → Press → Ready → Delivered), status line: *"Aapke kapre dhul gaye hain, ab press (istri) ho rahe hain."* |
| **Task Board** | Naya **🧺 TO PRESS** column — jin orders par press hona hai woh wahin, aur ek click mein `✅ Ready` |
| **Orders list / Customers / Ledger / Dashboard** | Badge "Press" likhta hai (pehle "ironing" raw dikhta) |
| **POS booking** | "Initial Order Status" mein Press bhi chun sakte hain (wash+press job ke liye) |
| **Washing count** (dashboard, live screen, task board) | Press bhi "kaam baqi" mein count hota hai — koi order chhoota nahi |

### 12.4 Zaroori baat (jo client ne khaas kaha)
Agar shop ne "Don't ask again for status changes today" tick kiya hua hai (baqi statuses ke liye WhatsApp popup band),
to **Press par phir bhi WhatsApp popup aayega** — kyunke client har haal mein press ka update chahta hai.
Ye behaviour `maybePromptWhatsAppOnStatus()` mein fix kiya gaya hai (sirf `ironing` exempt hai).

### 12.5 Purane orders par kya asar?
Kuch nahi. Jin orders ka status pehle se Ready/Delivered hai, unka data waisa hi rahega;
portal timeline un par Press step ko "done" (✓) dikha deti hai, is liye flow toota hua nazar nahi aata.

### 12.6 Test (verified)
- `tpress.js` — 20 checks green: Press option dropdown mein, save par status `ironing`, WhatsApp popup khulta hai,
  message text sahi, "don't ask again" ke bawajood Press prompt aata hai, baqi statuses mute rehte hain,
  portal strings + Task Board column mojood, purane orders untouched.
- `tpressportal.js` — portal ke STEPS/message + teen zabanon (EN/UR/Roman) ke labels verified.
- Visual: `preview/press-flow.pdf` (status dialog + portal timeline).

---

## 13. Discount / number boxes — ab seedha type hota hai (1 click)

### 13.1 Client ki shikayat
> "Jab discount par click kar ke amount daalte hain, proper value ek hi baar mein enter nahi hoti.
> Jaise 50% discount dena hai to pehle **5** enter hota hai… phir side se value increase karein ya
> 5 par click kar ke dobara 0 enter karein. Ise aasan bana dein."

### 13.2 Asli wajah (root cause)
POS cart ka summary har keystroke par **poora HTML dobara bana raha tha** (`innerHTML = …`).
Is se discount ka input box har baar naya ban jata tha — pehla digit likhte hi box "mar" jata tha,
focus chala jata tha, aur doosra digit kisi aur jagah chala jata tha. Isi liye 50% ke liye
"5" likh kar box dobara click karna parta tha.

### 13.3 Ab kya hua
| Fix | Tafseel |
|---|---|
| **Summary dobara nahi banti** | Ab sirf numbers (total, discount, charge) update hote hain — input box wahi rehta hai, focus nahi jata |
| **Click par poora value select** | Discount / Delivery Charges / Amount Received box par click karein → purani value select ho jati hai → seedha `50` likhein, purani khud replace |
| **Quick chips** | Discount mode ke mutabiq ek tap: `5% 10% 15% 20% 25% 50% 100%` (ya Fixed mein `50 100 200 500 1000`) + `Clear` |
| **Numeric keypad** | Mobile par seedha number pad khulta hai (`inputmode="numeric"`) |
| **Arrow keys / Enter** | ↑ ↓ se 1-1 barhta/ghatta hai, Enter se bahar |
| **Percent limit** | Percent mode mein 100 se zyada likhne par khud 100 par ruk jata hai |
| **Yahi sahulat doosri jagah bhi** | POS booking form ka Delivery Charges + Loyalty % , Payment ka "Amount Received", aur **Orders → Edit Invoice** (discount %, delivery charges, paid, item price/qty) |
| **Discount summary line** | Ab alag line par: `Discount − Rs. 2,500` (pehle chhoti si text thi) |

### 13.4 Cashier ke liye 3 tareeqe (jo bhi aasan lage)
1. **Type:** Discount box par click → `50` likhein → bas.
2. **Chip:** `50%` chip par ek click.
3. **Keyboard:** ↑ / ↓ se adjust karein.

### 13.5 Test (verified)
- `tdisc.js` — 8 checks: pehle keystroke ke baad input ka **wahi DOM node** rehta hai aur focus bhi,
  `5` phir `0` likhne par value **50** banti hai (pehle "5" par atak jati thi), chips mojood,
  50% par 5000 → 2500 sahi, click par value select hoti hai.
- `tdisc2.js` — Orders → Edit Invoice mein bhi 50% seedha type hota hai, 150 likhne par 100 par clamp, save par discount 2500 store.
- Delivery-charge aur Press ke tamaam purane tests bhi dobara pass (koi regression nahi).
- Visual: `preview/discount-easy.pdf`.

---

## 14. Status change se payment khud nahi lagti (Receive Additional Payment fix)

### 14.1 Client ki shikayat
> "Jab order ka status change karta hoon — jaise Washing ya Ready to Deliver — to
> **(Receive Additional Payment)** wali jagah par amount likhi aa jati hai jo abhi aani nahi chahiye.
> Jaldi jaldi mein woh amount save ho jati hai. Fix karein ke wahaan amount na aaye,
> kyunke abhi client ki taraf se payment hui hi nahi hoti."

### 14.2 Asli wajah
Status change dialog ka payment box **`value="${o.due}"`** — yani order ka poora baqi amount
pehle se bhara hua aa raha tha. Jo bhi cashier sirf status badalne ke liye Save dabata,
woh amount bhi sath hi "wasool" ho jati thi (Paid ban jati thi, Due 0). Test se confirm:
sirf "Washing" select kar ke Save dabane par ek Rs. 2,000 payment khud lag gayi thi.

### 14.3 Ab kya hua
| Fix | Tafseel |
|---|---|
| **Amount box khali** | Status dialog ka "Receive Additional Payment" ab **khali** hota hai — likhna optional hai |
| **Kuch Nahi (0)** | Ek click ka button — jab paisa nahi mila |
| **Poora Rs. X** | Jab customer poora due de de (pehle jaisa aasan) |
| **Warning line** | ⚠️ "Status badalne se payment khud nahi lagti. Khali chhod dein to Due waise hi rahega." |
| **Save par confirm** | Agar koi amount likha ho to Save se pehle poochta hai: "Rs. X wasool hua hai? Cancel karein agar paisa nahi mila." |
| **Ready/Delivered reminder** | Due baqi ho aur status Ready/Delivered ho to ek dafa yaad dilata hai ke Rs. X abhi due hai (rokta nahi) |
| **Payment History** | Order ke andar chhoti list: kab, kis method se, kitna — taake koi confusion na rahe |
| **Orders list** | Jis order par ek rupya bhi nahi mila, us par saaf **UNPAID** badge (pehle "Due Rs. 2,000" bhi galat jagah lagta tha) |
| **Status update ka audit** | Log mein likha jata hai: `INV-007: washing → ready (+Rs. 500 received)` jin mein paisa hua |

### 14.4 POS payment step bhi (wahi ghalti ho sakti thi)
Naye order mein **Advance** aur **Partial** tab kholne par "Amount Received Now" pehle se bhar jata tha
(200 / half) — jaldi mein save ho sakta tha. Ab:
- **Advance / Partial** → box **khali** (cashier khud likhe)
- **Pay Now (Full)** → poora amount (ye tab cashier ne khud chuna hai)
- **Credit** → 0, aur neeche saaf likha: *"Koi payment nahi mili — poora Rs. X delivery par (Credit)"*

### 14.5 Test (verified)
- `tpay.js` — 12 checks: status dialog ka box khali; "Washing" save par Paid 0 / Due 2000 / koi payment record nahi;
  "Ready" par bhi same; amount likhne par sahi save (500 → paid 500, due 1500); Receive Payment dialog khali box se save nahi karta.
- `tpospay.js` — 8 checks: Advance/Partial khali, Credit 0 + clear message, typing se due recalculate, Full tab poora amount.
- Purane suites (discount, delivery charge, invoice, Press) dobara pass.
- Visual: `preview/payment-fix.pdf`.


---

## 15. Cloud Sync (Multi-Device) — Firebase configure ho gaya

### 15.1 Config (software ke andar save)
`assets/js/firebase-defaults.js` mein maalik ka Firebase project mojood hai:

| Field | Value |
|---|---|
| Project | `maundrylaundrypos` |
| App ID | `1:194444859124:web:d01c1fa1038e896fd9f0a1` |
| Shop ID (data ka naam) | `modern-laundry-main` |

Ye sirf **public web config** hai (Firebase apiKey public hota hai) — asal hifazat **Firestore Rules** se hoti hai.

### 15.2 Client ko karna kya hai (bas 2 kaam)
1. **Firebase Console → Firestore Database → Rules** kholain aur `FIREBASE-RULES.txt` ka content paste kar ke **Publish** karein
   (ye zaroori hai — warna device connect ho kar data read/write nahi kar sakega; `/tables/{tableId}` path bhi included hai).
2. **POS → Settings → Cloud Sync (Multi-Device) → "☁️ Cloud Sync ON karein"** — bas ek click. Page khud reload hoga.

**Har naye device (mobile / PC / tablet) par bhi wahi ek button** — koi config type karne ki zaroorat nahi.
Agar button na dikhe (sync pehle se ON) to Settings → Cloud Sync → *Merge Now* / *Force Push* / *Force Pull* mojood hain.

### 15.3 Andar kya theek kiya
| Issue | Fix |
|---|---|
| Config har device par manually paste karna parta tha | Bundled defaults + **1-click ON** (Settings card + auto-connect on first run) |
| Settings mein Cloud Sync card **do dafa** aata tha (duplicate) | Ek card reh gaya, us par live ✅ ON / ⏸️ OFF badge |
| "Enable" button ka order ghalat tha — pehle `push()` chalta tha jab sync abhi OFF hota, is liye data cloud par jata hi nahi tha | Ab: `enabled = true` → **push** → pull/merge → listen |
| Portal ki config khaali thi (customer portal cloud se data nahi padh sakta tha) | Portal mein wahi project + shop id hard-wired |
| Portal cloud se aaya data **replace** kar deta tha (puraani copy naya data uda sakti thi) | Ab **merge** — jo record jis device par aakhri baar badla wohi jeetta, delete bhi respect hota hai |
| Cloud band hone par sirf "Needs attention" popup aata tha | Popup/again ka button ab direct **"☁️ Cloud Sync ON karein"** |

### 15.4 Sync kaise chalta hai (short)
- Har table (orders, customers, products, settings…) alag doc mein — 800KB se bara ho to **chunks** mein toot kar jata hai (unlimited data).
- Har save ke 1.5 second baad auto push; doosre device par Firestore snapshot se foran pull + merge.
- Merge rule: `updatedAt` naya wala jeetta hai (kabhi bhi doosre device ka purana data naye ko overwrite nahi karta).
- Har record par `deviceId` / `deviceLabel` / `updatedBy` — pata chalta hai kis device ne badla.

### 15.5 Test (verified)
`tcloud.js` — 20 checks green: config bina typing ke milti hai, shop id auto, manual config override karta hai,
Settings par 1-click button + duplicate card khatam, portal same project/shop use karta hai, portal merge karta hai
(replace nahi), merge mein naya record jeetta hai, local-only record bachta hai, aur cloud par delete kiya record
dobara zinda nahi hota.


---

## 15A. "Configure Cloud Sync (IT Admin)" button kaam nahi kar raha tha — FIX

### Kya masla tha
Settings mein Cloud Sync ka card **do buttons mein se sirf ek** dikhata tha:
jab software ke andar Firebase config mojood ho aur sync OFF ho, to purana
"🔄 Configure Cloud Sync (IT Admin)" button **gayab** ho jata tha aur sirf ek
naya quick button reh jata tha. Woh quick button sidha connect karne lagta tha —
koi window khulti hi nahi thi, aur connection fail hone par kuch nazar nahi aata tha.
(Client ke yahan bilkul yahi hua: button dabaya, kuch nahi hua.)

### Ab
| Button | Kya karta hai |
|---|---|
| **⚙️ Cloud Sync Settings kholein** | Hamesha mojood — manager window kholta hai (config, shop id, status, buttons) |
| **☁️ Cloud Sync ON karein (1 click)** | Manager kholta hai aur khud connect shuru karta hai (progress andar nazar aati hai) |
| **🔒 Advanced (IT Admin password)** | Merge / Force Push / Force Pull / Pause — sirf password ke baad |
| **🔌 Connection test karein** | Firebase se test: "cloud par data mojood hai (X KB)" ya "permission denied → Rules publish karein" |

- Password prompt ab **sirf advanced (khatarnaak) kaamon** par — connect karne ke liye nahi.
- Manager ke andar bhi ab **hamesha** ek button mojood hai: sync OFF ho to "ON karein", ON ho to Merge/Push/Pull/Pause.
- Sync ON hone par toast bhi aata hai: *"✅ Cloud Sync ON — data cloud par mehfooz"*.

### Test (verified)
`tcloudbtn3.js` — Firebase mock ke sath poora flow green: Settings ka button → manager khulta hai →
"ON karein" → 29 tables push + main doc + real-time listener + chunked format + user ko message.


---

## 15B. "Failed to get document because the client is offline" — matlab aur hal

Ye error Firebase ki taraf se aata hai jab **browser Firestore tak pohnch hi nahi pa raha**.
Software ka bug nahi — connection/rules ka masla hai. Ab software khud wajah bata deta hai.

### Tarteeb se check karein (99% cases inhi mein se ek hote hain)

| # | Check | Kaise |
|---|---|---|
| 1 | **Internet chal raha hai?** | Koi doosri website kholain. Offline ho to Wi-Fi/mobile data on karein |
| 2 | **Firestore Database bana hua hai?** | Firebase Console → **Build → Firestore Database** → agar "Create database" likha hai to **pehle usay banayein** (location: `asia-south1` ya koi bhi) |
| 3 | **Rules publish hain?** | Firestore → **Rules** tab → `FIREBASE-RULES.txt` ka poora content paste → **Publish** |
| 4 | **Firewall / antivirus / VPN** | Office ya school network `firestore.googleapis.com` + `*.googleapis.com` block kar deta hai. Mobile hotspot se test karein — agar wahan chal jaye to masla network ka hai |
| 5 | **Ad-blocker / Brave shields** | Band kar ke dobara "Connection test karein" |
| 6 | **Project ID sahi hai?** | Config mein `projectId: maundrylaundrypos` hona chahiye |

### Software mein kya behtar hua
- `init()` ab **8 second** tak connection ka intezaar karta hai; na bane to saaf error deta hai (pehle "client is offline" raw message aata tha).
- Error ki wajah ke mutabiq **seedhi hidayat** milti hai: *offline → internet/firewall*, *permission → rules publish*, *api-key → config dobara copy*.
- **Connection test** button ab poori tafseel dikhata hai aur "Merge Now / Force Pull" ka rasta bhi batata hai.
- Connect fail ho to sync **OFF hi rehta hai** — adhoora connection banta hi nahi (data safe).
- Sync ON hone par hi "Never synced" jaisi purani state badalti hai; jaldi mein ghalti se "connected" ka dhoka nahi milta.

### Test (verified)
`tcloudoffline.js` — 8 checks green: offline Firestore par init 8s mein saaf error deta hai, quick-connect `false` return karta hai
aur sync OFF rehta hai, manager dobara khulta hai, aur test button wajah + hal likhta hai.


---

## 15C. "Line 1: Parse error" — Firestore rules Realtime Database mein paste ho gaye

### Ghalti
Firebase Console mein **do alag databases** hote hain, rules dono ke **alag format** mein hote hain:

| Console menu | Rules format |
|---|---|
| **Firestore Database** | `rules_version = '2'; service cloud.firestore { match /databases/{database}/documents { ... } }` → `FIREBASE-RULES.txt` |
| **Realtime Database** | JSON → `{ "rules": { "shops": { "$shopId": { ".read": true, ".write": true } } } }` → `FIREBASE-RULES-REALTIME.txt` |

Screenshot mein **Realtime Database → Rules** khula tha aur wahan Firestore wale rules paste hue the —
is liye `Line 1: Parse error` aaya.

### Ab software dono support karta hai
1. **Firestore** (default, chhota-chhota chunked storage) — agar bana ho.
2. Agar Firestore nahi bana / jawab nahi de raha → software **khud Realtime Database** par switch kar jata hai
   (SDK lazily load hota hai, `shops/<shopId>` mein data + version + deviceId save hota hai, real-time listen bhi chalta hai).
   Manager mein backend bhi likha aata hai: *"🗄️ Backend: Realtime Database"*.

### Client ke liye do raste
- **A (behtar):** **Build → Firestore Database → Create database**, phir us ke Rules tab mein `FIREBASE-RULES.txt` paste → Publish.
- **B:** Realtime Database hi use karna ho to us ke Rules tab mein `FIREBASE-RULES-REALTIME.txt` (JSON) paste → Publish. Software khud usi par chal jayega.

### Saath hi 2 aur bug fix
- Quick-connect mein `push()` ab **sirf connect ke baad** chalta hai (pehle sync OFF hote hue push skip ho jata tha → cloud khali reh jata tha). Agar push fail ho to sync **OFF** hi rehta hai (jhoota "connected" nahi).
- Realtime Database SDK load par **5 second timeout** — UI atakti nahi.

### Test (verified)
- `trtdb.js` — 11 checks: Firestore offline hone par RTDB fallback, data `shops/modern-laundry-main` par save,
  doosre device ka record merge, manager mein backend ka naam.
- `tcloudoffline.js` — 8 checks: dono backend fail hon to saaf message + sync OFF + retry button.
- `tcloud.js`, `tcloudbtn3.js` bhi green (Firestore path intact).


---

## 15D. Option B — sirf Realtime Database par chalna (client ka faisla)

Client ne Realtime Database rakha hai. Ab software ka poora sync dono backends par chalta hai:

| Cheez | Firestore | Realtime Database |
|---|---|---|
| POS push/pull/merge | ✅ chunked docs | ✅ `shops/<shopId>` (JSON + version + deviceId) |
| Real-time listener | ✅ onSnapshot | ✅ `ref().on('value')` |
| Portal (customer) | ✅ chunked docs | ✅ `shops/<shopId>` se parhta hai |
| Rules file | `FIREBASE-RULES.txt` | `FIREBASE-RULES-REALTIME.txt` (JSON) |
| Setup guide | `CLOUD-SETUP-STEPS.md` | `REALTIME-DB-SETUP.md` |

### Kaam ka tareeqa
1. `CLOUD.init()` pehle Firestore probe karta hai. Realtime Database pehle chala ho (ya `mrlCloudBackend=rtdb`
   saved ho) to seedha RTDB try hota hai — warna Firestore probe (8s) ke baad RTDB fallback.
2. Backend localStorage mein yaad rehta hai → agli dafa seedha usi par connect hota hai (tez).
3. Manager/status mein backend likha aata hai: **🗄️ Backend: Realtime Database**.
4. Portal: Firestore par 6 second timeout; na chale to RTDB se parh leta hai (customer ko farq nahi parta).

### Is round ke fixes
- `portal.html`: `DB.save` guard (agar DB script masla kare to poora portal block na ho) + `window.PORTAL_CLOUD` debug hook.
- Quick-connect ka `push()` sirf **connect ke baad**, push fail → sync **OFF** (jhoota connected nahi).
- RTDB SDK load par 5s timeout.

### Test (verified)
`trtdb.js` 11 ✓ · `tportalrtdb.js` 6 ✓ · `tcloudoffline.js` 8 ✓ · `tcloud.js` 20 ✓ · `tcloudbtn3.js` 12 ✓ · baqi
(tpay/tpospay/tdisc/tdisc2/tdelcharge/tdcprint/tpress/tpressportal) bhi green.


---

## 15E. "Failed to get document because the client is offline" — ab nahi aayega (RTDB-first)

### Wajah
Project mein **Realtime Database** hai, Firestore nahi. Software pehle Firestore probe karta tha,
8 second intezaar ke baad fail hota tha, aur wohi raw message screen par aa jata tha — halanke sync
RTDB par chal sakta tha.

### Ab
- Config mein `databaseURL` shamil hai → `https://maundrylaundrypos-default-rtdb.firebaseio.com`
- `CLOUD.init()` **pehle Realtime Database** try karta hai (`.info/connected`), **1 second** ke andar connect.
- Firestore instance ab **lazily** banta hai (jab zaroorat ho) — bekaar ke "offline" attempt nahi.
- Firestore probe sirf tab jab RTDB na mile. RTDB probe ek page-load mein dobara nahi dohraya jata (5s bachta hai).
- Kamyabi par backend yaad rehta hai (`mrlCloudBackend=rtdb`) → agli dafa seedha RTDB.
- Fail hone par wajah backend ke hisab se: *permission* → rules JSON publish, *not found* → Realtime Database create karein, warna internet/firewall.

### Test (verified)
`tcloudprobe.js` 8 ✓ — `databaseURL` pick hota hai, RTDB **pehle** probe hoti hai (Firestore se pehle),
3 second se kam mein connect, payload `shops/modern-laundry-main` par, aur user ko raw "client is offline" nahi milta.
`tcloud.js` 20 ✓ · `tcloudbtn3.js` 12 ✓ · `trtdb.js` 11 ✓ · `tportalrtdb.js` 6 ✓ · `tcloudoffline.js` 8 ✓.


---

## 15F. Project audit (service-account key se, read-only) — asli wajah confirm

`maundrylaundrypos` project:

| Cheez | Nateeja |
|---|---|
| **Firestore database** | ❌ **bana hi nahi** — Cloud Firestore API disabled (`firestore.googleapis.com` → 403) |
| **Realtime Database** | ✅ ACTIVE — `https://maundrylaundrypos-default-rtdb.asia-southeast1.firebasedatabase.app` (asia-southeast1) |
| **RTDB Rules** | ✅ pehle se sahi: `shops/$shopId → .read: true, .write: true` |
| **RTDB data** | khali (sync pehli dafa chalna baqi hai) |

**Natija:** jo error aata tha (`Failed to get document because the client is offline`) woh **Firestore** ka tha jo
project mein mojood hi nahi. Ab software RTDB-first hai, aur galat URL bhi bardasht karta hai.

### Is round ke fixes
- `databaseURL` config mein sahi regional URL: `...asia-southeast1.firebasedatabase.app`
  (pehle `.firebaseio.com` tha — asia-southeast1 instance ke liye ghalat).
- `getDatabaseURLCandidates()` — saved URL → config URL → regional → US → legacy; jo chale wohi use hota hai, aur
  localStorage (`mrlCloudDatabaseURL`) mein yaad rehta hai. Har URL ke liye alag **named Firebase app** (SDK pehli
  databaseURL par atakta nahi).
- `portal.html` bhi wohi URL list try karta hai (customer ko farq nahi parta).
- `_rtdbUrl` state + console log: `[CloudSync] Realtime Database connected: <url>`.
- `_rtdbSkip` — ek page-load mein RTDB timeout dobara try nahi hota (5s bachta hai).

### Test (verified)
`tcloudurl.js` 9 ✓ (galat URL config, sahi regional instance par connect, URL yaad) ·
`tcloudprobe.js` 8 ✓ · `trtdb.js` 11 ✓ · `tportalrtdb.js` 6 ✓ · `tcloud.js` 20 ✓ · `tcloudbtn3.js` 12 ✓ ·
`tcloudoffline.js` 8 ✓ · baqi 8 suites green.

### 🔐 Security note (service account key)
Jo file bheji gayi (`...-adminsdk-...json`) woh **admin key** hai — ise kisi ko na dein, na website/email/WhatsApp par
rakhein. Agar kahin aur share hui ho to Firebase Console → Project settings → Service accounts → **Delete/rotate key**.
Software ko is ki zaroorat **nahi** — browser sirf public web config use karta hai.


---

## 15G. Live Dashboard (live.html) — "Missing or insufficient permissions"

### Wajah (do masle mile)
1. `live.html` mein **Firebase config aur Shop ID khali** the (`HARDCODED_* = ''`) — hosted site (vercel) par
   browser ke localStorage se kuch nahi milta, is liye page ne project hi nahi khoja.
2. Firestore ke rules `allow read, write: if false` hain → Firestore se parhna "Missing or insufficient permissions"
   deta hai (aur agar POS ne RTDB par sync kiya ho to Firestore mein data hi nahi).

### Fix
- `live.html` mein wohi public config + `Shop ID = modern-laundry-main` hard-wire kar diya (jaise `portal.html` mein hai).
  → hosted dashboard ab browser ke localStorage par depend nahi.
- `fetchCloudData()` ab **do raste** aazmata hai: pehle Firestore (7s timeout), na chale to
  **Realtime Database** (mumkin URLs: regional → US → legacy) se orders/expenses/settings parh leta hai.
- Purana bug: `unlock()` `startDashboard()` ko `let _refreshTimer` se pehle call karta tha →
  "Cannot access '_refreshTimer' before initialization". Ab `setTimeout(startDashboard, 0)`.
- `_rdbUrl` TDZ bug bhi theek (state `window.__mrlRdbUrl` par).

### Test (verified)
`tlive.js` 7 ✓ — config hard-wired, Firestore permission-denied hone par RTDB se orders load, dashboard render
(no "Could not load data"), PIN gate ke baad auto-start.

### Client ke liye
Live dashboard URL (`.../live.html`) par 30 second auto-refresh chalta rahega. Data wahan tab aayega jab
POS ne ek dafa **Cloud Sync ON** kiya ho (cloud abhi khali hai).


---

## 15H. POS par "Realtime Database se connection nahi bana" magar cloud-check.html Connected — REST fallback

### Masla
`cloud-check.html` (browser) connect ho raha tha, lekin POS ke andar Firebase **SDK** connect nahi ho raha tha —
matlab masla network/project ka nahi, SDK ke load/init ka tha. Client ke liye dono messages ulti lagti hain.

### Fix: `rest` backend
`cloudsync.js` mein teesra backend add kiya:
1. **Firestore** (agar chale)
2. **Realtime Database (SDK)** — probe timeout 6s → **10s**
3. **Realtime Database (REST)** — SDK bilkul na chale to seedha HTTPS se:
   - read: `GET <dbUrl>/shops/<shopId>.json`
   - write: `PUT <dbUrl>/shops/<shopId>.json`
   - polling har **20 second** (push/pull/merge wahi merge logic)
   - manager/status mein: **🗄️ Backend: Realtime Database (REST)** + URL
   - `Connection test` bhi REST mode samajhta hai

Is ka faida: agar user ke browser mein gstatic/SDK block ho, sync phir bhi chalega (koi SDK nahi chahiye).

### Test (verified)
`tcloudrest.js` 9 ✓ — SDK hamesha fail hone par bhi REST se connect, 125 products ka payload upload, doosre device
ka record merge, manager mein REST backend ka label.
Baqi suites: tcloud 20 ✓ · tcloudbtn3 12 ✓ · tcloudurl 9 ✓ · tcloudprobe 8 ✓ · tcloudrestore 9 ✓ · tcloudcheck 12 ✓ ·
tlive 7 ✓ · tportalrtdb 6 ✓ · trtdb 11 ✓ · tcloudoffline 8 ✓.


---

## 15I. Auto-Sync — naye system par login hote hi cloud khud ON

Client ki hidayat: "baar baar Settings mein ja kar button na dabana parey".

### Ab kya hota hai (bina koi click)
1. Software khulta hai (login screen / dashboard) → `cloudsync.js` ka auto-init chalta hai (2.5s baad).
2. `ensureCloudConnected()` — bundled config se khud config + Shop ID set, phir
   `init()` → `setEnabled(true)` → `push()` → `pullAndMerge()` → `listen()`.
3. Backend khud chuna jata hai: Firestore → RTDB (SDK) → **RTDB (REST)**. Jo mile, wohi.
4. Ek dafa toast: **"☁️ Cloud Sync ON — data cloud par mehfooz"**. Bas.
5. Network gir jaye / tab dobara saamne aaye → `online` + `visibilitychange` par **chup chaap reconnect** (30s throttle).

### Barsaati behtari
- `showCloudRecoveryPrompt()` ab koi khuli window (Settings → Cloud Sync) **band nahi karta** — pehle
  auto-connect fail hone par recovery popup khuli diagnosis ko replace kar deta tha.
- REST fallback `typeof fetch !== 'function'` guard (purane webview / jsdom jaisi jagah crash na ho).
- Settings card ki zubaan badli: *"login hote hi sync khud ON ho jata hai"* + (agar OFF ho to)
  *"Abhi connect karein (agar khud ON na hua ho)"*.

### Manual path khatam nahi hua
Risk ya debugging ke liye `⚙️ Cloud Sync Settings kholein` aur `🔒 Advanced` (password) waise hi hain.

### Test (verified)
`tcloudauto.js` 11 ✓ — naye device par sync OFF se **khud ON**, backend active, data push, single toast,
doosre device ka record merge, network `online` par reconnect. REST/offline/url/restore/doctor/live/portal bhi green.


---

## 15J. 🔴 DATA LOSS BUG — invoice bane magar cloud par nahi pohnche (FIXED)

Client ki report: "kal raat 3–4 invoice generate kiye" magar cloud par `orders: 0`.

### Root cause (reproduce kiya, `tinvocies`-style test se confirm)
`ensureCloudConnected()` ka catch **har failure par `setEnabled(false)`** kar deta tha — chahe connect
ho chuka ho aur sirf `push` ya `listen` fail hui ho. Us ke baad `DB.save()` ka push-hook is shart par
ruk jata tha:
```js
if (!CLOUD.isEnabled() || !CLOUD.isReady()) return;   // ← yahan silently return
```
Natija: **sync OFF, koi error nahi, aur har naya invoice sirf local reh jata**.

Doosra masla: connect hone se pehle ka koi bhi save **"dirty" mark hi nahi hota tha**, is liye connect ke
baad bhi woh push nahi hota tha.

### Fix (4 tabdeeliyan)
1. **Stage-aware enable** — `init` fail ho to hi OFF; `push`/`merge`/`listen` fail ho to sync **ON** rehta hai
   aur 30s retry timer lag jata hai.
2. **Dirty tracking** — `DB.save()` har dafa `_dirty = true` + `_dirtyAt`; agar config mojood hai magar sync OFF
   hai to `ensureCloudConnected()` khud chal jata hai (data chhupta nahi).
3. **Safety net** — har 30 second: agar `_dirty` hai to push retry (silent).
4. **`pagehide` beacon** — tab band/reload hone se pehle bacha hua data `fetch(..., {keepalive:true})` se bhej diya jata hai.
   Saath hi SDK `appendChild` par `document.head || body` guard.

### Test (verified)
`tinvoices.js` 8 ✓ — (a) 3 invoice → teenon cloud par, (b) pehli push fail hone par bhi invoice pohnchta hai aur
sync ON rehta hai, (c) transient failure ke baad agla save turant retry karta hai.
Baqi 15 suites green (`tcloud*`, `tlive`, `tportalrtdb`, `trtdb`, payment/press/discount...).

### Client ke liye zaroori hidayat
Jo 3–4 invoice us raat bane the woh **sirf us device ke local storage** mein honge (cloud par kabhi nahi gaye).
Naya build usi device par kholne par woh khud upload ho jayenge (dirty + auto-connect). Agar woh device
badal gaya ho to purana device kholna hoga; warna woh invoices dobara banane parenge.
