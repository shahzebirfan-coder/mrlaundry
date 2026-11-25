/* ===================== INVOICE / RECEIPT ===================== */
function resolveInvoiceCashier(order) {
  const cashier = order && order.cashierId ? DB.get('users', order.cashierId) : null;
  if (cashier && cashier.name) return cashier;
  return { name: order && (order.cashierName || order.cashierUsername) || '-' };
}

async function openInvoice(orderId, autoPrint) {
  const o = DB.get('orders', orderId);
  if (!o) { toast('Order not found','error'); return; }
  const c = DB.get('customers', o.customerId) || { name:'Walk-in Customer' };
  const cashier = resolveInvoiceCashier(o);
  const s = DB.settings();
  // Thermal output must never race the monochrome logo preparation. If the
  // cache is cold (e.g. immediately after switching 58/80mm paper), wait for
  // the clean 1-bit version before building either slip.
  if (s.logoImage && s.invoiceLogoMono !== false && typeof THERMAL !== 'undefined') {
    try { await THERMAL.prepare(s); } catch (e) { console.warn('[Invoice] Thermal logo prep failed:', e); }
  }
  const invoiceNo = o.invoiceNo ? `INV-${o.invoiceNo}` : '#' + o.id.slice(-6).toUpperCase();
  const totalPcs = getOrderTotalPieces(o);
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
          <div style="text-align:center;font-size:11px;font-weight:700;color:var(--text-soft);margin-bottom:6px;text-transform:uppercase;">📄 Customer Copy — cut after developer contact</div>
          ${customerSlip}
        </div>
        <div style="flex:0 0 auto;">
          <div style="text-align:center;font-size:11px;font-weight:700;color:var(--text-soft);margin-bottom:6px;text-transform:uppercase;">📋 Office Copy — after cut marker</div>
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

function cloneInvoiceSlip(slip) {
  const copy = slip.cloneNode(true);
  const originals = slip.querySelectorAll('canvas');
  const clones = copy.querySelectorAll('canvas');
  clones.forEach((canvas, i) => {
    const source = originals[i];
    if (!source) return;
    try {
      const img = document.createElement('img');
      img.src = source.toDataURL('image/png');
      img.width = source.width;
      img.height = source.height;
      img.className = canvas.className;
      img.style.cssText = canvas.style.cssText;
      img.alt = 'Invoice QR code';
      canvas.parentNode.replaceChild(img, canvas);
    } catch (e) { console.warn('[Invoice] Could not preserve print canvas:', e); }
  });
  return copy;
}

function doPrint(includeOffice) {
  const printArea = document.getElementById('printArea');
  if (!printArea) { alert('Print content not ready'); return; }

  const wrap = document.createElement('div');
  wrap.id = 'printWrapper';
  const slips = printArea.querySelectorAll('.print-slip');
  if (slips.length > 0) wrap.appendChild(cloneInvoiceSlip(slips[0]));
  // Keep only the slips in the print wrapper. printElement handles sheet-page
  // breaks, while thermal-roll mode keeps both copies continuous at CUT HERE.
  if (includeOffice && slips.length > 1) wrap.appendChild(cloneInvoiceSlip(slips[1]));

  if (typeof printElement === 'function') {
    printElement(wrap, { title: 'Invoice Print', thermalRoll: true });
  } else {
    alert('Print helper not loaded. Refresh page.');
  }
}

function invoicePdfFilename(invoiceNo) {
  return `Mr-Laundry-${String(invoiceNo || 'Invoice').replace(/[^a-z0-9_-]/gi, '-')}.pdf`;
}

function downloadInvoicePdf(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

async function buildCustomerInvoicePdfBlob(o, c, s, invoiceNo, totalPcs, delTypeInfo) {
  const html2canvasFn = window.html2canvas;
  const jsPDFCtor = window.jspdf && window.jspdf.jsPDF;
  if (!html2canvasFn || !jsPDFCtor) throw new Error('Invoice PDF tools did not load. Refresh the app and try again.');

  if (s.logoImage && s.invoiceLogoMono !== false && typeof THERMAL !== 'undefined') {
    await THERMAL.prepare(s);
  }
  const cashier = resolveInvoiceCashier(o);
  const paper = String(s.invoicePaper || '80') === '58' ? '58' : '80';
  const paperMm = paper === '58' ? 58 : 80;
  const printableMm = paper === '58' ? 48 : 72;
  const marginMm = Math.max(0, Math.min(10, +(s.invoiceMarginMm == null ? 2 : s.invoiceMarginMm)));
  const cssWidth = printableMm * 96 / 25.4;
  const pdfHost = document.createElement('div');
  pdfHost.style.cssText = `position:fixed;left:-10000px;top:0;width:${cssWidth}px;max-width:${cssWidth}px;background:#fff;color:#000;z-index:-1;pointer-events:none;`;
  pdfHost.innerHTML = `<div class="print-slip">${buildCustomerSlip(o, c, cashier, s, invoiceNo, totalPcs, delTypeInfo)}</div>`;
  document.body.appendChild(pdfHost);

  try {
    const invoice = pdfHost.querySelector('.invoice-page');
    invoice.style.setProperty('width', `${cssWidth}px`, 'important');
    invoice.style.setProperty('max-width', `${cssWidth}px`, 'important');
    invoice.style.setProperty('box-sizing', 'border-box', 'important');
    const qrData = (s.baseUrl ? s.baseUrl.replace(/\/$/, '') + '/invoice/' : '') + o.id;
    drawInvoiceQRs(pdfHost, qrData || o.id, s);
    if (typeof thermalCleanTextNodes === 'function') thermalCleanTextNodes(pdfHost);

    await Promise.all(Array.from(pdfHost.querySelectorAll('img')).map(img => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
        setTimeout(resolve, 5000);
      });
    }));
    if (document.fonts && document.fonts.ready) await document.fonts.ready;

    const scale = 3;
    const canvas = await html2canvasFn(invoice, {
      backgroundColor: '#ffffff',
      scale,
      useCORS: true,
      logging: false,
      width: cssWidth,
      windowWidth: Math.ceil(cssWidth),
      scrollX: 0,
      scrollY: 0
    });
    const contentHeightMm = (canvas.height / scale) * 25.4 / 96;
    const pageHeightMm = Math.max(80, contentHeightMm + (2 * marginMm));
    const pdf = new jsPDFCtor({ orientation: 'p', unit: 'mm', format: [paperMm, pageHeightMm], compress: true });
    const leftMm = (paperMm - printableMm) / 2;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', leftMm, marginMm, printableMm, contentHeightMm, undefined, 'FAST');
    return pdf.output('blob');
  } finally {
    pdfHost.remove();
  }
}

