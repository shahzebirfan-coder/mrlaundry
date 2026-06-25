/* ============================================================
   POS — New Sale (cart + booking + payment)
   ============================================================ */
const posState = {
  cart: [],
  customerId: 'cu_walkin',
  discountType: 'fixed',
  discountValue: 0,
  activeCategory: 'all',
  search: ''
};

function renderPOS(root) {
  root.innerHTML = `
    <div class="pos-page">
      <div class="pos-products">
        <div class="pos-search">
          <input type="text" id="posSearch" placeholder="Search products…" value="${escapeHtml(posState.search)}" />
        </div>
        <div class="pos-categories" id="posCats"></div>
        <div class="pos-grid" id="posGrid"></div>
      </div>
      <div class="pos-cart">
        <div class="cart-header">
          <div>
            🛒 Current Sale
            <div class="cart-customer" id="cartCustomer"></div>
          </div>
          <button class="btn btn-ghost btn-sm" id="clearCartBtn">Clear</button>
        </div>
        <div class="cart-items" id="cartItems"></div>
        <div class="cart-summary" id="cartSummary"></div>
        <div class="cart-actions">
          <button class="btn btn-secondary" id="chooseCustBtn">👤 Customer</button>
          <button class="btn btn-primary" id="checkoutBtn">Next → 💳</button>
        </div>
      </div>
    </div>
  `;

  renderPosCats();
  renderPosGrid();
  renderCart();

  $('#posSearch').oninput = (e) => {
    posState.search = e.target.value;
    renderPosGrid();
  };
  $('#clearCartBtn').onclick = () => {
    if (posState.cart.length === 0) return;
    confirmDialog('Clear cart?', () => {
      posState.cart = [];
      posState.discountValue = 0;
      renderCart();
      toast('Cart cleared', 'success');
    });
  };
  $('#chooseCustBtn').onclick = openCustomerPicker;
  $('#checkoutBtn').onclick = openBookingForm;
}

function renderPosCats() {
  const cats = DB.all('categories');
  $('#posCats').innerHTML = `
    <button class="cat-chip ${posState.activeCategory === 'all' ? 'active' : ''}" data-cat="all">📋 All</button>
    ${cats.map(c => `
      <button class="cat-chip ${posState.activeCategory === c.id ? 'active' : ''}" data-cat="${c.id}">
        ${c.icon || '🏷️'} ${escapeHtml(c.name)}
      </button>
    `).join('')}
  `;
  $$('.cat-chip').forEach(ch => ch.onclick = () => {
    posState.activeCategory = ch.dataset.cat;
    renderPosCats();
    renderPosGrid();
  });
}

