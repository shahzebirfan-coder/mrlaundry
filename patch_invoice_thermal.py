import sys

with open('assets/js/pages/invoice.js', 'r') as f:
    content = f.read()

def replace_between(content, start_marker, end_marker, new_text):
    start = content.find(start_marker)
    if start == -1: return content
    end = content.find(end_marker, start)
    if end == -1: return content
    return content[:start] + new_text + content[end:]

new_customer = """function buildCustomerSlip(o, c, cashier, s, invoiceNo, totalPcs, delTypeInfo) {
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
  // Bumping default sizes to make it clearer for thermal
  const fontSize = Math.max(12, Math.min(24, (+s.invoiceFontSize || 13) + 2));
  const width = Math.max(280, Math.min(800, +s.invoiceWidth || 360));

  const itemsHtml = (o.items || []).map(it => `
    <tr>
      <td style="padding:6px 0;font-size:${fontSize+1}px;font-weight:bold;">${escapeHtml(it.name)}<br><span style="font-size:${fontSize-1}px;font-weight:normal;">${it.qty} × ${fmtMoney(it.price)}</span></td>
      <td style="text-align:right;padding:6px 0;font-size:${fontSize+1}px;font-weight:bold;">${fmtMoney(it.qty*it.price)}</td>
    </tr>
  `).join('');

  const logoBlock = showLogo ? (s.logoImage
    ? `<div style="text-align:center;margin-bottom:8px;"><img src="${s.logoImage}" style="max-width:${Math.min(200,width*0.6)}px;max-height:100px;object-fit:contain;background:#fff;padding:4px;"/></div>`
    : `<div style="text-align:center;font-size:${fontSize+18}px;font-weight:900;line-height:1.2;">${escapeHtml(s.shopName)}</div>`) : '';

  const totalDisc = (o.discount || ((o.manualDiscount||0) + (o.loyaltyDiscount||0)));
  const discountLines = showDiscount ? `
    ${o.manualDiscount>0 ? `<tr><td style="padding:4px 0;">Discount:</td><td style="text-align:right;padding:4px 0;">- ${fmtMoney(o.manualDiscount)}</td></tr>` : ''}
    ${o.loyaltyDiscount>0 ? `<tr><td style="padding:4px 0;">Loyalty:</td><td style="text-align:right;padding:4px 0;">- ${fmtMoney(o.loyaltyDiscount)}</td></tr>` : ''}
    ${(!o.manualDiscount && !o.loyaltyDiscount && totalDisc>0) ? `<tr><td style="padding:4px 0;">Discount:</td><td style="text-align:right;padding:4px 0;">- ${fmtMoney(totalDisc)}</td></tr>` : ''}
  ` : '';

  return `
    <div class="invoice-page invoice-customer" style="max-width:${width}px;font-size:${fontSize}px;background:#fff;padding:16px;">
      ${logoBlock}
      <div style="text-align:center;font-size:${fontSize}px;margin-bottom:12px;line-height:1.4;">
        ${showTagline && s.tagline ? '<b>'+escapeHtml(s.tagline)+'</b><br>':''}
        ${showAddress && s.address ? escapeHtml(s.address)+'<br>':''}
        ${showPhone && s.phone ? escapeHtml(s.phone):''}
      </div>
      
      <div style="text-align:center;font-size:${fontSize+2}px;font-weight:900;margin:12px 0;letter-spacing:1px;color:#000;padding:6px 0;border-top:2px dashed #000;border-bottom:2px dashed #000;">★ CUSTOMER COPY ★</div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div style="display:inline-block;background:#fff;color:#000;border:2px solid #000;border-radius:10px;padding:8px 14px;flex:1;margin-right:12px;text-align:center;">
          <div style="font-size:${fontSize-2}px;font-weight:800;letter-spacing:1px;">INVOICE NO.</div>
          <div style="font-size:${fontSize+12}px;font-weight:900;line-height:1.2;letter-spacing:1px;">${invoiceNo}</div>
        </div>
        ${showQtyCircle ? `
          <div style="border:2px solid #000;border-radius:50%;min-width:70px;height:70px;display:flex;flex-direction:column;justify-content:center;align-items:center;background:#fff;color:#000;">
            <div style="font-size:${fontSize+10}px;font-weight:900;line-height:1;">${totalPcs}</div>
            <div style="font-size:${fontSize-4}px;font-weight:800;line-height:1;margin-top:2px;">PCS</div>
          </div>
        ` : ''}
      </div>

      ${showDelType ? `
        <div style="text-align:center;margin-bottom:16px;">
          <span style="font-size:${fontSize+2}px;font-weight:900;border:2px solid #000;border-radius:16px;padding:6px 20px;display:inline-block;">${delTypeInfo.icon} ${delTypeInfo.label}</span>
        </div>
      ` : ''}

      <table style="font-size:${fontSize+1}px;width:100%;border-collapse:collapse;margin-bottom:12px;line-height:1.5;">
        <tr><td style="padding:6px 0;border-top:1px dashed #000;font-weight:bold;">Booking Date</td><td style="text-align:right;padding:6px 0;border-top:1px dashed #000;">${fmtDate(o.createdAt)}</td></tr>
        ${o.deliveryDate? `<tr><td style="padding:6px 0;border-top:1px dashed #000;font-weight:bold;">Delivery Date</td><td style="text-align:right;padding:6px 0;border-top:1px dashed #000;color:#000;"><b>${escapeHtml(o.deliveryDate)}</b></td></tr>`:''}
        ${showCashier ? `<tr><td style="padding:6px 0;border-top:1px dashed #000;font-weight:bold;">Cashier</td><td style="text-align:right;padding:6px 0;border-top:1px dashed #000;">${escapeHtml(cashier.name)}</td></tr>`:''}
        <tr><td style="padding:6px 0;border-top:1px dashed #000;font-size:${fontSize+2}px;font-weight:bold;">Customer</td><td style="text-align:right;padding:6px 0;border-top:1px dashed #000;font-size:${fontSize+3}px;"><b>${escapeHtml(c.name)}</b></td></tr>
        ${c.phone? `<tr><td style="padding:6px 0;border-top:1px dashed #000;font-size:${fontSize+2}px;font-weight:bold;">Phone</td><td style="text-align:right;padding:6px 0;border-top:1px dashed #000;font-size:${fontSize+3}px;"><b>${escapeHtml(c.phone)}</b></td></tr>`:''}
      </table>

      ${showItems ? `
        <table style="font-size:${fontSize+1}px;width:100%;border-collapse:collapse;margin-bottom:10px;line-height:1.5;">
          <tr style="border-top:2px solid #000;border-bottom:2px solid #000;">
            <td style="padding:8px 0;font-weight:900;font-size:${fontSize+2}px;">ITEMS</td>
            <td style="text-align:right;padding:8px 0;font-weight:900;font-size:${fontSize+2}px;">TOTAL</td>
          </tr>
          ${itemsHtml}
        </table>
      ` : ''}

      <table style="font-size:${fontSize+2}px;width:100%;border-collapse:collapse;line-height:1.5;">
        <tr style="border-top:2px solid #000;"><td style="padding:8px 0;font-weight:bold;">Total</td><td style="text-align:right;padding:8px 0;font-weight:bold;font-size:${fontSize+4}px;">${fmtMoney(o.total)}</td></tr>
        ${discountLines}
        ${o.tax>0?`<tr><td style="padding:6px 0;">Tax</td><td style="text-align:right;padding:6px 0;">${fmtMoney(o.tax)}</td></tr>`:''}
        <tr><td style="padding:6px 0;">Paid</td><td style="text-align:right;padding:6px 0;">${fmtMoney(o.paid)}</td></tr>
        ${o.due>0?`<tr><td style="padding:8px 0;font-size:${fontSize+4}px;font-weight:900;"><b style="color:#000;">Payment Due</b></td><td style="text-align:right;padding:8px 0;font-size:${fontSize+4}px;"><b style="color:#000;font-weight:900;">${fmtMoney(o.due)}</b></td></tr>`:''}
        ${o.due==0?`<tr><td style="padding:8px 0;font-size:${fontSize+4}px;font-weight:900;"><b style="color:#000;">Payment</b></td><td style="text-align:right;padding:8px 0;font-size:${fontSize+4}px;"><b style="color:#000;font-weight:900;">${fmtMoney(o.total)}</b></td></tr>`:''}
      </table>

      ${showNotes && o.notes?`<div style="font-size:${fontSize}px;font-weight:bold;margin-top:16px;padding:8px;border:2px dashed #000;">📝 ${escapeHtml(o.notes)}</div>`:''}
      ${showTerms && s.invoiceTerms?`<div style="font-size:${fontSize-1}px;text-align:center;margin-top:16px;padding-top:12px;border-top:2px dashed #000;font-weight:bold;">${escapeHtml(s.invoiceTerms)}</div>`:''}
      
      ${showQR ? `<div style="text-align:center;margin-top:20px;"><canvas class="invQR"></canvas></div>` : ''}
      ${showFooter ? `<div style="text-align:center;font-size:${fontSize+2}px;font-weight:900;margin-top:16px;">${escapeHtml(s.invoiceFooter || '')}</div>` : ''}
    </div>
  `;
}
"""

