import sys

with open('assets/js/pages/invoice.js', 'r') as f:
    content = f.read()

# Add to Customer Slip footer
old_cust_footer = """      ${showQR ? `<div style="text-align:center;margin-top:20px;"><canvas class="invQR"></canvas></div>` : ''}
      ${showFooter ? `<div style="text-align:center;font-size:${fontSize+2}px;font-weight:900;margin-top:16px;">${escapeHtml(s.invoiceFooter || '')}</div>` : ''}
    </div>"""

new_cust_footer = """      ${showQR ? `<div style="text-align:center;margin-top:20px;"><canvas class="invQR"></canvas></div>` : ''}
      ${showFooter ? `<div style="text-align:center;font-size:${fontSize+2}px;font-weight:900;margin-top:16px;">${escapeHtml(s.invoiceFooter || '')}</div>` : ''}
      
      <div style="margin-top:20px; text-align:center; border-top:2px dashed #000; padding-top:12px;">
        <div style="font-size:11px; font-weight:bold; color:#000; margin-bottom:4px;">Powered & Managed by</div>
        <img src="assets/img/celinesoft_logo.png" style="width:140px; filter:grayscale(100%) contrast(1.5);" />
      </div>
    </div>"""

content = content.replace(old_cust_footer, new_cust_footer)

# Add to Office Slip footer
old_off_footer = """      ${s.invoiceShowQR !== false ? `<div style="text-align:center;margin-top:16px;"><canvas class="invQR" style="max-width:90px;"></canvas></div>`:''}
    </div>"""

new_off_footer = """      ${s.invoiceShowQR !== false ? `<div style="text-align:center;margin-top:16px;"><canvas class="invQR" style="max-width:90px;"></canvas></div>`:''}
      
      <div style="margin-top:16px; text-align:center; border-top:2px dashed #000; padding-top:10px;">
        <img src="assets/img/celinesoft_logo.png" style="width:100px; filter:grayscale(100%) contrast(1.5);" />
      </div>
    </div>"""

content = content.replace(old_off_footer, new_off_footer)

with open('assets/js/pages/invoice.js', 'w') as f:
    f.write(content)

