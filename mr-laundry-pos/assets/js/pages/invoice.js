/* ===================== INVOICE / RECEIPT ===================== */
function openInvoice(orderId, autoPrint) {
  const o = DB.get('orders', orderId);
  if (!o) { toast('Order not found','error'); return; }
  const c = DB.get('customers', o.customerId) || { name:'Walk-in Customer' };
  const cashier = DB.get('users', o.cashierId) || { name:'-' };
  const s = DB.settings();
  const invoiceNo = o.invoiceNo ? `INV-${o.invoiceNo}` : '#' + o.id.slice(-6).toUpperCase();
  const totalPcs = (o.items || []).reduce((sum, it) => sum + (it.qty || 0), 0);
  const delTypeMap = {
    hanger: { icon: '🧥', label: 'HANGER' },
    fold:   { icon: '📦', label: 'FOLD' },
    both:   { icon: '🧺', label: 'BOTH / MIXED' }
  };
  const delTypeInfo = delTypeMap[(o.deliveryType||'').toLowerCase()] || delTypeMap.hanger;

  const qrData = (s.baseUrl ? s.baseUrl.replace(/\/$/, '') + '/invoice/' : '') + o.id;
  const dualCopy = s.printDualCopy !== false;

  const customerSlip = buildCustomerSlip(o, c, cashier, s, invoiceNo, totalPcs, delTypeInfo);
  const officeSlip = dualCopy ? buildOfficeSlip(o, c, cashier, s, invoiceNo, totalPcs, delTypeInfo) : '';

  openModal(`
    <div class="no-print" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
      <h3>🧾 Invoice ${invoiceNo}</h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-secondary btn-sm" id="photosBtn" title="Manage order photos (for disputes)">📷 Photos${(o.photos&&o.photos.length)?` (${o.photos.length})`:''}</button>
        ${c.phone ? `<button class="btn btn-success btn-sm" id="waBtn" title="Send invoice via WhatsApp">📱 WhatsApp</button>` : ''}
        ${DB.currentUser().role==='admin' ? `<button class="btn btn-secondary btn-sm" id="customizeInv">⚙️ Customize</button><button class="btn btn-warning btn-sm" id="editFromInv">✏️ Edit</button>`:''}
        <button class="btn btn-secondary btn-sm" id="printCustomerOnly" title="Print only customer copy">🖨️ Customer Only</button>
        <button class="btn btn-primary btn-sm" id="printBoth" title="Print customer + office copy together">🖨️🖨️ Print Both</button>
        <button class="btn btn-ghost btn-sm" onclick="closeModal()">Close</button>
      </div>
    </div>

    ${dualCopy ? `
      <div style="display:flex;gap:14px;flex-wrap:wrap;justify-content:center;background:#f0f4ff;padding:14px;border-radius:10px;" class="no-print">
        <div style="flex:0 0 auto;">
          <div style="text-align:center;font-size:11px;font-weight:700;color:var(--text-soft);margin-bottom:6px;text-transform:uppercase;">📄 Customer Copy (Page 1)</div>
          ${customerSlip}
        </div>
        <div style="flex:0 0 auto;">
          <div style="text-align:center;font-size:11px;font-weight:700;color:var(--text-soft);margin-bottom:6px;text-transform:uppercase;">📋 Office Copy — Small (Page 2)</div>
          ${officeSlip}
        </div>
      </div>
    ` : `<div class="no-print" style="background:#f0f4ff;padding:14px;border-radius:10px;display:flex;justify-content:center;">${customerSlip}</div>`}

    <!-- Hidden print container -->
    <div id="printArea" class="print-only" style="display:none;">
      <div class="print-slip">${customerSlip}</div>
      ${dualCopy ? `<div class="print-page-break"></div><div class="print-slip">${officeSlip}</div>` : ''}
    </div>
  `, { large: true, onOpen(m) {
    drawInvoiceQRs(m, qrData || o.id, s);
    const editBtn = $('#editFromInv', m);
    if (editBtn) editBtn.onclick = () => { closeModal(); openEditInvoice(o.id); };
    const custBtn = $('#customizeInv', m);
    if (custBtn) custBtn.onclick = () => { closeModal(); openInvoiceCustomizer(orderId); };
    const recvBtn = m.querySelector('#recvFromInv');
    if (recvBtn) recvBtn.onclick = () => { closeModal(); setTimeout(() => openReceivePayment(orderId), 150); };
    const photosBtn = $('#photosBtn', m);
    if (photosBtn) photosBtn.onclick = () => { closeModal(); openOrderPhotos(o.id); };
    const waBtn = $('#waBtn', m);
    if (waBtn) waBtn.onclick = () => sendWhatsAppInvoice(o, c, s, invoiceNo, totalPcs, delTypeInfo);
    $('#printCustomerOnly', m).onclick = () => doPrint(false);
    $('#printBoth', m).onclick = () => doPrint(dualCopy);
    if (autoPrint) setTimeout(() => doPrint(dualCopy), 300);
  }});
}

