/* ===================== EXPENSES (with categories + filters) ===================== */

const EXPENSE_CATEGORIES = [
  { id: 'rent',        label: '🏠 Rent',                    color: '#ef4444' },
  { id: 'salary',      label: '👤 Salary / Wages',          color: '#f59e0b' },
  { id: 'utilities',   label: '💡 Utilities (Bills)',       color: '#3b82f6' },
  { id: 'supplies',    label: '🧴 Supplies (Detergent, etc.)', color: '#06b6d4' },
  { id: 'maintenance', label: '🔧 Maintenance / Repair',    color: '#8b5cf6' },
  { id: 'transport',   label: '🚚 Transport / Fuel',        color: '#ec4899' },
  { id: 'marketing',   label: '📢 Marketing / Ads',         color: '#10b981' },
  { id: 'tax',         label: '🧾 Tax / Govt Fee',          color: '#dc2626' },
  { id: 'food',        label: '🍵 Food / Tea for Staff',    color: '#eab308' },
  { id: 'rawmaterial', label: '🧺 Raw Material',            color: '#0ea5e9' },
  { id: 'other',       label: '📦 Other',                   color: '#6b7280' }
];

let expFilter = { range: 'today', dateFrom: '', dateTo: '', category: 'all', search: '' };

function getExpCategory(id) {
  return EXPENSE_CATEGORIES.find(c => c.id === id) || { id: 'other', label: '📦 Other', color: '#6b7280' };
}

function applyDateRange(range) {
  const today = new Date();
  const isoOf = (d) => isoDay(d);
  let from = '', to = isoOf(today);
  switch (range) {
    case 'today':       from = to; break;
    case 'yesterday': { const y = new Date(); y.setDate(y.getDate()-1); from = to = isoOf(y); break; }
    case 'last7':     { const d = new Date(); d.setDate(d.getDate()-6); from = isoOf(d); break; }
    case 'last30':    { const d = new Date(); d.setDate(d.getDate()-29); from = isoOf(d); break; }
    case 'thismonth': { from = isoOf(new Date(today.getFullYear(), today.getMonth(), 1)); break; }
    case 'lastmonth': {
      const fm = new Date(today.getFullYear(), today.getMonth()-1, 1);
      const lm = new Date(today.getFullYear(), today.getMonth(), 0);
      from = isoOf(fm); to = isoOf(lm); break;
    }
    case 'thisyear':  { from = isoOf(new Date(today.getFullYear(), 0, 1)); break; }
    case 'lastyear':  {
      from = isoOf(new Date(today.getFullYear()-1, 0, 1));
      to = isoOf(new Date(today.getFullYear()-1, 11, 31)); break;
    }
    case 'all':       from = '1970-01-01'; break;
    case 'custom':    return; // user picks
    default: from = to;
  }
  expFilter.dateFrom = from;
  expFilter.dateTo = to;
}