async function downloadCustomerInvoicePdf(o, c, s, invoiceNo, totalPcs, delTypeInfo) {
  const blob = await buildCustomerInvoicePdfBlob(o, c, s, invoiceNo, totalPcs, delTypeInfo);
  downloadInvoicePdf(blob, invoicePdfFilename(invoiceNo));
  return blob;
}

async function shareCustomerInvoicePdf(o, c, s, invoiceNo, totalPcs, delTypeInfo, message, phone) {
  // Pre-open only for the desktop fallback so popup blockers do not swallow WhatsApp.
  const fallbackTab = window.open('about:blank', '_blank');
  try {
    const blob = await buildCustomerInvoicePdfBlob(o, c, s, invoiceNo, totalPcs, delTypeInfo);
    const filename = invoicePdfFilename(invoiceNo);
    const file = new File([blob], filename, { type: 'application/pdf' });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      if (fallbackTab) fallbackTab.close();
      await navigator.share({ files: [file], title: `Invoice ${invoiceNo}`, text: message });
      if (typeof toast === 'function') toast('Choose WhatsApp in the share sheet, then select the customer.', 'success');
      return;
    }

    downloadInvoicePdf(blob, filename);
    const fallbackMessage = `${message}\n\nInvoice PDF downloaded — please attach it to this WhatsApp chat.`;
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(fallbackMessage)}`;
    if (fallbackTab && !fallbackTab.closed) fallbackTab.location.href = waUrl;
    else window.open(waUrl, '_blank');
    if (typeof toast === 'function') toast('PDF downloaded. Attach it in WhatsApp before sending.', 'success');
  } catch (e) {
    if (fallbackTab && !fallbackTab.closed) fallbackTab.close();
    if (e && e.name === 'AbortError') {
      if (typeof toast === 'function') toast('WhatsApp share cancelled.', 'warning');
      return;
    }
    console.error('[Invoice PDF]', e);
    if (typeof toast === 'function') toast(e.message || 'Could not create invoice PDF.', 'error');
  }
}

/* ============================================================
   INVOICE LOGO — thermal safe
   ============================================================
   Thermal printers are 1-bit, so the raw colour logo is not used
   directly. If a processed (monochrome, inverted-if-dark, trimmed)
   version is ready it is printed at a real physical size in mm.
   Otherwise we fall back to the client's logo with safe CSS.
   ============================================================ */
function buildInvoiceLogo(s, width, fontSize) {
  // No logo uploaded → print the shop name big, as before
  if (!s.logoImage) {
    return `<div style="text-align:center;font-size:${fontSize+18}px;font-weight:900;line-height:1.2;">${escapeHtml(s.shopName)}</div>`;
  }

  const paperSetting = String(s.invoicePaper || '80');
  const isThermal = (paperSetting === '58' || paperSetting === '80');
  const mono = s.invoiceLogoMono !== false;

  // Physical width in mm (thermal) so the size is correct on paper
  let mm = null, processed = null;
  if (typeof THERMAL !== 'undefined') {
    try {
      mm = THERMAL.targetMm(s);
      processed = THERMAL.cached(s);       // sync read; warms cache if missing
    } catch (e) { processed = null; }
  }

  // Never send an unprocessed dark/color logo to a 1-bit thermal head.
  // If processing fails, use a crisp text fallback instead of a black block.
  if (isThermal && mono && !processed) {
    return `<div class="inv-logo-wrap" style="text-align:center;margin-bottom:8px;font-size:${fontSize+18}px;font-weight:900;line-height:1.2;">${escapeHtml(s.shopName)}</div>`;
  }
  const src = (mono && processed) ? processed : s.logoImage;

  // Thermal: size in mm. A4/laser: scale to the invoice width.
  const widthCss = (isThermal && mm)
    ? `width:${mm}mm;max-width:${mm}mm;`
    : `max-width:${Math.min(200, width * 0.6)}px;`;
  const heightCss = (isThermal && mm) ? `max-height:${Math.round(mm * 0.55)}mm;` : `max-height:100px;`;

  return `<div class="inv-logo-wrap" style="text-align:center;margin-bottom:8px;">` +
         `<img class="inv-logo" src="${src}" alt="${escapeHtml(s.shopName)}" ` +
         `style="${widthCss}${heightCss}object-fit:contain;background:#fff;padding:2px;` +
         `image-rendering:pixelated;filter:none;"/>` +
         `</div>`;
}

/* ============================================================
   CUSTOMER COPY + OFFICE COPY — cut-safe thermal receipt layout
   ============================================================ */
function buildInvoiceDeveloperFooter(narrow, includeCut) {
  const logoWidth = narrow ? 29 : 38;
  return `
    <div class="invoice-developer-footer" style="text-align:center;margin-top:12px;padding-top:8px;border-top:1px dashed #000;color:#000;line-height:1.35;">
      <img src="assets/img/celinesoft-wordmark-mono.png" alt="CelineSoft" style="display:block;width:${logoWidth}mm;max-width:76%;height:auto;object-fit:contain;margin:0 auto 4px;background:#fff;image-rendering:pixelated;"/>
      <div style="font-size:${narrow ? 8 : 9}px;font-weight:700;">Developed by: <b>Celinesoft</b></div>
      <div style="font-size:${narrow ? 8 : 9}px;">Contact: 0302-8244803</div>
      ${includeCut ? `
        <div class="invoice-cut-here" style="display:flex;align-items:center;gap:7px;margin-top:9px;font-size:${narrow ? 8 : 9}px;font-weight:900;letter-spacing:.4px;">
          <span style="flex:1;border-top:1px dashed #000;"></span><span>CUT HERE</span><span style="flex:1;border-top:1px dashed #000;"></span>
        </div>
      ` : ''}
    </div>
  `;
}

function invoicePaymentLabel(order) {
  const labels = {
    cash:'Cash', card:'Card', bank:'Bank transfer', online:'Online',
    jazzcash:'JazzCash', easypaisa:'Easypaisa', cheque:'Cheque', credit:'Credit'
  };
  const method = String(order && order.paymentMethod || '').toLowerCase();
  const paid = Math.max(0, +(order && order.paid) || 0);
  const due = Math.max(0, +(order && order.due) || 0);
  const hasCredit = due > 0 || method === 'credit' || (order && (order.paymentType === 'credit' || (order.isCredit && paid === 0)));
  if (!hasCredit) return labels[method] || (paid > 0 ? 'Cash' : 'Credit');
  if (paid <= 0) return 'Credit';
  const tender = method && method !== 'credit' ? (labels[method] || method) : 'Cash';
  return `${tender} + Credit`;
}