function drawInvoiceQRs(root, data, s) {
  if (s.invoiceShowQR === false) return;
  $$('.invQR', root).forEach(canvas => {
    try { QRCode.toCanvas(canvas, data, { scale: 2, border: 1 }); } catch(e){}
  });
}

function doPrint(includeOffice) {
  // Find the print area in current modal
  const printArea = document.getElementById('printArea');
  if (!printArea) { alert('Print content not ready'); return; }

  // Build temporary element with only what we want to print
  const wrap = document.createElement('div');
  wrap.id = 'printWrapper';
  // Clone first slip (customer copy)
  const slips = printArea.querySelectorAll('.print-slip');
  if (slips.length > 0) wrap.appendChild(slips[0].cloneNode(true));
  // Add office copy only if requested
  if (includeOffice && slips.length > 1) {
    const breakDiv = document.createElement('div');
    breakDiv.className = 'print-page-break';
    wrap.appendChild(breakDiv);
    wrap.appendChild(slips[1].cloneNode(true));
  }

  // Use universal printElement helper
  if (typeof printElement === 'function') {
    printElement(wrap, { title: 'Invoice Print' });
  } else {
    alert('Print helper not loaded. Refresh page.');
  }
}

/* ============================================================
   CUSTOMER COPY (Page 1 — Full details)
   ============================================================ */
