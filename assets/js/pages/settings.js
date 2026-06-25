/* ============================================================
   Settings — shop, currency, users, backup
   ============================================================ */
function renderSettings(root) {
  const s = DB.settings();
  const stats = DB.storageStats();

  root.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Storage Used</div>
        <div class="stat-value">${stats?.usedMB || 0} MB</div>
        <div class="progress-bar mt-2">
          <div class="progress-fill ${stats?.percentFull > 80 ? 'danger' : stats?.percentFull > 50 ? 'warning' : ''}" style="width:${Math.min(100, stats?.percentFull || 0)}%"></div>
        </div>
        <div class="stat-sub">${stats?.percentFull || 0}% of 5MB limit</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Orders</div>
        <div class="stat-value">${stats?.tableCounts?.orders || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Customers</div>
        <div class="stat-value">${stats?.tableCounts?.customers || 0}</div>
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-header">
        <div class="card-title">🏪 Shop Details</div>
      </div>
      <div class="form-group">
        <label class="form-label">Shop Name</label>
        <input class="form-input" id="setShopName" value="${escapeHtml(s.shopName)}" />
      </div>
      <div class="form-group">
        <label class="form-label">Tagline</label>
        <input class="form-input" id="setTagline" value="${escapeHtml(s.tagline || '')}" />
      </div>
      <div class="form-group">
        <label class="form-label">Address</label>
        <input class="form-input" id="setAddress" value="${escapeHtml(s.address || '')}" />
      </div>
      <div class="form-group">
        <label class="form-label">Phone</label>
        <input class="form-input" id="setPhone" value="${escapeHtml(s.phone || '')}" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Currency Symbol</label>
          <input class="form-input" id="setCurrency" value="${escapeHtml(s.currency)}" />
        </div>
        <div class="form-group">
          <label class="form-label">Tax %</label>
          <input class="form-input" type="number" min="0" id="setTax" value="${s.taxPercent || 0}" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Default Delivery (days)</label>
          <input class="form-input" type="number" min="0" id="setDelDays" value="${s.defaultDeliveryDays || 2}" />
        </div>
        <div class="form-group">
          <label class="form-label">Default Loyalty Discount %</label>
          <input class="form-input" type="number" min="0" max="100" id="setLoyaltyPct" value="${s.defaultLoyaltyDiscountPercent || 10}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Invoice Footer</label>
        <input class="form-input" id="setFooter" value="${escapeHtml(s.invoiceFooter || '')}" />
      </div>
      <div class="form-group">
        <label class="form-label">Invoice Terms</label>
        <textarea class="form-textarea" id="setTerms">${escapeHtml(s.invoiceTerms || '')}</textarea>
      </div>
      <button class="btn btn-primary" id="saveShop">💾 Save Shop Details</button>
    </div>

    <div class="card mb-3">
      <div class="card-header">
        <div class="card-title">👤 Users</div>
        <button class="btn btn-secondary btn-sm" id="addUserBtn">+ Add User</button>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Name</th><th>Username</th><th>Role</th><th></th></tr></thead>
          <tbody>
            ${DB.all('users').map(u => `
              <tr>
                <td><strong>${escapeHtml(u.name)}</strong></td>
                <td>${escapeHtml(u.username)}</td>
                <td><span class="badge ${u.role === 'admin' ? 'badge-info' : ''}">${u.role}</span></td>
                <td>
                  ${u.username !== 'admin' ? `<button class="btn btn-ghost btn-sm" onclick="deleteUser('${u.id}')">🗑️</button>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-header">
        <div class="card-title">💾 Backup & Restore</div>
      </div>
      <p class="text-sm text-soft mb-3">
        Export your data to a JSON file. Keep this safe — it's a complete copy of your shop data.
        You can also import a backup to restore data on a new device.
      </p>
      <div class="flex gap-2" style="flex-wrap:wrap">
        <button class="btn btn-primary" id="exportBtn">📤 Export Backup</button>
        <label class="btn btn-secondary">
          📥 Import Backup
          <input type="file" id="importFile" accept=".json" style="display:none" />
        </label>
        <button class="btn btn-warning" id="trimBtn">🧹 Trim Old Orders (keep last 1000)</button>
        <button class="btn btn-danger" id="resetBtn">⚠️ Reset Everything</button>
      </div>
    </div>
  `;

  // Shop details save
  $('#saveShop').onclick = () => {
    DB.saveSettings({
      shopName: $('#setShopName').value.trim() || 'Mr Laundry',
      tagline: $('#setTagline').value.trim(),
      address: $('#setAddress').value.trim(),
      phone: $('#setPhone').value.trim(),
      currency: $('#setCurrency').value.trim() || 'Rs.',
      taxPercent: Math.max(0, +$('#setTax').value || 0),
      defaultDeliveryDays: Math.max(0, +$('#setDelDays').value || 2),
      defaultLoyaltyDiscountPercent: Math.max(0, +$('#setLoyaltyPct').value || 0),
      invoiceFooter: $('#setFooter').value.trim(),
      invoiceTerms: $('#setTerms').value.trim()
    });
    toast('Settings saved!', 'success');
    app.go('dashboard');
  };

  // Add user
  $('#addUserBtn').onclick = () => {
    openModal(`
      <div class="modal-header">
        <div class="modal-title">+ Add User</div>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input class="form-input" id="newUserName" />
        </div>
        <div class="form-group">
          <label class="form-label">Username</label>
          <input class="form-input" id="newUserUname" />
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input class="form-input" type="text" id="newUserPass" />
        </div>
        <div class="form-group">
          <label class="form-label">Role</label>
          <select class="form-select" id="newUserRole">
            <option value="cashier">Cashier</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" id="saveUserBtn">Save</button>
      </div>
    `, {
      onOpen: m => {
        $('#saveUserBtn', m).onclick = () => {
          const name = $('#newUserName', m).value.trim();
          const username = $('#newUserUname', m).value.trim();
          const password = $('#newUserPass', m).value.trim();
          if (!name || !username || !password) { toast('All fields required', 'error'); return; }
          if (DB.all('users').find(u => u.username === username)) { toast('Username already exists', 'error'); return; }
          DB.insert('users', { name, username, password, role: $('#newUserRole', m).value });
          closeModal();
          toast('User added', 'success');
          renderSettings(root);
        };
      }
    });
  };

  // Export
  $('#exportBtn').onclick = () => {
    const json = DB.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mrlaundry-backup-${isoDay(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Backup downloaded', 'success');
  };

  // Import
  $('#importFile').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        confirmDialog('This will REPLACE all current data. Are you sure?', () => {
          DB.importJSON(ev.target.result);
          toast('Data imported! Reloading…', 'success');
          setTimeout(() => location.reload(), 1000);
        });
      } catch (err) {
        toast('Invalid JSON file', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Trim
  $('#trimBtn').onclick = () => {
    confirmDialog('Trim old orders (keep last 1000) and audit logs? This frees storage space.', () => {
      if (!DB._data.orders) DB._data.orders = [];
      if (!DB._data.auditLog) DB._data.auditLog = [];
      const oBefore = DB._data.orders.length;
      const aBefore = DB._data.auditLog.length;
      if (oBefore > 1000) DB._data.orders.splice(0, oBefore - 1000);
      if (aBefore > 100) DB._data.auditLog.splice(0, aBefore - 100);
      DB.save();
      toast(`Trimmed ${oBefore - DB._data.orders.length} orders + ${aBefore - DB._data.auditLog.length} logs`, 'success');
      renderSettings(root);
    });
  };

  // Reset
  $('#resetBtn').onclick = () => {
    confirmDialog('⚠️ This will DELETE ALL DATA and restore defaults. Are you absolutely sure?', () => {
      confirmDialog('Last warning — this cannot be undone. Continue?', () => {
        DB.reset();
        toast('Reset complete. Reloading…', 'success');
        setTimeout(() => location.reload(), 1000);
      });
    });
  };
}

function deleteUser(id) {
  const u = DB.get('users', id);
  if (!u) return;
  confirmDialog(`Delete user "${u.name}"?`, () => {
    DB.remove('users', id);
    toast('User deleted', 'success');
    renderSettings(document.getElementById('mainContent'));
  });
}
