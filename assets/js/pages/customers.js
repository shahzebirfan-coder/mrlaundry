/* ============================================================
   Customers — list + add/edit
   ============================================================ */
function renderCustomers(root) {
  const customers = DB.all('customers').filter(c => c.id !== 'cu_walkin');
  const search = { value: '' };

  root.innerHTML = `
    <div class="card mb-3">
      <div class="card-header">
        <div class="card-title">👥 Customers (${customers.length})</div>
        <button class="btn btn-primary btn-sm" id="addCustBtn">+ Add Customer</button>
      </div>
      <input type="text" class="form-input" id="custSearch" placeholder="🔍 Search by name, phone, loyalty number…" />
    </div>

    <div id="custList"></div>
  `;

  const renderList = () => {
    const q = search.value.toLowerCase();
    const filtered = q
      ? customers.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q) ||
        (c.loyaltyNo || '').toLowerCase().includes(q)
      )
      : customers;

    if (filtered.length === 0) {
      $('#custList').innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">👥</div>
          <p>${q ? 'No customers found' : 'No customers yet. Add your first customer!'}</p>
        </div>`;
      return;
    }

    $('#custList').innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr><th>Name</th><th>Phone</th><th>Loyalty</th><th>Orders</th><th>Total Spent</th><th></th></tr>
          </thead>
          <tbody>
            ${filtered.map(c => {
              const myOrders = DB.all('orders').filter(o => o.customerId === c.id);
              const spent = myOrders.reduce((s, o) => s + (o.total || 0), 0);
              return `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px">
                      <div style="width:32px;height:32px;border-radius:50%;background:var(--primary-light);color:var(--primary);display:flex;align-items:center;justify-content:center;font-weight:700">${(c.name || '?').charAt(0).toUpperCase()}</div>
                      <strong>${escapeHtml(c.name)}</strong>
                    </div>
                  </td>
                  <td>${escapeHtml(c.phone || '-')}</td>
                  <td>${c.loyaltyActive ? '<span class="badge badge-success">⭐ ' + escapeHtml(c.loyaltyNo || '') + ' • ' + c.loyaltyDiscountPercent + '%</span>' : '<span class="text-soft text-sm">No card</span>'}</td>
                  <td>${myOrders.length}</td>
                  <td><strong>${fmtMoney(spent)}</strong></td>
                  <td>
                    <button class="btn btn-ghost btn-sm" onclick="editCustomer('${c.id}')">✏️</button>
                    <button class="btn btn-ghost btn-sm" onclick="deleteCustomer('${c.id}')">🗑️</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  renderList();
  $('#custSearch').oninput = e => { search.value = e.target.value; renderList(); };
  $('#addCustBtn').onclick = () => openCustomerForm(null, () => renderCustomers(root));
}

function editCustomer(id) {
  const c = DB.get('customers', id);
  if (!c) return;
  openCustomerForm(c, () => renderCustomers(document.getElementById('mainContent')));
}

function deleteCustomer(id) {
  const c = DB.get('customers', id);
  if (!c) return;
  confirmDialog(`Delete customer "${c.name}"? Their order history will be preserved.`, () => {
    DB.remove('customers', id);
    toast('Customer deleted', 'success');
    renderCustomers(document.getElementById('mainContent'));
  });
}