function buildCustomerSlip(o, c, cashier, s, invoiceNo, totalPcs, delTypeInfo) {
  const showLogo = s.invoiceShowLogo !== false;
  const showAddress = s.invoiceShowAddress !== false;
  const showPhone = s.invoiceShowPhone !== false;
  const showTagline = s.invoiceShowTagline !== false;
  const showCashier = s.invoiceShowCashier !== false;
  const showQR = s.invoiceShowQR !== false;
  const showDelType = s.invoiceShowDeliveryType !== false;
  const showItems = s.invoiceShowItemBreakdown !== false;
  const showPayMethod = s.invoiceShowPaymentMethod !== false;
  const showDiscount = s.invoiceShowDiscount !== false;
  const showNotes = s.invoiceShowNotes !== false;
  const showFooter = s.invoiceShowFooter !== false;
  const showEdited = s.invoiceShowEditedBadge !== false;
  const showQtyCircle = s.invoiceQtyCircle !== false;
  const showTerms = s.invoiceShowTerms === true;
  const fontSize = Math.max(10, Math.min(20, +s.invoiceFontSize || 13));
  const width = Math.max(280, Math.min(800, +s.invoiceWidth || 360));

  const itemsHtml = (o.items || []).map(it => `
    <tr>
      <td style="padding:6px 0;"><b style="font-size:${fontSize+1}px;">${escapeHtml(it.name)}</b><br><span style="font-size:${fontSize-1}px;">${it.qty} × ${fmtMoney(it.price)}</span></td>
      <td style="text-align:right;padding:6px 0;"><b style="font-size:${fontSize+1}px;">${fmtMoney(it.qty*it.price)}</b></td>
    </tr>
  `).join('');

  const logoBlock = showLogo ? (s.logoImage
    ? `<div style="text-align:center;margin-bottom:8px;"><img src="${s.logoImage}" style="max-width:${Math.min(200,width*0.6)}px;max-height:100px;object-fit:contain;background:#fff;padding:4px;"/></div>`
    : `<div style="text-align:center;font-size:42px;line-height:1;">${s.logo||'🧺'}</div>`) : '';

  const totalDisc = (o.discount || ((o.manualDiscount||0) + (o.loyaltyDiscount||0)));
  const discountLines = showDiscount ? `
    ${o.manualDiscount>0 ? `<tr><td>Discount${o.discountType==='percent'?` (${o.discountValue}%)`:''}:</td><td style="text-align:right;">- ${fmtMoney(o.manualDiscount)}</td></tr>` : ''}
    ${o.loyaltyDiscount>0 ? `<tr><td>⭐ Loyalty (${o.loyaltyPercent}%):</td><td style="text-align:right;">- ${fmtMoney(o.loyaltyDiscount)}</td></tr>` : ''}
    ${(!o.manualDiscount && !o.loyaltyDiscount && totalDisc>0) ? `<tr><td>Discount:</td><td style="text-align:right;">- ${fmtMoney(totalDisc)}</td></tr>` : ''}
  ` : '';

  return `
    <div class="invoice-page invoice-customer" style="max-width:${width}px;font-size:${fontSize}px;">
      ${logoBlock}
      <h2 style="font-size:${fontSize+8}px;">${escapeHtml(s.shopName)}</h2>
      <div class="sub" style="font-size:${fontSize}px;">
        ${showTagline && s.tagline ? escapeHtml(s.tagline)+'<br>':''}
        ${showAddress && s.address ? escapeHtml(s.address)+'<br>':''}
        ${showPhone && s.phone ? '📞 '+escapeHtml(s.phone):''}
      </div>
      <div style="text-align:center;font-size:${fontSize}px;font-weight:900;margin:6px 0;letter-spacing:2px;border-top:1px solid #000;border-bottom:1px solid #000;padding:4px 0;">★ CUSTOMER COPY ★</div>

      <div style="text-align:center;margin:10px 0 6px;">
        <div style="display:inline-block;border:3px solid #000;border-radius:10px;padding:8px 18px;background:#fff;">
          <div style="font-size:${fontSize-2}px;font-weight:700;letter-spacing:3px;color:#000;">INVOICE NO.</div>
          <div style="font-size:${fontSize+16}px;font-weight:900;line-height:1.1;letter-spacing:1px;color:#000;">${invoiceNo}</div>
        </div>
      </div>
      <div class="line"></div>

      ${showQtyCircle ? `
        <div class="qty-circle">
          <div class="num">${totalPcs}</div>
          <div class="lbl">Total Pcs</div>
        </div>
      ` : `<div style="text-align:center;font-weight:800;font-size:${fontSize+4}px;margin:8px 0;">Total Pieces: ${totalPcs}</div>`}

      ${showDelType ? `
        <div style="text-align:center;margin:8px 0 12px;">
          <span class="del-type-pill" style="font-size:${fontSize+1}px;">${delTypeInfo.icon} ${delTypeInfo.label}</span>
        </div>
      ` : ''}

      <table style="font-size:${fontSize}px;">
        <tr><td><b>Booking Date:</b></td><td style="text-align:right;">${fmtDate(o.createdAt)}</td></tr>
        ${o.deliveryDate? `<tr><td><b>Delivery Date:</b></td><td style="text-align:right;"><b style="color:#a00;">${escapeHtml(o.deliveryDate)}</b></td></tr>`:''}
        ${showCashier ? `<tr><td><b>Cashier:</b></td><td style="text-align:right;">${escapeHtml(cashier.name)}</td></tr>`:''}
        <tr><td><b>Customer:</b></td><td style="text-align:right;">${escapeHtml(c.name)}</td></tr>
        ${c.phone? `<tr><td><b>Phone:</b></td><td style="text-align:right;">${escapeHtml(c.phone)}</td></tr>`:''}
        ${c.loyaltyActive? `<tr><td><b>⭐ Loyalty:</b></td><td style="text-align:right;">${escapeHtml(c.loyaltyNo)}</td></tr>`:''}
      </table>
      <div class="line"></div>

      ${showItems ? `
        <div style="font-weight:800;text-align:center;font-size:${fontSize+1}px;margin-bottom:4px;">ITEMS</div>
        <table style="font-size:${fontSize}px;">${itemsHtml}</table>
        <div class="line"></div>
      ` : ''}

      <table style="font-size:${fontSize}px;">
        <tr style="border-top:2px solid #000;"><td style="padding-top:8px;"><b style="font-size:${fontSize+2}px;">Total Pieces:</b></td><td style="text-align:right;padding-top:8px;"><b style="font-size:${fontSize+4}px;">${totalPcs}</b></td></tr>
        <tr><td>Subtotal:</td><td style="text-align:right;">${fmtMoney(o.subtotal)}</td></tr>
        ${discountLines}
        ${o.tax>0?`<tr><td>Tax:</td><td style="text-align:right;">${fmtMoney(o.tax)}</td></tr>`:''}
        <tr><td><b>TOTAL:</b></td><td style="text-align:right;font-size:${fontSize+4}px;"><b>${fmtMoney(o.total)}</b></td></tr>
        <tr><td>Paid:</td><td style="text-align:right;">${fmtMoney(o.paid)}${o.advance>0?` <span style='font-size:10px;color:#0a0;'>(Advance)</span>`:''}</td></tr>
        ${o.due>0?`<tr><td><b>${o.isCredit?'CREDIT (Pay on Delivery):':'Due:'}</b></td><td style="text-align:right;color:#a00;"><b>${fmtMoney(o.due)}</b></td></tr>`:''}
        ${showPayMethod ? `<tr><td>Payment:</td><td style="text-align:right;text-transform:capitalize;">${escapeHtml(o.paymentMethod||'cash')}</td></tr>`:''}
        <tr><td>Status:</td><td style="text-align:right;text-transform:uppercase;"><b>${o.status}</b></td></tr>
      </table>

      ${showNotes && o.notes?`<div class="line"></div><div style="font-size:${fontSize-2}px;font-style:italic;">📝 ${escapeHtml(o.notes)}</div>`:''}
      ${showTerms && s.invoiceTerms?`<div class="line"></div><div style="font-size:${fontSize-3}px;text-align:center;">${escapeHtml(s.invoiceTerms)}</div>`:''}
      ${s.invoiceShowPortalTerms !== false ? `<div style="font-size:${fontSize-4}px;text-align:center;margin-top:4px;color:#333;">📜 Full T&amp;C: ${escapeHtml(s.baseUrl ? (s.baseUrl.replace(/\/$/,'') + '/portal.html') : 'visit our portal page')}</div>` : ''}
      ${showQR ? `<div class="line"></div><div class="qr"><canvas class="invQR"></canvas><div style="font-size:10px;margin-top:4px;">Scan to view order</div></div>` : ''}
      ${showFooter ? `<div class="thanks" style="font-size:${fontSize}px;">${escapeHtml(s.invoiceFooter || 'Thank You!')}</div>` : ''}
      <div style="text-align:center;font-size:9px;margin-top:8px;color:#666;">Powered by Mr Laundry POS</div>
      ${showEdited && o.editLog && o.editLog.length?`<div style="text-align:center;font-size:9px;margin-top:4px;color:#999;">* Edited ${o.editLog.length} time(s)</div>`:''}
    </div>
  `;
}

