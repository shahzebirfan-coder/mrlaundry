/* ===================== PICKUP & DELIVERY MODULE ===================== */
const PICKUP_TIME_SLOTS = [
  { value: '09:00-11:00', label: '9 AM - 11 AM' },
  { value: '11:00-13:00', label: '11 AM - 1 PM' },
  { value: '13:00-15:00', label: '1 PM - 3 PM' },
  { value: '15:00-17:00', label: '3 PM - 5 PM' },
  { value: '17:00-19:00', label: '5 PM - 7 PM' },
  { value: '19:00-21:00', label: '7 PM - 9 PM' }
];
const LEGACY_PICKUP_SLOTS = {
  '9am-12pm': '9 AM - 12 PM',
  '10am-2pm': '10 AM - 2 PM',
  '2pm-6pm': '2 PM - 6 PM',
  '6pm-9pm': '6 PM - 9 PM'
};
let deliveryFilter = { tab: 'requests', status: 'all', driverId: 'all' };

function pickupSlotLabel(slot) {
  const known = PICKUP_TIME_SLOTS.find(s => s.value === slot);
  return known ? known.label : (LEGACY_PICKUP_SLOTS[slot] || String(slot || '-'));
}

function pickupSlotWindow(slot) {
  const value = String(slot || '');
  let match = value.match(/^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/);
  if (match) return { start: +match[1] * 60 + +match[2], end: +match[3] * 60 + +match[4] };
  match = value.toLowerCase().match(/^(\d{1,2})(am|pm)-(\d{1,2})(am|pm)$/);
  if (!match) return null;
  const minutes = (hourText, period) => {
    let hour = Number(hourText) % 12;
    if (period === 'pm') hour += 12;
    return hour * 60;
  };
  return { start: minutes(match[1], match[2]), end: minutes(match[3], match[4]) };
}

function normalizePickupWhatsAppPhone(raw) {
  let phone = String(raw || '').replace(/\D/g, '');
  if (phone.startsWith('00')) phone = phone.slice(2);
  if (phone.startsWith('0') && phone.length === 11) phone = '92' + phone.slice(1);
  else if (phone.length === 10 && phone.startsWith('3')) phone = '92' + phone;
  return phone;
}

function renderDelivery() {
  const requests = DB.all('pickupRequests');
  const drivers = DB.all('drivers');
  const pending = requests.filter(r => r.status === 'pending').length;
  const assigned = requests.filter(r => r.status === 'assigned').length;
  const completed = requests.filter(r => r.status === 'completed').length;

  const content = `
    <h1 class="page-title">🚚 Pickup & Delivery</h1>
    <p class="page-sub">Manage home pickup requests and assign drivers for delivery service.</p>

    <div class="grid-stats" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-bottom:18px;">
      <div class="stat-card"><div class="ic b1">🚚</div><div><div class="lbl">Total Requests</div><div class="val">${requests.length}</div></div></div>
      <div class="stat-card"><div class="ic b3">⏳</div><div><div class="lbl">Pending Assign</div><div class="val" style="color:${pending>0?'var(--warning)':'var(--text)'};">${pending}</div></div></div>
      <div class="stat-card"><div class="ic b5">🛵</div><div><div class="lbl">On the Way</div><div class="val">${assigned}</div></div></div>
      <div class="stat-card"><div class="ic b2">✅</div><div><div class="lbl">Completed</div><div class="val">${completed}</div></div></div>
      <div class="stat-card"><div class="ic b4">👨‍✈️</div><div><div class="lbl">Active Drivers</div><div class="val">${drivers.filter(d => d.active!==false).length}</div></div></div>
    </div>

    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
      <button class="btn ${deliveryFilter.tab==='requests'?'btn-primary':'btn-secondary'}" id="tabReq">📋 Pickup Requests</button>
      <button class="btn ${deliveryFilter.tab==='drivers'?'btn-primary':'btn-secondary'}" id="tabDrv">👨‍✈️ Drivers</button>
      <button class="btn btn-success" id="newReqBtn" style="margin-left:auto;">+ New Pickup Request</button>
    </div>

    <div id="deliveryContent"></div>
  `;
  $('#app').innerHTML = renderLayout('delivery', content);
  bindLayout();

  $('#tabReq').onclick = () => { deliveryFilter.tab = 'requests'; renderDelivery(); };
  $('#tabDrv').onclick = () => { deliveryFilter.tab = 'drivers'; renderDelivery(); };
  $('#newReqBtn').onclick = () => openPickupRequestForm();

  if (deliveryFilter.tab === 'requests') renderRequestsTab();
  else renderDriversTab();
}