function buildInvoiceMetaTable(o, c, s, fontSize, narrow, cashier) {
  const bookingDate = fmtDateShort(o.bookingDate || o.createdAt);
  const deliveryDate = o.deliveryDate ? fmtDateShort(o.deliveryDate) : '';
  const paymentLabel = invoicePaymentLabel(o);
  return `
    <table class="invoice-meta-table" style="width:100%;table-layout:fixed;border-collapse:collapse;font-size:${fontSize}px;line-height:1.35;margin:8px 0;">
      <colgroup><col style="width:34%;"><col style="width:66%;"></colgroup>
      <tr><td>Booking</td><td>${escapeHtml(bookingDate)}</td></tr>
      ${deliveryDate ? `<tr><td>Delivery</td><td>${escapeHtml(deliveryDate)}</td></tr>` : ''}
      <tr><td>Customer</td><td><b>${escapeHtml(c.name || 'Walk-in Customer')}</b></td></tr>
      ${c.phone ? `<tr><td>Phone</td><td>${escapeHtml(c.phone)}</td></tr>` : ''}
      ${s.invoiceShowCashier !== false && cashier && cashier.name ? `<tr><td>Cashier</td><td>${escapeHtml(cashier.name)}</td></tr>` : ''}
      ${s.invoiceShowPaymentMethod !== false && paymentLabel ? `<tr><td>Payment</td><td>${escapeHtml(paymentLabel)}</td></tr>` : ''}
    </table>
  `;
}

function buildOfficeMetaTable(o, c, cashier, fontSize) {
  const bookingDate = fmtDateShort(o.bookingDate || o.createdAt) || '—';
  const deliveryDate = o.deliveryDate ? fmtDateShort(o.deliveryDate) : '—';
  const contact = c && c.phone ? c.phone : '—';
  const cashierName = cashier && cashier.name ? cashier.name : '—';
  return `
    <table class="invoice-meta-table invoice-office-meta" style="width:100%;table-layout:fixed;border-collapse:collapse;font-size:${Math.max(9,fontSize-1)}px;line-height:1.3;margin:5px 0 7px;">
      <colgroup><col style="width:30%;"><col style="width:70%;"></colgroup>
      <tr><td style="padding:2px 0;font-weight:700;">Booking</td><td style="padding:2px 0;">${escapeHtml(bookingDate)}</td></tr>
      <tr><td style="padding:2px 0;font-weight:700;">Delivery</td><td style="padding:2px 0;">${escapeHtml(deliveryDate)}</td></tr>
      <tr><td style="padding:2px 0;font-weight:700;">Contact</td><td style="padding:2px 0;">${escapeHtml(contact)}</td></tr>
      <tr><td style="padding:2px 0;font-weight:700;">Payment</td><td style="padding:2px 0;">${escapeHtml(invoicePaymentLabel(o))}</td></tr>
      <tr><td style="padding:2px 0;font-weight:700;">Cashier</td><td style="padding:2px 0;">${escapeHtml(cashierName)}</td></tr>
    </table>
  `;
}

