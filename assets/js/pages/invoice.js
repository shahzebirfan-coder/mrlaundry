/* ============================================================
   Invoice — view + print
   ============================================================ */
function openInvoice(orderId) {
  const o = DB.get('orders', orderId);
  if (!o) { toast('Order not found', 'error'); return; }
  const c = DB.get('customers', o.customerId) || { name: 'Walk-in Customer' };
  const cashier = DB.get('users', o.cashierId) || { name: o.cashierName || '-' };
  const s = DB.settings();
  const invoiceNo = `INV-${o.invoiceNo}`;
  const totalPcs = (o.items || []).reduce((sum, it) => sum + (it.qty || 0), 0);
  const cur = s.currency;

  openModal(`
    <div class="modal-header no-print">
      <div class="modal-title">🧾 Invoice ${invoiceNo}</div>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div id="printArea" style="background:white;padding:20px;color:#000;font-family:monospace;font-size:13px;line-height:1.4;max-width:380px;margin:0 auto;border:1px solid #ddd">
        <div style="text-align:center;border-bottom:2px dashed #000;padding-bottom:10px;margin-bottom:10px">
          <div style="font-size:28px">${s.logo || '🧺'}</div>
          <h2 style="margin:6px 0">${escapeHtml(s.shopName)}</h2>
          ${s.tagline ? `<div style="font-size:11px">${escapeHtml(s.tagline)}</div>` : ''}
          ${s.address ? `<div style="font-size:11px">${escapeHtml(s.address)}</div>` : ''}
          ${s.phone ? `<div style="font-size:11px">📞 ${escapeHtml(s.phone)}</div>` : ''}
        </div>

        <div style="display:flex;justify-content:space-between;margin-bottom:10px">
          <div><strong>INVOICE</strong></div>
          <div><strong>${invoiceNo}</strong></div>
        </div>
        <div style="background:#f5f5f5;padding:8px;border-radius:4px;text-align:center;margin-bottom:10px">
          <div style="font-size:32px;font-weight:bold">${totalPcs}</div>
          <div style="font-size:10px;text-transform:uppercase">Total Pieces</div>
        </div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:10px">
          <tr><td><strong>Customer:</strong></td><td>${escapeHtml(c.name)}</td></tr>
          ${c.phone ? `<tr><td><strong>Phone:</strong></td><td>${escapeHtml(c.phone)}</td></tr>` : ''}
          <tr><td><strong>Cashier:</strong></td><td>${escapeHtml(cashier.name)}</td></tr>
          <tr><td><strong>Delivery:</strong></td><td><strong>${o.deliveryDate || '-'}</strong></td></tr>
          <tr><td><strong>Date:</strong></td><td>${fmtDateTime(o.createdAt)}</td></tr>
          ${c.loyaltyActive ? `<tr><td><strong>Loyalty:</strong></td><td>⭐ ${escapeHtml(c.loyaltyNo || '')} (${c.loyaltyDiscountPercent}%)</td></tr>` : ''}
        </table>

        <div style="border-top:1px dashed #000;border-bottom:1px dashed #000;padding:8px 0;margin-bottom:10px">
          ${(o.items || []).map(it => `
            <div style="display:flex;justify-content:space-between;padding:3px 0">
              <div>${escapeHtml(it.name)}</div>
              <div>${it.qty} × ${cur} ${it.price}</div>
            </div>
            <div style="text-align:right;font-size:11px">= ${cur} ${it.price * it.qty}</div>
          `).join('')}
        </div>

        <table style="width:100%;margin-bottom:10px">
          <tr><td>Subtotal:</td><td style="text-align:right">${fmtMoney(o.subtotal)}</td></tr>
          ${o.manualDiscount > 0 ? `<tr><td>Discount:</td><td style="text-align:right">− ${fmtMoney(o.manualDiscount)}</td></tr>` : ''}
          ${o.loyaltyDiscount > 0 ? `<tr><td>⭐ Loyalty:</td><td style="text-align:right">− ${fmtMoney(o.loyaltyDiscount)}</td></tr>` : ''}
          ${o.tax > 0 ? `<tr><td>Tax:</td><td style="text-align:right">${fmtMoney(o.tax)}</td></tr>` : ''}
          <tr style="border-top:2px solid #000"><td><strong>TOTAL:</strong></td><td style="text-align:right"><strong style="font-size:18px">${fmtMoney(o.total)}</strong></td></tr>
          <tr><td>Paid:</td><td style="text-align:right">${fmtMoney(o.paid)}</td></tr>
          ${o.due > 0 ? `<tr><td><strong>Due:</strong></td><td style="text-align:right;color:red"><strong>${fmtMoney(o.due)}</strong></td></tr>` : ''}
          <tr><td>Payment:</td><td style="text-align:right">${escapeHtml(o.paymentMethod || '-')}</td></tr>
          <tr><td>Status:</td><td style="text-align:right"><strong>${(o.status || 'pending').toUpperCase()}</strong></td></tr>
        </table>

        ${o.deliveryType ? `<div style="text-align:center;margin:10px 0"><strong>📦 ${o.deliveryType.toUpperCase()}</strong></div>` : ''}

        ${o.notes ? `<div style="border-top:1px dashed #000;padding-top:8px;margin-top:10px;font-size:11px"><strong>Notes:</strong> ${escapeHtml(o.notes)}</div>` : ''}

        <div style="text-align:center;margin-top:16px;padding-top:10px;border-top:1px dashed #000;font-size:11px">
          ${escapeHtml(s.invoiceFooter || 'Thank you!')}
        </div>

        ${s.invoiceTerms ? `<div style="margin-top:10px;font-size:9px;color:#666;text-align:center">${escapeHtml(s.invoiceTerms)}</div>` : ''}
      </div>
    </div>
    <div class="modal-footer no-print">
      <button class="btn btn-secondary" onclick="closeModal()">Close</button>
      <button class="btn btn-primary" onclick="printInvoice()">🖨️ Print</button>
    </div>
  `, { large: true });
}

function printInvoice() {
  const content = document.getElementById('printArea');
  if (!content) return;
  const win = window.open('', '_blank', 'width=400,height=600');
  win.document.write(`
    <html>
      <head>
        <title>Invoice</title>
        <style>
          body { margin: 0; padding: 10px; font-family: monospace; }
          @page { size: 80mm auto; margin: 0; }
        </style>
      </head>
      <body>${content.innerHTML}</body>
    </html>
  `);
  win.document.close();
  setTimeout(() => win.print(), 300);
}