new_office = """function buildOfficeSlip(o, c, cashier, s, invoiceNo, totalPcs, delTypeInfo) {
  const width = Math.max(220, Math.min(400, +s.officeCopyWidth || 280));
  const fontSize = Math.max(10, Math.min(20, (+s.officeCopyFontSize || 11) + 2));

  return `
    <div class="invoice-page invoice-office" style="max-width:${width}px;font-size:${fontSize}px;padding:16px;background:#fff;border:1px dashed #ccc;">
      <div style="text-align:center;font-weight:900;font-size:${fontSize+8}px;margin-bottom:8px;color:#000;line-height:1.2;">
        ${escapeHtml(s.shopName)}
      </div>
      <div style="text-align:center;font-weight:900;font-size:${fontSize+2}px;display:flex;align-items:center;justify-content:center;margin-bottom:14px;color:#000;">
        <hr style="flex:1; border:none; border-top:2px solid #000; margin-right:8px;">
        OFFICE COPY
        <hr style="flex:1; border:none; border-top:2px solid #000; margin-left:8px;">
      </div>

      <div style="text-align:center;margin-bottom:16px;">
        <div style="display:inline-block;background:#fff;color:#000;border:2px solid #000;border-radius:10px;padding:8px 24px;">
          <div style="font-size:${fontSize}px;font-weight:800;letter-spacing:1px;margin-bottom:2px;">INVOICE NO.</div>
          <div style="font-size:${fontSize+14}px;font-weight:900;line-height:1.1;">${invoiceNo}</div>
        </div>
      </div>

      <table style="font-size:${fontSize+1}px;width:100%;border-collapse:collapse;border:2px solid #000;margin-bottom:14px;background:#fff;line-height:1.5;">
        <tr><td style="border:1px solid #000;padding:6px 8px;font-weight:bold;">Booked:</td><td style="border:1px solid #000;padding:6px 8px;">${fmtDateShort(o.createdAt)}</td></tr>
        ${o.deliveryDate? `<tr><td style="border:1px solid #000;padding:6px 8px;font-weight:bold;">Delivery:</td><td style="border:1px solid #000;padding:6px 8px;color:#000;"><b>${escapeHtml(o.deliveryDate)}</b></td></tr>`:''}
        <tr><td style="border:1px solid #000;padding:6px 8px;font-weight:bold;">Customer:</td><td style="border:1px solid #000;padding:6px 8px;font-size:${fontSize+3}px;"><b>${escapeHtml(c.name)}</b></td></tr>
        ${c.phone? `<tr><td style="border:1px solid #000;padding:6px 8px;font-weight:bold;">Phone:</td><td style="border:1px solid #000;padding:6px 8px;font-size:${fontSize+2}px;"><b>${escapeHtml(c.phone)}</b></td></tr>`:''}
        <tr><td style="border:1px solid #000;padding:6px 8px;font-weight:bold;">By:</td><td style="border:1px solid #000;padding:6px 8px;">${escapeHtml(cashier.name)}</td></tr>
      </table>

      <div style="display:flex;gap:8px;margin-bottom:16px;">
        <div style="flex:1;border:2px solid #000;border-radius:6px;overflow:hidden;display:flex;flex-direction:column;background:#fff;">
          <div style="background:#fff;border-bottom:2px solid #000;color:#000;text-align:center;font-size:${fontSize}px;padding:6px 0;font-weight:900;">PIECES</div>
          <div style="text-align:center;font-size:${fontSize+10}px;font-weight:900;padding:8px 0;">${totalPcs}</div>
        </div>
        <div style="flex:2;border:2px solid #000;border-radius:6px;overflow:hidden;display:flex;flex-direction:column;background:#fff;">
          <div style="background:#fff;border-bottom:2px solid #000;color:#000;text-align:center;font-size:${fontSize}px;padding:6px 0;font-weight:900;">PACKAGING</div>
          <div style="text-align:center;font-size:${fontSize+4}px;font-weight:900;padding:8px 0;display:flex;align-items:center;justify-content:center;gap:4px;">
             ${delTypeInfo.icon} ${delTypeInfo.label}
          </div>
        </div>
      </div>

      <div style="border:2px solid #000; border-radius:6px; padding:10px; background:#fff;">
        <table style="font-size:${fontSize+2}px;width:100%;border-collapse:collapse;line-height:1.5;">
          ${(o.items || []).map(it => `
            <tr><td style="padding:6px 0;font-weight:bold;">${escapeHtml(it.name)} <span style="font-size:${fontSize+4}px;float:right;">×${it.qty}</span></td></tr>
          `).join('')}
        </table>
        <div style="border-top:2px solid #000; margin-top:8px; padding-top:8px;">
          <table style="font-size:${fontSize+3}px;width:100%;border-collapse:collapse;line-height:1.5;">
            <tr><td style="padding:4px 0;">Total</td><td style="text-align:right;padding:4px 0;font-weight:bold;">${fmtMoney(o.total)}</td></tr>
            <tr><td style="padding:4px 0;">Paid</td><td style="text-align:right;padding:4px 0;font-weight:bold;">${fmtMoney(o.paid)}</td></tr>
            ${o.due>0?`<tr><td style="padding:4px 0;color:#000;font-weight:900;">Due</td><td style="text-align:right;padding:4px 0;color:#000;font-weight:900;">${fmtMoney(o.due)}</td></tr>`:''}
          </table>
        </div>
      </div>

      ${s.invoiceShowQR !== false ? `<div style="text-align:center;margin-top:16px;"><canvas class="invQR" style="max-width:90px;"></canvas></div>`:''}
    </div>
  `;
}
"""

content = replace_between(content, "function buildCustomerSlip", "/* ============================================================\n   OFFICE COPY", new_customer)
content = replace_between(content, "function buildOfficeSlip", "/* ============================================================\n   WHATSAPP", new_office)

with open('assets/js/pages/invoice.js', 'w') as f:
    f.write(content)

