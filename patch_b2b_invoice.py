import sys

with open('assets/js/pages/invoice.js', 'r') as f:
    content = f.read()

challan_logic = """
/* ============================================================
   B2B ZERO-CASH DELIVERY CHALLAN (Thermal)
   ============================================================ */
function printChallan(orderId) {
  const o = DB.get('orders', orderId);
  if (!o) return;
  const c = DB.get('customers', o.customerId) || { name: 'Customer' };
  const s = DB.settings();
  const challanNo = o.invoiceNo ? `CH-${o.invoiceNo}` : 'CH-' + o.id.slice(-6).toUpperCase();
  const totalPcs = (o.items || []).reduce((sum, it) => sum + (it.qty || 0), 0);
  
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
"""

content += challan_logic

with open('assets/js/pages/invoice.js', 'w') as f:
    f.write(content)
