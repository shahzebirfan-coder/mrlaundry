import sys

with open('assets/js/pages/invoice.js', 'r') as f:
    content = f.read()

# Replace buildCustomerSlip and buildOfficeSlip
import re

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
  const fontSize = Math.max(10, Math.min(20, +s.invoiceFontSize || 13));
  const width = Math.max(280, Math.min(800, +s.invoiceWidth || 360));

  const itemsHtml = (o.items || []).map(it => `
    <tr>
      <td style="padding:4px 0;">${escapeHtml(it.name)} ×${it.qty}</td>
      <td style="text-align:right;padding:4px 0;">${fmtMoney(it.qty*it.price)}</td>
    </tr>
  `).join('');

  const logoBlock = showLogo ? (s.logoImage
    ? `<div style="text-align:center;margin-bottom:8px;"><img src="${s.logoImage}" style="max-width:${Math.min(200,width*0.6)}px;max-height:100px;object-fit:contain;background:#fff;padding:4px;"/></div>`
    : `<div style="text-align:center;font-size:${fontSize+18}px;font-weight:800;line-height:1.2;">${escapeHtml(s.shopName)}</div>`) : '';

  const totalDisc = (o.discount || ((o.manualDiscount||0) + (o.loyaltyDiscount||0)));
  const discountLines = showDiscount ? `
    ${o.manualDiscount>0 ? `<tr><td style="padding:2px 0;">Discount:</td><td style="text-align:right;">- ${fmtMoney(o.manualDiscount)}</td></tr>` : ''}
    ${o.loyaltyDiscount>0 ? `<tr><td style="padding:2px 0;">Loyalty:</td><td style="text-align:right;">- ${fmtMoney(o.loyaltyDiscount)}</td></tr>` : ''}
    ${(!o.manualDiscount && !o.loyaltyDiscount && totalDisc>0) ? `<tr><td style="padding:2px 0;">Discount:</td><td style="text-align:right;">- ${fmtMoney(totalDisc)}</td></tr>` : ''}
  ` : '';

  return `
    <div class="invoice-page invoice-customer" style="max-width:${width}px;font-size:${fontSize}px;background:#fff;padding:16px;">
      ${logoBlock}
      <div style="text-align:center;font-size:${fontSize-1}px;margin-bottom:8px;">
        ${showTagline && s.tagline ? '<b>'+escapeHtml(s.tagline)+'</b><br>':''}
        ${showAddress && s.address ? escapeHtml(s.address)+'<br>':''}
        ${showPhone && s.phone ? escapeHtml(s.phone):''}
      </div>
      <div style="text-align:center;font-size:${fontSize}px;font-weight:900;margin:10px 0;letter-spacing:1px;background:#000;color:#fff;padding:4px 0;border-radius:6px;">★ CUSTOMER COPY ★</div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div style="display:inline-block;background:#000;color:#fff;border-radius:10px;padding:6px 14px;flex:1;margin-right:12px;">
          <div style="font-size:${fontSize-3}px;font-weight:700;letter-spacing:1px;">INVOICE NO.</div>
          <div style="font-size:${fontSize+12}px;font-weight:900;line-height:1.1;letter-spacing:1px;">${invoiceNo}</div>
        </div>
        ${showQtyCircle ? `
          <div style="border:2px solid #000;border-radius:50%;min-width:60px;height:60px;display:flex;flex-direction:column;justify-content:center;align-items:center;background:#fff;color:#000;">
            <div style="font-size:${fontSize+8}px;font-weight:900;line-height:1;">${totalPcs}</div>
            <div style="font-size:${fontSize-5}px;font-weight:700;line-height:1;">TOTAL PCS</div>
          </div>
        ` : ''}
      </div>

      ${showDelType ? `
        <div style="text-align:center;margin-bottom:12px;">
          <span style="font-size:${fontSize-1}px;font-weight:700;border:2px solid #000;border-radius:16px;padding:3px 14px;display:inline-block;">${delTypeInfo.icon} ${delTypeInfo.label}</span>
        </div>
      ` : ''}

      <table style="font-size:${fontSize}px;width:100%;border-collapse:collapse;margin-bottom:10px;">
        <tr><td style="padding:4px 0;border-top:1px solid #aaa;">Booking Date</td><td style="text-align:right;padding:4px 0;border-top:1px solid #aaa;">${fmtDate(o.createdAt)}</td></tr>
        ${o.deliveryDate? `<tr><td style="padding:4px 0;border-top:1px solid #aaa;">Delivery Date</td><td style="text-align:right;padding:4px 0;border-top:1px solid #aaa;color:#a00;"><b>${escapeHtml(o.deliveryDate)}</b></td></tr>`:''}
        ${showCashier ? `<tr><td style="padding:4px 0;border-top:1px solid #aaa;">Cashier</td><td style="text-align:right;padding:4px 0;border-top:1px solid #aaa;">${escapeHtml(cashier.name)}</td></tr>`:''}
        <tr><td style="padding:4px 0;border-top:1px solid #aaa;font-size:${fontSize+1}px;">Customer</td><td style="text-align:right;padding:4px 0;border-top:1px solid #aaa;font-size:${fontSize+2}px;"><b>${escapeHtml(c.name)}</b></td></tr>
        ${c.phone? `<tr><td style="padding:4px 0;border-top:1px solid #aaa;font-size:${fontSize+1}px;">Phone</td><td style="text-align:right;padding:4px 0;border-top:1px solid #aaa;font-size:${fontSize+2}px;"><b>${escapeHtml(c.phone)}</b></td></tr>`:''}
      </table>

      ${showItems ? `
        <table style="font-size:${fontSize}px;width:100%;border-collapse:collapse;margin-bottom:6px;">
          <tr style="border-top:2px solid #000;border-bottom:2px solid #000;">
            <td style="padding:4px 0;font-weight:800;">ITEMS</td>
            <td style="text-align:right;padding:4px 0;font-weight:800;">TOTAL</td>
          </tr>
          ${itemsHtml}
        </table>
      ` : ''}

      <table style="font-size:${fontSize}px;width:100%;border-collapse:collapse;">
        <tr style="border-top:1px solid #000;"><td style="padding:2px 0;">Total</td><td style="text-align:right;padding:2px 0;">${fmtMoney(o.total)}</td></tr>
        ${discountLines}
        ${o.tax>0?`<tr><td style="padding:2px 0;">Tax</td><td style="text-align:right;">${fmtMoney(o.tax)}</td></tr>`:''}
        <tr><td style="padding:2px 0;">Paid</td><td style="text-align:right;padding:2px 0;">${fmtMoney(o.paid)}</td></tr>
        ${o.due>0?`<tr><td style="padding:2px 0;"><b style="color:#a00;">Payment</b></td><td style="text-align:right;padding:2px 0;"><b style="color:#a00;">${fmtMoney(o.due)}</b></td></tr>`:''}
        ${o.due==0?`<tr><td style="padding:2px 0;"><b style="color:#a00;">Payment</b></td><td style="text-align:right;padding:2px 0;"><b style="color:#a00;">${fmtMoney(o.total)}</b></td></tr>`:''}
      </table>

      ${showNotes && o.notes?`<div style="font-size:${fontSize-2}px;font-style:italic;margin-top:8px;">📝 ${escapeHtml(o.notes)}</div>`:''}
      ${showTerms && s.invoiceTerms?`<div style="font-size:${fontSize-3}px;text-align:center;margin-top:8px;">${escapeHtml(s.invoiceTerms)}</div>`:''}
      
      ${showQR ? `<div style="text-align:center;margin-top:12px;"><canvas class="invQR"></canvas></div>` : ''}
      ${showFooter ? `<div style="text-align:center;font-size:${fontSize}px;font-weight:bold;margin-top:8px;">${escapeHtml(s.invoiceFooter || '')}</div>` : ''}
    </div>
  `;
}
"""

new_office = """function buildOfficeSlip(o, c, cashier, s, invoiceNo, totalPcs, delTypeInfo) {
  const width = Math.max(220, Math.min(400, +s.officeCopyWidth || 280));
  const fontSize = Math.max(9, Math.min(16, +s.officeCopyFontSize || 11));

  return `
    <div class="invoice-page invoice-office" style="max-width:${width}px;font-size:${fontSize}px;padding:14px;background:#fdf6d8;">
      <div style="text-align:center;font-weight:800;font-size:${fontSize+6}px;margin-bottom:4px;color:#000;">
        ${escapeHtml(s.shopName)}
      </div>
      <div style="text-align:center;font-weight:800;font-size:${fontSize}px;display:flex;align-items:center;justify-content:center;margin-bottom:10px;color:#000;">
        <hr style="flex:1; border:none; border-top:1px solid #000; margin-right:6px;">
        OFFICE COPY
        <hr style="flex:1; border:none; border-top:1px solid #000; margin-left:6px;">
      </div>

      <div style="text-align:center;margin-bottom:10px;">
        <div style="display:inline-block;background:#000;color:#fff;border-radius:10px;padding:6px 20px;">
          <div style="font-size:${fontSize-2}px;font-weight:700;letter-spacing:1px;margin-bottom:2px;">INVOICE NO.</div>
          <div style="font-size:${fontSize+10}px;font-weight:900;line-height:1;">${invoiceNo}</div>
        </div>
      </div>

      <table style="font-size:${fontSize}px;width:100%;border-collapse:collapse;border:1px solid #000;margin-bottom:8px;background:#fdf6d8;">
        <tr><td style="border:1px solid #000;padding:3px 6px;">Booked:</td><td style="border:1px solid #000;padding:3px 6px;">${fmtDateShort(o.createdAt)}</td></tr>
        ${o.deliveryDate? `<tr><td style="border:1px solid #000;padding:3px 6px;">Delivery:</td><td style="border:1px solid #000;padding:3px 6px;color:#a00;"><b>${escapeHtml(o.deliveryDate)}</b></td></tr>`:''}
        <tr><td style="border:1px solid #000;padding:3px 6px;">Customer:</td><td style="border:1px solid #000;padding:3px 6px;"><b>${escapeHtml(c.name)}</b></td></tr>
        ${c.phone? `<tr><td style="border:1px solid #000;padding:3px 6px;">Phone:</td><td style="border:1px solid #000;padding:3px 6px;"><b>${escapeHtml(c.phone)}</b></td></tr>`:''}
        <tr><td style="border:1px solid #000;padding:3px 6px;">By:</td><td style="border:1px solid #000;padding:3px 6px;">${escapeHtml(cashier.name)}</td></tr>
      </table>

      <div style="display:flex;gap:6px;margin-bottom:8px;">
        <div style="flex:1;border:2px solid #000;border-radius:6px;overflow:hidden;display:flex;flex-direction:column;background:#fdf6d8;">
          <div style="background:#000;color:#fff;text-align:center;font-size:${fontSize-2}px;padding:3px 0;font-weight:bold;">PIECES</div>
          <div style="text-align:center;font-size:${fontSize+6}px;font-weight:900;padding:4px 0;">${totalPcs}</div>
        </div>
        <div style="flex:2;border:2px solid #000;border-radius:6px;overflow:hidden;display:flex;flex-direction:column;background:#fdf6d8;">
          <div style="background:#000;color:#fff;text-align:center;font-size:${fontSize-2}px;padding:3px 0;font-weight:bold;">PACKAGING</div>
          <div style="text-align:center;font-size:${fontSize+1}px;font-weight:900;padding:4px 0;display:flex;align-items:center;justify-content:center;gap:4px;">
             ${delTypeInfo.icon} ${delTypeInfo.label}
          </div>
        </div>
      </div>

      <div style="border:1px solid #000; border-radius:6px; padding:6px; background:#fdf6d8;">
        <table style="font-size:${fontSize}px;width:100%;border-collapse:collapse;">
          ${(o.items || []).map(it => `
            <tr><td style="padding:2px 0;">${escapeHtml(it.name)} ×${it.qty}</td></tr>
          `).join('')}
        </table>
        <div style="border-top:1px solid #000; margin-top:4px; padding-top:4px;">
          <table style="font-size:${fontSize}px;width:100%;border-collapse:collapse;">
            <tr><td style="padding:2px 0;">Total</td><td style="text-align:right;padding:2px 0;">${fmtMoney(o.total)}</td></tr>
            <tr><td style="padding:2px 0;">Paid</td><td style="text-align:right;padding:2px 0;">${fmtMoney(o.paid)}</td></tr>
            ${o.due>0?`<tr><td style="padding:2px 0;color:#a00;">Due</td><td style="text-align:right;padding:2px 0;color:#a00;">${fmtMoney(o.due)}</td></tr>`:''}
          </table>
        </div>
      </div>

      ${s.invoiceShowQR !== false ? `<div style="text-align:center;margin-top:10px;"><canvas class="invQR" style="max-width:80px;"></canvas></div>`:''}
    </div>
  `;
}
"""

content = replace_between(content, "function buildCustomerSlip", "/* ============================================================\n   OFFICE COPY", new_customer)
content = replace_between(content, "function buildOfficeSlip", "/* ============================================================\n   WHATSAPP", new_office)

with open('assets/js/pages/invoice.js', 'w') as f:
    f.write(content)