function renderExpenses() {
  if (!expFilter.dateFrom) applyDateRange(expFilter.range || 'today');

  const content = `
    <h1 class="page-title">💸 Expenses</h1>
    <p class="page-sub">Track business expenses — categorized for proper reporting.</p>

    <!-- Date Range Quick Filters -->
    <div style="background:var(--surface);border-radius:12px;padding:14px;margin-bottom:14px;border:1px solid var(--border);">
      <div style="font-weight:700;font-size:13px;margin-bottom:10px;">📅 Date Range</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        ${[
          { id: 'today',     label: 'Today' },
          { id: 'yesterday', label: 'Yesterday' },
          { id: 'last7',     label: 'Last 7 Days' },
          { id: 'last30',    label: 'Last 30 Days' },
          { id: 'thismonth', label: 'This Month' },
          { id: 'lastmonth', label: 'Last Month' },
          { id: 'thisyear',  label: 'This Year' },
          { id: 'lastyear',  label: 'Last Year' },
          { id: 'all',       label: 'All Time' },
          { id: 'custom',    label: '🎯 Custom Range' }
        ].map(r => `
          <button class="exp-range-btn ${expFilter.range===r.id?'active':''}" data-range="${r.id}" style="padding:8px 14px;border:2px solid ${expFilter.range===r.id?'var(--primary)':'var(--border)'};background:${expFilter.range===r.id?'var(--primary)':'var(--surface)'};color:${expFilter.range===r.id?'#fff':'var(--text)'};border-radius:10px;font-weight:700;font-size:12px;cursor:pointer;transition:all .2s ease;">${r.label}</button>
        `).join('')}
      </div>
      <div id="customRange" style="display:${expFilter.range==='custom'?'flex':'none'};gap:8px;margin-top:10px;align-items:center;flex-wrap:wrap;">
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;">From <input type="date" id="eFrom" value="${expFilter.dateFrom}"/></label>
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;">To <input type="date" id="eTo" value="${expFilter.dateTo}"/></label>
        <button class="btn btn-primary btn-sm" id="eApplyCustom">Apply</button>
      </div>
      <div style="font-size:11px;color:var(--text-soft);margin-top:8px;">
        📊 Showing: <b>${expFilter.dateFrom}</b> to <b>${expFilter.dateTo}</b>
      </div>
    </div>

    <!-- Action bar -->
    <div class="filter-bar" style="margin-bottom:14px;">
      <select id="eCatFilter" style="padding:10px;border:1px solid var(--border);border-radius:8px;font-weight:600;">
        <option value="all">📂 All Categories</option>
        ${EXPENSE_CATEGORIES.map(c => `<option value="${c.id}" ${expFilter.category===c.id?'selected':''}>${c.label}</option>`).join('')}
      </select>
      <input id="eSearch" placeholder="🔍 Search title/note..." value="${escapeHtml(expFilter.search)}" style="flex:1;min-width:200px;padding:10px;border:1px solid var(--border);border-radius:8px;"/>
      <button class="btn btn-primary" id="addExpBtn">+ Add Expense</button>
      <button class="btn btn-secondary btn-sm" id="exportCSVBtn">📥 Export CSV</button>
      <button class="btn btn-warning btn-sm" id="exportPDFBtn">📄 Export PDF</button>
    </div>

    <!-- Summary stats -->
    <div id="expSummary"></div>

    <!-- Category-wise breakdown -->
    <div id="expCatBreakdown"></div>

    <!-- Expense table -->
    <div class="card" style="padding:0;overflow:hidden;">
      <table class="tbl">
        <thead><tr>
          <th>Date</th>
          <th>Category</th>
          <th>Title</th>
          <th>Note</th>
          <th style="text-align:right;">Amount</th>
          <th>Actions</th>
        </tr></thead>
        <tbody id="expBody"></tbody>
      </table>
    </div>
  `;
  $('#app').innerHTML = renderLayout('expenses', content);
  bindLayout();

  $$('.exp-range-btn').forEach(b => b.onclick = () => {
    expFilter.range = b.dataset.range;
    if (b.dataset.range !== 'custom') {
      applyDateRange(b.dataset.range);
    }
    renderExpenses();
  });
  $('#eApplyCustom')?.addEventListener('click', () => {
    expFilter.dateFrom = $('#eFrom').value;
    expFilter.dateTo = $('#eTo').value;
    renderExpBody();
  });
  $('#eCatFilter').onchange = (e) => { expFilter.category = e.target.value; renderExpBody(); };
  $('#eSearch').oninput = (e) => { expFilter.search = e.target.value; renderExpBody(); };
  $('#addExpBtn').onclick = () => openExpenseForm();
  $('#exportCSVBtn').onclick = exportExpensesCSV;
  $('#exportPDFBtn').onclick = exportExpensesPDF;

  renderExpBody();
}

function filteredExpenses() {
  return DB.all('expenses').filter(e => {
    const day = e.date || (e.createdAt||'').slice(0,10);
    if (expFilter.dateFrom && day < expFilter.dateFrom) return false;
    if (expFilter.dateTo && day > expFilter.dateTo) return false;
    if (expFilter.category !== 'all' && (e.category || 'other') !== expFilter.category) return false;
    if (expFilter.search) {
      const q = expFilter.search.toLowerCase();
      if (!(e.title||'').toLowerCase().includes(q) && !(e.note||'').toLowerCase().includes(q)) return false;
    }
    return true;
  }).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
}

