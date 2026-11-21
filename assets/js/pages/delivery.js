/* ===================== PICKUP & DELIVERY MODULE ===================== */
let deliveryFilter = { tab: 'requests', status: 'all', driverId: 'all' };

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
      <button class="btn ${deliveryFilter.tab==='drivers'?'btn-primary':'btn-secondary'}" id="tabDrv">👨‍✈️ Captains</button>
      <button class="btn btn-secondary" id="pickupSetupBtn">⚙️ Slot &amp; WhatsApp Setup</button>
      <button class="btn btn-success" id="newReqBtn" style="margin-left:auto;">+ New Pickup Request</button>
    </div>

    <div id="deliveryContent"></div>
  `;
  $('#app').innerHTML = renderLayout('delivery', content);
  bindLayout();

  $('#tabReq').onclick = () => { deliveryFilter.tab = 'requests'; renderDelivery(); };
  $('#tabDrv').onclick = () => { deliveryFilter.tab = 'drivers'; renderDelivery(); };
  $('#newReqBtn').onclick = () => openPickupRequestForm();
  $('#pickupSetupBtn').onclick = () => openPickupSetup();

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
            <td><b>${escapeHtml(r.pickupDate||'-')}</b><br><small>${escapeHtml(r.pickupSlot||'-')}</small></td>
            <td>${r.driverId ? '🛵 ' + escapeHtml((drivers.find(d=>d.id===r.driverId)||{}).name||'-') +
                  '<br><small style="color:var(--text-soft);">' + escapeHtml((drivers.find(d=>d.id===r.driverId)||{}).phone||'no number') + '</small>'
                  : '<span style="color:var(--text-soft);">Not assigned</span>'}</td>
            <td><span class="badge ${statusColors[r.status]||'pending'}">${r.status}</span></td>
            <td>${r.rating?('⭐'.repeat(r.rating)):'-'}</td>
            <td style="white-space:nowrap;">
              ${r.status === 'pending' ? `<button class="btn btn-success btn-sm" data-act="assign" data-id="${r.id}">👨‍✈️ Assign</button>` : ''}
              ${r.status === 'assigned' ? `<button class="btn btn-primary btn-sm" data-act="pickup" data-id="${r.id}">📦 Mark Picked Up</button>` : ''}
              ${r.status === 'picked' ? `<button class="btn btn-success btn-sm" data-act="deliver" data-id="${r.id}">✅ Complete</button>` : ''}
              ${r.driverId ? `<button class="btn btn-secondary btn-sm" data-act="sheet" data-id="${r.id}" title="Job sheet / WhatsApp">🧾</button>` : ''}
              ${r.customerPhone ? `<button class="btn btn-success btn-sm" data-act="wacust" data-id="${r.id}" title="WhatsApp the customer">📱</button>` : ''}
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
    else if (act === 'sheet') openJobSheet(id);
    else if (act === 'wacust') {
      const rq = DB.get('pickupRequests', id);
      if (!rq) return;
      const drv = rq.driverId ? DB.get('drivers', rq.driverId) : null;
      const sh = window.PICKUP_OPS ? PICKUP_OPS.jobSheet(rq, drv) : null;
      if (!sh) { toast('Pickup module not loaded', 'error'); return; }
      PICKUP_OPS.openWhatsApp(sh.customerPhone, sh.customerMessage);
      if (typeof logAction === 'function') logAction('pickup.waCustomer', id);
    }
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
  const r = existing || { customerName:'', customerPhone:'', address:'', pickupDate: isoDay(new Date(Date.now()+86400000)), pickupSlot:'', notes:'', status:'pending' };
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
        <select id="rSlot"><option value="${escapeHtml(r.pickupSlot||'')}">${escapeHtml(r.pickupSlot || 'Loading…')}</option></select>
        <small id="rSlotNote" style="color:var(--text-soft);"></small>
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
    /* Slot list = slots that are still sellable (2h lead time, 1 order per slot). */
    const refreshSlots = () => {
      const sel = $('#rSlot', m);
      const note = $('#rSlotNote', m);
      const dateISO = $('#rDate', m).value;
      if (!window.PICKUP_OPS) { sel.innerHTML = '<option value="10am-2pm">10 AM - 2 PM</option>'; return; }
      const res = PICKUP_OPS.slotsForDay(dateISO);
      if (!res.slots.length) {
        const why = res.reason === 'closed' ? 'Shop closed on this day — choose another date.'
          : res.reason === 'late' ? 'Too late today — first slot starts ' + PICKUP_OPS.config().leadHours + 'h from now.'
          : res.reason === 'past' ? 'This date has already passed.'
          : 'All slots for this day are booked (1 order per slot). Try the next date.';
        sel.innerHTML = '<option value="">No slots available</option>';
        note.textContent = why;
        note.style.color = 'var(--danger)';
        return;
      }
      const keep = sel.value;
      sel.innerHTML = res.slots.map(sl =>
        `<option value="${escapeHtml(sl.value)}" ${sl.value === keep || sl.value === r.pickupSlot ? 'selected' : ''}>🕒 ${escapeHtml(sl.label)}</option>`
      ).join('');
      note.textContent = 'Each slot takes ONE pickup — booked slots are hidden automatically.';
      note.style.color = 'var(--text-soft)';
    };
    $('#rDate', m).onchange = refreshSlots;
    refreshSlots();

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
      if (!data.pickupSlot) { toast('Pick an available time slot','error'); return; }
      // one order per slot — block a double booking even if two staff edit at once
      if (window.PICKUP_OPS && !PICKUP_OPS.slotFree(data.pickupDate, data.pickupSlot)) {
        const clash = DB.all('pickupRequests').find(x => x.id !== (existing && existing.id) &&
          x.status !== 'cancelled' && x.pickupDate === data.pickupDate && String(x.pickupSlot) === data.pickupSlot);
        toast('That slot is already booked' + (clash ? ' for ' + clash.customerName : '') + ' — pick another', 'error');
        return;
      }
      // keep the captain if he was already assigned (edit must not wipe the assignment)
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


/* ============================================================
   SLOT & WHATSAPP SETUP
   ============================================================ */
function openPickupSetup() {
  const s = DB.settings();
  const ops = window.PICKUP_OPS;
  const cfg = ops ? ops.config() : {};
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  openModal(`
    <h3>⚙️ Pickup Slot &amp; WhatsApp Setup</h3>
    <p class="sub">Controls how the customer sees slots on the portal, and what the captain / customer receive.</p>

    <div style="font-weight:800;margin:14px 0 8px;">🕒 Slot rules</div>
    <div class="form-row">
      <div class="field">
        <label>Minimum lead time (hours)</label>
        <input type="number" id="psLead" min="0" max="24" value="${cfg.leadHours != null ? cfg.leadHours : 2}"/>
        <small style="color:var(--text-soft);">Slots start this many hours from now (2 = rider free by then).</small>
      </div>
      <div class="field">
        <label>Orders per slot</label>
        <input type="number" id="psCap" min="1" max="10" value="${cfg.capacity || 1}"/>
        <small style="color:var(--text-soft);">1 = one customer per slot (recommended).</small>
      </div>
    </div>
    <div class="form-row">
      <div class="field">
        <label>Slot length (minutes)</label>
        <select id="psLen">
          ${[60,90,120,180].map(n => `<option value="${n}" ${cfg.slotMinutes==n?'selected':''}>${n} min</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Working hours</label>
        <div style="display:flex;gap:6px;align-items:center;">
          <input type="time" id="psStart" value="${escapeHtml(cfg.dayStart||'10:00')}" style="flex:1;"/>
          <span>to</span>
          <input type="time" id="psEnd" value="${escapeHtml(cfg.dayEnd||'20:00')}" style="flex:1;"/>
        </div>
      </div>
    </div>
    <div class="field">
      <label>Open days</label>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        ${dayNames.map((n, i) => `
          <label style="display:flex;align-items:center;gap:4px;padding:6px 9px;border:1px solid var(--border);border-radius:8px;font-size:12px;">
            <input type="checkbox" class="ps-day" value="${i}" ${(cfg.openDays||[]).indexOf(i) !== -1 ? 'checked' : ''}/> ${n.slice(0,3)}
          </label>`).join('')}
      </div>
    </div>
    <label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:14px;">
      <input type="checkbox" id="psFri" ${cfg.fridayBreak !== false ? 'checked' : ''}/> Skip 1:30 – 2:00 PM slots on Friday (prayer break)
    </label>

    <div style="font-weight:800;margin:14px 0 8px;border-top:1px solid var(--border);padding-top:14px;">📱 WhatsApp on assignment</div>
    <label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:6px;">
      <input type="checkbox" id="psAutoCap" ${cfg.autoCaptain ? 'checked' : ''}/> Automatically message the captain (job sheet)
    </label>
    <label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:12px;">
      <input type="checkbox" id="psAutoCust" ${cfg.autoCustomer ? 'checked' : ''}/> Automatically confirm to the customer
    </label>

    <div class="field">
      <label>Captain message template</label>
      <textarea id="psTplCap" rows="8" style="width:100%;font-family:monospace;font-size:11.5px;">${escapeHtml(s.waTemplateCaptain || (ops ? ops.DEFAULT_CAPTAIN_TPL : ''))}</textarea>
      <small style="color:var(--text-soft);">{shop} {request} {name} {phone} {address} {date} {slot} {notes}</small>
    </div>
    <div class="field">
      <label>Customer message template</label>
      <textarea id="psTplCust" rows="8" style="width:100%;font-family:monospace;font-size:11.5px;">${escapeHtml(s.waTemplateCustomer || (ops ? ops.DEFAULT_CUSTOMER_TPL : ''))}</textarea>
      <small style="color:var(--text-soft);">{name} {date} {slot} {captain} {captain_phone} {vehicle} {shop} {shop_phone}</small>
    </div>

    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-secondary" id="psResetTpl">↺ Default messages</button>
      <button class="btn btn-primary" id="psSave">💾 Save</button>
    </div>
  `, { large: true, onOpen(m) {
    $('#psResetTpl', m).onclick = () => {
      if (!ops) return;
      $('#psTplCap', m).value = ops.DEFAULT_CAPTAIN_TPL;
      $('#psTplCust', m).value = ops.DEFAULT_CUSTOMER_TPL;
    };
    $('#psSave', m).onclick = () => {
      const days = [...m.querySelectorAll('.ps-day:checked')].map(cb => +cb.value);
      DB.saveSettings({
        pickupLeadHours: Math.max(0, Math.min(24, +$('#psLead', m).value || 0)),
        pickupSlotCapacity: Math.max(1, Math.min(10, +$('#psCap', m).value || 1)),
        pickupSlotMinutes: +$('#psLen', m).value || 120,
        pickupDayStart: $('#psStart', m).value || '10:00',
        pickupDayEnd: $('#psEnd', m).value || '20:00',
        pickupOpenDays: days,
        pickupFridayBreak: $('#psFri', m).checked,
        autoWhatsAppCaptain: $('#psAutoCap', m).checked,
        autoWhatsAppCustomer: $('#psAutoCust', m).checked,
        waTemplateCaptain: $('#psTplCap', m).value.trim(),
        waTemplateCustomer: $('#psTplCust', m).value.trim()
      });
      closeModal(); toast('Pickup setup saved', 'success');
      if (typeof logAction === 'function') logAction('pickup.setup', 'slot rules updated');
      renderDelivery();
    };
  }});
}