function renderRequestsTab() {
  const drivers = DB.all('drivers');
  const requests = [...DB.all('pickupRequests')].sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||''));

  if (!requests.length) {
    $('#deliveryContent').innerHTML = `<div class="card"><div class="empty"><div class="emoji">📋</div><h4>No pickup requests yet</h4><p>Customers can request from the portal, or add manually with "+ New Pickup Request"</p></div></div>`;
    return;
  }

  const statusColors = {pending:'pending', assigned:'washing', picked:'ready', completed:'paid', cancelled:'cancelled'};

  $('#deliveryContent').innerHTML = `
    <div class="card" style="padding:0;overflow:hidden;">
      <table class="tbl">
        <thead><tr>
          <th>Request #</th><th>Customer</th><th>Address</th><th>Pickup Time</th>
          <th>Driver</th><th>Status</th><th>Rating</th><th>Actions</th>
        </tr></thead>
        <tbody>${requests.map(r => `
          <tr>
            <td><b>#${r.id.slice(-6).toUpperCase()}</b></td>
            <td><b>${escapeHtml(r.customerName)}</b><br><small style="color:var(--text-soft);">${escapeHtml(r.customerPhone)}</small></td>
            <td style="font-size:12px;">${escapeHtml(r.address)}</td>
            <td><b>${escapeHtml(r.pickupDate||'-')}</b><br><small>${escapeHtml(pickupSlotLabel(r.pickupSlot))}</small></td>
            <td>${r.driverId ? '🛵 '+escapeHtml((drivers.find(d=>d.id===r.driverId)||{}).name||'-') : '<span style="color:var(--text-soft);">Not assigned</span>'}</td>
            <td><span class="badge ${statusColors[r.status]||'pending'}">${r.status}</span></td>
            <td>${r.rating?('⭐'.repeat(r.rating)):'-'}</td>
            <td style="white-space:nowrap;">
              ${r.status === 'pending' ? `<button class="btn btn-success btn-sm" data-act="assign" data-id="${r.id}">👨‍✈️ Assign</button>` : ''}
              ${r.status === 'assigned' ? `<button class="btn btn-primary btn-sm" data-act="pickup" data-id="${r.id}">📦 Mark Picked Up</button>` : ''}
              ${r.status === 'picked' ? `<button class="btn btn-success btn-sm" data-act="deliver" data-id="${r.id}">✅ Complete</button>` : ''}
              <button class="btn btn-secondary btn-sm" data-act="edit" data-id="${r.id}">✏️</button>
              ${DB.currentUser().role === 'admin' ? `<button class="btn btn-danger btn-sm" data-act="del" data-id="${r.id}">🗑️</button>` : ''}
            </td>
          </tr>
        `).join('')}</tbody>
      </table>
    </div>
  `;

  $$('[data-act]').forEach(b => b.onclick = () => {
    const id = b.dataset.id;
    const act = b.dataset.act;
    if (act === 'assign') openAssignDriverDialog(id);
    else if (act === 'pickup') updateRequestStatus(id, 'picked');
    else if (act === 'deliver') openCompleteDeliveryDialog(id);
    else if (act === 'edit') openPickupRequestForm(DB.get('pickupRequests', id));
    else if (act === 'del') confirmDialog('Delete this request?', () => { DB.remove('pickupRequests', id); renderDelivery(); });
  });
}

