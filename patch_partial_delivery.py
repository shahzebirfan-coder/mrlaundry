import sys

with open('assets/js/pages/orders.js', 'r') as f:
    content = f.read()

# Add the partial delivery button in the list
old_btn = """<button class="btn btn-secondary btn-sm" data-act="status" data-id="${o.id}" title="${t('ord.updateStatus')}">🔄</button>"""
new_btn = """<button class="btn btn-secondary btn-sm" data-act="status" data-id="${o.id}" title="${t('ord.updateStatus')}">🔄</button>
        <button class="btn btn-secondary btn-sm" data-act="partial" data-id="${o.id}" title="Partial Delivery">🛍️</button>"""

content = content.replace(old_btn, new_btn)

# Add event listener
old_act = """else if (b.dataset.act === 'status') openStatusChange(id);"""
new_act = """else if (b.dataset.act === 'status') openStatusChange(id);
    else if (b.dataset.act === 'partial') openPartialDelivery(id);"""

content = content.replace(old_act, new_act)

# Insert openPartialDelivery function
partial_logic = """
function openPartialDelivery(orderId) {
  const o = DB.get('orders', orderId);
  if (!o) return;
  const c = DB.get('customers', o.customerId) || {};
  
  // Initialize delivered states
  const items = o.items || [];
  items.forEach((it, idx) => {
    if (typeof it.delivered === 'undefined') it.delivered = (o.status === 'delivered');
    if (typeof it.redryclean === 'undefined') it.redryclean = false;
  });

  const html = `
    <h3>🛍️ Partial Delivery — INV-${o.invoiceNo || o.id.slice(-6).toUpperCase()}</h3>
    <p class="sub">Customer: ${escapeHtml(c.name)}</p>
    <div style="background:var(--surface-alt);padding:14px;border-radius:10px;margin-bottom:14px;">
      <p style="margin:0 0 10px 0;font-size:13px;color:var(--text-soft);">Check items to mark as delivered. Use "Re-Wash" if item needs free redo.</p>
      <table class="tbl" style="width:100%;font-size:13px;">
        <thead><tr><th>Item</th><th style="text-align:center;">Delivered?</th><th style="text-align:center;">Free Re-Wash?</th></tr></thead>
        <tbody>
          ${items.map((it, idx) => `
            <tr>
              <td><b>${escapeHtml(it.name)}</b> ×${it.qty}</td>
              <td style="text-align:center;">
                <input type="checkbox" id="pd_del_${idx}" style="width:20px;height:20px;" ${it.delivered ? 'checked' : ''}/>
              </td>
              <td style="text-align:center;">
                <input type="checkbox" id="pd_redry_${idx}" style="width:20px;height:20px;" ${it.redryclean ? 'checked' : ''}/>
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
      let deliveredCount = 0;
      items.forEach((it, idx) => {
        it.delivered = $('#pd_del_' + idx, m).checked;
        it.redryclean = $('#pd_redry_' + idx, m).checked;
        if (it.delivered) deliveredCount++;
      });
      let newStatus = o.status;
      if (deliveredCount === 0) newStatus = 'ready';
      else if (deliveredCount === items.length) newStatus = 'delivered';
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
      DB.update('orders', orderId, patch); // Save first
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
  
  const deliveredItems = o.items.filter(it => it.delivered);
  const pendingItems = o.items.filter(it => !it.delivered && !it.redryclean);
  const redryItems = o.items.filter(it => !it.delivered && it.redryclean);

  const html = `
    <div style="font-family:sans-serif;width:280px;padding:10px;color:#000;">
      <h2 style="text-align:center;margin:0;font-size:20px;">${escapeHtml(s.shopName)}</h2>
      <div style="text-align:center;font-size:12px;font-weight:bold;margin:4px 0 10px;border-bottom:2px dashed #000;padding-bottom:4px;">
        PARTIAL DELIVERY SLIP
      </div>
      <div style="font-size:13px;margin-bottom:10px;">
        <b>Invoice:</b> ${invoiceNo}<br>
        <b>Customer:</b> ${escapeHtml(c.name)}<br>
        <b>Date:</b> ${new Date().toLocaleDateString()}
      </div>
      
      ${deliveredItems.length ? `
        <div style="border:1px solid #000;padding:4px;margin-bottom:8px;">
          <b style="font-size:12px;">✅ GIVEN TO CUSTOMER TODAY:</b>
          <div style="font-size:13px;margin-top:4px;">
            ${deliveredItems.map(it => `• ${escapeHtml(it.name)} ×${it.qty}`).join('<br>')}
          </div>
        </div>
      ` : ''}
      
      ${pendingItems.length ? `
        <div style="border:1px dashed #000;padding:4px;margin-bottom:8px;">
          <b style="font-size:12px;">⏳ PENDING (Still in shop):</b>
          <div style="font-size:13px;margin-top:4px;">
            ${pendingItems.map(it => `• ${escapeHtml(it.name)} ×${it.qty}`).join('<br>')}
          </div>
        </div>
      ` : ''}

      ${redryItems.length ? `
        <div style="border:2px solid #000;padding:4px;margin-bottom:8px;">
          <b style="font-size:12px;">🌀 RE-WASH (Free):</b>
          <div style="font-size:13px;margin-top:4px;">
            ${redryItems.map(it => `• ${escapeHtml(it.name)} ×${it.qty}`).join('<br>')}
          </div>
        </div>
      ` : ''}

      <div style="text-align:center;margin-top:10px;font-size:12px;font-weight:bold;border-top:1px dashed #000;padding-top:4px;">
        Remaining Balance: ${fmtMoney(o.due)}
      </div>
    </div>
  `;
  
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  if (typeof printElement === 'function') printElement(wrap, { title: 'Partial Delivery' });
}
"""

content += partial_logic

with open('assets/js/pages/orders.js', 'w') as f:
    f.write(content)

