/* ============================================================
   Dashboard — today's stats + recent orders
   ============================================================ */
function renderDashboard(root) {
  const orders = DB.all('orders');
  const customers = DB.all('customers');
  const settings = DB.settings();
  const today = isoDay(new Date());
  const monthStart = isoDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const todayOrders = orders.filter(o => isoDay(o.createdAt) === today);
  const monthOrders = orders.filter(o => isoDay(o.createdAt) >= monthStart);

  const todayRevenue = todayOrders.reduce((s, o) => s + (o.paid || 0), 0);
  const monthRevenue = monthOrders.reduce((s, o) => s + (o.total || 0), 0);
  const pending = orders.filter(o => o.status !== 'delivered').length;
  const credit = orders.filter(o => o.due > 0).reduce((s, o) => s + o.due, 0);

  const recent = orders.slice(-10).reverse();

  root.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Today's Sales</div>
        <div class="stat-value">${fmtMoney(todayRevenue)}</div>
        <div class="stat-sub">${todayOrders.length} orders</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">This Month</div>
        <div class="stat-value">${fmtMoney(monthRevenue)}</div>
        <div class="stat-sub">${monthOrders.length} orders</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Pending</div>
        <div class="stat-value">${pending}</div>
        <div class="stat-sub">orders to deliver</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Credit Due</div>
        <div class="stat-value text-warning">${fmtMoney(credit)}</div>
        <div class="stat-sub">to collect</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">📋 Recent Orders</div>
        <button class="btn btn-secondary btn-sm" onclick="app.go('orders')">View All →</button>
      </div>
      ${recent.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <p>No orders yet. <a onclick="app.go('pos')">Create your first order →</a></p>
        </div>
      ` : `
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Invoice</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${recent.map(o => {
                const c = DB.get('customers', o.customerId);
                return `
                  <tr onclick="openInvoice('${o.id}')" style="cursor:pointer">
                    <td><strong>INV-${o.invoiceNo}</strong></td>
                    <td>${escapeHtml(c?.name || 'Walk-in')}</td>
                    <td>${fmtMoney(o.total)}</td>
                    <td><span class="badge ${o.status === 'delivered' ? 'badge-success' : o.status === 'ready' ? 'badge-info' : 'badge-warning'}">${o.status}</span></td>
                    <td class="text-sm text-soft">${fmtDate(o.createdAt)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}