function renderPosGrid() {
  const products = DB.all('products').filter(p => p.active !== false);
  const filtered = products.filter(p => {
    if (posState.activeCategory !== 'all' && p.category !== posState.activeCategory) return false;
    if (posState.search && !p.name.toLowerCase().includes(posState.search.toLowerCase())) return false;
    return true;
  });

  if (filtered.length === 0) {
    $('#posGrid').innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">🔍</div>
        <p>No products found</p>
      </div>`;
    return;
  }

  $('#posGrid').innerHTML = filtered.map(p => `
    <div class="product-tile" data-id="${p.id}">
      <div class="product-tile-icon">${p.image || '🧺'}</div>
      <div class="product-tile-name">${escapeHtml(p.name)}</div>
      <div class="product-tile-price">${fmtMoney(p.price)}</div>
    </div>
  `).join('');

  $$('.product-tile').forEach(tile => tile.onclick = () => {
    addToCart(tile.dataset.id);
    tile.classList.add('added');
    setTimeout(() => tile.classList.remove('added'), 300);
  });
}

function addToCart(productId) {
  const p = DB.get('products', productId);
  if (!p) return;
  const existing = posState.cart.find(i => i.productId === productId);
  if (existing) existing.qty += 1;
  else posState.cart.push({ productId: p.id, name: p.name, image: p.image, price: p.price, qty: 1 });
  renderCart();
}

function calcCartTotals() {
  const subtotal = posState.cart.reduce((s, i) => s + i.price * i.qty, 0);
  const settings = DB.settings();
  const taxPercent = +settings.taxPercent || 0;
  const cust = DB.get('customers', posState.customerId);

  let manualDiscount = 0;
  if (posState.discountType === 'percent') {
    manualDiscount = Math.round(subtotal * (posState.discountValue || 0) / 100);
  } else {
    manualDiscount = posState.discountValue || 0;
  }
  manualDiscount = Math.min(subtotal, Math.max(0, manualDiscount));

  let loyaltyDiscount = 0;
  let loyaltyPercent = 0;
  if (cust && cust.loyaltyActive && cust.loyaltyDiscountPercent > 0) {
    loyaltyPercent = cust.loyaltyDiscountPercent;
    loyaltyDiscount = Math.round((subtotal - manualDiscount) * loyaltyPercent / 100);
  }

  const totalDiscount = manualDiscount + loyaltyDiscount;
  const taxable = Math.max(0, subtotal - totalDiscount);
  const tax = Math.round(taxable * taxPercent / 100);
  const total = taxable + tax;

  return { subtotal, manualDiscount, loyaltyDiscount, loyaltyPercent, totalDiscount, tax, total };
}

function renderCart() {
  const cust = DB.get('customers', posState.customerId);
  $('#cartCustomer').innerHTML = cust
    ? `👤 ${escapeHtml(cust.name)}${cust.phone ? ' • ' + escapeHtml(cust.phone) : ''}${cust.loyaltyActive ? ' ⭐' + cust.loyaltyDiscountPercent + '%' : ''}`
    : '👤 Walk-in Customer';

  if (posState.cart.length === 0) {
    $('#cartItems').innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">🛒</div>
        <p>Cart is empty</p>
        <p class="text-sm">Tap a product to add it</p>
      </div>`;
    $('#cartSummary').innerHTML = '';
    return;
  }

  const cur = DB.settings().currency;
  $('#cartItems').innerHTML = posState.cart.map((it, i) => `
    <div class="cart-item">
      <div>
        <div class="cart-item-name">${escapeHtml(it.name)}</div>
        <div class="cart-item-price">${cur} ${it.price} × ${it.qty} = <strong>${fmtMoney(it.price * it.qty)}</strong></div>
      </div>
      <div class="cart-item-qty">
        <button class="qty-btn" data-act="minus" data-i="${i}">−</button>
        <input class="qty-input" type="number" min="1" value="${it.qty}" data-i="${i}" />
        <button class="qty-btn" data-act="plus" data-i="${i}">+</button>
        <button class="qty-btn" data-act="remove" data-i="${i}">×</button>
      </div>
    </div>
  `).join('');

  $$('.qty-btn').forEach(b => b.onclick = () => {
    const i = +b.dataset.i;
    if (b.dataset.act === 'plus') posState.cart[i].qty++;
    else if (b.dataset.act === 'minus') posState.cart[i].qty = Math.max(1, posState.cart[i].qty - 1);
    else if (b.dataset.act === 'remove') posState.cart.splice(i, 1);
    renderCart();
  });
  $$('.qty-input').forEach(inp => inp.onchange = () => {
    const i = +inp.dataset.i;
    posState.cart[i].qty = Math.max(1, parseInt(inp.value) || 1);
    renderCart();
  });

  const tot = calcCartTotals();
  $('#cartSummary').innerHTML = `
    <div class="summary-row">
      <span>Subtotal</span><span>${fmtMoney(tot.subtotal)}</span>
    </div>
    <div class="summary-row">
      <span>Discount
        <select id="discTypeSel" style="font-size:11px;padding:2px 4px;border:1px solid var(--border);border-radius:4px;background:var(--surface)">
          <option value="fixed" ${posState.discountType === 'fixed' ? 'selected' : ''}>${cur}</option>
          <option value="percent" ${posState.discountType === 'percent' ? 'selected' : ''}>%</option>
        </select>
        <input id="discValInp" type="number" min="0" value="${posState.discountValue}" style="width:60px;font-size:11px;padding:2px 4px;border:1px solid var(--border);border-radius:4px" />
      </span>
      <span id="discAmt">${tot.manualDiscount > 0 ? '− ' + fmtMoney(tot.manualDiscount) : '-'}</span>
    </div>
    ${tot.loyaltyDiscount > 0 ? `
      <div class="summary-row text-success">
        <span>⭐ Loyalty (${tot.loyaltyPercent}%)</span><span>− ${fmtMoney(tot.loyaltyDiscount)}</span>
      </div>` : ''}
    ${tot.tax > 0 ? `
      <div class="summary-row"><span>Tax</span><span>${fmtMoney(tot.tax)}</span></div>
    ` : ''}
    <div class="summary-row total">
      <span>TOTAL</span><span>${fmtMoney(tot.total)}</span>
    </div>
  `;
  $('#discTypeSel').onchange = e => { posState.discountType = e.target.value; renderCart(); };
  $('#discValInp').oninput = e => {
    posState.discountValue = Math.max(0, parseFloat(e.target.value) || 0);
    renderCart();
  };
}