function renderDriversTab() {
  const drivers = [...DB.all('drivers')].sort((a,b) => (a.name||'').localeCompare(b.name||''));
  const requests = DB.all('pickupRequests');

  $('#deliveryContent').innerHTML = `
    <div class="filter-bar">
      <button class="btn btn-primary" id="addDrvBtn">+ Add Driver</button>
    </div>

    <div class="card" style="padding:0;overflow:hidden;">
      <table class="tbl">
        <thead><tr>
          <th>Name</th><th>Phone</th><th>Vehicle</th><th>Active</th>
          <th>Total Deliveries</th><th>Avg Rating</th><th>Actions</th>
        </tr></thead>
        <tbody>
          ${drivers.length ? drivers.map(d => {
            const myReqs = requests.filter(r => r.driverId === d.id);
            const completed = myReqs.filter(r => r.status === 'completed');
            const ratings = completed.filter(r => r.rating).map(r => r.rating);
            const avgRating = ratings.length ? (ratings.reduce((s,x)=>s+x,0)/ratings.length).toFixed(1) : '-';
            return `<tr>
              <td><b>${escapeHtml(d.name)}</b></td>
              <td>${escapeHtml(d.phone||'-')}</td>
              <td>${escapeHtml(d.vehicle||'-')}</td>
              <td>${d.active!==false ? '<span class="badge paid">Active</span>' : '<span class="badge cancelled">Inactive</span>'}</td>
              <td>${completed.length}</td>
              <td>${avgRating !== '-' ? avgRating + ' ⭐' : '-'}</td>
              <td>
                <button class="btn btn-secondary btn-sm" data-act="edit-drv" data-id="${d.id}">✏️</button>
                ${DB.currentUser().role==='admin' ? `<button class="btn btn-danger btn-sm" data-act="del-drv" data-id="${d.id}">🗑️</button>`:''}
              </td>
            </tr>`;
          }).join('') : '<tr><td colspan="7"><div class="empty"><div class="emoji">👨‍✈️</div><h4>No drivers added yet</h4></div></td></tr>'}
        </tbody>
      </table>
    </div>
  `;

  $('#addDrvBtn').onclick = () => openDriverForm();
  $$('[data-act]').forEach(b => b.onclick = () => {
    const id = b.dataset.id;
    if (b.dataset.act === 'edit-drv') openDriverForm(DB.get('drivers', id));
    else if (b.dataset.act === 'del-drv') confirmDialog('Delete this driver?', () => { DB.remove('drivers', id); renderDelivery(); });
  });
}

function openPickupRequestForm(existing) {
  const r = existing || { customerName:'', customerPhone:'', address:'', pickupDate: isoDay(new Date(Date.now()+86400000)), pickupSlot:'09:00-11:00', notes:'', status:'pending' };
  const slotOptions = PICKUP_TIME_SLOTS.map(slot => `<option value="${slot.value}" ${r.pickupSlot===slot.value?'selected':''}>${slot.label}</option>`).join('');
  const legacySlotOption = r.pickupSlot && !PICKUP_TIME_SLOTS.some(slot => slot.value === r.pickupSlot)
    ? `<option value="${escapeHtml(r.pickupSlot)}" selected>${escapeHtml(pickupSlotLabel(r.pickupSlot))} (existing request)</option>`
    : '';
  openModal(`
    <h3>${existing?'Edit':'+ New'} Pickup Request</h3>
    <div class="form-row">
      <div class="field"><label>Customer Name *</label><input id="rName" value="${escapeHtml(r.customerName)}"/></div>
      <div class="field"><label>Phone *</label><input id="rPhone" value="${escapeHtml(r.customerPhone)}" type="tel"/></div>
    </div>
    <div class="form-row cols-1">
      <div class="field"><label>Pickup Address *</label><textarea id="rAddr" rows="2">${escapeHtml(r.address)}</textarea></div>
    </div>
    <div class="form-row">
      <div class="field"><label>Pickup Date *</label><input type="date" id="rDate" value="${r.pickupDate}"/></div>
      <div class="field"><label>Time Slot</label>
        <select id="rSlot">
          ${legacySlotOption}${slotOptions}
        </select>
      </div>
    </div>
    <div class="form-row cols-1">
      <div class="field"><label>Notes</label><textarea id="rNotes" rows="2" placeholder="Apartment #, landmarks, special instructions...">${escapeHtml(r.notes||'')}</textarea></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="saveReqBtn">💾 Save</button>
    </div>
  `, { onOpen(m) {
    $('#saveReqBtn', m).onclick = () => {
      const data = {
        customerName: $('#rName', m).value.trim(),
        customerPhone: $('#rPhone', m).value.trim(),
        address: $('#rAddr', m).value.trim(),
        pickupDate: $('#rDate', m).value,
        pickupSlot: $('#rSlot', m).value,
        notes: $('#rNotes', m).value.trim(),
        status: r.status
      };
      if (!data.customerName || !data.customerPhone || !data.address) { toast('Name, phone & address required','error'); return; }
      if (!data.pickupDate || !data.pickupSlot) { toast('Pickup date and slot are required','error'); return; }
      const requestedWindow = pickupSlotWindow(data.pickupSlot);
      const slotConflict = DB.all('pickupRequests').find(request => {
        if (request.id === (existing && existing.id) || request.status === 'cancelled' || request.pickupDate !== data.pickupDate) return false;
        const bookedWindow = pickupSlotWindow(request.pickupSlot);
        return requestedWindow && bookedWindow && requestedWindow.start < bookedWindow.end && requestedWindow.end > bookedWindow.start;
      });
      if (slotConflict) { toast('This pickup slot is already booked. Choose another date or time.','error'); return; }
      if (existing) DB.update('pickupRequests', existing.id, data);
      else DB.insert('pickupRequests', data);
      closeModal(); toast('Saved','success');
      if (typeof logAction === 'function') logAction(existing?'pickup.edit':'pickup.add', data.customerName);
      renderDelivery();
    };
  }});
}

