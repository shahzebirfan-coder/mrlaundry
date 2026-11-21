/* ===================== ORDERS / INVOICES ===================== */
let ordersFilter = { status:'all', search:'', dateFrom:'', dateTo:'', payment:'all' };

function renderOrders() {
  const content = `
    <h1 class="page-title">📦 ${t('ord.title')}</h1>
    <p class="page-sub">Search, view, and ${DB.currentUser().role==='admin'?'edit':'track'} all invoices.</p>

    <div class="card" style="margin-bottom:14px;padding:14px;">
      <div style="font-weight:700;margin-bottom:10px;">${t('ord.findInvoice')}</div>
      <div class="filter-bar" style="margin-bottom:8px;">
        <input id="oSearch" placeholder="${t('ord.searchPlaceholder')}" style="flex:1;min-width:280px;" value="${escapeHtml(ordersFilter.search)}"/>
        <select id="oStatus">
          <option value="all">${t('ord.allStatus')}</option>
          <option value="pending">⏳ ${t('status.pending')}</option>
          <option value="washing">🌀 ${t('status.washing')}</option>
          <option value="ironing">🧺 ${t('status.ironing', 'Press (Ironing)')}</option>
          <option value="ready">✅ ${t('status.ready')}</option>
          <option value="delivered">📦 ${t('status.delivered')}</option>
          <option value="cancelled">❌ ${t('status.cancelled')}</option>
        </select>
        <select id="oPayment">
          <option value="all">${t('ord.allPayments')}</option>
          <option value="paid">${t('ord.fullyPaid')}</option>
          <option value="credit">${t('ord.credit')}</option>
          <option value="advance">${t('ord.advance')}</option>
          <option value="partial">${t('ord.partial')}</option>
        </select>
      </div>
      <div class="filter-bar">
        <label style="display:flex;align-items:center;gap:6px;">${t('ord.from')} <input type="date" id="oFrom" value="${ordersFilter.dateFrom}"/></label>
        <label style="display:flex;align-items:center;gap:6px;">${t('ord.to')} <input type="date" id="oTo" value="${ordersFilter.dateTo}"/></label>
        <button class="btn btn-secondary btn-sm" id="oToday">${t('ord.today')}</button>
        <button class="btn btn-secondary btn-sm" id="oWeek">${t('ord.last7')}</button>
        <button class="btn btn-secondary btn-sm" id="oMonth">${t('ord.thisMonth')}</button>
        <button class="btn btn-ghost btn-sm" id="oClear">${t('ord.clearAll')}</button>
        <button class="btn btn-success" id="oQuickPay" style="margin-left:auto;">${t('ord.quickReceive')}</button>
        <button class="btn btn-primary" data-page="pos">${t('ord.newSale')}</button>
      </div>
    </div>

    <div id="ordersSummary"></div>

    <div class="card" style="padding:0;overflow:hidden;">
      <table class="tbl">
        <thead><tr>
          <th>${t('ord.invoice')}</th><th>${t('ord.customer')}</th><th>${t('ord.items')}</th><th>${t('ord.total')}</th><th>${t('ord.paid')}</th>
          <th>${t('ord.status')}</th><th>${t('ord.booked')}</th><th>${t('ord.delivery')}</th><th>${t('ord.actions')}</th>
        </tr></thead>
        <tbody id="ordersBody"></tbody>
      </table>
    </div>
  `;
  $('#app').innerHTML = renderLayout('orders', content);
  bindLayout();

  $('#oSearch').oninput  = e => { ordersFilter.search = e.target.value; renderOrdersBody(); };
  $('#oStatus').onchange = e => { ordersFilter.status = e.target.value; renderOrdersBody(); };
  $('#oPayment').onchange= e => { ordersFilter.payment = e.target.value; renderOrdersBody(); };
  $('#oFrom').onchange   = e => { ordersFilter.dateFrom = e.target.value; renderOrdersBody(); };
  $('#oTo').onchange     = e => { ordersFilter.dateTo = e.target.value; renderOrdersBody(); };
  $('#oToday').onclick   = () => { ordersFilter.dateFrom = ordersFilter.dateTo = isoDay(); renderOrders(); };
  $('#oWeek').onclick    = () => { const d=new Date(); d.setDate(d.getDate()-6); ordersFilter.dateFrom = isoDay(d); ordersFilter.dateTo = isoDay(); renderOrders(); };
  $('#oMonth').onclick   = () => { const d=new Date(); ordersFilter.dateFrom = isoDay(new Date(d.getFullYear(),d.getMonth(),1)); ordersFilter.dateTo = isoDay(); renderOrders(); };
  $('#oClear').onclick   = () => { ordersFilter = { status:'all', search:'', dateFrom:'', dateTo:'', payment:'all' }; renderOrders(); };
  $('#oQuickPay').onclick = () => openQuickPay();

  // Set status/payment dropdowns to current value
  $('#oStatus').value = ordersFilter.status;
  $('#oPayment').value = ordersFilter.payment;
  renderOrdersBody();
}

