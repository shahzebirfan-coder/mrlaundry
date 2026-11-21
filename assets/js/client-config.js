/* ============================================================
   IT ADMIN: CLIENT CONFIGURATION FILE
   Is file ko aap naye client (B, C, D) ko software dene se
   pehle edit kar sakte hain. Software automatically pehli dafa
   yahan se details pick karega.
   ============================================================ */

const CLIENT_CONFIG = {
  // 1. Initial Shop / Brand Settings
  shopName: "Modern Dry Cleaners",         // Client ka shop naam
  tagline: "Quality Dry Cleaner Service",  // Tagline

  // 2. Initial Admin Login (first-run seed only)
  //    ⚠️ Passwords are NOT stored here any more — they live in the hashed
  //    vault (assets/js/vault.js) and are wiped from this file at hand-over.
  //    The first-run credentials are printed in the hand-over document.
  adminUsername: "admin",
  adminName: "Administrator",              // Display Name

  // 3. Trial & Subscription
  trialDays: 15,                          // Default trial days for new client

  // 4. Login screen details (client in Settings se bhi badal sakta hai)
  address:  "Z-45, Memon Co-operative Housing Society, Karachi",
  phone:    "021-34388398",
  whatsapp: "03428096622",
  facebook: "",

  // 5. Shop timings — shown on the customer portal (portal.html)
  //    Portal ke "Open Now / Closed" badge ke liye format:
  //      DaySpec: HH:MM AM - HH:MM PM
  //    Friday ka break (1:30 PM - 2:00 PM) daily schedule se nahi
  //    nikalkar portal timings card me alag likha gaya hai.
  shopHours: [
    "Monday: 9:00 AM - 8:00 PM",
    "Tuesday: 9:00 AM - 8:00 PM",
    "Wednesday: 9:00 AM - 8:00 PM",
    "Thursday: 9:00 AM - 8:00 PM",
    "Friday: 9:00 AM - 8:00 PM",
    "Saturday: 9:00 AM - 8:00 PM",
    "Sunday: Closed"
  ].join("\n"),

  // 6. Winter / Summer timings (invoices, portal & printed slips par)
  shopTimingText:
    "WINTER TIMINGS\n" +
    "Mon-Sat: 8:00 AM - 1:00 PM  |  2:00 PM - 7:30 PM (Friday)\n" +
    "SUMMER TIMINGS\n" +
    "Mon-Sat: 9:00 AM - 1:00 PM  |  2:00 PM - 8:00 PM (Friday)\n" +
    "Sunday: Closed",

  // 7. Brand colours (logo se match)
  brandColor:      "#0b3f80",   // Modern — navy
  brandColorAccent: "#0e9ad2"   // Dry Cleaners — teal
};
