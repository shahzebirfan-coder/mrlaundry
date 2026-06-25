/* ============================================================
   Orders — list + filter + actions
   ============================================================ */
function renderOrders(root) {
  const orders = DB.all('orders').slice().reverse();
  const statusFilter = { value: 'all' };
  const dateFilter = { value: 'all' };

  root.innerHTML = `
    <div class="card mb-3">
      <div class="card-header">
        <div class="card-title">📜 Orders (${orders.length})</div>
        <button class="btn btn-primary btn-sm" onclick="app.go('pos')">+ New Sale</button>
      </div>
      <div class="flex gap-2" style="flex-wrap:wrap">
        <select class="form-select" id="filterStatus" style="width:auto">
          <option value="all">All Status</option>
          <option value="pending">⏳ Pending</option>
          <option value="washing">🌀 Washing</option>
          <option value="ready">✅ Ready</option>
          <option value="delivered">📦 Delivered</option>
        </select>
        <select class="form-select" id="filterDate" style="width:auto">
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
      </div>
    </div>

    <div id="ordersList"></div>
  `;

  const renderList = () => {
    let filtered = orders;
    if (statusFilter.value !== 'all') filtered = filtered.filter(o => o.status === statusFilter.value);
    if (dateFilter.value !== 'all') {
      const today = isoDay(new Date());
      if (dateFilter.value === 'today') filtered = filtered.filter(o => isoDay(o.createdAt) === today);
      else if (dateFilter.value === 'week') {
        const weekAgo = new Date(Date.now() - 7 * 86400000);
        filtered = filtered.filter(o => new Date(o.createdAt) >= weekAgo);
      } else if (dateFilter.value === 'month') {
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        filtered = filtered.filter(o => new Date(o.createdAt) >= monthStart);
      }
    }

    if (filtered.length === 0) {
      $('#ordersList').innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <p>No orders found</p>
        </div>`;
      return;
    }

    $('#ordersList').innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Invoice</th><th>Customer</th><th>Items</th><th>Total</th><th>Paid</th><th>Status</th><th>Delivery</th><th>Date</th><th></th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(o => {
              const c = DB.get('customers', o.customerId);
              const itemCount = (o.items || []).reduce((s, i) => s + i.qty, 0);
              return `
                <tr>
                  <td><strong>INV-${o.invoiceNo}</strong></td>
                  <td>${escapeHtml(c?.name || 'Walk-in')}</td>
                  <td>${itemCount} pcs</td>
                  <td><strong>${fmtMoney(o.total)}</strong></td>
                  <td>${fmtMoney(o.paid)}${o.due > 0 ? '<br><span class="text-sm text-warning">Due: ' + fmtMoney(o.due) + '</span>' : ''}</td>
                  <td>
                    <select class="form-select status-sel" data-id="${o.id}" style="padding:4px 8px;font-size:12px">
                      <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>⏳ Pending</option>
                      <option value="washing" ${o.status === 'washing' ? 'selected' : ''}>🌀 Washing</option>
                      <option value="ready" ${o.status === 'ready' ? 'selected' : ''}>✅ Ready</option>
                      <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>📦 Delivered</option>
                    </select>
                  </td>
                  <td class="text-sm">${o.deliveryDate || '-'}</td>
                  <td class="text-sm text-soft">${fmtDate(o.createdAt)}</td>
                  <td>
                    <button class="btn btn-ghost btn-sm" onclick="openInvoice('${o.id}')">🧾</button>
                    <button class="btn btn-ghost btn-sm" onclick="deleteOrder('${o.id}')">🗑️</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
    $$('.status-sel').forEach(sel => sel.onchange = () => {
      DB.update('orders', sel.dataset.id, { status: sel.value });
      toast('Status updated', 'success');
    });
  };

  renderList();
  $('#filterStatus').onchange = e => { statusFilter.value = e.target.value; renderList(); };
  $('#filterDate').onchange = e => { dateFilter.value = e.target.value; renderList(); };
}

function deleteOrder(id) {
  const o = DB.get('orders', id);
  if (!o) return;
  confirmDialog(`Delete INV-${o.invoiceNo}? This cannot be undone.`, () => {
    DB.remove('orders', id);
    toast('Order deleted', 'success');
    renderOrders(document.getElementById('mainContent'));
  });
}