function renderExpBody() {
  const list = filteredExpenses();
  const total = list.reduce((s,e)=>s+(e.amount||0),0);

  // Category breakdown
  const catTotals = {};
  list.forEach(e => {
    const cid = e.category || 'other';
    catTotals[cid] = (catTotals[cid] || 0) + (e.amount || 0);
  });
  const catEntries = Object.entries(catTotals).sort((a,b)=>b[1]-a[1]);

  // Summary stats
  $('#expSummary').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:16px;">
      <div class="stat-card" style="background:linear-gradient(135deg,#fee2e2,#fef2f2);border-left:4px solid #ef4444;">
        <div class="ic" style="background:#ef4444;color:#fff;">💸</div>
        <div>
          <div class="lbl">Total Expenses</div>
          <div class="val" style="color:#dc2626;">${fmtMoney(total)}</div>
          <div class="lbl" style="font-size:10px;">${list.length} entries</div>
        </div>
      </div>
      <div class="stat-card" style="background:linear-gradient(135deg,#fef3c7,#fffbeb);border-left:4px solid #f59e0b;">
        <div class="ic" style="background:#f59e0b;color:#fff;">📂</div>
        <div>
          <div class="lbl">Categories Used</div>
          <div class="val" style="color:#d97706;">${catEntries.length}</div>
          <div class="lbl" style="font-size:10px;">Different types</div>
        </div>
      </div>
      <div class="stat-card" style="background:linear-gradient(135deg,#dbeafe,#eff6ff);border-left:4px solid #3b82f6;">
        <div class="ic" style="background:#3b82f6;color:#fff;">📊</div>
        <div>
          <div class="lbl">Avg per Entry</div>
          <div class="val" style="color:#2563eb;">${fmtMoney(list.length ? Math.round(total/list.length) : 0)}</div>
        </div>
      </div>
    </div>
  `;

  // Category breakdown card
  if (catEntries.length) {
    $('#expCatBreakdown').innerHTML = `
      <div class="card" style="margin-bottom:14px;">
        <div class="card-header"><h3>📂 By Category</h3></div>
        <div style="padding:14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;">
          ${catEntries.map(([cid, amt]) => {
            const cat = getExpCategory(cid);
            const pct = total > 0 ? Math.round(amt/total*100) : 0;
            return `<div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:12px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <div style="font-weight:700;font-size:13px;color:${cat.color};">${cat.label}</div>
                <div style="font-weight:800;font-size:14px;">${fmtMoney(amt)}</div>
              </div>
              <div style="background:#eef1f7;border-radius:6px;height:8px;overflow:hidden;">
                <div style="background:${cat.color};height:100%;width:${pct}%;transition:width .3s ease;"></div>
              </div>
              <div style="font-size:11px;color:var(--text-soft);margin-top:4px;text-align:right;">${pct}%</div>
            </div>`;
          }).join('')}
        </div>
      </div>
    `;
  } else {
    $('#expCatBreakdown').innerHTML = '';
  }

  // Table
  if (!list.length) {
    $('#expBody').innerHTML = `<tr><td colspan="6"><div class="empty" style="padding:40px;"><div class="emoji">💸</div><h4>No expenses found</h4><p>Try changing date range or add new expense.</p></div></td></tr>`;
    return;
  }

  $('#expBody').innerHTML = list.map(e => {
    const cat = getExpCategory(e.category);
    return `<tr>
      <td>${escapeHtml(e.date || (e.createdAt||'').slice(0,10))}</td>
      <td><span style="background:${cat.color}20;color:${cat.color};padding:4px 10px;border-radius:12px;font-size:12px;font-weight:700;">${cat.label}</span></td>
      <td><b>${escapeHtml(e.title)}</b></td>
      <td style="color:var(--text-soft);font-size:13px;">${escapeHtml(e.note||'-')}</td>
      <td style="text-align:right;"><b style="color:#dc2626;">${fmtMoney(e.amount)}</b></td>
      <td>
        <button class="btn btn-secondary btn-sm" data-act="edit" data-id="${e.id}">✏️</button>
        <button class="btn btn-danger btn-sm" data-act="del" data-id="${e.id}">🗑️</button>
      </td>
    </tr>`;
  }).join('') + `
    <tr style="background:#fef2f2;font-weight:800;font-size:15px;">
      <td colspan="4" style="text-align:right;padding:12px;">GRAND TOTAL:</td>
      <td style="text-align:right;color:#dc2626;padding:12px;">${fmtMoney(total)}</td>
      <td></td>
    </tr>
  `;

  $$('#expBody [data-act]').forEach(b => b.onclick = () => {
    const id = b.dataset.id;
    if (b.dataset.act === 'edit') openExpenseForm(DB.get('expenses', id));
    else confirmDialog('Delete this expense?', () => { DB.remove('expenses', id); renderExpBody(); });
  });
}

function openExpenseForm(existing) {
  const e = existing || { title:'', amount:0, note:'', date: isoDay(), category: 'other' };
  openModal(`
    <h3>${existing?'✏️ Edit':'+ Add'} Expense</h3>
    <div class="form-row">
      <div class="field"><label>Title *</label><input id="eTitle" value="${escapeHtml(e.title)}" placeholder="e.g. June Rent, Detergent for Friday"/></div>
      <div class="field"><label>Amount (Rs.) *</label><input type="number" id="eAmount" value="${e.amount}" style="font-weight:700;font-size:16px;"/></div>
    </div>
    <div class="form-row">
      <div class="field">
        <label>📂 Category *</label>
        <select id="eCat" style="font-weight:600;">
          ${EXPENSE_CATEGORIES.map(c => `<option value="${c.id}" ${(e.category||'other')===c.id?'selected':''}>${c.label}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label>Date *</label><input type="date" id="eDate2" value="${e.date}"/></div>
    </div>
    <div class="form-row cols-1">
      <div class="field"><label>Note (optional)</label><input id="eNote" value="${escapeHtml(e.note||'')}" placeholder="Any details..."/></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="saveBtn">💾 Save Expense</button>
    </div>
  `, { onOpen(m){
    $('#saveBtn', m).onclick = () => {
      const title = $('#eTitle', m).value.trim();
      const amount = +$('#eAmount', m).value;
      if (!title || amount <= 0) { toast('Enter title & amount','error'); return; }
      const data = {
        title, amount,
        note: $('#eNote', m).value,
        date: $('#eDate2', m).value,
        category: $('#eCat', m).value,
        branchId: (typeof getActiveBranchId === 'function') ? getActiveBranchId() : 'main'
      };
      if (existing) DB.update('expenses', existing.id, data);
      else DB.insert('expenses', data);
      if (typeof logAction === 'function') logAction(existing?'expense.edit':'expense.add', `${title} (${data.category}) Rs.${amount}`);
      toast(existing ? '✅ Updated' : '✅ Expense added', 'success');
      closeModal(); renderExpBody();
    };
  }});
}

/* ===================== EXPORTS ===================== */
function exportExpensesCSV() {
  const list = filteredExpenses();
  const total = list.reduce((s,e)=>s+(e.amount||0),0);
  const rows = [['Date','Category','Title','Note','Amount']];
  list.forEach(e => {
    const cat = getExpCategory(e.category);
    rows.push([
      e.date || (e.createdAt||'').slice(0,10),
      cat.label.replace(/[^\w\s\/]/g,'').trim(),
      e.title, e.note || '', e.amount
    ]);
  });
  rows.push(['', '', '', 'TOTAL', total]);
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const fname = `expenses_${expFilter.dateFrom}_to_${expFilter.dateTo}.csv`;
  downloadFile(fname, csv, 'text/csv');
  toast('✅ CSV exported','success');
}

async function exportExpensesPDF() {
  const list = filteredExpenses();
  if (!list.length) { toast('No expenses to export', 'warning'); return; }
  const total = list.reduce((s,e)=>s+(e.amount||0),0);
  const s = DB.settings();

  // Category breakdown
  const catTotals = {};
  list.forEach(e => {
    const cid = e.category || 'other';
    catTotals[cid] = (catTotals[cid] || 0) + (e.amount || 0);
  });
  const catRows = Object.entries(catTotals).sort((a,b)=>b[1]-a[1])
    .map(([cid, amt]) => {
      const cat = getExpCategory(cid);
      const pct = total > 0 ? (amt/total*100).toFixed(1) : 0;
      return `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;">${cat.label}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;">${fmtMoney(amt)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;color:#666;">${pct}%</td>
      </tr>`;
    }).join('');

  // Detail rows
  const detailRows = list.map(e => {
    const cat = getExpCategory(e.category);
    return `<tr>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:11px;">${e.date || (e.createdAt||'').slice(0,10)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:11px;">${cat.label}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:11px;"><b>${escapeHtml(e.title)}</b></td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:11px;color:#666;">${escapeHtml(e.note||'-')}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:11px;text-align:right;">${fmtMoney(e.amount)}</td>
    </tr>`;
  }).join('');

  const logoHtml = s.logoImage
    ? `<img src="${s.logoImage}" style="max-width:80px;max-height:80px;object-fit:contain;background:#000;padding:6px;border-radius:8px;" alt="logo"/>`
    : `<div style="font-size:50px;">${s.logo||'🧺'}</div>`;

  const html = `
    <!DOCTYPE html>
    <html><head>
      <meta charset="utf-8">
      <title>Expense Report — ${escapeHtml(s.shopName||'Laundry POS')}</title>
      <style>
        body { font-family: Arial, sans-serif; color: #000; padding: 20px; margin: 0; }
        h1 { margin: 8px 0; font-size: 22px; }
        h2 { font-size: 14px; margin: 16px 0 8px; color: #4f7cff; border-bottom: 2px solid #4f7cff; padding-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
        th { background: #4f7cff; color: #fff; padding: 8px; font-size: 11px; text-align: left; }
        th:last-child { text-align: right; }
        .header { display: flex; align-items: center; gap: 14px; border-bottom: 3px solid #4f7cff; padding-bottom: 14px; margin-bottom: 16px; }
        .totals { background: #fef2f2; border: 2px solid #ef4444; padding: 14px; border-radius: 8px; margin: 14px 0; }
        .totals .row { display: flex; justify-content: space-between; font-size: 16px; font-weight: 700; }
        .totals .grand { font-size: 22px; font-weight: 900; color: #dc2626; }
        .footer { text-align: center; font-size: 10px; color: #666; margin-top: 30px; border-top: 1px dashed #ccc; padding-top: 10px; }
        @media print { body { padding: 10px; } }
      </style>
    </head><body>
      <div class="header">
        ${logoHtml}
        <div style="flex:1;">
          <h1>${escapeHtml(s.shopName||'Laundry POS')}</h1>
          <div style="font-size:12px;color:#666;">${escapeHtml(s.address||'')}</div>
          <div style="font-size:12px;color:#666;">${escapeHtml(s.phone||'')}</div>
        </div>
        <div style="text-align:right;font-size:11px;color:#666;">
          <div><b>Generated:</b> ${new Date().toLocaleString()}</div>
          <div><b>Period:</b> ${expFilter.dateFrom} to ${expFilter.dateTo}</div>
          <div><b>By:</b> ${escapeHtml(DB.currentUser()?.name||'Admin')}</div>
        </div>
      </div>

      <h1 style="text-align:center;margin:20px 0;">💸 EXPENSE REPORT</h1>

      <div class="totals">
        <div class="row"><span>Total Entries:</span><span>${list.length}</span></div>
        <div class="row"><span>Categories Used:</span><span>${Object.keys(catTotals).length}</span></div>
        <div class="row grand" style="margin-top:8px;padding-top:8px;border-top:1px dashed #ef4444;"><span>GRAND TOTAL:</span><span>${fmtMoney(total)}</span></div>
      </div>

      <h2>📂 Breakdown by Category</h2>
      <table>
        <thead><tr><th>Category</th><th>Amount</th><th>% of Total</th></tr></thead>
        <tbody>${catRows}</tbody>
      </table>

      <h2>📋 All Expense Entries (${list.length})</h2>
      <table>
        <thead><tr><th>Date</th><th>Category</th><th>Title</th><th>Note</th><th>Amount</th></tr></thead>
        <tbody>${detailRows}</tbody>
        <tfoot>
          <tr style="background:#fef2f2;font-weight:800;">
            <td colspan="4" style="padding:10px;text-align:right;">GRAND TOTAL:</td>
            <td style="padding:10px;text-align:right;color:#dc2626;">${fmtMoney(total)}</td>
          </tr>
        </tfoot>
      </table>

      <div class="footer">
        ${escapeHtml(s.shopName||'Laundry POS')} — Confidential Financial Report<br>
        Generated by Laundry POS POS • ${new Date().toLocaleString()}
      </div>
    </body></html>
  `;

  // Open in new window for print → save as PDF
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) { toast('Pop-up blocked! Allow pop-ups to export PDF.', 'error'); return; }
  win.document.write(html);
  win.document.close();
  // Wait for image to load before triggering print
  setTimeout(() => {
    win.focus();
    win.print();
  }, 800);
  toast('📄 Print dialog opened — choose "Save as PDF"', 'success');
}

window.EXPENSE_CATEGORIES = EXPENSE_CATEGORIES;
window.getExpCategory = getExpCategory;