function openCustomerPicker() {
  const customers = DB.all('customers').filter(c => c.id !== 'cu_walkin');
  openModal(`
    <div class="modal-header">
      <div class="modal-title">👥 Choose Customer</div>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <input type="text" class="form-input mb-3" id="custSearch" placeholder="Search by name, phone…" />
      <div id="custList">
        <div class="cust-row" data-id="cu_walkin" style="padding:10px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px;cursor:pointer;display:flex;align-items:center;gap:10px">
          <div style="width:36px;height:36px;border-radius:50%;background:var(--bg);display:flex;align-items:center;justify-content:center">👤</div>
          <div><strong>Walk-in Customer</strong></div>
        </div>
        ${customers.map(c => `
          <div class="cust-row" data-id="${c.id}" style="padding:10px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px;cursor:pointer;display:flex;align-items:center;gap:10px">
            <div style="width:36px;height:36px;border-radius:50%;background:var(--primary-light);color:var(--primary);display:flex;align-items:center;justify-content:center;font-weight:700">${(c.name || '?').charAt(0).toUpperCase()}</div>
            <div style="flex:1">
              <strong>${escapeHtml(c.name)}</strong>
              <div class="text-sm text-soft">${escapeHtml(c.phone || 'No phone')}${c.loyaltyActive ? ' • ⭐ ' + c.loyaltyDiscountPercent + '%' : ''}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="newCustBtn">+ Add New</button>
    </div>
  `, {
    onOpen: m => {
      const renderList = (q = '') => {
        const ql = q.toLowerCase();
        const filtered = customers.filter(c =>
          !q || (c.name || '').toLowerCase().includes(ql) || (c.phone || '').includes(q)
        );
        const listHtml = `
          <div class="cust-row" data-id="cu_walkin" style="padding:10px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px;cursor:pointer;display:flex;align-items:center;gap:10px">
            <div style="width:36px;height:36px;border-radius:50%;background:var(--bg);display:flex;align-items:center;justify-content:center">👤</div>
            <div><strong>Walk-in Customer</strong></div>
          </div>
          ${filtered.map(c => `
            <div class="cust-row" data-id="${c.id}" style="padding:10px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px;cursor:pointer;display:flex;align-items:center;gap:10px">
              <div style="width:36px;height:36px;border-radius:50%;background:var(--primary-light);color:var(--primary);display:flex;align-items:center;justify-content:center;font-weight:700">${(c.name || '?').charAt(0).toUpperCase()}</div>
              <div style="flex:1">
                <strong>${escapeHtml(c.name)}</strong>
                <div class="text-sm text-soft">${escapeHtml(c.phone || 'No phone')}${c.loyaltyActive ? ' • ⭐ ' + c.loyaltyDiscountPercent + '%' : ''}</div>
              </div>
            </div>
          `).join('')}`;
        $('#custList', m).innerHTML = listHtml;
        $$('.cust-row', m).forEach(r => r.onclick = () => {
          posState.customerId = r.dataset.id;
          closeModal();
          renderCart();
          toast('Customer: ' + (DB.get('customers', r.dataset.id)?.name || 'Walk-in'), 'success');
        });
      };
      renderList();
      $('#custSearch', m).oninput = e => renderList(e.target.value);
      $('#newCustBtn', m).onclick = () => {
        closeModal();
        openCustomerForm(null, newC => {
          posState.customerId = newC.id;
          renderCart();
        });
      };
    }
  });
}

function openCustomerForm(existing, onSave) {
  const c = existing || { name: '', phone: '', address: '', loyaltyNo: '', loyaltyDiscountPercent: 0, loyaltyActive: false };
  openModal(`
    <div class="modal-header">
      <div class="modal-title">${existing ? '✏️ Edit' : '+ Add'} Customer</div>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Name *</label>
        <input class="form-input" id="cfName" value="${escapeHtml(c.name)}" />
      </div>
      <div class="form-group">
        <label class="form-label">Phone *</label>
        <input class="form-input" id="cfPhone" value="${escapeHtml(c.phone)}" />
      </div>
      <div class="form-group">
        <label class="form-label">Address</label>
        <input class="form-input" id="cfAddr" value="${escapeHtml(c.address)}" />
      </div>
      <hr style="border:none;border-top:1px solid var(--border);margin:16px 0" />
      <h4 class="text-sm font-bold mb-2">⭐ Loyalty Card</h4>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Loyalty No</label>
          <input class="form-input" id="cfLoyaltyNo" value="${escapeHtml(c.loyaltyNo)}" placeholder="Leave blank to auto-generate" />
        </div>
        <div class="form-group">
          <label class="form-label">Discount %</label>
          <input class="form-input" type="number" min="0" max="100" id="cfLoyaltyPct" value="${c.loyaltyDiscountPercent || 0}" />
        </div>
      </div>
      <div class="form-group">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" id="cfLoyaltyActive" ${c.loyaltyActive ? 'checked' : ''} />
          <span>Activate loyalty for this customer</span>
        </label>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="cfSaveBtn">Save Customer</button>
    </div>
  `, {
    onOpen: m => {
      $('#cfSaveBtn', m).onclick = () => {
        const name = $('#cfName', m).value.trim();
        const phone = $('#cfPhone', m).value.trim();
        if (!name) { toast('Name required', 'error'); return; }
        if (!phone) { toast('Phone required', 'error'); return; }
        const loyaltyActive = $('#cfLoyaltyActive', m).checked;
        const data = {
          name,
          phone,
          address: $('#cfAddr', m).value.trim(),
          loyaltyNo: $('#cfLoyaltyNo', m).value.trim() || (loyaltyActive ? DB.nextLoyaltyNumber() : ''),
          loyaltyDiscountPercent: Math.max(0, +$('#cfLoyaltyPct', m).value || 0),
          loyaltyActive
        };
        let saved;
        if (existing) saved = DB.update('customers', existing.id, data);
        else saved = DB.insert('customers', data);
        closeModal();
        toast('Customer saved!', 'success');
        if (onSave) onSave(saved);
      };
    }
  });
}

/* === STEP 1: Booking Form (customer + delivery details) === */
function openBookingForm() {
  if (posState.cart.length === 0) {
    toast('Cart is empty', 'error');
    return;
  }
  const cust = DB.get('customers', posState.customerId) || { name: '', phone: '', address: '' };
  const tot = calcCartTotals();
  const defaultDays = DB.settings().defaultDeliveryDays || 2;
  const today = new Date();
  const todayStr = today.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
  const bookingDateIso = isoDay(today);

  openModal(`
    <div class="modal-header">
      <div class="modal-title">📝 Booking Details</div>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Booking Date</label>
          <input class="form-input" value="${todayStr}" disabled />
        </div>
        <div class="form-group">
          <label class="form-label">Phone *</label>
          <input class="form-input" id="bCustPhone" value="${escapeHtml(cust.phone)}" placeholder="Type phone…" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Customer Name *</label>
        <input class="form-input" id="bCustName" value="${escapeHtml(cust.name)}" />
      </div>
      <div class="form-group">
        <label class="form-label">Address</label>
        <input class="form-input" id="bCustAddr" value="${escapeHtml(cust.address || '')}" />
      </div>
      <hr style="border:none;border-top:1px solid var(--border);margin:16px 0" />

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Delivery In</label>
          <select class="form-select" id="bDeliveryDays">
            <option value="1">1 day (tomorrow)</option>
            <option value="2" selected>2 days</option>
            <option value="3">3 days</option>
            <option value="4">4 days</option>
            <option value="5">5 days</option>
            <option value="7">1 week</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Delivery Date</label>
          <input class="form-input" type="date" id="bDeliveryDate" />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Packaging / Delivery Type</label>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
          <label style="border:1px solid var(--border);border-radius:8px;padding:10px;text-align:center;cursor:pointer">
            <input type="radio" name="bDelType" value="hanger" checked style="margin-bottom:4px" />
            <div style="font-size:24px">🧥</div>
            <strong>Hanger</strong>
          </label>
          <label style="border:1px solid var(--border);border-radius:8px;padding:10px;text-align:center;cursor:pointer">
            <input type="radio" name="bDelType" value="fold" style="margin-bottom:4px" />
            <div style="font-size:24px">📦</div>
            <strong>Fold</strong>
          </label>
          <label style="border:1px solid var(--border);border-radius:8px;padding:10px;text-align:center;cursor:pointer">
            <input type="radio" name="bDelType" value="both" style="margin-bottom:4px" />
            <div style="font-size:24px">🧺</div>
            <strong>Both</strong>
          </label>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea class="form-textarea" id="bNotes" placeholder="e.g. Urgent, no starch"></textarea>
      </div>

      <div style="background:var(--bg);border-radius:8px;padding:12px;margin-top:12px">
        <div class="summary-row"><span>Subtotal</span><span>${fmtMoney(tot.subtotal)}</span></div>
        ${tot.manualDiscount > 0 ? `<div class="summary-row"><span>Discount</span><span class="text-success">− ${fmtMoney(tot.manualDiscount)}</span></div>` : ''}
        ${tot.loyaltyDiscount > 0 ? `<div class="summary-row"><span>⭐ Loyalty</span><span class="text-success">− ${fmtMoney(tot.loyaltyDiscount)}</span></div>` : ''}
        ${tot.tax > 0 ? `<div class="summary-row"><span>Tax</span><span>${fmtMoney(tot.tax)}</span></div>` : ''}
        <div class="summary-row total"><span>TOTAL</span><span>${fmtMoney(tot.total)}</span></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary btn-lg" id="bNextBtn">Next → 💳 Payment</button>
    </div>
  `, {
    large: true,
    onOpen: m => {
      const setDate = (days) => {
        $('#bDeliveryDate', m).value = isoDay(new Date(Date.now() + days * 86400000));
      };
      setDate(defaultDays);
      $('#bDeliveryDays', m).onchange = e => setDate(+e.target.value);

      $('#bNextBtn', m).onclick = () => {
        const name = $('#bCustName', m).value.trim();
        const phone = $('#bCustPhone', m).value.trim();
        if (!name) { toast('Customer name required', 'error'); return; }
        if (!phone) { toast('Phone required', 'error'); return; }

        // Save/update customer
        let customer = DB.all('customers').find(c => c.phone === phone && c.id !== 'cu_walkin');
        const custData = {
          name, phone,
          address: $('#bCustAddr', m).value.trim()
        };
        if (customer) customer = DB.update('customers', customer.id, custData);
        else customer = DB.insert('customers', custData);
        posState.customerId = customer.id;

        const deliveryTypeEl = m.querySelector('input[name="bDelType"]:checked');
        const orderMeta = {
          deliveryDate: $('#bDeliveryDate', m).value,
          deliveryType: deliveryTypeEl ? deliveryTypeEl.value : 'hanger',
          notes: $('#bNotes', m).value.trim(),
          bookingDate: bookingDateIso
        };
        closeModal();
        openPaymentDialog(orderMeta);
      };
    }
  });
}

/* === STEP 2: Payment Dialog === */
function openPaymentDialog(orderMeta) {
  const tot = calcCartTotals();
  const cust = DB.get('customers', posState.customerId);

  openModal(`
    <div class="modal-header">
      <div class="modal-title">💳 Payment</div>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="text-sm text-soft mb-3">Customer: <strong>${escapeHtml(cust?.name || 'Walk-in')}</strong>${cust?.phone ? ' • ' + escapeHtml(cust.phone) : ''}</div>

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:16px">
        <button class="btn btn-secondary pay-tab active" data-type="paid">💵 Pay Now</button>
        <button class="btn btn-secondary pay-tab" data-type="advance">🟢 Advance</button>
        <button class="btn btn-secondary pay-tab" data-type="partial">🟡 Partial</button>
        <button class="btn btn-secondary pay-tab" data-type="credit">📋 Credit</button>
      </div>

      <div class="form-group">
        <label class="form-label">Payment Method</label>
        <select class="form-select" id="payMethod">
          <option value="cash">💵 Cash</option>
          <option value="card">💳 Card</option>
          <option value="bank">🏦 Bank Transfer</option>
          <option value="jazzcash">📱 JazzCash</option>
          <option value="easypaisa">📱 Easypaisa</option>
          <option value="credit">📋 Credit (Pay on Delivery)</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Initial Status</label>
        <select class="form-select" id="payStatus">
          <option value="pending" selected>⏳ Pending</option>
          <option value="washing">🌀 Washing</option>
          <option value="ready">✅ Ready</option>
          <option value="delivered">📦 Delivered</option>
        </select>
      </div>

      <div style="background:var(--bg);border-radius:8px;padding:12px;margin-top:12px">
        <div class="summary-row"><span>Total Amount</span><span class="font-bold">${fmtMoney(tot.total)}</span></div>
        <div class="form-group mt-3 mb-2">
          <label class="form-label" id="paidLbl">Amount Received</label>
          <input class="form-input" type="number" id="paidInput" min="0" max="${tot.total}" value="${tot.total}" />
        </div>
        <div id="dueLine" class="text-sm font-bold"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="backBtn">← Back</button>
      <button class="btn btn-success btn-lg" id="confirmBtn">✅ Save & Print</button>
    </div>
  `, {
    large: true,
    onOpen: m => {
      let currentType = 'paid';

      const updateDue = () => {
        const paid = Math.max(0, +$('#paidInput', m).value || 0);
        const due = tot.total - paid;
        let html;
        if (paid <= 0) html = `<span class="text-warning">📋 Credit Sale — ${fmtMoney(tot.total)} on delivery</span>`;
        else if (currentType === 'advance' && due > 0) html = `<span class="text-success">🟢 Advance: <strong>${fmtMoney(paid)}</strong> • Due: <strong>${fmtMoney(due)}</strong></span>`;
        else if (due > 0) html = `<span class="text-warning">Due: <strong>${fmtMoney(due)}</strong></span>`;
        else if (due < 0) html = `<span class="text-success">Change: ${fmtMoney(Math.abs(due))}</span>`;
        else html = `<span class="text-success">✅ Fully Paid</span>`;
        $('#dueLine', m).innerHTML = html;
      };
      updateDue();
      $('#paidInput', m).oninput = updateDue;

      $$('.pay-tab', m).forEach(tb => tb.onclick = () => {
        $$('.pay-tab', m).forEach(x => x.classList.remove('active'));
        tb.classList.add('active');
        currentType = tb.dataset.type;
        if (currentType === 'paid') { $('#paidInput', m).value = tot.total; $('#paidLbl', m).textContent = 'Amount Received'; }
        if (currentType === 'advance') { $('#paidInput', m).value = Math.min(tot.total, 200); $('#paidLbl', m).textContent = '🟢 Advance Amount'; }
        if (currentType === 'partial') { $('#paidInput', m).value = Math.round(tot.total / 2); $('#paidLbl', m).textContent = '🟡 Partial Amount'; }
        if (currentType === 'credit') { $('#paidInput', m).value = 0; $('#paidLbl', m).textContent = 'Amount Received (0 = Credit)'; $('#payMethod', m).value = 'credit'; }
        updateDue();
      });

      $('#backBtn', m).onclick = () => { closeModal(); openBookingForm(); };

      $('#confirmBtn', m).onclick = () => {
        const paid = Math.max(0, +$('#paidInput', m).value || 0);
        const actualPaid = Math.min(tot.total, paid);
        const due = Math.max(0, tot.total - actualPaid);

        let paymentType = 'paid';
        if (actualPaid === 0) paymentType = 'credit';
        else if (actualPaid < tot.total) paymentType = (currentType === 'advance') ? 'advance' : 'partial';

        const order = {
          invoiceNo: DB.nextInvoiceNumber(),
          items: posState.cart.map(i => ({ ...i, lineTotal: i.price * i.qty })),
          customerId: posState.customerId,
          subtotal: tot.subtotal,
          discount: tot.totalDiscount,
          manualDiscount: tot.manualDiscount,
          loyaltyDiscount: tot.loyaltyDiscount,
          loyaltyPercent: tot.loyaltyPercent,
          discountType: posState.discountType,
          discountValue: posState.discountValue,
          tax: tot.tax,
          total: tot.total,
          paid: actualPaid,
          due,
          advance: paymentType === 'advance' ? actualPaid : 0,
          paymentType,
          isCredit: actualPaid === 0,
          status: $('#payStatus', m).value,
          paymentMethod: $('#payMethod', m).value,
          deliveryDate: orderMeta.deliveryDate,
          deliveryType: orderMeta.deliveryType,
          bookingDate: orderMeta.bookingDate,
          notes: orderMeta.notes,
          cashierId: DB.currentUser().id,
          cashierUsername: DB.currentUser().username,
          cashierName: DB.currentUser().name
        };
        const saved = DB.insert('orders', order);

        // Reset cart
        posState.cart = [];
        posState.discountValue = 0;
        posState.customerId = 'cu_walkin';
        closeModal();
        toast(`Order INV-${saved.invoiceNo} saved!`, 'success');
        openInvoice(saved.id);
      };
    }
  });
}