/* ============================================================
   OFFICE COPY (Page 2 — Compact, paper-saving)
   ============================================================ */
function buildOfficeSlip(o, c, cashier, s, invoiceNo, totalPcs, delTypeInfo) {
  const width = Math.max(220, Math.min(400, +s.officeCopyWidth || 280));
  const fontSize = Math.max(9, Math.min(14, +s.officeCopyFontSize || 11));

  const itemsHtml = (o.items || []).map(it => `
    <tr>
      <td style="padding:1px 4px 1px 0;">${escapeHtml(it.name)}</td>
      <td style="text-align:right;padding:1px 0;white-space:nowrap;"><b>×${it.qty}</b></td>
    </tr>
  `).join('');

  return `
    <div class="invoice-page invoice-office" style="max-width:${width}px;font-size:${fontSize}px;padding:12px;background:#fffbe6;">
      <div style="text-align:center;font-weight:800;font-size:${fontSize+2}px;border-bottom:1px solid #000;padding-bottom:4px;margin-bottom:6px;">
        ${escapeHtml(s.shopName)} — OFFICE COPY
      </div>

      <div style="text-align:center;margin:6px 0;">
        <div style="display:inline-block;border:2.5px solid #000;border-radius:8px;padding:5px 14px;background:#fff;">
          <div style="font-size:${fontSize-2}px;font-weight:700;letter-spacing:2px;">INVOICE NO.</div>
          <div style="font-size:${fontSize+12}px;font-weight:900;line-height:1;letter-spacing:1px;">${invoiceNo}</div>
        </div>
      </div>

      <table style="font-size:${fontSize}px;width:100%;">
        <tr><td><b>Booked:</b></td><td style="text-align:right;">${fmtDateShort(o.createdAt)}</td></tr>
        ${o.deliveryDate? `<tr><td><b>Delivery:</b></td><td style="text-align:right;color:#a00;"><b>${escapeHtml(o.deliveryDate)}</b></td></tr>`:''}
        <tr><td><b>Customer:</b></td><td style="text-align:right;">${escapeHtml(c.name)}</td></tr>
        ${c.phone? `<tr><td><b>Phone:</b></td><td style="text-align:right;">${escapeHtml(c.phone)}</td></tr>`:''}
        <tr><td><b>By:</b></td><td style="text-align:right;">${escapeHtml(cashier.name)}</td></tr>
      </table>

      <div style="display:flex;align-items:center;justify-content:space-between;margin:6px 0;border-top:1px dashed #000;border-bottom:1px dashed #000;padding:4px 0;">
        <div>
          <div style="font-size:${fontSize-1}px;">PIECES</div>
          <div style="font-size:${fontSize+10}px;font-weight:900;line-height:1;">${totalPcs}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:${fontSize-1}px;">PACKAGING</div>
          <div style="font-size:${fontSize+1}px;font-weight:800;border:1.5px solid #000;padding:2px 8px;border-radius:12px;margin-top:2px;">${delTypeInfo.icon} ${delTypeInfo.label}</div>
        </div>
      </div>

      <table style="font-size:${fontSize}px;width:100%;">${itemsHtml}</table>

      <div style="border-top:1px dashed #000;margin-top:4px;padding-top:4px;">
        <table style="font-size:${fontSize}px;width:100%;">
          <tr><td>Total:</td><td style="text-align:right;"><b>${fmtMoney(o.total)}</b></td></tr>
          <tr><td>Paid:</td><td style="text-align:right;">${fmtMoney(o.paid)}</td></tr>
          ${o.due>0
            ? `<tr><td><b style="color:#a00;">Due:</b></td><td style="text-align:right;color:#a00;"><b>${fmtMoney(o.due)}</b></td></tr>`
            : `<tr><td colspan="2" style="text-align:center;color:#080;"><b>✓ PAID</b></td></tr>`}
        </table>
      </div>

      ${o.notes ? `<div style="font-size:${fontSize-1}px;font-style:italic;border-top:1px dashed #000;margin-top:4px;padding-top:4px;">📝 ${escapeHtml(o.notes)}</div>`:''}

      ${s.invoiceShowQR !== false ? `<div style="text-align:center;margin-top:6px;"><canvas class="invQR"></canvas></div>`:''}
    </div>
  `;
}