function buildInvoiceItemTable(o, fontSize, narrow) {
  const items = Array.isArray(o.items) ? o.items : [];
  const nameWidth = narrow ? 42 : 45;
  const rateWidth = narrow ? 33 : 31;
  const amountWidth = 100 - nameWidth - rateWidth;
  const detailSize = Math.max(8, fontSize - 2);
  return `
    <table class="invoice-items-table" style="width:100%;table-layout:fixed;border-collapse:collapse;margin:8px 0 5px;line-height:1.3;font-size:${fontSize}px;">
      <colgroup><col style="width:${nameWidth}%;"><col style="width:${rateWidth}%;"><col style="width:${amountWidth}%;"></colgroup>
      <thead><tr>
        <th style="text-align:left;padding:4px 3px 4px 0;border-top:1.5px solid #000;border-bottom:1.5px solid #000;font-size:${detailSize}px;">ITEM</th>
        <th style="text-align:center;padding:4px 1px;border-top:1.5px solid #000;border-bottom:1.5px solid #000;font-size:${detailSize}px;">QTY × RATE</th>
        <th style="text-align:right;padding:4px 0 4px 2px;border-top:1.5px solid #000;border-bottom:1.5px solid #000;font-size:${detailSize}px;">AMOUNT</th>
      </tr></thead>
      <tbody>
        ${items.map(it => `
          <tr>
            <td style="padding:4px 3px 4px 0;font-weight:700;overflow-wrap:anywhere;word-break:normal;vertical-align:top;">${escapeHtml(it.name || 'Item')}</td>
            <td style="padding:4px 1px;text-align:center;font-size:${detailSize}px;white-space:nowrap;vertical-align:top;">${+it.qty || 0} × ${fmtMoney(+it.price || 0)}</td>
            <td style="text-align:right;white-space:nowrap;padding:4px 0 4px 2px;font-weight:700;font-size:${detailSize}px;vertical-align:top;">${fmtMoney((+it.qty || 0) * (+it.price || 0))}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function buildOfficeItemTable(o, fontSize) {
  const items = Array.isArray(o.items) ? o.items : [];
  return `
    <table class="invoice-items-table invoice-office-items" style="width:100%;table-layout:fixed;border-collapse:collapse;margin:5px 0 0;line-height:1.25;font-size:${Math.max(9,fontSize-1)}px;">
      <colgroup><col style="width:75%;"><col style="width:25%;"></colgroup>
      <thead><tr>
        <th style="text-align:left;padding:4px 3px 4px 0;border-top:1.5px solid #000;border-bottom:1.5px solid #000;font-size:${Math.max(9,fontSize-1)}px;">ITEM</th>
        <th style="text-align:right;padding:4px 0;border-top:1.5px solid #000;border-bottom:1.5px solid #000;font-size:${Math.max(9,fontSize-1)}px;">QTY</th>
      </tr></thead>
      <tbody>
        ${items.map(it => `
          <tr>
            <td style="padding:3px 3px 3px 0;font-weight:600;overflow-wrap:anywhere;vertical-align:top;">${escapeHtml(it.name || 'Item')}</td>
            <td style="padding:3px 0;text-align:right;white-space:nowrap;vertical-align:top;">${+it.qty || 0}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function invoiceDiscountAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

function invoiceDiscountPercent(value) {
  const percent = Number(value);
  if (!Number.isFinite(percent) || percent <= 0) return '';
  return `${Number.isInteger(percent) ? percent : +percent.toFixed(2)}%`;
}

function buildInvoiceDiscountRows(order, fontSize) {
  const manualDiscount = invoiceDiscountAmount(order.manualDiscount);
  const loyaltyDiscount = invoiceDiscountAmount(order.loyaltyDiscount);
  const savedTotal = invoiceDiscountAmount(order.discount);
  const componentTotal = manualDiscount + loyaltyDiscount;
  const totalDiscount = savedTotal > 0 ? savedTotal : componentTotal;
  if (totalDiscount <= 0) return '';

  const manualPercent = String(order.discountType || '').toLowerCase() === 'percent'
    ? invoiceDiscountPercent(order.discountValue) : '';
  const loyaltyPercent = invoiceDiscountPercent(order.loyaltyPercent);
  const components = [];
  if (manualDiscount > 0) {
    components.push({ label: manualPercent ? `Manual Discount (${manualPercent})` : 'Manual Discount', amount: manualDiscount });
  }
  if (loyaltyDiscount > 0) {
    components.push({ label: loyaltyPercent ? `Loyalty Discount (${loyaltyPercent})` : 'Loyalty Discount', amount: loyaltyDiscount });
  }

  const detailStyle = 'padding:3px 0;color:#166534;';
  const amountStyle = 'padding:3px 0;text-align:right;white-space:nowrap;color:#166534;font-weight:700;';
  const totalRow = `
    <tr class="invoice-discount-total">
      <td style="padding:5px 0;border-top:1px dashed #000;border-bottom:1px dashed #000;font-weight:900;font-size:${fontSize}px;color:#14532d;">TOTAL DISCOUNT OFFERED</td>
      <td style="padding:5px 0;border-top:1px dashed #000;border-bottom:1px dashed #000;text-align:right;white-space:nowrap;font-weight:900;font-size:${fontSize}px;color:#14532d;">− ${fmtMoney(totalDiscount)}</td>
    </tr>
  `;

  if (components.length > 1) {
    const detailRows = components.map(part => `
      <tr><td style="${detailStyle}">${escapeHtml(part.label)}</td><td style="${amountStyle}">− ${fmtMoney(part.amount)}</td></tr>
    `).join('');
    return detailRows + totalRow;
  }

  if (components.length === 1 && Math.abs(totalDiscount - components[0].amount) > 0.01) {
    return `
      <tr><td style="${detailStyle}">${escapeHtml(components[0].label)}</td><td style="${amountStyle}">− ${fmtMoney(components[0].amount)}</td></tr>
      ${totalRow}
    `;
  }

  let label = 'Discount Offered';
  if (components.length === 1 && loyaltyDiscount > 0) {
    label = loyaltyPercent ? `Discount Offered (Loyalty ${loyaltyPercent})` : 'Discount Offered (Loyalty)';
  } else if (components.length === 1 && manualPercent) {
    label = `Discount Offered (${manualPercent})`;
  } else if (!components.length && manualPercent) {
    label = `Discount Offered (${manualPercent})`;
  }

  return `
    <tr class="invoice-discount-total">
      <td style="padding:5px 0;border-top:1px dashed #000;border-bottom:1px dashed #000;font-weight:900;font-size:${fontSize}px;color:#14532d;">${escapeHtml(label.toUpperCase())}</td>
      <td style="padding:5px 0;border-top:1px dashed #000;border-bottom:1px dashed #000;text-align:right;white-space:nowrap;font-weight:900;font-size:${fontSize}px;color:#14532d;">− ${fmtMoney(totalDiscount)}</td>
    </tr>
  `;
}

function buildInvoiceTotalsTable(o, fontSize) {
  return `
    <table class="invoice-totals-table" style="width:100%;border-collapse:collapse;margin-top:4px;line-height:1.35;font-size:${fontSize}px;">
      <tbody>
        <tr><td style="padding:4px 0;border-top:1.5px solid #000;">Gross Total</td><td style="padding:4px 0;border-top:1.5px solid #000;text-align:right;white-space:nowrap;font-weight:700;">${fmtMoney(o.subtotal)}</td></tr>
        ${buildInvoiceDiscountRows(o, fontSize)}
        ${(+o.tax || 0) > 0 ? `<tr><td style="padding:3px 0;">Tax</td><td style="padding:3px 0;text-align:right;white-space:nowrap;">${fmtMoney(o.tax)}</td></tr>` : ''}
        <tr><td style="padding:5px 0;border-top:1px dashed #000;font-weight:900;font-size:${fontSize+1}px;">BILL TOTAL</td><td style="padding:5px 0;border-top:1px dashed #000;text-align:right;white-space:nowrap;font-weight:900;font-size:${fontSize+1}px;">${fmtMoney(o.total)}</td></tr>
        <tr><td style="padding:3px 0;">Paid</td><td style="padding:3px 0;text-align:right;white-space:nowrap;">${fmtMoney(o.paid)}</td></tr>
        ${(+o.due || 0) > 0 ? `<tr><td style="padding:4px 0;font-weight:900;font-size:${fontSize+1}px;">DUE</td><td style="padding:4px 0;text-align:right;white-space:nowrap;font-weight:900;font-size:${fontSize+1}px;">${fmtMoney(o.due)}</td></tr>` : ''}
      </tbody>
    </table>
  `;
}

function buildInvoiceHero(invoiceNo, totalPcs, delTypeInfo, fontSize, narrow) {
  const typeLabel = escapeHtml(delTypeInfo && delTypeInfo.label ? delTypeInfo.label : 'FOLD');
  return `
    <div style="margin:8px 0 6px;padding:8px 7px 7px;border:2px solid #000;border-radius:8px;text-align:center;background:#fff;color:#000;">
      <div style="font-size:${Math.max(8,fontSize-2)}px;font-weight:800;letter-spacing:.7px;">INVOICE NUMBER</div>
      <div style="font-size:${fontSize+(narrow ? 8 : 11)}px;font-weight:900;line-height:1.12;letter-spacing:.3px;overflow-wrap:anywhere;">#${escapeHtml(invoiceNo)}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:6px 0 9px;">
      <div style="border:1.5px solid #000;border-radius:7px;padding:6px 3px;text-align:center;background:#fff;color:#000;">
        <div style="font-size:${Math.max(7,fontSize-4)}px;font-weight:800;letter-spacing:.25px;">NUMBER OF PIECES</div>
        <div style="font-size:${fontSize+(narrow ? 5 : 8)}px;font-weight:900;line-height:1.2;">${totalPcs}</div>
      </div>
      <div style="border:1.5px solid #000;border-radius:7px;padding:6px 3px;text-align:center;background:#fff;color:#000;">
        <div style="font-size:${Math.max(7,fontSize-4)}px;font-weight:800;letter-spacing:.25px;">TYPE / PACKAGING</div>
        <div style="font-size:${narrow ? Math.max(9,fontSize) : fontSize+2}px;font-weight:900;line-height:1.2;overflow-wrap:anywhere;">${typeLabel}</div>
      </div>
    </div>
  `;
}

function buildInvoiceBrandHeader(s, logoBlock, fontSize, narrow, copyLabel) {
  const address = String(s.address || '').trim().split(/\r?\n/).map(escapeHtml).join('<br>');
  const tagline = s.invoiceShowTagline === false ? '' : String(s.tagline || '').trim();
  return `
    <div style="text-align:center;color:#000;">
      ${logoBlock}
      <div style="font-size:${fontSize+(narrow ? 1 : 3)}px;font-weight:900;line-height:1.15;margin:2px 0 3px;">${escapeHtml(s.shopName || 'Mr Laundry')}</div>
      ${tagline ? `<div style="font-size:${Math.max(8,fontSize-1)}px;font-weight:700;line-height:1.25;">${escapeHtml(tagline)}</div>` : ''}
      ${s.invoiceShowAddress !== false && address ? `<div style="font-size:${Math.max(8,fontSize-1)}px;line-height:1.25;margin-top:2px;">${address}</div>` : ''}
      ${s.invoiceShowPhone !== false && s.phone ? `<div style="font-size:${Math.max(8,fontSize-1)}px;font-weight:700;margin-top:1px;">${escapeHtml(s.phone)}</div>` : ''}
    </div>
    <div style="text-align:center;font-size:${fontSize+(narrow ? 0 : 1)}px;font-weight:900;letter-spacing:.5px;margin:8px 0 6px;padding:5px 2px;border-top:1px dashed #000;border-bottom:1px dashed #000;">${copyLabel}</div>
  `;
}

function buildCustomerSlip(o, c, cashier, s, invoiceNo, totalPcs, delTypeInfo) {
  const paper = String(s.invoicePaper || '80');
  const narrow = paper === '58';
  const fontSize = narrow ? Math.max(10, Math.min(12, (+s.invoiceFontSize || 13) - 2)) : Math.max(12, Math.min(15, +s.invoiceFontSize || 13));
  const width = Math.max(280, Math.min(800, +s.invoiceWidth || 360));
  const logoBlock = s.invoiceShowLogo !== false ? buildInvoiceLogo(s, width, fontSize) : '';
  const showQR = s.invoiceShowQR !== false;
  const footer = s.invoiceShowFooter !== false ? `<div style="text-align:center;margin-top:8px;font-size:${fontSize}px;font-weight:900;">${escapeHtml(s.invoiceFooter || '')}</div>` : '';
  const hours = String(s.shopHours || '').trim();
  // The portal terms are the shop's full, editable terms; fall back to the
  // short invoice terms when no full terms have been configured.
  const terms = String(s.portalTerms || '').trim() || String(s.invoiceTerms || '').trim();
  const termsHtml = terms ? `
    <section style="margin-top:9px;padding-top:7px;border-top:1px dashed #000;color:#000;">
      <div style="text-align:center;font-size:${Math.max(9,fontSize)}px;font-weight:900;letter-spacing:.4px;margin-bottom:5px;">TERMS &amp; CONDITIONS</div>
      <div style="font-size:${narrow ? Math.max(9,fontSize-1) : Math.max(10,fontSize-1)}px;font-weight:700;line-height:1.4;white-space:pre-wrap;overflow-wrap:anywhere;text-align:left;">${escapeHtml(terms)}</div>
    </section>
  ` : '';
  const hoursHtml = hours ? `
    <section style="margin-top:8px;padding-top:6px;border-top:1px dashed #000;text-align:center;color:#000;">
      <div style="font-size:${Math.max(8,fontSize-1)}px;font-weight:900;letter-spacing:.35px;margin-bottom:3px;">SHOP TIMINGS</div>
      <div style="font-size:${Math.max(8,fontSize-2)}px;line-height:1.3;white-space:pre-line;overflow-wrap:anywhere;">${escapeHtml(hours)}</div>
    </section>
  ` : '';
  const qrHtml = showQR ? `<div style="text-align:center;margin-top:7px;"><canvas class="invQR" style="width:42px;height:42px;max-width:42px;max-height:42px;"></canvas></div>` : '';

  return `
    <div class="invoice-page invoice-customer" style="width:100%;max-width:${width}px;box-sizing:border-box;font-family:Arial,'Helvetica Neue',sans-serif;font-size:${fontSize}px;line-height:1.35;font-weight:500;color:#000;background:#fff;padding:${narrow ? 7 : 10}px;">
      ${buildInvoiceBrandHeader(s, logoBlock, fontSize, narrow, 'CUSTOMER COPY')}
      ${buildInvoiceHero(invoiceNo, totalPcs, delTypeInfo, fontSize, narrow)}
      ${buildInvoiceMetaTable(o, c, s, fontSize, narrow, cashier)}
      ${s.invoiceShowItemBreakdown !== false ? buildInvoiceItemTable(o, fontSize, narrow) : ''}
      ${buildInvoiceTotalsTable(o, fontSize)}
      ${s.invoiceShowNotes !== false && o.notes ? `<div style="margin-top:7px;padding:6px;border:1px dashed #000;font-size:${fontSize}px;overflow-wrap:anywhere;"><b>Notes:</b> ${escapeHtml(o.notes)}</div>` : ''}
      ${qrHtml}
      ${hoursHtml}
      ${footer}
      ${termsHtml}
      ${buildInvoiceDeveloperFooter(narrow, true)}
    </div>
  `;
}

function buildOfficeBrandHeader(s, fontSize, narrow) {
  return `
    <div style="text-align:center;color:#000;margin-bottom:5px;">
      <div style="font-size:${fontSize+(narrow ? 1 : 2)}px;font-weight:900;line-height:1.15;">${escapeHtml(s.shopName || 'Mr Laundry')}</div>
      <div style="font-size:${Math.max(9,fontSize-1)}px;font-weight:900;letter-spacing:.6px;margin-top:3px;padding:3px 0;border-top:1px dashed #000;border-bottom:1px dashed #000;">OFFICE COPY</div>
    </div>
  `;
}

function buildOfficeSlip(o, c, cashier, s, invoiceNo, totalPcs, delTypeInfo) {
  const paper = String(s.invoicePaper || '80');
  const narrow = paper === '58';
  const width = Math.max(220, Math.min(400, +s.officeCopyWidth || 280));
  const fontSize = narrow ? 10 : Math.max(11, Math.min(13, (+s.officeCopyFontSize || 11) + 1));
  return `
    <div class="invoice-page invoice-office" style="width:100%;max-width:${width}px;box-sizing:border-box;font-family:Arial,'Helvetica Neue',sans-serif;font-size:${fontSize}px;line-height:1.3;font-weight:500;color:#000;background:#fff;padding:${narrow ? 6 : 9}px;">
      ${buildOfficeBrandHeader(s, fontSize, narrow)}
      ${buildInvoiceHero(invoiceNo, totalPcs, delTypeInfo, fontSize, narrow)}
      ${buildOfficeMetaTable(o, c, cashier, fontSize)}
      ${buildOfficeItemTable(o, fontSize)}
    </div>
  `;
}
/* ============================================================
   WHATSAPP INVOICE
   ============================================================ */
function normalizeWhatsAppPhone(rawPhone) {
  let phone = String(rawPhone || '').replace(/[^\d+]/g, '');
  if (phone.startsWith('+')) phone = phone.substring(1);
  // Pakistan local mobile format: 03XXXXXXXXX -> international 923XXXXXXXXX.
  if (phone.startsWith('0') && phone.length === 11) phone = '92' + phone.substring(1);
  return phone.replace(/\D/g, '');
}

function openWhatsAppWithInvoice(phone, message) {
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  const tab = window.open(url, '_blank');
  if (!tab) {
    if (typeof toast === 'function') toast('WhatsApp popup was blocked. Allow popups or copy the message.', 'warning');
    return false;
  }
  return true;
}

function sharePreparedInvoicePdf(blob, invoiceNo, message, phone) {
  const filename = invoicePdfFilename(invoiceNo);
  const fallback = () => {
    downloadInvoicePdf(blob, filename);
    const fallbackMessage = `${message}\n\nInvoice PDF downloaded — please attach it to this WhatsApp chat.`;
    openWhatsAppWithInvoice(phone, fallbackMessage);
    if (typeof toast === 'function') toast('PDF downloaded. Attach it in WhatsApp before sending.', 'success');
  };

  let file = null;
  try {
    if (typeof File === 'function') file = new File([blob], filename, { type: 'application/pdf' });
    if (file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      // Call share synchronously in the click handler so mobile browsers keep
      // the required user activation. WhatsApp can then be selected in its sheet.
      let sharePromise;
      try {
        sharePromise = navigator.share({ files: [file], title: `Invoice ${invoiceNo}`, text: message });
      } catch (error) {
        if (error && error.name === 'AbortError') return;
        console.warn('[Invoice PDF] Native share could not start; using download fallback.', error);
        fallback();
        return;
      }
      Promise.resolve(sharePromise).then(() => {
        if (typeof toast === 'function') toast('Share sheet opened. Choose WhatsApp, select the customer, then tap Send.', 'success');
      }).catch(error => {
        if (error && error.name === 'AbortError') {
          if (typeof toast === 'function') toast('Sharing cancelled.', 'warning');
          return;
        }
        console.warn('[Invoice PDF] Native share failed; downloading the PDF instead.', error);
        downloadInvoicePdf(blob, filename);
        if (typeof toast === 'function') toast('PDF downloaded. Open WhatsApp and attach it to the customer chat.', 'warning');
      });
      return;
    }
  } catch (error) {
    console.warn('[Invoice PDF] File sharing is unavailable; using download fallback.', error);
  }
  fallback();
}

function sendWhatsAppInvoice(o, c, s, invoiceNo, totalPcs, delTypeInfo) {
  if (!c.phone) { toast('Customer phone number missing', 'error'); return; }

  const phone = normalizeWhatsAppPhone(c.phone);
  if (!phone) { toast('Customer phone number is invalid', 'error'); return; }

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
    '{name}':     c.name || 'Customer',
    '{shop}':     s.shopName || 'Laundry',
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
  Object.entries(vars).forEach(([k,v]) => { msg = msg.split(k).join(String(v == null ? '' : v)); });

  openModal(`
    <h3>📱 Send Invoice via WhatsApp</h3>
    <p class="sub">Sending to: <b>${escapeHtml(c.name || 'Customer')}</b> (${escapeHtml(c.phone)}) → WhatsApp: <code>+${escapeHtml(phone)}</code></p>
    <div class="field">
      <label>Message Preview (you can edit before sending)</label>
      <textarea id="waMsg" rows="14" style="width:100%;padding:12px;border:1px solid var(--border);border-radius:8px;font-family:inherit;font-size:13px;">${escapeHtml(msg)}</textarea>
    </div>
    <label for="waIncludePdf" style="display:flex;align-items:flex-start;gap:10px;padding:12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:9px;margin:12px 0;cursor:pointer;">
      <input type="checkbox" id="waIncludePdf" style="margin-top:3px;"/>
      <span><b>Attach polished invoice PDF</b><small style="display:block;color:var(--text-soft);margin-top:3px;">When supported, choose WhatsApp in the share sheet. Otherwise the PDF downloads and WhatsApp opens so you can attach it manually.</small></span>
    </label>
    <div id="waPdfStatus" style="display:none;font-size:12px;color:var(--text-soft);margin:0 0 12px;"></div>
    <div style="background:var(--surface-alt);padding:10px;border-radius:8px;font-size:12px;color:var(--text-soft);margin-bottom:14px;">
      💡 WhatsApp opens with the regular invoice/payment message. A browser cannot attach a file through a wa.me link; on supported phones, use the share sheet, or attach the downloaded PDF manually.
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-secondary" id="copyBtn">📋 Copy Text</button>
      <button class="btn btn-success" id="sendBtn">📱 Open WhatsApp</button>
    </div>
  `, { large: true, onOpen(m) {
    const includePdf = $('#waIncludePdf', m);
    const pdfStatus = $('#waPdfStatus', m);
    const sendBtn = $('#sendBtn', m);
    let pdfBlob = null;
    let pdfPromise = null;
    let pdfError = false;

    const setSendState = () => {
      if (includePdf.checked && !pdfBlob) {
        sendBtn.disabled = !!pdfPromise;
        sendBtn.textContent = pdfPromise ? '⏳ Preparing invoice PDF…' : (pdfError ? '↻ Retry PDF' : '📎 Prepare invoice PDF');
      } else {
        sendBtn.disabled = false;
        sendBtn.textContent = includePdf.checked ? '📎 Share PDF + WhatsApp' : '📱 Open WhatsApp';
      }
    };

    const preparePdf = () => {
      if (pdfBlob || pdfPromise) return pdfPromise;
      pdfError = false;
      pdfStatus.style.display = 'block';
      pdfStatus.textContent = 'Creating the customer-copy PDF from the current shop branding and invoice settings…';
      pdfPromise = buildCustomerInvoicePdfBlob(o, c, s, invoiceNo, totalPcs, delTypeInfo)
        .then(blob => {
          pdfBlob = blob;
          pdfStatus.textContent = 'Invoice PDF is ready. Tap “Share PDF + WhatsApp” to continue.';
          return blob;
        })
        .catch(error => {
          pdfError = true;
          console.error('[Invoice PDF]', error);
          pdfStatus.textContent = error.message || 'Could not create the PDF. Retry, or uncheck the option to send the message only.';
          if (typeof toast === 'function') toast(error.message || 'Could not create invoice PDF.', 'error');
          throw error;
        })
        .finally(() => {
          pdfPromise = null;
          setSendState();
        });
      // Prevent an unhandled rejection when the user toggles PDF on and then
      // chooses to send only the text message.
      pdfPromise.catch(() => {});
      setSendState();
      return pdfPromise;
    };

    $('#copyBtn', m).onclick = () => {
      const text = $('#waMsg', m).value;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => toast('Message copied to clipboard','success'))
          .catch(() => toast('Could not copy message. Select and copy it manually.', 'warning'));
      } else {
        toast('Clipboard is unavailable. Select and copy the message manually.', 'warning');
      }
    };

    includePdf.onchange = () => {
      if (includePdf.checked) preparePdf();
      setSendState();
    };

    sendBtn.onclick = () => {
      const text = $('#waMsg', m).value;
      if (includePdf.checked) {
        if (!pdfBlob) {
          if (pdfPromise) {
            if (typeof toast === 'function') toast('Please wait for the invoice PDF to finish preparing.', 'warning');
          } else {
            preparePdf();
          }
          return;
        }
        sharePreparedInvoicePdf(pdfBlob, invoiceNo, text, phone);
        closeModal();
        return;
      }
      openWhatsAppWithInvoice(phone, text);
      closeModal();
      if (typeof toast === 'function') toast('Opening WhatsApp…', 'success');
    };
  }});
}