function openDriverForm(existing) {
  const d = existing || { name:'', phone:'', vehicle:'', license:'', active:true };
  openModal(`
    <h3>${existing?'Edit':'+ Add'} Driver</h3>
    <div class="form-row">
      <div class="field"><label>Name *</label><input id="dName" value="${escapeHtml(d.name)}"/></div>
      <div class="field"><label>Phone *</label><input id="dPhone" value="${escapeHtml(d.phone||'')}" type="tel"/></div>
    </div>
    <div class="form-row">
      <div class="field"><label>Vehicle (e.g. Honda 70 - LXR 123)</label><input id="dVeh" value="${escapeHtml(d.vehicle||'')}"/></div>
      <div class="field"><label>License #</label><input id="dLic" value="${escapeHtml(d.license||'')}"/></div>
    </div>
    <div class="form-row cols-1">
      <div class="field"><label>Status</label>
        <select id="dActive">
          <option value="true" ${d.active!==false?'selected':''}>✅ Active</option>
          <option value="false" ${d.active===false?'selected':''}>❌ Inactive</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="saveDrvBtn">Save</button>
    </div>
  `, { onOpen(m) {
    $('#saveDrvBtn', m).onclick = () => {
      const data = {
        name: $('#dName', m).value.trim(),
        phone: $('#dPhone', m).value.trim(),
        vehicle: $('#dVeh', m).value.trim(),
        license: $('#dLic', m).value.trim(),
        active: $('#dActive', m).value === 'true'
      };
      if (!data.name || !data.phone) { toast('Name & phone required','error'); return; }
      if (existing) DB.update('drivers', existing.id, data);
      else DB.insert('drivers', data);
      closeModal(); toast('Saved','success');
      renderDelivery();
    };
  }});
}

function openAssignDriverDialog(requestId) {
  const drivers = DB.all('drivers').filter(d => d.active !== false);
  if (!drivers.length) { toast('Add a driver first', 'error'); return; }

  openModal(`
    <h3>👨‍✈️ Assign Driver</h3>
    <p class="sub">Pick a driver for this pickup request.</p>
    <div style="display:flex;flex-direction:column;gap:8px;">
      ${drivers.map(d => `
        <label style="display:flex;align-items:center;gap:10px;padding:12px;border:2px solid var(--border);border-radius:10px;cursor:pointer;">
          <input type="radio" name="drv" value="${d.id}"/>
          <div style="flex:1;">
            <div style="font-weight:700;">🛵 ${escapeHtml(d.name)}</div>
            <div style="font-size:11px;color:var(--text-soft);">${escapeHtml(d.phone||'')} • ${escapeHtml(d.vehicle||'No vehicle')}</div>
          </div>
        </label>
      `).join('')}
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="assignBtn">✅ Assign</button>
    </div>
  `, { onOpen(m) {
    $('#assignBtn', m).onclick = () => {
      const sel = m.querySelector('input[name="drv"]:checked');
      if (!sel) { toast('Pick a driver', 'error'); return; }
      DB.update('pickupRequests', requestId, {
        driverId: sel.value,
        status: 'assigned',
        assignedAt: new Date().toISOString()
      });
      closeModal(); toast('Driver assigned', 'success');
      if (typeof logAction === 'function') logAction('pickup.assign', requestId);
      renderDelivery();
      setTimeout(() => openPickupAssignmentWhatsApp(requestId), 250);
    };
  }});
}

