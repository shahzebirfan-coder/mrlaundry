import sys

with open('assets/js/pages/invoice.js', 'r') as f:
    content = f.read()

# Modify Customer Slip
old_table_cust = """      <table style="font-size:${fontSize+2}px;width:100%;border-collapse:collapse;line-height:1.5;">
        <tr style="border-top:2px solid #000;"><td style="padding:8px 0;font-weight:bold;">Total</td><td style="text-align:right;padding:8px 0;font-weight:bold;font-size:${fontSize+4}px;">${fmtMoney(o.total)}</td></tr>
        ${discountLines}
        ${o.tax>0?`<tr><td style="padding:6px 0;">Tax</td><td style="text-align:right;padding:6px 0;">${fmtMoney(o.tax)}</td></tr>`:''}
        <tr><td style="padding:6px 0;">Paid</td><td style="text-align:right;padding:6px 0;">${fmtMoney(o.paid)}</td></tr>
        ${o.due>0?`<tr><td style="padding:8px 0;font-size:${fontSize+4}px;font-weight:900;"><b style="color:#000;">Payment Due</b></td><td style="text-align:right;padding:8px 0;font-size:${fontSize+4}px;"><b style="color:#000;font-weight:900;">${fmtMoney(o.due)}</b></td></tr>`:''}
        ${o.due==0?`<tr><td style="padding:8px 0;font-size:${fontSize+4}px;font-weight:900;"><b style="color:#000;">Payment</b></td><td style="text-align:right;padding:8px 0;font-size:${fontSize+4}px;"><b style="color:#000;font-weight:900;">${fmtMoney(o.total)}</b></td></tr>`:''}
      </table>"""

new_table_cust = """      <table style="font-size:${fontSize+2}px;width:100%;border-collapse:collapse;line-height:1.5;">
        <tr style="border-top:2px solid #000;"><td style="padding:8px 0;font-weight:bold;">Gross Total</td><td style="text-align:right;padding:8px 0;font-weight:bold;font-size:${fontSize+4}px;">${fmtMoney(o.subtotal)}</td></tr>
        ${discountLines}
        ${o.tax>0?`<tr><td style="padding:6px 0;">Tax</td><td style="text-align:right;padding:6px 0;">${fmtMoney(o.tax)}</td></tr>`:''}
        ${totalDisc>0?`<tr style="border-top:1px dashed #000;"><td style="padding:8px 0;font-weight:900;font-size:${fontSize+4}px;">NET TOTAL</td><td style="text-align:right;padding:8px 0;font-weight:900;font-size:${fontSize+6}px;">${fmtMoney(o.total)}</td></tr>`:''}
        <tr><td style="padding:6px 0;">Paid</td><td style="text-align:right;padding:6px 0;">${fmtMoney(o.paid)}</td></tr>
        ${o.due>0?`<tr><td style="padding:8px 0;font-size:${fontSize+4}px;font-weight:900;"><b style="color:#000;">Payment Due</b></td><td style="text-align:right;padding:8px 0;font-size:${fontSize+4}px;"><b style="color:#000;font-weight:900;">${fmtMoney(o.due)}</b></td></tr>`:''}
        ${o.due==0 && totalDisc==0?`<tr><td style="padding:8px 0;font-size:${fontSize+4}px;font-weight:900;"><b style="color:#000;">Payment</b></td><td style="text-align:right;padding:8px 0;font-size:${fontSize+4}px;"><b style="color:#000;font-weight:900;">${fmtMoney(o.total)}</b></td></tr>`:''}
      </table>"""

content = content.replace(old_table_cust, new_table_cust)


# Modify Office Slip
old_table_off = """        <div style="border-top:2px solid #000; margin-top:8px; padding-top:8px;">
          <table style="font-size:${fontSize+3}px;width:100%;border-collapse:collapse;line-height:1.5;">
            <tr><td style="padding:4px 0;">Total</td><td style="text-align:right;padding:4px 0;font-weight:bold;">${fmtMoney(o.total)}</td></tr>
            <tr><td style="padding:4px 0;">Paid</td><td style="text-align:right;padding:4px 0;font-weight:bold;">${fmtMoney(o.paid)}</td></tr>
            ${o.due>0?`<tr><td style="padding:4px 0;color:#000;font-weight:900;">Due</td><td style="text-align:right;padding:4px 0;color:#000;font-weight:900;">${fmtMoney(o.due)}</td></tr>`:''}
          </table>
        </div>"""

new_table_off = """        <div style="border-top:2px solid #000; margin-top:8px; padding-top:8px;">
          <table style="font-size:${fontSize+3}px;width:100%;border-collapse:collapse;line-height:1.5;">
            <tr><td style="padding:4px 0;">Gross</td><td style="text-align:right;padding:4px 0;font-weight:bold;">${fmtMoney(o.subtotal)}</td></tr>
            ${(o.discount||((o.manualDiscount||0)+(o.loyaltyDiscount||0)))>0 ? `<tr><td style="padding:4px 0;color:#b91c1c;">Discount</td><td style="text-align:right;padding:4px 0;color:#b91c1c;font-weight:bold;">-${fmtMoney(o.discount||((o.manualDiscount||0)+(o.loyaltyDiscount||0)))}</td></tr>
            <tr><td style="padding:4px 0;font-weight:900;">Net Total</td><td style="text-align:right;padding:4px 0;font-weight:900;">${fmtMoney(o.total)}</td></tr>` : `<tr><td style="padding:4px 0;">Total</td><td style="text-align:right;padding:4px 0;font-weight:bold;">${fmtMoney(o.total)}</td></tr>`}
            <tr><td style="padding:4px 0;">Paid</td><td style="text-align:right;padding:4px 0;font-weight:bold;">${fmtMoney(o.paid)}</td></tr>
            ${o.due>0?`<tr><td style="padding:4px 0;color:#000;font-weight:900;">Due</td><td style="text-align:right;padding:4px 0;color:#000;font-weight:900;">${fmtMoney(o.due)}</td></tr>`:''}
          </table>
        </div>"""

content = content.replace(old_table_off, new_table_off)

with open('assets/js/pages/invoice.js', 'w') as f:
    f.write(content)

