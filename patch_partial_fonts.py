import sys

with open('assets/js/pages/orders.js', 'r') as f:
    content = f.read()

old_header = """      <div style="font-size:13px;margin-bottom:10px;">
        <b>Invoice:</b> ${invoiceNo}<br>
        <b>Customer:</b> ${escapeHtml(c.name)}<br>
        <b>Date:</b> ${new Date().toLocaleDateString()}
      </div>"""

new_header = """      <div style="margin-bottom:12px; line-height:1.5;">
        <div style="font-size:20px;font-weight:900;">INV: ${invoiceNo}</div>
        <div style="font-size:18px;font-weight:bold;">${escapeHtml(c.name)}</div>
        <div style="font-size:16px;font-weight:bold;color:#333;">${new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}</div>
      </div>"""

content = content.replace(old_header, new_header)

with open('assets/js/pages/orders.js', 'w') as f:
    f.write(content)
