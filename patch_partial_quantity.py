import sys

with open('assets/js/pages/orders.js', 'r') as f:
    content = f.read()

start_marker = "function openPartialDelivery(orderId) {"
start_idx = content.find(start_marker)

if start_idx != -1:
    content = content[:start_idx]

new_logic = """function openPartialDelivery(orderId) {
  const o = DB.get('orders', orderId);
  if (!o) return;
  const c = DB.get('customers', o.customerId) || {};
  
  const items = o.items || [];
  // Migrate old data on the fly
  items.forEach(it => {
    if (typeof it.deliveredQty === 'undefined') {
      it.deliveredQty = it.delivered ? it.qty : 0;
    }
    if (typeof it.rewashQty === 'undefined') {
      it.rewashQty = (!it.delivered && it.redryclean) ? it.qty : 0;
    }
  });

  const html = `
    <h3>🛍️ Partial Delivery — INV-${o.invoiceNo || o.id.slice(-6).toUpperCase()}</h3>
    <p class="sub">Customer: ${escapeHtml(c.name)}</p>
    <div style="background:var(--surface-alt);padding:14px;border-radius:10px;margin-bottom:14px;">
      <p style="margin:0 0 10px 0;font-size:13px;color:var(--text-soft);">Enter the exact quantity being delivered or sent for free re-wash today.</p>
      <table class="tbl" style="width:100%;font-size:13px;">
        <thead><tr><th>Item</th><th style="text-align:center;">Delivered</th><th style="text-align:center;">Re-Wash</th></tr></thead>
        <tbody>
          ${items.map((it, idx) => `
            <tr>
              <td style="padding:8px 4px;"><b>${escapeHtml(it.name)}</b><br><small style="color:var(--text-soft);">Total Qty: ${it.qty}</small></td>
              <td style="text-align:center;padding:8px 4px;">
                <input type="number" id="pd_del_${idx}" value="${it.deliveredQty}" min="0" max="${it.qty}" style="width:60px;text-align:center;padding:6px;border:1px solid var(--border);border-radius:6px;font-weight:bold;" onchange="const max=${it.qty}; let v=parseInt(this.value)||0; if(v>max)this.value=max; else if(v<0)this.value=0;"/>
              </td>
              <td style="text-align:center;padding:8px 4px;">
                <input type="number" id="pd_rewash_${idx}" value="${it.rewashQty}" min="0" max="${it.qty}" style="width:60px;text-align:center;padding:6px;border:1px solid var(--border);border-radius:6px;font-weight:bold;" onchange="const max=${it.qty}; let v=parseInt(this.value)||0; if(v>max)this.value=max; else if(v<0)this.value=0;"/>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <div class="form-row cols-1" id="pdPaySec">
      <div class="field">
        <label>Receive Payment (Remaining Due: <b style="color:var(--danger);">${fmtMoney(o.due)}</b>)</label>
        <input type="number" id="pdAddPay" value="0" min="0" max="${o.due}"/>
      </div>
    </div>
    
    <div class="modal-footer">
      <button class="btn btn-ghost" id="pdCancelBtn">Cancel</button>
      <button class="btn btn-warning" id="pdPrintBtn">🖨️ Print Partial Slip</button>
      <button class="btn btn-primary" id="pdSaveBtn">💾 Save Delivery</button>
    </div>
  `;

  openModal(html, { onOpen(m) {
    if (o.due === 0) $('#pdPaySec', m).style.display = 'none';

    $('#pdCancelBtn', m).onclick = closeModal;
    
    const collectData = () => {
      let totalDelivered = 0;
      let totalQty = 0;
      
      items.forEach((it, idx) => {
        totalQty += it.qty;
        let dQty = parseInt($('#pd_del_' + idx, m).value) || 0;
        let rQty = parseInt($('#pd_rewash_' + idx, m).value) || 0;
        
        // Prevent exceeding total quantity
        if (dQty + rQty > it.qty) {
          rQty = it.qty - dQty; // prioritize delivered, clamp rewash
        }
        
        it.deliveredQty = dQty;
        it.rewashQty = rQty;
        // Keep legacy flags synced for backward compatibility
        it.delivered = (dQty === it.qty);
        it.redryclean = (rQty > 0);
        
        totalDelivered += dQty;
      });
      
      let newStatus = o.status;
      if (totalDelivered === 0) newStatus = 'ready';
      else if (totalDelivered === totalQty) newStatus = 'delivered';
      else newStatus = 'partial'; // custom status

      const addPay = Math.max(0, +$('#pdAddPay', m)?.value || 0);
      const paid = Math.min(o.total, o.paid + addPay);
      const due = o.total - paid;
      return { status: newStatus, items, paid, due, isCredit: due > 0 };
    };

    $('#pdSaveBtn', m).onclick = () => {
      const patch = collectData();
      DB.update('orders', orderId, patch);
      closeModal(); toast('Partial delivery saved','success'); renderOrdersBody();
    };

    $('#pdPrintBtn', m).onclick = () => {
      const patch = collectData();
      DB.update('orders', orderId, patch);
      closeModal();
      printPartialSlip(orderId);
      renderOrdersBody();
    };
  }});
}

function printPartialSlip(orderId) {
  const o = DB.get('orders', orderId);
  const c = DB.get('customers', o.customerId) || { name: 'Customer' };
  const s = DB.settings();
  const invoiceNo = o.invoiceNo ? `INV-${o.invoiceNo}` : '#' + o.id.slice(-6).toUpperCase();
  
  const deliveredItems = [];
  const pendingItems = [];
  const redryItems = [];

  o.items.forEach(it => {
    const dQty = it.deliveredQty || 0;
    const rQty = it.rewashQty || 0;
    const pQty = it.qty - dQty - rQty;
    
    if (dQty > 0) deliveredItems.push({ name: it.name, qty: dQty });
    if (pQty > 0) pendingItems.push({ name: it.name, qty: pQty });
    if (rQty > 0) redryItems.push({ name: it.name, qty: rQty });
  });

  const html = `
    <div style="font-family:sans-serif;width:280px;padding:10px;color:#000;">
      <h2 style="text-align:center;margin:0;font-size:20px;">${escapeHtml(s.shopName)}</h2>
      <div style="text-align:center;font-size:12px;font-weight:bold;margin:4px 0 10px;border-bottom:2px dashed #000;padding-bottom:4px;">
        PARTIAL DELIVERY SLIP
      </div>
      <div style="margin-bottom:12px; line-height:1.5;">
        <div style="font-size:20px;font-weight:900;">INV: ${invoiceNo}</div>
        <div style="font-size:18px;font-weight:bold;">${escapeHtml(c.name)}</div>
        <div style="font-size:16px;font-weight:bold;color:#333;">${new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}</div>
      </div>
      
      ${deliveredItems.length ? `
        <div style="border:1px solid #000;padding:4px;margin-bottom:8px;">
          <b style="font-size:12px;">✅ GIVEN TO CUSTOMER:</b>
          <div style="font-size:14px;margin-top:4px;font-weight:bold;">
            ${deliveredItems.map(it => `• ${escapeHtml(it.name)} ×${it.qty}`).join('<br>')}
          </div>
        </div>
      ` : ''}
      
      ${pendingItems.length ? `
        <div style="border:1px dashed #000;padding:4px;margin-bottom:8px;">
          <b style="font-size:12px;">⏳ PENDING (Still in shop):</b>
          <div style="font-size:14px;margin-top:4px;">
            ${pendingItems.map(it => `• ${escapeHtml(it.name)} ×${it.qty}`).join('<br>')}
          </div>
        </div>
      ` : ''}

      ${redryItems.length ? `
        <div style="border:2px solid #000;padding:4px;margin-bottom:8px;">
          <b style="font-size:12px;">🌀 RE-WASH (Free):</b>
          <div style="font-size:14px;margin-top:4px;">
            ${redryItems.map(it => `• ${escapeHtml(it.name)} ×${it.qty}`).join('<br>')}
          </div>
        </div>
      ` : ''}

      <div style="text-align:center;margin-top:10px;font-size:14px;font-weight:bold;border-top:1px dashed #000;padding-top:6px;">
        Remaining Balance: ${fmtMoney(o.due)}
      </div>
    </div>
  `;
  
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  if (typeof printElement === 'function') printElement(wrap, { title: 'Partial Delivery' });
}
"""

content += new_logic

with open('assets/js/pages/orders.js', 'w') as f:
    f.write(content)
