/* ============================================================
   PICKUP OPERATIONS  —  Modern Dry Cleaners
   ============================================================
   1. SLOT ENGINE
      • slots start at least N hours from "now" (default 2h) so the
        rider is free when the customer asks
      • one pickup order per slot (capacity configurable, default 1)
      • a slot is hidden as soon as it is booked
      • Friday break + closed days respected

   2. CAPTAIN (driver) WHATSAPP
      • full job sheet: contact person, number, address, slot, notes
      • sent automatically the moment a request is assigned (toggle)

   3. CUSTOMER WHATSAPP
      • "pickup confirmed, captain X (number) is coming at your slot"
      • sent automatically with the captain's details

   Everything reads its defaults from Settings → Pickup & Delivery.
   ============================================================ */

window.PICKUP_OPS = (function () {
  'use strict';

  /* ---------------- settings ---------------- */
  function cfg() {
    var s = (typeof DB !== 'undefined' && DB.settings) ? DB.settings() : {};
    return {
      leadHours:   (s.pickupLeadHours != null ? +s.pickupLeadHours : 2),
      capacity:    (s.pickupSlotCapacity != null ? +s.pickupSlotCapacity : 1),
      slotMinutes: (s.pickupSlotMinutes != null ? +s.pickupSlotMinutes : 120),
      dayStart:    (s.pickupDayStart || '10:00'),
      dayEnd:      (s.pickupDayEnd || '20:00'),
      openDays:    (s.pickupOpenDays || [1, 2, 3, 4, 5, 6]),   // 0 = Sunday
      fridayBreak: s.pickupFridayBreak !== false,               // 13:30 – 14:00
      autoCaptain: s.autoWhatsAppCaptain !== false,
      autoCustomer: s.autoWhatsAppCustomer !== false,
      captainTemplate: s.waTemplateCaptain || '',
      customerTemplate: s.waTemplateCustomer || ''
    };
  }

  /* ---------------- time helpers ---------------- */
  function toMin(hhmm) {
    var p = String(hhmm || '0:0').split(':');
    return (+p[0] || 0) * 60 + (+p[1] || 0);
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function label(mins) {
    var h = Math.floor(mins / 60) % 24, m = mins % 60;
    var h12 = h % 12 || 12, ap = h >= 12 ? 'PM' : 'AM';
    return h12 + (m ? ':' + pad2(m) : '') + ' ' + ap;
  }

  /* Booked counts per date+slot, ignoring cancelled requests. */
  function bookedCount(dateISO, slotLabel) {
    var all = (typeof DB !== 'undefined') ? DB.all('pickupRequests') : [];
    return all.filter(function (r) {
      return r && r.status !== 'cancelled' && r.pickupDate === dateISO &&
             String(r.pickupSlot || '') === slotLabel;
    }).length;
  }

  /* Is this exact slot still sellable? */
  function slotFree(dateISO, slotLabel) {
    return bookedCount(dateISO, slotLabel) < Math.max(1, cfg().capacity);
  }

  /* Build the list of sellable slots for a given day (YYYY-MM-DD). */
  function slotsForDay(dateISO, opts) {
    opts = opts || {};
    var c = cfg();
    var now = new Date();
    var todayISO = (typeof isoDay === 'function') ? isoDay(now) : new Date().toISOString().slice(0, 10);
    var day = new Date(dateISO + 'T00:00:00');

    // past day? (checked first — an old Sunday is "past", not "closed")
    if (!dateISO || isNaN(day.getTime()) || dateISO < todayISO) return { slots: [], reason: 'past' };
    // closed day?
    if (c.openDays.indexOf(day.getDay()) === -1) {
      return { slots: [], reason: 'closed' };
    }

    var cursor = toMin(c.dayStart);
    var end = toMin(c.dayEnd);
    var earliest = (now.getTime() + c.leadHours * 3600 * 1000);

    var out = [];
    while (cursor + c.slotMinutes <= end) {
      // build the slot from wall-clock hours/minutes (DST safe)
      var slotStart = new Date(day.getTime());
      slotStart.setHours(Math.floor(cursor / 60), cursor % 60, 0, 0);

      // Friday break: skip slots that fall inside 13:30 – 14:00
      var insideBreak = false;
      if (c.fridayBreak && day.getDay() === 5) {
        var bStart = 13 * 60 + 30, bEnd = 14 * 60;
        insideBreak = (cursor < bEnd && (cursor + c.slotMinutes) > bStart);
      }

      var lbl = label(cursor) + ' - ' + label(cursor + c.slotMinutes);
      var tooSoon = slotStart.getTime() < earliest;
      var full = bookedCount(dateISO, lbl) >= Math.max(1, c.capacity);

      if (!insideBreak && !tooSoon && !full) {
        out.push({
          value: lbl,
          label: lbl,
          startMin: cursor,
          endMin: cursor + c.slotMinutes,
          iso: slotStart.toISOString()
        });
      }
      cursor += c.slotMinutes;
    }

    if (!out.length) {
      var reason = 'full';
      // distinguish "too soon today" from "fully booked"
      if (dateISO === todayISO) {
        var closeAt = new Date(day.getTime());
        closeAt.setHours(Math.floor(end / 60), end % 60, 0, 0);
        if (earliest >= closeAt.getTime()) reason = 'late';
      }
      return { slots: [], reason: reason };
    }
    return { slots: out, reason: null };
  }

  /* First N days that actually have a free slot (for the date picker). */
  function nextAvailableDays(count, fromISO) {
    var out = [];
    var start = fromISO ? new Date(fromISO + 'T00:00:00') : new Date();
    for (var i = 0; i < 21 && out.length < (count || 7); i++) {
      var d = new Date(start.getTime() + i * 86400000);
      var iso = d.toISOString().slice(0, 10);
      var res = slotsForDay(iso);
      if (res.slots.length) out.push({ iso: iso, slots: res.slots, date: d });
    }
    return out;
  }

  /* ---------------- WhatsApp helpers ---------------- */
  function waNumber(raw) {
    var p = String(raw || '').replace(/[^\d+]/g, '');
    if (p.startsWith('+')) p = p.substring(1);
    if (p.startsWith('00')) p = p.substring(2);
    if (p.startsWith('0') && p.length === 11) p = '92' + p.substring(1);
    return p;
  }

  function prettyDate(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso + 'T00:00:00');
      return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) { return iso; }
  }

  function fill(tpl, data) {
    return String(tpl || '').replace(/\{(\w+)\}/g, function (m, key) {
      return data[key] != null ? String(data[key]) : '';
    });
  }

  var DEFAULT_CAPTAIN_TPL =
    '*NEW PICKUP ASSIGNED*\n' +
    '{shop}\n\n' +
    'Request: {request}\n' +
    'Contact person: {name}\n' +
    'Contact number: {phone}\n' +
    'Address: {address}\n' +
    'Pickup date: {date}\n' +
    'Time slot: {slot}\n' +
    'Items/Notes: {notes}\n\n' +
    'Please call the customer before leaving. Thank you!';

  var DEFAULT_CUSTOMER_TPL =
    'Hello {name},\n\n' +
    'Your pickup request with {shop} is *CONFIRMED* ✅\n\n' +
    'Pickup date: {date}\n' +
    'Time slot: {slot}\n\n' +
    'Our captain will arrive at your door:\n' +
    'Name: {captain}\n' +
    'Contact: {captain_phone}\n' +
    '{vehicle}\n\n' +
    'He will call you before arriving. Thank you for choosing {shop}! 🙏';

  /* Build the two messages for a request + captain. */
  function buildMessages(req, driver) {
    var s = (typeof DB !== 'undefined') ? DB.settings() : {};
    var c = cfg();
    var shop = (s.shopName || 'Modern Dry Cleaners');
    var data = {
      shop: shop,
      request: '#' + String(req.id || '').slice(-6).toUpperCase(),
      name: req.customerName || '',
      phone: req.customerPhone || '',
      address: req.address || '',
      date: prettyDate(req.pickupDate),
      slot: req.pickupSlot || '',
      notes: req.notes || '-',
      captain: (driver && driver.name) || '-',
      captain_phone: (driver && driver.phone) || '-',
      vehicle: (driver && driver.vehicle) ? ('Vehicle: ' + driver.vehicle) : '',
      shop_phone: s.phone || '',
      address_shop: s.address || ''
    };
    return {
      captain: fill(c.captainTemplate || DEFAULT_CAPTAIN_TPL, data),
      customer: fill(c.customerTemplate || DEFAULT_CUSTOMER_TPL, data),
      captainPhone: waNumber(driver && driver.phone),
      customerPhone: waNumber(req.customerPhone)
    };
  }

  /* Open WhatsApp (wa.me) in a new tab — same behaviour as the rest of the app. */
  function openWhatsApp(number, text) {
    if (!number) return false;
    var url = 'https://wa.me/' + number + '?text=' + encodeURIComponent(text);
    window.open(url, '_blank');
    return true;
  }

  /* Send both messages. Returns what was opened. */
  function notifyAssignment(req, driver, opts) {
    opts = opts || {};
    var c = cfg();
    var msgs = buildMessages(req, driver);
    var sent = { captain: false, customer: false };
    if (opts.captain !== false && c.autoCaptain && msgs.captainPhone) {
      sent.captain = openWhatsApp(msgs.captainPhone, msgs.captain);
    }
    if (opts.customer !== false && c.autoCustomer && msgs.customerPhone) {
      sent.customer = openWhatsApp(msgs.customerPhone, msgs.customer);
    }
    return sent;
  }

  /* ---------------- assignment ---------------- */
  function assign(requestId, driverId) {
    var req = DB.get('pickupRequests', requestId);
    var drv = DB.get('drivers', driverId);
    if (!req || !drv) { toast('Request or captain not found', 'error'); return null; }

    DB.update('pickupRequests', requestId, {
      driverId: driverId,
      status: 'assigned',
      assignedAt: new Date().toISOString()
    });

    var updated = DB.get('pickupRequests', requestId);
    var c = cfg();
    var sent = { captain: false, customer: false };

    if (c.autoCaptain || c.autoCustomer) {
      // small delay so the render finishes before two tabs open
      setTimeout(function () { notifyAssignment(updated, drv); }, 250);
    }
    return updated;
  }

  /* Reminder friendly summary used by the job-sheet modal. */
  function jobSheet(req, drv) {
    var m = buildMessages(req, drv || {});
    return {
      request: req,
      driver: drv || null,
      captainMessage: m.captain,
      customerMessage: m.customer,
      captainPhone: m.captainPhone,
      customerPhone: m.customerPhone
    };
  }

  return {
    config: cfg,
    slotsForDay: slotsForDay,
    nextAvailableDays: nextAvailableDays,
    bookedCount: bookedCount,
    slotFree: slotFree,
    waNumber: waNumber,
    openWhatsApp: openWhatsApp,
    buildMessages: buildMessages,
    notifyAssignment: notifyAssignment,
    assign: assign,
    jobSheet: jobSheet,
    prettyDate: prettyDate,
    label: label,
    DEFAULT_CAPTAIN_TPL: DEFAULT_CAPTAIN_TPL,
    DEFAULT_CUSTOMER_TPL: DEFAULT_CUSTOMER_TPL
  };
})();