/* ============================================================
   INVOICE CUSTOMIZER (admin)
   ============================================================ */
function openInvoiceCustomizer(reopenOrderId) {
  const s = DB.settings();
  const paperSetting = String(s.invoicePaper || '80');
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

    <div class="card" style="padding:14px;margin-bottom:14px;background:var(--surface-alt);border:1px solid var(--border);">
      <div style="font-weight:700;margin-bottom:10px;">🖨️ Brand Logo on Invoice (Thermal)</div>
      <div class="form-row">
        <div class="field">
          <label>Printer Paper Width</label>
          <select id="cfPaper">
            <option value="58" ${paperSetting==='58'?'selected':''}>58mm — small receipt</option>
            <option value="80" ${paperSetting==='80'?'selected':''}>80mm — standard (default)</option>
          </select>
          <small style="color:var(--text-soft);">58mm ≈ 48mm printable · 80mm ≈ 72mm printable</small>
        </div>
        <div class="field">
          <label>Page Margin (mm)</label>
          <select id="cfMargin">
            <option value="0" ${s.invoiceMarginMm==0?'selected':''}>0mm — edge to edge</option>
            <option value="2" ${(s.invoiceMarginMm==null||s.invoiceMarginMm==2)?'selected':''}>2mm — recommended</option>
            <option value="4" ${s.invoiceMarginMm==4?'selected':''}>4mm — safer for cheap printers</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="field">
          <label>Logo Width on Paper</label>
          <select id="cfLogoSize">
            <option value="40" ${s.invoiceLogoSize==40?'selected':''}>Small (40%)</option>
            <option value="62" ${(!s.invoiceLogoSize||s.invoiceLogoSize==62)?'selected':''}>Medium (62%) — recommended</option>
            <option value="80" ${s.invoiceLogoSize==80?'selected':''}>Large (80%)</option>
            <option value="100" ${s.invoiceLogoSize==100?'selected':''}>Full width (100%)</option>
          </select>
        </div>
      </div>
      <label style="display:flex;align-items:center;gap:8px;margin-top:4px;">
        <input type="checkbox" id="cfLogoMono" ${s.invoiceLogoMono!==false?'checked':''}/>
        <span><b>Thermal-optimise the logo</b>
          <small style="display:block;color:var(--text-soft);font-weight:400;margin-top:2px;">
            Converts to pure black &amp; white, flattens transparency to white, and auto-inverts dark logos so they never print as a black block.
          </small>
        </span>
      </label>
      <div id="logoPreviewBox" style="margin-top:12px;text-align:center;background:#fff;border:1px dashed var(--border);border-radius:8px;padding:10px;">
        <div style="font-size:11px;color:var(--text-soft);margin-bottom:8px;">Preview — exactly what the thermal head will burn</div>
        <div id="logoPreviewInner" style="min-height:40px;">…</div>
        <div id="logoPreviewMeta" style="font-size:11px;color:var(--text-soft);margin-top:8px;"></div>
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
      <div style="font-weight:700;margin-bottom:6px;">👁️ What to Show on Customer Copy</div>
      <div style="font-size:11px;color:var(--text-soft);margin-bottom:10px;">Invoice number, pieces, hanger/fold type, shop timings, Terms &amp; Conditions, cut marker, and any applicable discount amount are always included. Manual and loyalty discounts are itemized when available.</div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;font-size:13px;">
        ${invToggle('invoiceShowLogo', '🏷️ Shop Logo', s.invoiceShowLogo)}
        ${invToggle('invoiceShowTagline', '📝 Shop Tagline', s.invoiceShowTagline)}
        ${invToggle('invoiceShowAddress', '🏠 Shop Address', s.invoiceShowAddress)}
        ${invToggle('invoiceShowPhone', '📞 Shop Phone', s.invoiceShowPhone)}
        ${invToggle('invoiceShowCashier', '👤 Cashier Name', s.invoiceShowCashier)}
        ${invToggle('invoiceShowItemBreakdown', '📋 Item-by-Item List', s.invoiceShowItemBreakdown)}
        ${invToggle('invoiceShowPaymentMethod', '💳 Payment Method', s.invoiceShowPaymentMethod)}
        ${invToggle('invoiceShowNotes', '📝 Order Notes', s.invoiceShowNotes)}
        ${invToggle('invoiceShowQR', '🔳 QR Code', s.invoiceShowQR)}
        ${invToggle('invoiceShowFooter', '💬 Footer Message', s.invoiceShowFooter)}
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
        <label>📜 Short Terms on Receipt <small style="color:var(--text-soft);font-weight:400;">(used as a fallback if full shop terms are empty)</small></label>
        <textarea id="cfTerms" rows="2" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;">${escapeHtml(s.invoiceTerms||'')}</textarea>
      </div>
    </div>
    <div class="form-row cols-1">
      <div class="field">
        <label>🌐 Full Terms &amp; Conditions (invoice + Customer Portal)
          <small style="color:var(--text-soft);font-weight:400;display:block;margin-top:2px;">These shop terms print on the customer invoice and also appear in a collapsible card on portal.html. Keep them concise for thermal paper. 📜</small>
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
    /* ---- live thermal logo preview ---- */
    const renderLogoPreview = async () => {
      const box = $('#logoPreviewInner', m);
      const meta = $('#logoPreviewMeta', m);
      if (!box) return;
      const cur = DB.settings();
      const test = Object.assign({}, cur, {
        invoicePaper: $('#cfPaper', m).value,
        invoiceLogoSize: +($('#cfLogoSize', m).value || 62),
        invoiceLogoMono: $('#cfLogoMono', m).checked
      });

      if (!cur.logoImage) {
        box.innerHTML = '<div style="padding:10px;color:var(--text-soft);font-size:12px;">No logo uploaded — the shop NAME will be printed instead.</div>';
        if (meta) meta.textContent = '';
        return;
      }

      if (!test.invoiceLogoMono) {
        box.innerHTML = '<div style="padding:10px;color:var(--text-soft);font-size:12px;">Thermal optimisation is OFF — the original colour logo will print.<br><b>Warning:</b> dark logos may print as a solid black block.</div>';
        if (meta) meta.textContent = '';
        return;
      }

      box.innerHTML = '<div style="padding:10px;color:var(--text-soft);font-size:12px;">Preparing preview…</div>';
      try {
        if (typeof THERMAL === 'undefined') throw new Error('thermal module missing');
        THERMAL.clearCache();
        const res = await THERMAL.prepare(test, {});
        if (!res) throw new Error('could not process');
        const mm = THERMAL.targetMm(test);
        const dots = THERMAL.targetDots(test);
        box.innerHTML = '<img src="' + res.dataUrl + '" style="width:' + mm + 'mm;max-width:100%;image-rendering:pixelated;background:#fff;border:1px solid #eee;padding:2px;"/>';
        if (meta) {
          meta.innerHTML = '📐 ' + mm + 'mm wide on paper (' + dots + ' dots) · ' +
            res.w + '×' + res.h + 'px · ' +
            (res.inverted ? '🔄 auto-inverted (dark logo)' : '◻️ used as-is');
        }
      } catch (e) {
        box.innerHTML = '<div style="padding:10px;color:var(--danger);font-size:12px;">Preview unavailable: ' + escapeHtml(e.message) + '</div>';
      }
    };

    ['cfPaper', 'cfLogoSize'].forEach(id => {
      const el = $('#' + id, m);
      if (el) el.onchange = renderLogoPreview;
    });
    const monoEl = $('#cfLogoMono', m);
    if (monoEl) monoEl.onchange = renderLogoPreview;
    renderLogoPreview();

    const collect = () => {
      const patch = {
        invoiceFontSize: Math.max(10, Math.min(20, +$('#cfFont', m).value || 13)),
        invoiceWidth: +$('#cfWidth', m).value || 360,
        invoicePaper: $('#cfPaper', m).value === '58' ? '58' : '80',
        invoiceLogoSize: +($('#cfLogoSize', m).value || 62),
        invoiceLogoMono: $('#cfLogoMono', m).checked,
        invoiceMarginMm: +($('#cfMargin', m).value || 0),
        invoiceFooter: $('#cfFooter', m).value,
        invoiceTerms: $('#cfTerms', m).value,
        portalTerms: $('#cfPortalTerms', m).value,
        invoiceShowDiscount: true,
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

/* ============================================================
   B2B ZERO-CASH DELIVERY CHALLAN (Thermal)
   ============================================================ */
function printChallan(orderId) {
  const o = DB.get('orders', orderId);
  if (!o) return;
  const c = DB.get('customers', o.customerId) || { name: 'Customer' };
  const s = DB.settings();
  const challanNo = o.invoiceNo ? `CH-${o.invoiceNo}` : 'CH-' + o.id.slice(-6).toUpperCase();
  const totalPcs = getOrderTotalPieces(o);
  
  const width = Math.max(280, Math.min(400, +s.invoiceWidth || 300));
  const fontSize = Math.max(12, Math.min(20, (+s.invoiceFontSize || 13)));

  const html = `
    <div style="font-family:'Courier New', Courier, monospace; width:${width}px; padding:10px; color:#000; box-sizing:border-box;">
      <div style="text-align:center; margin-bottom:12px; border-bottom:2px dashed #000; padding-bottom:8px;">
        <div style="font-size:${fontSize+6}px; font-weight:900; margin-bottom:4px;">${escapeHtml(s.shopName)}</div>
        <div style="font-size:${fontSize}px; font-weight:bold; background:#000; color:#fff; display:inline-block; padding:4px 8px; letter-spacing:1px;">DELIVERY CHALLAN</div>
      </div>
      
      <div style="font-size:${fontSize}px; line-height:1.5; margin-bottom:12px;">
        <b>Client:</b> ${escapeHtml(c.name)}<br>
        <b>Challan #:</b> ${challanNo}<br>
        <b>Date:</b> ${fmtDate(o.createdAt)}<br>
        <b>Type:</b> B2B / Corporate
      </div>
      
      <table style="width:100%; font-size:${fontSize}px; border-collapse:collapse; margin-bottom:14px; border-top:2px solid #000; border-bottom:2px solid #000;">
        <thead>
          <tr>
            <th style="text-align:left; padding:6px 0; border-bottom:1px dashed #000;">Item Description</th>
            <th style="text-align:right; padding:6px 0; border-bottom:1px dashed #000;">Qty</th>
          </tr>
        </thead>
        <tbody>
          ${(o.items||[]).map(it => `
            <tr>
              <td style="padding:6px 0; font-weight:bold;">${escapeHtml(it.name)}</td>
              <td style="text-align:right; font-weight:bold; font-size:${fontSize+2}px;">${it.qty}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div style="text-align:right; font-weight:900; font-size:${fontSize+2}px; margin-bottom:20px;">
        Total Pieces: ${totalPcs}
      </div>
      
      <div style="text-align:center; font-size:${fontSize-2}px; font-weight:bold; border:2px solid #000; padding:6px; margin-bottom:30px; border-radius:4px;">
        * ZERO CASH MEMO *<br>Billed to Monthly Statement
      </div>
      
      <div style="border-top:1px solid #000; text-align:center; padding-top:6px; font-size:${fontSize-1}px; font-weight:bold; margin-bottom:14px; width:80%; margin-left:10%;">
        Receiver Signature & Stamp
      </div>
    </div>
  `;

  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  if (typeof printElement === 'function') printElement(wrap, { title: 'Delivery Challan' });
}
window.printChallan = printChallan;