function openAssignDriverDialog(requestId) {
  const req = DB.get('pickupRequests', requestId);
  if (!req) return;
  const drivers = DB.all('drivers').filter(d => d.active !== false);
  if (!drivers.length) { toast('Add a captain first (Drivers tab)', 'error'); return; }

  const ops = window.PICKUP_OPS;
  const cf = ops ? ops.config() : { autoCaptain: true, autoCustomer: true };

  openModal(`
    <h3>👨‍✈️ Assign Captain</h3>
    <p class="sub">The full job details go to the captain on WhatsApp — and a confirmation goes to the customer.</p>

    <div style="background:var(--surface-alt);border-radius:10px;padding:12px;margin-bottom:12px;font-size:12.5px;line-height:1.8;">
      <div><b>Contact person:</b> ${escapeHtml(req.customerName || '-')}</div>
      <div><b>Contact number:</b> ${escapeHtml(req.customerPhone || '-')}</div>
      <div><b>Address:</b> ${escapeHtml(req.address || '-')}</div>
      <div><b>Pickup:</b> ${escapeHtml(req.pickupDate || '-')} · ${escapeHtml(req.pickupSlot || '-')}</div>
      ${req.notes ? `<div><b>Notes:</b> ${escapeHtml(req.notes)}</div>` : ''}
    </div>

    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;">
      ${drivers.map(d => `
        <label class="drv-pick" style="display:flex;align-items:center;gap:10px;padding:12px;border:2px solid var(--border);border-radius:10px;cursor:pointer;">
          <input type="radio" name="drv" value="${d.id}"/>
          <div style="flex:1;">
            <div style="font-weight:700;">🛵 ${escapeHtml(d.name)}</div>
            <div style="font-size:11px;color:var(--text-soft);">${escapeHtml(d.phone || 'NO NUMBER — cannot WhatsApp')} • ${escapeHtml(d.vehicle || 'No vehicle')}</div>
          </div>
        </label>
      `).join('')}
    </div>

    <div style="background:#ecfdf5;border:1px solid #86efac;border-radius:10px;padding:12px;font-size:12px;line-height:1.9;color:#14532d;">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
        <input type="checkbox" id="waCaptain" ${cf.autoCaptain ? 'checked' : ''}/>
        <span><b>Send job sheet to captain</b> on WhatsApp</span>
      </label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:4px;">
        <input type="checkbox" id="waCustomer" ${cf.autoCustomer ? 'checked' : ''}/>
        <span><b>Confirm to customer</b> with captain's name &amp; number</span>
      </label>
      <div style="font-size:11px;color:#166534;margin-top:6px;">WhatsApp opens with the message ready — just press send.</div>
    </div>

    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="assignBtn">✅ Assign &amp; Send</button>
    </div>
  `, { onOpen(m) {
    // highlight the picked captain
    m.querySelectorAll('input[name="drv"]').forEach(inp => {
      inp.onchange = () => m.querySelectorAll('.drv-pick').forEach(l => {
        const on = l.querySelector('input').checked;
        l.style.borderColor = on ? 'var(--primary)' : 'var(--border)';
        l.style.background = on ? 'var(--primary-light)' : 'transparent';
      });
    });

    $('#assignBtn', m).onclick = () => {
      const sel = m.querySelector('input[name="drv"]:checked');
      if (!sel) { toast('Pick a captain', 'error'); return; }
      const sendCaptain = $('#waCaptain', m).checked;
      const sendCustomer = $('#waCustomer', m).checked;
      const driver = DB.get('drivers', sel.value);

      DB.update('pickupRequests', requestId, {
        driverId: sel.value,
        status: 'assigned',
        assignedAt: new Date().toISOString()
      });

      const updated = DB.get('pickupRequests', requestId);
      closeModal();

      if (ops) {
        if (sendCaptain || sendCustomer) {
          setTimeout(() => {
            const sent = ops.notifyAssignment(updated, driver, { captain: sendCaptain, customer: sendCustomer });
            const bits = [];
            if (sent.captain) bits.push('captain');
            if (sent.customer) bits.push('customer');
            toast(bits.length ? ('WhatsApp opened for ' + bits.join(' + ')) : 'Assigned (no WhatsApp number)', bits.length ? 'success' : 'warning');
          }, 200);
        } else {
          toast('Captain assigned', 'success');
        }
      }

      if (typeof logAction === 'function') logAction('pickup.assign', `${requestId} → ${driver ? driver.name : sel.value}`);
      renderDelivery();

      // show the job sheet so it can be re-sent / printed any time
      setTimeout(() => openJobSheet(requestId), 500);
    };
  }});
}