function filteredOrders() {
  const orders = [...DB.all('orders')].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  return orders.filter(o => {
    if (ordersFilter.status !== 'all' && o.status !== ordersFilter.status) return false;
    if (ordersFilter.payment === 'paid'    && o.due > 0) return false;
    if (ordersFilter.payment === 'credit'  && o.paid > 0) return false;
    if (ordersFilter.payment === 'advance' && o.paymentType !== 'advance') return false;
    if (ordersFilter.payment === 'partial' && (o.paid === 0 || o.due === 0 || o.paymentType === 'advance')) return false;
    const d = o.createdAt.slice(0,10);
    if (ordersFilter.dateFrom && d < ordersFilter.dateFrom) return false;
    if (ordersFilter.dateTo && d > ordersFilter.dateTo) return false;
    if (ordersFilter.search) {
      const q = ordersFilter.search.toLowerCase();
      const c = DB.get('customers', o.customerId) || {};
      const invStr = String(o.invoiceNo || o.id);
      if (!invStr.toLowerCase().includes(q)
        && !(c.name||'').toLowerCase().includes(q)
        && !(c.phone||'').includes(q)
        && !(c.loyaltyNo||'').toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

function renderOrdersBody() {
  const filtered = filteredOrders();

  // Summary
  const totalRevenue = filtered.reduce((s,o)=>s+(o.total||0),0);
  const totalPaid = filtered.reduce((s,o)=>s+(o.paid||0),0);
  const totalDue = filtered.reduce((s,o)=>s+(o.due||0),0);
  $('#ordersSummary').innerHTML = `
    <div class="grid-stats" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-bottom:14px;">
      <div class="stat-card"><div class="ic b1">🧾</div><div><div class="lbl">Showing</div><div class="val">${filtered.length} invoices</div></div></div>
      <div class="stat-card"><div class="ic b2">💰</div><div><div class="lbl">${t('ord.total')}</div><div class="val">${fmtMoney(totalRevenue)}</div></div></div>
      <div class="stat-card"><div class="ic b3">✅</div><div><div class="lbl">${t('ord.collected')}</div><div class="val">${fmtMoney(totalPaid)}</div></div></div>
      <div class="stat-card"><div class="ic b4">⏰</div><div><div class="lbl">${t('ord.outstandingDue')}</div><div class="val" style="color:var(--danger);">${fmtMoney(totalDue)}</div></div></div>
    </div>
  `;

  if (!filtered.length) {
    $('#ordersBody').innerHTML = `<tr><td colspan="9"><div class="empty"><div class="emoji">📦</div><h4>${t('ord.noOrders')}</h4><p>${t('ord.tryClearing')}</p></div></td></tr>`;
    return;
  }

  $('#ordersBody').innerHTML = filtered.map(o => {
    const c = DB.get('customers', o.customerId) || { name: 'Walk-in' };
    const invNo = DB.invoiceLabel(o);
    return `<tr>
      <td><b>${escapeHtml(invNo)}</b>${o.isCredit?`<br><span class="badge due">CREDIT</span>`:''}${o.paymentType==='advance'?`<br><span class="badge" style="background:#dcfce7;color:#065f46;">🟢 ADVANCE</span>`:''}</td>
      <td><b>${escapeHtml(c.name)}</b><br><small style="color:var(--text-soft);">${escapeHtml(c.phone||'')}</small></td>
      <td>${o.items.length} items<br><b style='color:var(--primary);'>${o.items.reduce((s,i)=>s+(i.qty||0),0)} pcs</b>${o.deliveryType?` <span class='badge' style='background:#f3f4f6;color:#374151;'>${o.deliveryType==='hanger'?'🧥':o.deliveryType==='fold'?'📦':'🧺'} ${o.deliveryType}</span>`:''}</td>
      <td><b>${fmtMoney(o.total)}</b></td>
      <td>
        ${o.due>0
          ? `<span class="badge due">${(o.paid||0) > 0 ? 'Due ' + fmtMoney(o.due) : 'UNPAID'}</span>
             <br><small style="color:var(--text-soft);">Paid: ${fmtMoney(o.paid||0)}</small>`
          : `<span style="color:var(--success);font-weight:700;">${fmtMoney(o.paid||0)}</span><br><span class="badge paid">Paid ✅</span>`}
      </td>
      <td>
        <span class="badge ${o.status}">${statusBadgeLabel(o.status)}</span>
        ${(o.status === 'ready' && o.location) ? `<br><span style="font-size:10px;font-weight:700;color:#000;background:#fef08a;padding:2px 6px;border-radius:6px;border:1px solid #f59e0b;margin-top:4px;display:inline-block;">📍 ${escapeHtml(o.location)}</span>` : ''}
      </td>
      <td>${fmtDateShort(o.createdAt)}</td>
      <td>${escapeHtml(o.deliveryDate || '-')}</td>
      <td>
        <button class="btn btn-secondary btn-sm" data-act="view" data-id="${o.id}" title="${t('ord.viewInv')}">👁️</button>
        <button class="btn btn-secondary btn-sm" data-act="status" data-id="${o.id}" title="${t('ord.updateStatus')}">🔄</button>
        <button class="btn btn-secondary btn-sm" data-act="partial" data-id="${o.id}" title="Partial Delivery">🛍️</button>
        ${(o.due||0) > 0 ? `<button class="btn btn-success btn-sm" data-act="receive" data-id="${o.id}" title="${t('rcv.title')}">💰</button>` : ''}
        ${c.phone ? `<button class="btn btn-success btn-sm" data-act="wa" data-id="${o.id}" title="${t('ord.sendWa')}">📱${(o.whatsappLog && o.whatsappLog.length) ? ` ${o.whatsappLog.length}` : ""}</button>` : ''}
        <button class="btn btn-secondary btn-sm" data-act="photos" data-id="${o.id}" title="${t('ord.photos')}">📷${(o.photos&&o.photos.length)?` ${o.photos.length}`:''}</button>
        <button class="btn btn-secondary btn-sm" data-act="print" data-id="${o.id}" title="${t('ord.printInv')}">🖨️</button>
        ${c.isB2B ? `<button class="btn btn-secondary btn-sm" data-act="challan" data-id="${o.id}" title="Print Delivery Challan" style="border-color:#1e40af;color:#1e40af;background:#eff6ff;">📄 Challan</button>` : ''}
        ${DB.currentUser().role==='admin' && !(typeof isAppExpired === 'function' && isAppExpired()) ? `<button class="btn btn-warning btn-sm" data-act="edit" data-id="${o.id}" title="${t('ord.edit')}">✏️</button><button class="btn btn-danger btn-sm" data-act="del" data-id="${o.id}" title="${t('ord.delete')}">🗑️</button>` : ''}
      </td>
    </tr>`;
  }).join('');

  $$('[data-act]').forEach(b => b.onclick = () => {
    const id = b.dataset.id;
    if (b.dataset.act === 'view' || b.dataset.act === 'print') openInvoice(id, b.dataset.act === 'print');
    else if (b.dataset.act === 'challan') printChallan(id);
    else if (b.dataset.act === 'status') openStatusChange(id);
    else if (b.dataset.act === 'partial') openPartialDelivery(id);
    else if (b.dataset.act === 'receive') openReceivePayment(id);
    else if (b.dataset.act === 'wa') openWhatsAppPicker(id);
    else if (b.dataset.act === 'edit') openEditInvoice(id);
    else if (b.dataset.act === 'photos') openOrderPhotos(id);
    else if (b.dataset.act === 'del') {
      if (typeof confirmVoidWithReason === 'function') {
        confirmVoidWithReason(id, 'delete', () => {
          const orderToDel = DB.get('orders', id);
          if (orderToDel && typeof restoreInventory === 'function') restoreInventory(orderToDel);
          DB.remove('orders', id);
          if (typeof DB.reclaimInvoiceNo === 'function') DB.reclaimInvoiceNo(orderToDel && orderToDel.invoiceNo);
          renderOrdersBody();
        });
      } else {
        confirmDialog('Delete this invoice permanently?', () => {
          if (typeof logAction === 'function') logAction('order.delete', `Order ${id.slice(-6)}`);
          const orderToDel = DB.get('orders', id);
          if (orderToDel && typeof restoreInventory === 'function') restoreInventory(orderToDel);
          DB.remove('orders', id);
          if (typeof DB.reclaimInvoiceNo === 'function') DB.reclaimInvoiceNo(orderToDel && orderToDel.invoiceNo);
          toast('Deleted','success'); renderOrdersBody();
        });
      }
    }
  });
}

/* Status ka insaani naam — "ironing" ke bajaye "Press" */
function statusBadgeLabel(status) {
  const map = { pending: 'Pending', washing: 'Washing', ironing: 'Press', ready: 'Ready', delivered: 'Delivered', cancelled: 'Cancelled', partial: 'Partial' };
  return map[status] || status;
}

function openStatusChange(orderId) {
  const o = DB.get('orders', orderId);
  if (!o) return;
  const c = DB.get('customers', o.customerId) || {};
  const html = `
    <h3>🔄 Update Order — ${DB.invoiceLabel(o)}</h3>
    <p class="sub">Customer: ${escapeHtml(c.name)} • ${escapeHtml(c.phone||'')}</p>
    <div class="form-row cols-1">
      <div class="field">
        <label>Order Status</label>
        <select id="newStatus">
          <option value="pending"   ${o.status==='pending'?'selected':''}>⏳ Pending</option>
          <option value="washing"   ${o.status==='washing'?'selected':''}>🌀 Washing</option>
          <option value="ironing"   ${o.status==='ironing'?'selected':''}>🧺 Press (Ironing)</option>
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
      <div class="field" id="pressHint" style="display:${o.status==='ironing'?'block':'none'};background:#fff7ed;border-left:4px solid #f59e0b;border-radius:8px;padding:8px 10px;font-size:12px;color:#92400e;font-weight:600;">
        🧺 Press = kapre dhul chuke, istri ho rahi hai. Customer ko WhatsApp par update chala jayega aur portal par bhi yahi status nazar aayega.
      </div>
      <div class="field">
        <label>Receive Additional Payment <span style="font-weight:400;font-size:11px;color:var(--text-soft);">(optional — sirf tab likhein jab paisa wasool hua ho)</span></label>
        <input type="text" inputmode="numeric" pattern="[0-9]*" id="addPay" value="" placeholder="0"
               autocomplete="off" style="font-size:16px;font-weight:700;text-align:right;background:var(--surface);"/>
        <small style="color:var(--text-soft);">Current Paid: <b>${fmtMoney(o.paid)}</b> • Remaining Due: <b style="color:var(--danger);">${fmtMoney(o.due)}</b></small>
        ${o.due > 0 ? `<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">
          <button type="button" class="btn btn-secondary btn-sm" data-addpay="0">Kuch Nahi (0)</button>
          <button type="button" class="btn btn-secondary btn-sm" data-addpay="${o.due}">Poora ${fmtMoney(o.due)}</button>
        </div>` : ''}
        <small style="display:block;margin-top:6px;color:#92400e;background:#fffbeb;border-left:3px solid #f59e0b;border-radius:6px;padding:6px 8px;">
          ⚠️ Status badalne se payment khud nahi lagti. Khali chhod dein to Due waise hi rahega.
        </small>
      </div>
    </div>
    ${(Array.isArray(o.paymentsLog) && o.paymentsLog.length) ? `
    <details style="margin-bottom:12px;background:var(--surface-alt);border-radius:8px;padding:8px 10px;">
      <summary style="cursor:pointer;font-size:12px;font-weight:700;">📜 Payment History (${o.paymentsLog.length})</summary>
      <table style="width:100%;font-size:11.5px;margin-top:6px;border-collapse:collapse;">
        ${o.paymentsLog.slice().reverse().map(pp => `
          <tr style="border-bottom:1px dotted var(--border);">
            <td style="padding:3px 0;">${new Date(pp.at).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</td>
            <td style="padding:3px 0;">${escapeHtml(pp.method || 'cash')}</td>
            <td style="padding:3px 0;text-align:right;font-weight:700;">${fmtMoney(pp.amount)}</td>
          </tr>`).join('')}
      </table>
    </details>` : ''}

    <div class="modal-footer">
      <button class="btn btn-ghost" id="cancelBtn">Cancel</button>
      <button class="btn btn-primary" id="saveBtn">💾 Save</button>
    </div>
  `;
  openModal(html, { onOpen(m){
    $('#newStatus', m).onchange = (e) => {
      $('#rackField', m).style.display = e.target.value === 'ready' ? 'block' : 'none';
      if ($('#pressHint', m)) $('#pressHint', m).style.display = e.target.value === 'ironing' ? 'block' : 'none';
      if (e.target.value === 'ready') setTimeout(()=>$('#newRack', m).focus(), 100);
    };
    /* quick "0 / poora" buttons */
    if (window.easyNumber) window.easyNumber($('#addPay', m), { min: 0, max: () => Math.max(0, o.due) });
    $$('[data-addpay]', m).forEach(b => b.onclick = () => {
      $('#addPay', m).value = (+b.dataset.addpay || 0) || '';
      try { $('#addPay', m).focus(); } catch (e) {}
    });

    $('#cancelBtn', m).onclick = closeModal;
    $('#saveBtn', m).onclick = () => {
      const newStatus = $('#newStatus', m).value;
      // KHALI / 0 = koi payment nahi. Sirf tab paisa lagta hai jab cashier ne khud likha ho.
      const rawPay = String($('#addPay', m).value || '').trim();
      const addPay = rawPay === '' ? 0 : Math.max(0, Math.min(o.due, +rawPay || 0));
      const paid = Math.min(o.total, o.paid + addPay);
      const due = Math.max(0, o.total - paid);
      const oldStatus = o.status;

      const apply = () => {
        const patch = { status: newStatus, paid, due, isCredit: due > 0 };
        if (newStatus === 'ready') patch.location = $('#newRack', m).value.trim();
        if (addPay > 0) {
          const paymentsLog = Array.isArray(o.paymentsLog) ? [...o.paymentsLog] : [];
          paymentsLog.push({
            id: 'pay_' + Date.now().toString(36) + Math.floor(Math.random() * 1000),
            amount: addPay, method: 'cash', note: 'Status update ke sath',
            by: DB.currentUser()?.username || 'unknown',
            byName: DB.currentUser()?.name || '',
            at: new Date().toISOString()
          });
          patch.paymentsLog = paymentsLog;
        }
        DB.update('orders', orderId, patch);
        if (typeof logAction === 'function') {
          logAction('order.status', `${DB.invoiceLabel(o)}: ${oldStatus} → ${newStatus}${addPay > 0 ? ` (+${fmtMoney(addPay)} received)` : ''}`);
        }
        if (typeof maybePromptWhatsAppOnStatus === 'function' && oldStatus !== newStatus && !sessionStorage.getItem('mrLaundryWaPause')) {
          setTimeout(() => maybePromptWhatsAppOnStatus(orderId, newStatus, oldStatus), 300);
        }
        closeModal();
        toast(addPay > 0 ? `Order updated • ${fmtMoney(addPay)} received` : 'Order updated — koi payment nahi lagi', 'success');
        renderOrdersBody();
      };

      // Ready / Delivered par paisa nahi mila → ek dafa yaad dila dein (force nahi)
      if (addPay === 0 && ['ready', 'delivered'].includes(newStatus) && o.due > 0) {
        confirmDialog(`Order "${newStatus === 'ready' ? 'Ready' : 'Delivered'}" ho raha hai lekin abhi tak ${fmtMoney(o.due)} due hai.\n\nTheek hai? (Order due ke sath hi save hoga — payment baad mein bhi le sakte hain.)`, apply);
        return;
      }
      // paisa likha gaya ho to ek dafa confirm — jaldi jaldi mein ghalti na ho
      if (addPay > 0) {
        confirmDialog(`Rs. ${(+addPay).toLocaleString()} wasool hua hai?\n\nYe amount customer ke Paid mein add ho jayega (Due ${fmtMoney(o.due)} → ${fmtMoney(due)}).\n\nAgar paisa nahi mila to Cancel karein aur box khali chhod dein.`, apply);
      } else {
        apply();
      }
    };
  }});
}

/* ===== EDIT INVOICE — Admin only ===== */
function openEditInvoice(orderId) {
  if (DB.currentUser().role !== 'admin') { toast('Admin access only','error'); return; }
  const o = DB.get('orders', orderId);
  if (!o) return;
  const c = DB.get('customers', o.customerId) || {};

  const itemsHtml = (items) => items.map((it,i) => `
    <tr data-i="${i}">
      <td><input type="text" value="${escapeHtml(it.name)}" data-fld="name" style="width:100%;padding:6px;border:1px solid var(--border);border-radius:6px;"/></td>
      <td><input type="number" value="${it.price}" min="0" data-fld="price" style="width:90px;padding:6px;border:1px solid var(--border);border-radius:6px;"/></td>
      <td><input type="number" value="${it.qty}" min="1" data-fld="qty" style="width:70px;padding:6px;border:1px solid var(--border);border-radius:6px;"/></td>
      <td class="line-total"><b>${fmtMoney(it.price*it.qty)}</b></td>
      <td><button class="btn btn-danger btn-sm" data-rm="${i}">🗑️</button></td>
    </tr>
  `).join('');

  const html = `
    <h3>✏️ Edit Invoice — ${DB.invoiceLabel(o)}</h3>
    <p class="sub">⚠️ Admin-only. Changes are logged with your username.</p>

    <div style="padding:10px;background:var(--surface-alt);border-radius:8px;margin-bottom:14px;font-size:13px;">
      Customer: <b>${escapeHtml(c.name)}</b> • ${escapeHtml(c.phone||'')} • Booked: ${fmtDate(o.createdAt)}
    </div>

    <div style="font-weight:700;margin-bottom:8px;">Items</div>
    <table class="tbl" style="margin-bottom:12px;">
      <thead><tr><th>Item</th><th>Price</th><th>Qty</th><th>Line Total</th><th></th></tr></thead>
      <tbody id="editItems">${itemsHtml(o.items)}</tbody>
    </table>
    <button class="btn btn-secondary btn-sm" id="addRowBtn">+ Add Item Row</button>

    <div class="form-row" style="margin-top:14px;">
      <div class="field">
        <label>Discount Type</label>
        <select id="eDiscType">
          <option value="fixed" ${(o.discountType||'fixed')==='fixed'?'selected':''}>Fixed</option>
          <option value="percent" ${o.discountType==='percent'?'selected':''}>Percent (%)</option>
        </select>
      </div>
      <div class="field">
        <label>Discount Value</label>
        <input type="text" inputmode="numeric" pattern="[0-9]*" id="eDiscVal" value="${o.discountValue||0}" autocomplete="off" style="text-align:right;font-weight:700;"/>
      </div>
    </div>
    <div class="form-row">
      <div class="field">
        <label>🚚 ${escapeHtml(DB.deliveryChargeLabel())} <span style="font-weight:400;font-size:11px;color:var(--text-soft);">(after discount)</span></label>
        <input type="text" inputmode="numeric" pattern="[0-9]*" id="eDelCharge" value="${(o.deliveryCharge != null ? o.deliveryCharge : (o.deliveryFee || 0))}" autocomplete="off" style="text-align:right;font-weight:700;"/>
      </div>
      <div class="field">
        <label>Paid Amount</label>
        <input type="text" inputmode="numeric" pattern="[0-9]*" id="ePaid" value="${o.paid}" autocomplete="off" style="text-align:right;font-weight:700;"/>
      </div>
      <div class="field">
        <label>Status</label>
        <select id="eStatus">
          ${['pending','washing','ironing','ready','delivered','cancelled'].map(s=>`<option value="${s}" ${o.status===s?'selected':''}>${s === 'ironing' ? 'Press (Ironing)' : s}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="field">
        <label>Delivery Date</label>
        <input type="date" id="eDelivery" value="${o.deliveryDate||''}"/>
      </div>
      <div class="field">
        <label>Payment Method</label>
        <select id="ePayMethod">
          ${['cash','card','bank','online','credit'].map(p=>`<option value="${p}" ${o.paymentMethod===p?'selected':''}>${p}</option>`).join('')}
        </select>
      </div>
    </div>

    <div id="eTotals" style="background:var(--primary-light);padding:12px;border-radius:8px;margin:10px 0;font-weight:600;"></div>

    <div class="modal-footer">
      <button class="btn btn-ghost" id="cancelBtn">Cancel</button>
      <button class="btn btn-success" id="saveBtn">💾 Save Changes</button>
    </div>
  `;
  openModal(html, { large: true, onOpen(m) {
    const calcAndShow = () => {
      if (!m || !m.querySelectorAll) return;
      const rows = $$('#editItems tr', m);
      let subtotal = 0;
      rows.forEach(tr => {
        const price = +tr.querySelector('[data-fld="price"]').value || 0;
        const qty = +tr.querySelector('[data-fld="qty"]').value || 0;
        const line = price * qty;
        tr.querySelector('.line-total').innerHTML = `<b>${fmtMoney(line)}</b>`;
        subtotal += line;
      });
      const discType = $('#eDiscType', m).value;
      const discVal = +$('#eDiscVal', m).value || 0;
      const disc = discType === 'percent' ? Math.round(subtotal * discVal / 100) : discVal;
      const delCh = Math.max(0, Math.round(+($('#eDelCharge', m) ? $('#eDelCharge', m).value : 0) || 0));
      const total = Math.max(0, subtotal - disc) + delCh;   // delivery charge is added AFTER the discount
      const paid = Math.min(total, +$('#ePaid', m).value || 0);
      const due = total - paid;
      $('#eTotals', m).innerHTML = `
        Subtotal: ${fmtMoney(subtotal)} •
        Discount: − ${fmtMoney(disc)} •
        ${delCh > 0 ? `🚚 ${escapeHtml(DB.deliveryChargeLabel())}: + ${fmtMoney(delCh)} • ` : ''}
        <b>Total: ${fmtMoney(total)}</b> •
        Paid: ${fmtMoney(paid)} •
        ${due>0?`<span style="color:var(--danger);">Due: ${fmtMoney(due)}</span>`:'<span style="color:var(--success);">Paid in Full ✅</span>'}
      `;
    };

    const bindRow = (tr) => {
      tr.querySelectorAll('input').forEach(i => {
        i.oninput = calcAndShow;
        const fld = i.dataset.fld;
        if (window.easyNumber && (fld === 'price' || fld === 'qty')) {
          window.easyNumber(i, { min: fld === 'qty' ? 1 : 0, onChange: () => calcAndShow() });
        }
      });
      const rm = tr.querySelector('[data-rm]'); if (rm) rm.onclick = () => { tr.remove(); calcAndShow(); };
    };
    $$('#editItems tr', m).forEach(bindRow);

    $('#addRowBtn', m).onclick = () => {
      const tr = document.createElement('tr');
      const i = $$('#editItems tr', m).length;
      tr.dataset.i = i;
      tr.innerHTML = `
        <td><input type="text" value="Custom Item" data-fld="name" style="width:100%;padding:6px;border:1px solid var(--border);border-radius:6px;"/></td>
        <td><input type="text" inputmode="numeric" value="100" data-fld="price" style="width:90px;padding:6px;border:1px solid var(--border);border-radius:6px;text-align:right;"/></td>
        <td><input type="text" inputmode="numeric" value="1" data-fld="qty" style="width:70px;padding:6px;border:1px solid var(--border);border-radius:6px;text-align:right;"/></td>
        <td class="line-total"><b>${fmtMoney(100)}</b></td>
        <td><button class="btn btn-danger btn-sm" data-rm="${i}">🗑️</button></td>
      `;
      $('#editItems', m).appendChild(tr);
      bindRow(tr);
      calcAndShow();
    };

    [$('#eDiscType', m), $('#eDiscVal', m), $('#ePaid', m)];
    // discount value: seedha type karein (click par select), percent mode mein 0-100
    if (window.easyNumber) {
      window.easyNumber($('#eDiscVal', m), {
        min: 0,
        max: () => ($('#eDiscType', m).value === 'percent' ? 100 : Infinity),
        onChange: () => calcAndShow()
      });
      window.easyNumber($('#eDelCharge', m), { min: 0, onChange: () => calcAndShow() });
      window.easyNumber($('#ePaid', m), { min: 0, onChange: () => calcAndShow() });
    }
    $('#eDiscType', m).onchange = calcAndShow;
    calcAndShow();

    $('#cancelBtn', m).onclick = closeModal;
    $('#saveBtn', m).onclick = () => {
      const rows = $$('#editItems tr', m);
      const items = rows.map(tr => {
        const name = tr.querySelector('[data-fld="name"]').value.trim();
        const price = +tr.querySelector('[data-fld="price"]').value || 0;
        const qty = +tr.querySelector('[data-fld="qty"]').value || 0;
        return { name, price, qty, lineTotal: price * qty, image: '🧺' };
      }).filter(i => i.name && i.price > 0 && i.qty > 0);
      if (!items.length) { toast('At least one item required','error'); return; }

      const subtotal = items.reduce((s,i)=>s+i.lineTotal,0);
      const discType = $('#eDiscType', m).value;
      const discVal = +$('#eDiscVal', m).value || 0;
      const disc = discType === 'percent' ? Math.round(subtotal * discVal / 100) : Math.min(subtotal, discVal);
      const delCharge = Math.max(0, Math.round(+$('#eDelCharge', m).value || 0));
      const total = Math.max(0, subtotal - disc) + delCharge;   // charge after discount
      const paid = Math.min(total, +$('#ePaid', m).value || 0);
      const due = total - paid;

      const editLog = o.editLog || [];
      editLog.push({ by: DB.currentUser().username, at: new Date().toISOString() });

      if (typeof logAction === 'function') logAction('order.edit', `${DB.invoiceLabel(o)}: items changed`);
      const _oldStatus = o.status;
      DB.update('orders', orderId, {
        items, subtotal, discountType: discType, discountValue: discVal,
        deliveryCharge: delCharge,
        discount: disc, manualDiscount: disc, loyaltyDiscount: 0, loyaltyPercent: 0,
        tax: 0, total, paid, due, isCredit: due > 0,
        status: $('#eStatus', m).value,
        deliveryDate: $('#eDelivery', m).value,
        paymentMethod: $('#ePayMethod', m).value,
        editLog
      });
      closeModal(); toast('Invoice updated','success'); renderOrdersBody();
      const _newStatus = $('#eStatus', m).value;
      if (typeof maybePromptWhatsAppOnStatus === 'function' && _oldStatus !== _newStatus) {
        setTimeout(() => maybePromptWhatsAppOnStatus(orderId, _newStatus, _oldStatus), 300);
      }
    };
  }});
}

/* ===================== DEDICATED RECEIVE PAYMENT ===================== */
/* Customer ek invoice slip lekar shop pe aaya, payment deni hai
   - Search by invoice OR phone
   - Choose payment method (Cash / Card / Bank / JazzCash / Easypaisa / Cheque)
   - Optionally mark as Delivered (auto if fully paid + status is "ready")
   - Log to paymentsLog[] for audit trail
   - Print payment receipt option
*/

function openReceivePayment(orderId) {
  const o = DB.get('orders', orderId);
  if (!o) { toast('Order not found', 'error'); return; }
  if ((o.due || 0) <= 0) { toast(t('rcv.noDue') + ' ✅', 'success'); return; }

  const c = DB.get('customers', o.customerId) || { name: 'Walk-in', phone: '' };
  const invNo = DB.invoiceLabel(o);
  const s = DB.settings();

  const html = `
    <h3>💰 ${t('rcv.title')} — ${escapeHtml(invNo)}</h3>
    <div style="background:#f0f9ff;border-left:4px solid #0ea5e9;padding:12px;border-radius:8px;margin-bottom:14px;">
      <div style="font-size:14px;"><b>${escapeHtml(c.name)}</b> ${c.phone?`• ${escapeHtml(c.phone)}`:''}</div>
      <div style="display:flex;gap:18px;margin-top:8px;flex-wrap:wrap;font-size:13px;">
        <div>${t('rcv.total')}: <b>${fmtMoney(o.total)}</b></div>
        <div>${t('rcv.paidSoFar')}: <b style="color:var(--success);">${fmtMoney(o.paid)}</b></div>
        <div>${t('rcv.due')}: <b style="color:var(--danger);font-size:18px;">${fmtMoney(o.due)}</b></div>
      </div>
    </div>

    <div class="form-row cols-2">
      <div class="field">
        <label>💵 ${t('rcv.amountNow')}</label>
        <input type="text" inputmode="numeric" pattern="[0-9]*" id="rcvAmt" value="" placeholder="0"
               autocomplete="off" style="font-size:18px;font-weight:700;text-align:right;"/>
        <small style="color:var(--text-soft);">Max: ${fmtMoney(o.due)} — pehle amount likhein, phir Save dabayein</small>
        <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">
          <button type="button" class="btn btn-secondary btn-sm" data-quick="full">${t('rcv.full')} ${fmtMoney(o.due)}</button>
          <button type="button" class="btn btn-secondary btn-sm" data-quick="half">${t('rcv.half')} ${fmtMoney(Math.round(o.due/2))}</button>
        </div>
      </div>
      <div class="field">
        <label>💳 ${t('rcv.method')}</label>
        <select id="rcvMethod" style="font-size:15px;font-weight:600;">
          <option value="cash">${t('rcv.cash')}</option>
          <option value="card">${t('rcv.card')}</option>
          <option value="bank">${t('rcv.bank')}</option>
          <option value="jazzcash">${t('rcv.jazzcash')}</option>
          <option value="easypaisa">${t('rcv.easypaisa')}</option>
          <option value="cheque">${t('rcv.cheque')}</option>
        </select>
      </div>
    </div>

    <div class="form-row cols-1">
      <div class="field">
        <label>📝 ${t('rcv.refNote')}</label>
        <input type="text" id="rcvNote" placeholder="${t('rcv.refPlaceholder')}"/>
      </div>
    </div>

    <div class="field" style="background:#f8fafc;padding:10px;border-radius:8px;">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
        <input type="checkbox" id="rcvDeliver" ${o.status === 'ready' ? 'checked' : ''}/>
        📦 ${t('rcv.markDelivered')}
      </label>
      <small style="color:var(--text-soft);">Auto-checked if order is Ready for Pickup</small>
    </div>

    <div class="field" style="background:#fffbeb;padding:10px;border-radius:8px;">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
        <input type="checkbox" id="rcvPrint"/>
        🖨️ ${t('rcv.printReceipt')}
      </label>
    </div>

    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-success btn-lg" id="rcvSave">${t('rcv.confirmBtn')}</button>
    </div>
  `;

  openModal(html, { large: true, onOpen(m) {
    if (window.easyNumber) window.easyNumber($('#rcvAmt', m), { min: 0, max: () => Math.max(0, o.due) });
    $$('[data-quick]', m).forEach(b => b.onclick = () => {
      const v = b.dataset.quick;
      $('#rcvAmt', m).value = v === 'full' ? o.due : Math.round(o.due/2);
      try { $('#rcvAmt', m).focus(); } catch (e) {}
    });

    $('#rcvSave', m).onclick = () => {
      const raw = String($('#rcvAmt', m).value || '').trim();
      const amt = Math.max(0, Math.min(o.due, +raw || 0));
      if (raw === '' || amt <= 0) { toast('Pehle amount likhein — khali box se payment save nahi hoti', 'error'); return; }

      const method = $('#rcvMethod', m).value;
      const note = $('#rcvNote', m).value.trim();
      const alsoDeliver = $('#rcvDeliver', m).checked;
      const wantPrint = $('#rcvPrint', m).checked;

      const newPaid = (o.paid || 0) + amt;
      const newDue = Math.max(0, o.total - newPaid);
      const oldStatus = o.status;
      const newStatus = (alsoDeliver || (newDue === 0 && o.status === 'ready')) ? 'delivered' : o.status;

      // Append to paymentsLog
      const paymentsLog = Array.isArray(o.paymentsLog) ? [...o.paymentsLog] : [];
      const payRecord = {
        id: 'pay_' + Date.now().toString(36) + Math.floor(Math.random()*1000),
        amount: amt,
        method,
        note,
        by: DB.currentUser()?.username || 'unknown',
        byName: DB.currentUser()?.name || '',
        at: new Date().toISOString()
      };
      paymentsLog.push(payRecord);

      DB.update('orders', orderId, {
        paid: newPaid,
        due: newDue,
        isCredit: newDue > 0,
        paymentMethod: method, // latest method
        status: newStatus,
        paymentsLog
      });

      if (typeof logAction === 'function') {
        logAction('payment.receive', `${invNo}: ${fmtMoney(amt)} via ${method}${note?' ('+note+')':''}`);
      }

      // Sound + toast
      if (typeof SoundFX !== 'undefined') try { SoundFX.play('cash'); } catch(e){}
      toast(`✅ ${t('rcv.received')} ${fmtMoney(amt)} ${t('rcv.via')} ${method}`, 'success');

      // WhatsApp prompt if status changed
      if (newStatus !== oldStatus && typeof maybePromptWhatsAppOnStatus === 'function' && !sessionStorage.getItem('mrLaundryWaPause')) {
        setTimeout(() => maybePromptWhatsAppOnStatus(orderId, newStatus, oldStatus), 400);
      }

      closeModal();
      if (typeof renderOrdersBody === 'function' && document.querySelector('#ordersBody')) renderOrdersBody();
      if (typeof app !== 'undefined' && app.current === 'dashboard') app.go('dashboard');

      if (wantPrint) {
        setTimeout(() => printPaymentReceipt(orderId, payRecord), 300);
      }
    };

    // Focus amount field
    setTimeout(() => $('#rcvAmt', m)?.focus(), 100);
  }});
}

/* Print a small payment receipt slip */
function printPaymentReceipt(orderId, payRecord) {
  const o = DB.get('orders', orderId);
  if (!o) return;
  const c = DB.get('customers', o.customerId) || { name: 'Walk-in', phone: '' };
  const s = DB.settings();
  const invNo = DB.invoiceLabel(o);
  const width = s.invoiceWidth || 360;

  const div = document.createElement('div');
  div.id = '__payReceipt__';
  div.style.cssText = `position:fixed;left:-9999px;top:0;width:${width}px;font-family:Arial,sans-serif;font-size:13px;color:#000;background:#fff;padding:12px;`;
  div.innerHTML = `
    <div style="text-align:center;border-bottom:2px dashed #000;padding-bottom:8px;margin-bottom:8px;">
      ${s.logoImage ? `<img src="${s.logoImage}" style="max-width:80px;max-height:60px;background:#000;padding:4px;border-radius:6px;"/>` : ''}
      <div style="font-size:18px;font-weight:800;margin-top:6px;">${escapeHtml(s.shopName || 'Modern Dry Cleaners')}</div>
      <div style="font-size:11px;">${escapeHtml(s.address || '')}</div>
      <div style="font-size:11px;">${escapeHtml(s.phone || '')}</div>
    </div>
    <div style="text-align:center;font-size:16px;font-weight:800;margin:6px 0;padding:6px;background:#000;color:#fff;">PAYMENT RECEIPT</div>
    <table style="width:100%;font-size:12px;border-collapse:collapse;">
      <tr><td>Receipt #:</td><td style="text-align:right;"><b>${payRecord.id.slice(-8).toUpperCase()}</b></td></tr>
      <tr><td>Invoice:</td><td style="text-align:right;"><b>${escapeHtml(invNo)}</b></td></tr>
      <tr><td>Date:</td><td style="text-align:right;">${new Date(payRecord.at).toLocaleString()}</td></tr>
      <tr><td>Customer:</td><td style="text-align:right;"><b>${escapeHtml(c.name)}</b></td></tr>
      ${c.phone?`<tr><td>Phone:</td><td style="text-align:right;">${escapeHtml(c.phone)}</td></tr>`:''}
      <tr><td>Cashier:</td><td style="text-align:right;">${escapeHtml(payRecord.byName || payRecord.by)}</td></tr>
    </table>
    <div style="border-top:1px dashed #000;margin:8px 0;"></div>
    <table style="width:100%;font-size:13px;">
      <tr><td>Bill Total:</td><td style="text-align:right;">${fmtMoney(o.total)}</td></tr>
      ${(+o.deliveryCharge || 0) > 0 ? `<tr><td style="font-size:11px;">↳ includes ${escapeHtml(o.deliveryChargeLabel || DB.deliveryChargeLabel())}</td><td style="text-align:right;font-size:11px;">+ ${fmtMoney(o.deliveryCharge)}</td></tr>` : ''}
      <tr><td>Previously Paid:</td><td style="text-align:right;">${fmtMoney(o.paid - payRecord.amount)}</td></tr>
      <tr style="font-size:16px;font-weight:800;background:#dcfce7;"><td style="padding:6px;">RECEIVED NOW:</td><td style="text-align:right;padding:6px;">${fmtMoney(payRecord.amount)}</td></tr>
      <tr><td>Method:</td><td style="text-align:right;text-transform:uppercase;"><b>${escapeHtml(payRecord.method)}</b></td></tr>
      ${payRecord.note?`<tr><td>Note:</td><td style="text-align:right;">${escapeHtml(payRecord.note)}</td></tr>`:''}
      <tr style="font-size:14px;font-weight:800;${o.due > 0 ? 'background:#fee2e2;color:#991b1b;':'background:#dbeafe;color:#1e3a8a;'}"><td style="padding:6px;">${o.due > 0 ? 'STILL DUE:' : 'STATUS:'}</td><td style="text-align:right;padding:6px;">${o.due > 0 ? fmtMoney(o.due) : 'FULLY PAID ✅'}</td></tr>
    </table>
    <div style="text-align:center;margin-top:10px;font-size:11px;border-top:2px dashed #000;padding-top:8px;">
      Thank you! 🙏<br>
      ${escapeHtml(s.shopName || 'Modern Dry Cleaners')}
    </div>
  `;
  document.body.appendChild(div);
  if (typeof printElement === 'function') {
    printElement(div, { title: 'Payment Receipt' }).finally(() => div.remove());
  } else {
    window.print();
    setTimeout(() => div.remove(), 500);
  }
}

/* ===================== QUICK PAY DIALOG ===================== */
/* Customer aata hai slip lekar — invoice # ya phone se search karo, fast pay screen kholo */
function openQuickPay() {
  const html = `
    <h3>💰 ${t('qp.title')}</h3>
    <p class="sub">${t('qp.searchHint')}</p>

    <div class="field">
      <label>🔍 Search by Invoice # or Phone</label>
      <input id="qpSearch" placeholder="${t('qp.placeholder')}" autocomplete="off" style="font-size:16px;padding:14px;" autofocus/>
    </div>

    <div id="qpResults" style="min-height:200px;"></div>

    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Close</button>
    </div>
  `;
  openModal(html, { large: true, onOpen(m) {
    const inp = $('#qpSearch', m);
    const out = $('#qpResults', m);

    function renderResults() {
      const q = inp.value.trim().toLowerCase();
      if (!q) {
        // Show all orders with due > 0
        const dueOrders = DB.all('orders').filter(o => (o.due||0) > 0).sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20);
        if (!dueOrders.length) {
          out.innerHTML = '<div class="empty" style="padding:30px;"><div class="emoji">✅</div><h4>' + t('qp.noOutstanding') + '</h4><p>' + t('qp.allPaid') + '</p></div>';
          return;
        }
        out.innerHTML = `<div style="font-size:12px;color:var(--text-soft);margin-bottom:8px;">${t('qp.recentUnpaid')}</div>` + renderRows(dueOrders);
        return;
      }
      const digits = q.replace(/\D/g, '');
      const orders = DB.all('orders').filter(o => {
        const inv = String(o.invoiceNo || '');
        const c = DB.get('customers', o.customerId) || {};
        const phone = String(c.phone || '').replace(/\D/g, '');
        return inv.includes(digits) || phone.includes(digits) || (c.name||'').toLowerCase().includes(q);
      }).sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30);

      if (!orders.length) {
        out.innerHTML = '<div class="empty" style="padding:30px;"><div class="emoji">🔍</div><h4>' + t('qp.noMatches') + '</h4><p>' + t('qp.tryDifferent') + '</p></div>';
        return;
      }
      out.innerHTML = renderRows(orders);
    }

    function renderRows(orders) {
      return `<table class="tbl" style="margin-top:6px;"><thead><tr><th>Invoice</th><th>Customer</th><th>Total</th><th>Paid</th><th>Due</th><th>Status</th><th>Action</th></tr></thead><tbody>` +
        orders.map(o => {
          const c = DB.get('customers', o.customerId) || { name:'Walk-in', phone:'' };
          const inv = DB.invoiceLabel(o);
          const due = o.due || 0;
          return `<tr>
            <td><b>${escapeHtml(inv)}</b></td>
            <td>${escapeHtml(c.name)}<br><small>${escapeHtml(c.phone||'')}</small></td>
            <td>${fmtMoney(o.total)}</td>
            <td style="color:var(--success);">${fmtMoney(o.paid)}</td>
            <td style="color:${due>0?'var(--danger)':'var(--success)'};font-weight:700;">${fmtMoney(due)}</td>
            <td>
        <span class="badge ${o.status}">${statusBadgeLabel(o.status)}</span>
        ${(o.status === 'ready' && o.location) ? `<br><span style="font-size:10px;font-weight:700;color:#000;background:#fef08a;padding:2px 6px;border-radius:6px;border:1px solid #f59e0b;margin-top:4px;display:inline-block;">📍 ${escapeHtml(o.location)}</span>` : ''}
      </td>
            <td>
              ${due > 0
                ? `<button class="btn btn-success btn-sm" data-qpay="${o.id}">💰 ${t('rcv.title')}</button>`
                : `<span style="color:var(--success);font-weight:700;">✅ ${t('ord.paid')}</span>`
              }
              <button class="btn btn-secondary btn-sm" data-qview="${o.id}">👁️</button>
            </td>
          </tr>`;
        }).join('') + '</tbody></table>';
    }

    inp.oninput = renderResults;
    out.addEventListener('click', (e) => {
      const payBtn = e.target.closest('[data-qpay]');
      const viewBtn = e.target.closest('[data-qview]');
      if (payBtn) { closeModal(); setTimeout(() => openReceivePayment(payBtn.dataset.qpay), 150); }
      if (viewBtn) { closeModal(); setTimeout(() => openInvoice(viewBtn.dataset.qview), 150); }
    });

    renderResults();
  }});
}

/* Make globally available */
window.openReceivePayment = openReceivePayment;
window.openQuickPay = openQuickPay;
window.printPaymentReceipt = printPaymentReceipt;

function openPartialDelivery(orderId) {
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
    <h3>🛍️ Partial Delivery — ${DB.invoiceLabel(o)}</h3>
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

    $('#pdPrintBtn', m).onclick = async (ev) => {
      const patch = collectData();
      DB.update('orders', orderId, patch);
      closeModal();
      // print FIRST and wait for the print window, so a blocked popup is reported
      const okPrint = await printPartialSlip(orderId);
      if (!okPrint) toast('Slip saved, but the print window was blocked — allow pop-ups to print it', 'error');
      renderOrdersBody();
      // also refresh the customer's portal view (status + item split)
      if (typeof CLOUD !== 'undefined' && CLOUD.isEnabled && CLOUD.isEnabled()) {
        try { CLOUD.pushNow && CLOUD.pushNow(); } catch (e) {}
      }
      if (ev && ev.currentTarget) ev.currentTarget.disabled = false;
    };
  }});
}

