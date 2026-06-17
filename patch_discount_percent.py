import sys

with open('assets/js/pages/invoice.js', 'r') as f:
    content = f.read()

# Fix for Customer slip
old_discount_lines = """  const totalDisc = (o.discount || ((o.manualDiscount||0) + (o.loyaltyDiscount||0)));
  const discountLines = showDiscount ? `
    ${o.manualDiscount>0 ? `<tr><td style="padding:4px 0;">Discount:</td><td style="text-align:right;padding:4px 0;">- ${fmtMoney(o.manualDiscount)}</td></tr>` : ''}
    ${o.loyaltyDiscount>0 ? `<tr><td style="padding:4px 0;">Loyalty:</td><td style="text-align:right;padding:4px 0;">- ${fmtMoney(o.loyaltyDiscount)}</td></tr>` : ''}
    ${(!o.manualDiscount && !o.loyaltyDiscount && totalDisc>0) ? `<tr><td style="padding:4px 0;">Discount:</td><td style="text-align:right;padding:4px 0;">- ${fmtMoney(totalDisc)}</td></tr>` : ''}
  ` : '';"""

new_discount_lines = """  const totalDisc = (o.discount || ((o.manualDiscount||0) + (o.loyaltyDiscount||0)));
  const discountLines = showDiscount ? `
    ${o.manualDiscount>0 ? `<tr><td style="padding:6px 0;font-size:${fontSize+2}px;font-weight:900;color:#000;">🎉 Discount${o.discountType==='percent'?` (${o.discountValue}%)`:''}:</td><td style="text-align:right;padding:6px 0;font-size:${fontSize+2}px;font-weight:900;color:#000;">- ${fmtMoney(o.manualDiscount)}</td></tr>` : ''}
    ${o.loyaltyDiscount>0 ? `<tr><td style="padding:6px 0;font-size:${fontSize+2}px;font-weight:900;color:#000;">⭐ Loyalty (${o.loyaltyPercent||''}%):</td><td style="text-align:right;padding:6px 0;font-size:${fontSize+2}px;font-weight:900;color:#000;">- ${fmtMoney(o.loyaltyDiscount)}</td></tr>` : ''}
    ${(!o.manualDiscount && !o.loyaltyDiscount && totalDisc>0) ? `<tr><td style="padding:6px 0;font-size:${fontSize+2}px;font-weight:900;color:#000;">🎉 Discount:</td><td style="text-align:right;padding:6px 0;font-size:${fontSize+2}px;font-weight:900;color:#000;">- ${fmtMoney(totalDisc)}</td></tr>` : ''}
  ` : '';"""

content = content.replace(old_discount_lines, new_discount_lines)

# Fix for Office slip
old_office_discount = """            ${(o.discount||((o.manualDiscount||0)+(o.loyaltyDiscount||0)))>0 ? `<tr><td style="padding:4px 0;color:#b91c1c;">Discount</td><td style="text-align:right;padding:4px 0;color:#b91c1c;font-weight:bold;">-${fmtMoney(o.discount||((o.manualDiscount||0)+(o.loyaltyDiscount||0)))}</td></tr>"""

new_office_discount = """            ${(o.discount||((o.manualDiscount||0)+(o.loyaltyDiscount||0)))>0 ? `<tr><td style="padding:4px 0;font-size:${fontSize+1}px;font-weight:900;color:#000;">Discount</td><td style="text-align:right;padding:4px 0;font-size:${fontSize+1}px;font-weight:900;color:#000;">-${fmtMoney(o.discount||((o.manualDiscount||0)+(o.loyaltyDiscount||0)))}</td></tr>"""

content = content.replace(old_office_discount, new_office_discount)

with open('assets/js/pages/invoice.js', 'w') as f:
    f.write(content)