/* ============================================================
   WHATSAPP INVOICE
   ============================================================ */
function sendWhatsAppInvoice(o, c, s, invoiceNo, totalPcs, delTypeInfo) {
  if (!c.phone) { toast('Customer phone number missing', 'error'); return; }

  // Clean phone: digits only, with country code
  let phone = c.phone.replace(/[^\d+]/g, '');
  if (phone.startsWith('+')) phone = phone.substring(1);
  // PK pattern: 03XXXXXXXXX (11 digits) -> 923XXXXXXXXX
  if (phone.startsWith('0') && phone.length === 11) phone = '92' + phone.substring(1);

  const itemsText = (o.items || [])
    .map(it => `• ${it.name} × ${it.qty} = ${fmtMoney(it.qty * it.price)}`)
    .join('\n');

  const template = s.whatsappTemplate || `Hello {name}, thank you for your order at {shop}!

Invoice: {invoice}
Total Pcs: {pcs}
Amount: {total}
Paid: {paid}
Due: {due}
Delivery: {delivery} ({type})

{footer}`;

  const vars = {
    '{name}':     c.name,
    '{shop}':     s.shopName,
    '{invoice}':  invoiceNo,
    '{pcs}':      totalPcs,
    '{items}':    itemsText,
    '{subtotal}': fmtMoney(o.subtotal),
    '{discount}': fmtMoney(o.discount || 0),
    '{total}':    fmtMoney(o.total),
    '{paid}':     fmtMoney(o.paid),
    '{due}':      fmtMoney(o.due),
    '{delivery}': o.deliveryDate || '-',
    '{type}':     delTypeInfo.label,
    '{phone}':    s.phone || '',
    '{address}':  s.address || '',
    '{footer}':   s.invoiceFooter || 'Thank You!'
  };

  let msg = template;
  Object.entries(vars).forEach(([k,v]) => { msg = msg.split(k).join(v); });

  // Open preview dialog so user can edit before sending
  openModal(`
    <h3>📱 Send Invoice via WhatsApp</h3>
    <p class="sub">Sending to: <b>${escapeHtml(c.name)}</b> (${escapeHtml(c.phone)}) → WhatsApp: <code>+${phone}</code></p>
    <div class="field">
      <label>Message Preview (you can edit before sending)</label>
      <textarea id="waMsg" rows="14" style="width:100%;padding:12px;border:1px solid var(--border);border-radius:8px;font-family:inherit;font-size:13px;">${escapeHtml(msg)}</textarea>
    </div>
    <div style="background:var(--surface-alt);padding:10px;border-radius:8px;font-size:12px;color:var(--text-soft);margin-bottom:14px;">
      💡 Clicking <b>Send</b> opens WhatsApp Web (on PC) or the WhatsApp app (on phone) with this message pre-filled. You just need to press the send arrow there.
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-secondary" id="copyBtn">📋 Copy Text</button>
      <button class="btn btn-success" id="sendBtn">📱 Open WhatsApp</button>
    </div>
  `, { large: true, onOpen(m) {
    $('#copyBtn', m).onclick = () => {
      const text = $('#waMsg', m).value;
      navigator.clipboard.writeText(text).then(() => toast('Message copied to clipboard','success'));
    };
    $('#sendBtn', m).onclick = () => {
      const text = $('#waMsg', m).value;
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
      toast('Opening WhatsApp...', 'success');
      closeModal();
    };
  }});
}

