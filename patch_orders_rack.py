import sys

with open('assets/js/pages/orders.js', 'r') as f:
    content = f.read()

def replace_between(content, start_marker, end_marker, new_text):
    start = content.find(start_marker)
    if start == -1: return content
    end = content.find(end_marker, start)
    if end == -1: return content
    return content[:start] + new_text + content[end:]

old_openStatusChange = """function openStatusChange(orderId) {
  const o = DB.get('orders', orderId);
  if (!o) return;
  const c = DB.get('customers', o.customerId) || {};
  const html = `
    <h3>🔄 Update Order — INV-${o.invoiceNo || o.id.slice(-6).toUpperCase()}</h3>
    <p class="sub">Customer: ${escapeHtml(c.name)} • ${escapeHtml(c.phone||'')}</p>
    <div class="form-row cols-1">
      <div class="field">
        <label>Order Status</label>
        <select id="newStatus">
          <option value="pending"   ${o.status==='pending'?'selected':''}>⏳ Pending</option>
          <option value="washing"   ${o.status==='washing'?'selected':''}>🌀 Washing</option>
          <option value="ready"     ${o.status==='ready'?'selected':''}>✅ Ready for Pickup</option>
          <option value="delivered" ${o.status==='delivered'?'selected':''}>📦 Delivered</option>
          <option value="cancelled" ${o.status==='cancelled'?'selected':''}>❌ Cancelled</option>
        </select>
      </div>
      <div class="field">
        <label>Receive Additional Payment</label>
        <input type="number" id="addPay" value="${o.due}" min="0" max="${o.due}"/>
        <small style="color:var(--text-soft);">Current Paid: <b>${fmtMoney(o.paid)}</b> • Remaining Due: <b style="color:var(--danger);">${fmtMoney(o.due)}</b></small>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="cancelBtn">Cancel</button>
      <button class="btn btn-primary" id="saveBtn">💾 Save</button>
    </div>
  `;
  openModal(html, { onOpen(m){
    $('#cancelBtn', m).onclick = closeModal;
    $('#saveBtn', m).onclick = () => {
      const newStatus = $('#newStatus', m).value;
      const addPay = Math.max(0, +$('#addPay', m).value || 0);
      const paid = Math.min(o.total, o.paid + addPay);
      const due = o.total - paid;
      const oldStatus = o.status;
      DB.update('orders', orderId, { status: newStatus, paid, due, isCredit: due > 0 });
      if (typeof maybePromptWhatsAppOnStatus === 'function' && oldStatus !== newStatus && !sessionStorage.getItem('mrLaundryWaPause')) {
        setTimeout(() => maybePromptWhatsAppOnStatus(orderId, newStatus, oldStatus), 300);
      }
      closeModal(); toast('Order updated','success'); renderOrdersBody();
    };
  }});
}"""

new_openStatusChange = """function openStatusChange(orderId) {
  const o = DB.get('orders', orderId);
  if (!o) return;
  const c = DB.get('customers', o.customerId) || {};
  const html = `
    <h3>🔄 Update Order — INV-${o.invoiceNo || o.id.slice(-6).toUpperCase()}</h3>
    <p class="sub">Customer: ${escapeHtml(c.name)} • ${escapeHtml(c.phone||'')}</p>
    <div class="form-row cols-1">
      <div class="field">
        <label>Order Status</label>
        <select id="newStatus">
          <option value="pending"   ${o.status==='pending'?'selected':''}>⏳ Pending</option>
          <option value="washing"   ${o.status==='washing'?'selected':''}>🌀 Washing</option>
          <option value="ready"     ${o.status==='ready'?'selected':''}>✅ Ready for Pickup</option>
          <option value="delivered" ${o.status==='delivered'?'selected':''}>📦 Delivered</option>
          <option value="cancelled" ${o.status==='cancelled'?'selected':''}>❌ Cancelled</option>
        </select>
      </div>
      <div class="field" id="rackField" style="display:${o.status==='ready'?'block':'none'};">
        <label>📍 Rack/Shelf Location (Optional)</label>
        <input type="text" id="newRack" placeholder="e.g. Rack A1, Shelf 3" value="${escapeHtml(o.location||'')}"/>
        <small style="color:var(--text-soft);">Helps you find clothes instantly when customer arrives.</small>
      </div>
      <div class="field">
        <label>Receive Additional Payment</label>
        <input type="number" id="addPay" value="${o.due}" min="0" max="${o.due}"/>
        <small style="color:var(--text-soft);">Current Paid: <b>${fmtMoney(o.paid)}</b> • Remaining Due: <b style="color:var(--danger);">${fmtMoney(o.due)}</b></small>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="cancelBtn">Cancel</button>
      <button class="btn btn-primary" id="saveBtn">💾 Save</button>
    </div>
  `;
  openModal(html, { onOpen(m){
    $('#newStatus', m).onchange = (e) => {
      $('#rackField', m).style.display = e.target.value === 'ready' ? 'block' : 'none';
      if (e.target.value === 'ready') setTimeout(()=>$('#newRack', m).focus(), 100);
    };
    $('#cancelBtn', m).onclick = closeModal;
    $('#saveBtn', m).onclick = () => {
      const newStatus = $('#newStatus', m).value;
      const addPay = Math.max(0, +$('#addPay', m).value || 0);
      const paid = Math.min(o.total, o.paid + addPay);
      const due = o.total - paid;
      const oldStatus = o.status;
      const patch = { status: newStatus, paid, due, isCredit: due > 0 };
      if (newStatus === 'ready') patch.location = $('#newRack', m).value.trim();
      
      DB.update('orders', orderId, patch);
      if (typeof maybePromptWhatsAppOnStatus === 'function' && oldStatus !== newStatus && !sessionStorage.getItem('mrLaundryWaPause')) {
        setTimeout(() => maybePromptWhatsAppOnStatus(orderId, newStatus, oldStatus), 300);
      }
      closeModal(); toast('Order updated','success'); renderOrdersBody();
    };
  }});
}"""

content = content.replace(old_openStatusChange, new_openStatusChange)

# Modify renderOrdersBody to show location badge
old_badge = """      <td><span class="badge ${o.status}">${o.status}</span></td>"""
new_badge = """      <td>
        <span class="badge ${o.status}">${o.status}</span>
        ${(o.status === 'ready' && o.location) ? `<br><span style="font-size:10px;font-weight:700;color:#000;background:#fef08a;padding:2px 6px;border-radius:6px;border:1px solid #f59e0b;margin-top:4px;display:inline-block;">📍 ${escapeHtml(o.location)}</span>` : ''}
      </td>"""

content = content.replace(old_badge, new_badge)

with open('assets/js/pages/orders.js', 'w') as f:
    f.write(content)