/* ============================================================
   JOB SHEET — everything the captain needs, re-sendable
   ============================================================ */
function openJobSheet(requestId) {
  const req = DB.get('pickupRequests', requestId);
  if (!req) return;
  const driver = req.driverId ? DB.get('drivers', req.driverId) : null;
  const ops = window.PICKUP_OPS;
  const sheet = ops ? ops.jobSheet(req, driver) : null;
  if (!sheet) return;

  openModal(`
    <h3>🧾 Job Sheet — #${escapeHtml(String(req.id).slice(-6).toUpperCase())}</h3>
    <p class="sub">${driver ? 'Captain: <b>' + escapeHtml(driver.name) + '</b>' : 'No captain assigned yet'}</p>

    <div style="background:var(--surface-alt);border-radius:10px;padding:12px;font-size:13px;line-height:1.9;margin-bottom:12px;">
      <div><b>Contact person:</b> ${escapeHtml(req.customerName || '-')}</div>
      <div><b>Contact number:</b> <a href="tel:${escapeHtml((req.customerPhone||'').replace(/[^\d+]/g,''))}">${escapeHtml(req.customerPhone || '-')}</a></div>
      <div><b>Address:</b> ${escapeHtml(req.address || '-')}</div>
      <div><b>Pickup date:</b> ${escapeHtml(ops ? ops.prettyDate(req.pickupDate) : req.pickupDate || '-')}</div>
      <div><b>Time slot:</b> ${escapeHtml(req.pickupSlot || '-')}</div>
      ${req.notes ? `<div><b>Notes:</b> ${escapeHtml(req.notes)}</div>` : ''}
      ${driver ? `<div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--border);"><b>Captain:</b> ${escapeHtml(driver.name)} · ${escapeHtml(driver.phone || '-')}${driver.vehicle ? ' · ' + escapeHtml(driver.vehicle) : ''}</div>` : ''}
    </div>

    ${driver ? `
      <div class="field">
        <label>Message for the captain</label>
        <textarea id="jsCaptain" rows="8" style="width:100%;font-size:12px;font-family:monospace;">${escapeHtml(sheet.captainMessage)}</textarea>
      </div>
      <div class="field">
        <label>Message for the customer</label>
        <textarea id="jsCustomer" rows="8" style="width:100%;font-size:12px;font-family:monospace;">${escapeHtml(sheet.customerMessage)}</textarea>
      </div>
    ` : `<div style="background:#fff7ed;border:1px solid #fdba74;padding:10px;border-radius:8px;font-size:12px;color:#7c2d12;">Assign a captain to generate the WhatsApp messages.</div>`}

    <div class="modal-footer" style="flex-wrap:wrap;gap:6px;">
      <button class="btn btn-ghost" onclick="closeModal()">Close</button>
      ${driver ? `
        <button class="btn btn-secondary" id="jsCopyCap">📋 Copy captain msg</button>
        <button class="btn btn-success" id="jsSendCap">📱 Captain</button>
        <button class="btn btn-primary" id="jsSendCust">📱 Customer</button>
      ` : ''}
    </div>
  `, { large: true, onOpen(m) {
    if (!driver) return;
    const capMsg = () => $('#jsCaptain', m).value;
    const custMsg = () => $('#jsCustomer', m).value;

    $('#jsCopyCap', m).onclick = () => {
      navigator.clipboard.writeText(capMsg()).then(() => toast('Copied','success')).catch(() => toast('Copy failed','error'));
    };
    $('#jsSendCap', m).onclick = () => {
      if (!sheet.captainPhone) { toast('Captain has no phone number saved', 'error'); return; }
      ops.openWhatsApp(sheet.captainPhone, capMsg());
      if (typeof logAction === 'function') logAction('pickup.waCaptain', requestId);
    };
    $('#jsSendCust', m).onclick = () => {
      if (!sheet.customerPhone) { toast('Customer has no phone number', 'error'); return; }
      ops.openWhatsApp(sheet.customerPhone, custMsg());
      if (typeof logAction === 'function') logAction('pickup.waCustomer', requestId);
    };
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