async function printPartialSlip(orderId) {
  const o = DB.get('orders', orderId);
  const c = DB.get('customers', o.customerId) || { name: 'Customer' };
  const s = DB.settings();
  const invoiceNo = DB.invoiceLabel(o);
  
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
    <div class="invoice-page inv-slip" style="font-family:Arial,sans-serif;padding:6px;color:#000;">
      <h2 style="text-align:center;margin:0;font-size:20px;">${escapeHtml(s.shopName)}</h2>
      <div style="text-align:center;font-size:12px;font-weight:bold;margin:4px 0 10px;border-bottom:2px dashed #000;padding-bottom:4px;">
        PARTIAL DELIVERY SLIP
      </div>
      ${(o.items || []).some(it => (it.deliveredQty||0) > 0) ? '' : '<div style="text-align:center;font-size:11px;font-weight:bold;border:1px solid #000;padding:4px;margin-bottom:8px;">⚠️ KOI ITEM "GIVEN" MARK NAHI HUA</div>'}
      <div style="margin-bottom:12px; line-height:1.5;">
        <div style="font-size:20px;font-weight:900;">${invoiceNo}</div>
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

      <div style="margin-top:10px;font-size:12px;border-top:1px dashed #000;padding-top:6px;">
        <div style="display:flex;justify-content:space-between;"><span>Bill Total</span><span style="font-weight:bold;">${fmtMoney(o.total)}</span></div>
        ${(+o.deliveryCharge || 0) > 0 ? `<div style="display:flex;justify-content:space-between;"><span>↳ includes ${escapeHtml(o.deliveryChargeLabel || DB.deliveryChargeLabel())}</span><span>+ ${fmtMoney(o.deliveryCharge)}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;"><span>Paid</span><span>${fmtMoney(o.paid)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:bold;margin-top:3px;border-top:1px dotted #000;padding-top:3px;">
          <span>Remaining Balance</span><span>${fmtMoney(o.due)}</span>
        </div>
      </div>
    </div>
  `;
  
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  if (typeof printElement === 'function') return printElement(wrap, { title: 'Partial Delivery' });
}
