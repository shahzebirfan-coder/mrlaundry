/* ============================================================
   Products — laundry rate list
   ============================================================ */
function renderProducts(root) {
  const products = DB.all('products');
  const categories = DB.all('categories');
  const catFilter = { value: 'all' };
  const search = { value: '' };

  root.innerHTML = `
    <div class="card mb-3">
      <div class="card-header">
        <div class="card-title">🏷️ Products / Rate List (${products.length})</div>
      </div>
      <div class="flex gap-2" style="flex-wrap:wrap">
        <select class="form-select" id="catFilter" style="width:auto">
          <option value="all">All Categories</option>
          ${categories.map(c => `<option value="${c.id}">${c.icon} ${escapeHtml(c.name)}</option>`).join('')}
        </select>
        <input type="text" class="form-input" id="prodSearch" placeholder="🔍 Search…" style="max-width:300px" />
      </div>
    </div>

    <div id="prodList"></div>
  `;

  const renderList = () => {
    const q = search.value.toLowerCase();
    let filtered = products;
    if (catFilter.value !== 'all') filtered = filtered.filter(p => p.category === catFilter.value);
    if (q) filtered = filtered.filter(p => p.name.toLowerCase().includes(q));

    if (filtered.length === 0) {
      $('#prodList').innerHTML = `<div class="empty-state"><div class="empty-state-icon">🏷️</div><p>No products found</p></div>`;
      return;
    }

    $('#prodList').innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Item</th><th>Category</th><th>Price</th><th></th></tr></thead>
          <tbody>
            ${filtered.map(p => {
              const c = categories.find(c => c.id === p.category);
              return `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px">
                      <div style="font-size:24px">${p.image || '🧺'}</div>
                      <strong>${escapeHtml(p.name)}</strong>
                    </div>
                  </td>
                  <td>${c ? c.icon + ' ' + escapeHtml(c.name) : '-'}</td>
                  <td><strong>${fmtMoney(p.price)}</strong></td>
                  <td><button class="btn btn-ghost btn-sm" onclick="editProductPrice('${p.id}')">✏️ Edit Price</button></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  renderList();
  $('#catFilter').onchange = e => { catFilter.value = e.target.value; renderList(); };
  $('#prodSearch').oninput = e => { search.value = e.target.value; renderList(); };
}

function editProductPrice(id) {
  const p = DB.get('products', id);
  if (!p) return;
  openModal(`
    <div class="modal-header">
      <div class="modal-title">✏️ Edit Price</div>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding:12px;background:var(--bg);border-radius:8px">
        <div style="font-size:32px">${p.image || '🧺'}</div>
        <div><strong>${escapeHtml(p.name)}</strong></div>
      </div>
      <div class="form-group">
        <label class="form-label">Price (${DB.settings().currency})</label>
        <input type="number" min="0" class="form-input form-input-lg" id="newPrice" value="${p.price}" />
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="savePrice">Save</button>
    </div>
  `, {
    onOpen: m => {
      $('#savePrice', m).onclick = () => {
        const newPrice = Math.max(0, +$('#newPrice', m).value || 0);
        DB.update('products', id, { price: newPrice });
        closeModal();
        toast('Price updated', 'success');
        renderProducts(document.getElementById('mainContent'));
      };
    }
  });
}