function openPickupAssignmentWhatsApp(requestId) {
  const request = DB.get('pickupRequests', requestId);
  if (!request) return;
  const driver = DB.get('drivers', request.driverId) || {};
  const captainPhone = normalizePickupWhatsAppPhone(driver.phone);
  const customerPhone = normalizePickupWhatsAppPhone(request.customerPhone);
  const slot = pickupSlotLabel(request.pickupSlot);
  const date = request.pickupDate || 'To be confirmed';
  const notes = request.notes ? `\nNotes: ${request.notes}` : '';

  const captainMessage = `Hi ${driver.name || 'Captain'}, a new pickup request has been assigned to you.\n\nCustomer: ${request.customerName || '-'}\nCustomer phone: ${request.customerPhone || '-'}\nPickup address: ${request.address || '-'}\nPickup date: ${date}\nPickup slot: ${slot}${notes}\n\nPlease contact the customer if needed.`;
  const customerMessage = `Hello ${request.customerName || 'Customer'}, your pickup request is confirmed.\n\nCaptain/driver: ${driver.name || 'To be confirmed'}\nCaptain phone: ${driver.phone || 'Unavailable'}\nPickup date: ${date}\nPickup slot: ${slot}\nPickup address: ${request.address || '-'}\n\nThank you!`;

  openModal(`
    <h3>📱 Notify Captain &amp; Customer</h3>
    <p class="sub">Pickup #${String(request.id || '').slice(-6).toUpperCase()} • ${escapeHtml(date)} • ${escapeHtml(slot)}</p>
    <div style="background:var(--surface-alt);padding:10px 12px;border-radius:8px;margin-bottom:14px;font-size:12px;color:var(--text-soft);">
      Review or edit each message, then open WhatsApp. Messages are pre-filled; tap WhatsApp's send arrow to send them.
    </div>
    <div class="field">
      <label>Captain message — ${escapeHtml(driver.name || 'Captain')} (${escapeHtml(driver.phone || 'no phone')})</label>
      <textarea id="captainWaMessage" rows="7" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font:inherit;">${escapeHtml(captainMessage)}</textarea>
      ${!captainPhone ? '<small style="color:var(--danger);">A valid captain phone number is required to open WhatsApp.</small>' : ''}
    </div>
    <div class="field">
      <label>Customer confirmation — ${escapeHtml(request.customerName || 'Customer')} (${escapeHtml(request.customerPhone || 'no phone')})</label>
      <textarea id="customerWaMessage" rows="7" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font:inherit;">${escapeHtml(customerMessage)}</textarea>
      ${!customerPhone ? '<small style="color:var(--danger);">A valid customer phone number is required to open WhatsApp.</small>' : ''}
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Done</button>
      <button class="btn btn-secondary" id="captainWaBtn" ${captainPhone?'':'disabled'}>📱 WhatsApp Captain</button>
      <button class="btn btn-success" id="customerWaBtn" ${customerPhone?'':'disabled'}>📱 WhatsApp Customer</button>
    </div>
  `, { large: true, onOpen(m) {
    const openChat = (recipient, phone, messageSelector) => {
      if (!phone) { toast('Recipient phone number is missing or invalid','error'); return; }
      const message = $(messageSelector, m).value;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
      const current = DB.get('pickupRequests', requestId) || request;
      const notifyLog = Array.isArray(current.whatsappNotifyLog) ? [...current.whatsappNotifyLog] : [];
      notifyLog.push({ recipient, openedAt: new Date().toISOString(), by: DB.currentUser()?.username || 'unknown' });
      DB.update('pickupRequests', requestId, { whatsappNotifyLog: notifyLog });
      toast(`Opening WhatsApp for ${recipient === 'captain' ? 'captain' : 'customer'}...`, 'success');
    };
    $('#captainWaBtn', m).onclick = () => openChat('captain', captainPhone, '#captainWaMessage');
    $('#customerWaBtn', m).onclick = () => openChat('customer', customerPhone, '#customerWaMessage');
  }});
}

function updateRequestStatus(id, newStatus) {
  DB.update('pickupRequests', id, { status: newStatus, [newStatus + 'At']: new Date().toISOString() });
  toast('Status updated', 'success');
  renderDelivery();
}

function openCompleteDeliveryDialog(requestId) {
  openModal(`
    <h3>✅ Complete Delivery</h3>
    <p class="sub">Mark this delivery as complete and rate the driver.</p>
    <div class="field">
      <label>Customer Rating (optional)</label>
      <div style="display:flex;gap:8px;justify-content:center;font-size:36px;margin:10px 0;">
        ${[1,2,3,4,5].map(n => `<span class="rate-star" data-star="${n}" style="cursor:pointer;color:#ddd;">★</span>`).join('')}
      </div>
    </div>
    <div class="field"><label>Feedback (optional)</label><textarea id="dlvFb" rows="2"></textarea></div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-success" id="cmpBtn">✅ Complete</button>
    </div>
  `, { onOpen(m) {
    let rating = 0;
    m.querySelectorAll('.rate-star').forEach(s => {
      s.onclick = () => {
        rating = +s.dataset.star;
        m.querySelectorAll('.rate-star').forEach((x,i) => x.style.color = i < rating ? '#f59e0b' : '#ddd');
      };
    });
    $('#cmpBtn', m).onclick = () => {
      DB.update('pickupRequests', requestId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        rating: rating || null,
        feedback: $('#dlvFb', m).value.trim()
      });
      closeModal(); toast('Delivery completed!', 'success');
      renderDelivery();
    };
  }});
}