/* ============================================================
   INVOICE CUSTOMIZER (admin)
   ============================================================ */
function openInvoiceCustomizer(reopenOrderId) {
  const s = DB.settings();
  const html = `
    <h3>⚙️ Customize Invoice</h3>
    <p class="sub">Control what's printed for customer copy & office copy.</p>

    <div class="form-row">
      <div class="field">
        <label>Customer Copy Font Size (px)</label>
        <input type="number" id="cfFont" value="${s.invoiceFontSize||13}" min="10" max="20"/>
      </div>
      <div class="field">
        <label>Customer Copy Width (px)</label>
        <select id="cfWidth">
          <option value="280" ${s.invoiceWidth==280?'selected':''}>280 — Thermal 58mm</option>
          <option value="360" ${(!s.invoiceWidth||s.invoiceWidth==360)?'selected':''}>360 — Thermal 80mm (default)</option>
          <option value="420" ${s.invoiceWidth==420?'selected':''}>420 — A6 paper</option>
          <option value="560" ${s.invoiceWidth==560?'selected':''}>560 — A5 paper</option>
          <option value="720" ${s.invoiceWidth==720?'selected':''}>720 — A4 paper</option>
        </select>
      </div>
    </div>

    <div style="background:#fffbe6;border:1px solid #f59e0b;border-radius:10px;padding:14px;margin-bottom:14px;">
      <div style="font-weight:700;margin-bottom:10px;">📋 Office Copy (Small slip for paper saving)</div>
      <label style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
        <input type="checkbox" id="cfDual" ${s.printDualCopy!==false?'checked':''}/>
        <b>Always print Customer + Office copy together</b>
      </label>
      <div class="form-row">
        <div class="field" style="margin:0;">
          <label>Office Copy Width (px)</label>
          <input type="number" id="cfOffW" value="${s.officeCopyWidth||280}" min="220" max="400"/>
        </div>
        <div class="field" style="margin:0;">
          <label>Office Copy Font Size (px)</label>
          <input type="number" id="cfOffF" value="${s.officeCopyFontSize||11}" min="9" max="14"/>
        </div>
      </div>
    </div>

    <div style="background:var(--surface-alt);border-radius:10px;padding:14px;margin-bottom:14px;">
      <div style="font-weight:700;margin-bottom:10px;">👁️ What to Show on Customer Copy</div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;font-size:13px;">
        ${invToggle('invoiceQtyCircle', '🔵 Big Quantity Circle', s.invoiceQtyCircle)}
        ${invToggle('invoiceShowDeliveryType', '📦 Hanger/Fold Type', s.invoiceShowDeliveryType)}
        ${invToggle('invoiceShowLogo', '🏷️ Shop Logo', s.invoiceShowLogo)}
        ${invToggle('invoiceShowTagline', '📝 Shop Tagline', s.invoiceShowTagline)}
        ${invToggle('invoiceShowAddress', '🏠 Shop Address', s.invoiceShowAddress)}
        ${invToggle('invoiceShowPhone', '📞 Shop Phone', s.invoiceShowPhone)}
        ${invToggle('invoiceShowCashier', '👤 Cashier Name', s.invoiceShowCashier)}
        ${invToggle('invoiceShowItemBreakdown', '📋 Item-by-Item List', s.invoiceShowItemBreakdown)}
        ${invToggle('invoiceShowDiscount', '💸 Discount Lines', s.invoiceShowDiscount)}
        ${invToggle('invoiceShowPaymentMethod', '💳 Payment Method', s.invoiceShowPaymentMethod)}
        ${invToggle('invoiceShowNotes', '📝 Order Notes', s.invoiceShowNotes)}
        ${invToggle('invoiceShowQR', '🔳 QR Code', s.invoiceShowQR)}
        ${invToggle('invoiceShowFooter', '💬 Footer Message', s.invoiceShowFooter)}
        ${invToggle('invoiceShowEditedBadge', '✏️ "Edited" Note', s.invoiceShowEditedBadge)}
        ${invToggle('invoiceShowTerms', '📜 Short T&C on Receipt', s.invoiceShowTerms)}
        ${invToggle('invoiceShowPortalTerms', '🌐 "Full T&C on Portal" Line', s.invoiceShowPortalTerms !== false)}
      </div>
    </div>

    <div class="form-row cols-1">
      <div class="field">
        <label>Footer Message</label>
        <input id="cfFooter" value="${escapeHtml(s.invoiceFooter||'')}"/>
      </div>
    </div>
    <div class="form-row cols-1">
      <div class="field">
        <label>📜 Short Terms on Receipt <small style="color:var(--text-soft);font-weight:400;">(keep short to save paper!)</small></label>
        <textarea id="cfTerms" rows="2" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;">${escapeHtml(s.invoiceTerms||'')}</textarea>
      </div>
    </div>
    <div class="form-row cols-1">
      <div class="field">
        <label>🌐 Full Terms &amp; Conditions (shown on Customer Portal page)
          <small style="color:var(--text-soft);font-weight:400;display:block;margin-top:2px;">Customers see this in a collapsible card on portal.html — no paper wasted! 📜</small>
        </label>
        <textarea id="cfPortalTerms" rows="10" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:13px;line-height:1.6;">${escapeHtml(s.portalTerms||'')}</textarea>
      </div>
    </div>

    <div class="form-row cols-1">
      <div class="field">
        <label>📱 WhatsApp Message Template</label>
        <textarea id="cfWaTpl" rows="8" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-family:monospace;font-size:12px;">${escapeHtml(s.whatsappTemplate||'')}</textarea>
        <small style="color:var(--text-soft);">Variables: {name} {shop} {invoice} {pcs} {items} {subtotal} {discount} {total} {paid} {due} {delivery} {type} {phone} {address} {footer}</small>
      </div>
    </div>

    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      ${reopenOrderId ? `<button class="btn btn-secondary" id="reopenBtn">Save & Preview</button>` : ''}
      <button class="btn btn-primary" id="saveBtn">💾 Save Settings</button>
    </div>
  `;
  openModal(html, { large: true, onOpen(m) {
    const collect = () => {
      const patch = {
        invoiceFontSize: Math.max(10, Math.min(20, +$('#cfFont', m).value || 13)),
        invoiceWidth: +$('#cfWidth', m).value || 360,
        invoiceFooter: $('#cfFooter', m).value,
        invoiceTerms: $('#cfTerms', m).value,
        portalTerms: $('#cfPortalTerms', m).value,
        printDualCopy: $('#cfDual', m).checked,
        officeCopyWidth: +$('#cfOffW', m).value || 280,
        officeCopyFontSize: +$('#cfOffF', m).value || 11,
        whatsappTemplate: $('#cfWaTpl', m).value
      };
      $$('input[data-inv-toggle]', m).forEach(cb => { patch[cb.dataset.invToggle] = cb.checked; });
      return patch;
    };
    $('#saveBtn', m).onclick = () => { DB.saveSettings(collect()); toast('Invoice settings saved','success'); closeModal(); };
    const reopenBtn = $('#reopenBtn', m);
    if (reopenBtn) reopenBtn.onclick = () => { DB.saveSettings(collect()); toast('Saved','success'); closeModal(); setTimeout(()=>openInvoice(reopenOrderId), 100); };
  }});
}

function invToggle(key, label, currentVal) {
  const checked = currentVal === false ? '' : 'checked';
  return `<label style="display:flex;align-items:center;gap:6px;padding:6px 8px;background:var(--surface);border:1px solid var(--border);border-radius:6px;cursor:pointer;">
    <input type="checkbox" data-inv-toggle="${key}" ${checked}/> ${label}
  </label>`;
}
