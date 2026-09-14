/* ============================================================
   FACTORY / WHOLESALE (Per-KG) BUSINESS MODULE
   ------------------------------------------------------------
   Complete B2B factory management, separate from retail POS:
     • Per-KG laundry income (clients, weight entries, payments)
     • DELIVERY tracking — kitna kg aaya (received), kitna deliver
       hua, kitna abhi factory mein baqi (in hand)
     • Factory expenses (salary, fuel, chemicals, utilities...)
     • Employees (name + monthly salary)
     • Investments (machines, CCTV, setup...) + recovery tracker
     • Today / Monthly views + Profit & Loss
     • Edit (✏️) on clients, entries, payments, expenses,
       investments, deliveries & employees — galati sudhaar ke liye

   Tables:
     factoryClients    {id,name,phone,address,rate,createdAt}
     factoryEntries    {id,clientId,date,kg,pieces,rate,amount,note,...}   (RECEIVED for wash)
     factoryDeliveries {id,clientId,date,kg,pieces,note,...}               (DELIVERED back)
     factoryPayments   {id,clientId,date,amount,method,note,...}
     factoryEmployees  {id,name,role,salary,phone,active,createdAt}
     factoryExpenses   {id,date,category,amount,note,createdAt}
     factoryInvestments{id,date,name,amount,note,createdAt}
   ============================================================ */

function factoryRate() { return +DB.settings().factoryRatePerKg || 200; }
const F_EXP_CATS = ['Salary','Fuel','Chemicals','Utilities','Maintenance','Rent','Other'];

let factoryState = { tab:'dashboard', clientId:'', month:'', range:'month', from:'', to:'' };

/* ---------- helpers ---------- */
function fMonthList() {
  const set = new Set();
  ['factoryEntries','factoryDeliveries','factoryExpenses','factoryPayments','factoryInvestments'].forEach(tbl=>{
    (DB.all(tbl)||[]).forEach(r=>{ const d=String(r.date||r.createdAt||'').slice(0,7); if(d) set.add(d); });
  });
  set.add(new Date().toISOString().slice(0,7));
  return Array.from(set).sort().reverse();
}
function fMonthLbl(ym){ if(!ym)return''; const[y,m]=ym.split('-'); const n=['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return `${n[+m]||m} ${y}`; }
function fInPeriod(dateStr){
  const d = String(dateStr||'').slice(0,10);
  if (!d) return false;
  if (factoryState.range === 'today') return d === isoDay();
  if (factoryState.range === 'all') return true;
  if (factoryState.range === 'custom'){
    const f = factoryState.from || '0000-01-01';
    const t = factoryState.to   || isoDay();
    return d >= f && d <= t;
  }
  return d.slice(0,7) === (factoryState.month || new Date().toISOString().slice(0,7));
}
function fPeriodLbl(){
  if (factoryState.range==='today') return 'Today';
  if (factoryState.range==='all')   return 'All Time';
  if (factoryState.range==='custom')return `${factoryState.from||'…'} → ${factoryState.to||isoDay()}`;
  return fMonthLbl(factoryState.month);
}
/* Latest recorded payment of a client — powers the "After Last Payment" view */
function fLastPayment(cid){
  if(!cid) return null;
  const pays=(DB.all('factoryPayments')||[]).filter(p=>!p._deleted&&p.clientId===cid).sort((a,b)=>String(b.date||b.createdAt).localeCompare(String(a.date||a.createdAt)));
  return pays[0]||null;
}
function fNextDay(d){ const dt=new Date(String(d).slice(0,10)+'T00:00:00'); dt.setDate(dt.getDate()+1); return dt.toISOString().slice(0,10); }
function fR1(n){ return Math.round((+n||0)*10)/10; } // 1-decimal kg rounding

/* Received vs Delivered — all-time per client (for "in factory" balance) */
function fKgTotals(cid) {
  const recv = (DB.all('factoryEntries')||[]).filter(e=>!e._deleted && e.clientId===cid).reduce((s,e)=>s+(+e.kg||0),0);
  const recvPcs = (DB.all('factoryEntries')||[]).filter(e=>!e._deleted && e.clientId===cid).reduce((s,e)=>s+(+e.pieces||0),0);
  const del = (DB.all('factoryDeliveries')||[]).filter(d=>!d._deleted && d.clientId===cid).reduce((s,d)=>s+(+d.kg||0),0);
  const delPcs = (DB.all('factoryDeliveries')||[]).filter(d=>!d._deleted && d.clientId===cid).reduce((s,d)=>s+(+d.pieces||0),0);
  return { recv:fR1(recv), del:fR1(del), pcs:recvPcs, delPcs:delPcs, pending:fR1(Math.max(0, recv-del)) };
}
/* All clients — how much kg is still lying in the factory right now */
function fTotalPendingKg() {
  const recv = (DB.all('factoryEntries')||[]).filter(e=>!e._deleted).reduce((s,e)=>s+(+e.kg||0),0);
  const del = (DB.all('factoryDeliveries')||[]).filter(d=>!d._deleted).reduce((s,d)=>s+(+d.kg||0),0);
  return fR1(Math.max(0, recv-del));
}

/* All-time totals (for investment recovery, which is cumulative) */
function fAllTime() {
  const income = (DB.all('factoryEntries')||[]).filter(e=>!e._deleted).reduce((s,e)=>s+(+e.amount||0),0);
  const expenses = (DB.all('factoryExpenses')||[]).filter(e=>!e._deleted).reduce((s,e)=>s+(+e.amount||0),0);
  const investment = (DB.all('factoryInvestments')||[]).filter(e=>!e._deleted).reduce((s,e)=>s+(+e.amount||0),0);
  const grossProfit = income - expenses;           // profit before counting investment
  const recovered = Math.max(0, Math.min(investment, grossProfit)); // how much investment paid back
  const netPosition = grossProfit - investment;    // + means investment fully recovered & this is real profit
  return { income, expenses, investment, grossProfit, recovered, netPosition, pending: Math.max(0, investment - grossProfit) };
}

/* Period totals (today / this month / all) */
function fPeriod() {
  const income = (DB.all('factoryEntries')||[]).filter(e=>!e._deleted && fInPeriod(e.date||e.createdAt)).reduce((s,e)=>s+(+e.amount||0),0);
  const kg = (DB.all('factoryEntries')||[]).filter(e=>!e._deleted && fInPeriod(e.date||e.createdAt)).reduce((s,e)=>s+(+e.kg||0),0);
  const pcs = (DB.all('factoryEntries')||[]).filter(e=>!e._deleted && fInPeriod(e.date||e.createdAt)).reduce((s,e)=>s+(+e.pieces||0),0);
  const delKg = (DB.all('factoryDeliveries')||[]).filter(d=>!d._deleted && fInPeriod(d.date||d.createdAt)).reduce((s,d)=>s+(+d.kg||0),0);
  const expenses = (DB.all('factoryExpenses')||[]).filter(e=>!e._deleted && fInPeriod(e.date||e.createdAt)).reduce((s,e)=>s+(+e.amount||0),0);
  const invest = (DB.all('factoryInvestments')||[]).filter(e=>!e._deleted && fInPeriod(e.date||e.createdAt)).reduce((s,e)=>s+(+e.amount||0),0);
  const paymentsIn = (DB.all('factoryPayments')||[]).filter(e=>!e._deleted && fInPeriod(e.date||e.createdAt)).reduce((s,e)=>s+(+e.amount||0),0);
  return { income, kg, pcs, delKg:fR1(delKg), expenses, invest, paymentsIn, profit: income - expenses };
}

/* ================= MAIN RENDER ================= */
function renderFactory() {
  if (factoryState.month === '') factoryState.month = new Date().toISOString().slice(0,7);
  const clients = DB.all('factoryClients')||[];
  if (!factoryState.clientId && clients.length) factoryState.clientId = clients[0].id;

  const tabs = [
    ['dashboard','📊 Dashboard'],
    ['entries','⚖️ Weight & Billing'],
    ['expenses','💸 Expenses'],
    ['investment','🏗️ Investment'],
    ['employees','👷 Employees'],
  ];
  const tabBar = `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;">
    ${tabs.map(([id,lbl])=>`<button class="btn ${factoryState.tab===id?'btn-primary':'btn-secondary'} btn-sm" data-ftab="${id}">${lbl}</button>`).join('')}
  </div>`;

  const content = `
    <h1 class="page-title">🏭 Factory (Per-KG Business)</h1>
    <p class="page-sub">Wholesale laundry billing, deliveries, expenses, investment & profit — separate from retail.</p>
    ${tabBar}
    <div id="factoryTabBody"></div>
  `;
  $('#app').innerHTML = renderLayout('factory', content);
  bindLayout();
  $$('[data-ftab]').forEach(b=> b.onclick = ()=>{ factoryState.tab=b.dataset.ftab; renderFactory(); });
  renderFactoryTab();
}

function renderFactoryTab() {
  const el = $('#factoryTabBody');
  if (!el) return;
  if (factoryState.tab==='dashboard') return el.innerHTML = fTabDashboard(), fBindDashboard();
  if (factoryState.tab==='entries')   return el.innerHTML = fTabEntries(), fBindEntries();
  if (factoryState.tab==='expenses')  return el.innerHTML = fTabExpenses(), fBindExpenses();
  if (factoryState.tab==='investment')return el.innerHTML = fTabInvestment(), fBindInvestment();
  if (factoryState.tab==='employees') return el.innerHTML = fTabEmployees(), fBindEmployees();
}

/* period selector (Today / Month / All) shared UI */
function fPeriodBar() {
  const months = fMonthList();
  return `<div class="card" style="padding:12px;margin-bottom:14px;">
    <div class="filter-bar" style="gap:8px;flex-wrap:wrap;align-items:center;">
      <div style="display:flex;gap:6px;background:var(--surface-alt);border-radius:10px;padding:4px;">
        <button class="btn ${factoryState.range==='today'?'btn-primary':'btn-ghost'} btn-sm" data-frange="today">Today</button>
        <button class="btn ${factoryState.range==='month'?'btn-primary':'btn-ghost'} btn-sm" data-frange="month">This Month</button>
        <button class="btn ${factoryState.range==='all'?'btn-primary':'btn-ghost'} btn-sm" data-frange="all">All Time</button>
        <button class="btn ${factoryState.range==='custom'?'btn-primary':'btn-ghost'} btn-sm" data-frange="custom" title="Custom date range">📅 Custom</button>
      </div>
      ${factoryState.range==='month'?`<select id="fMonthSel" style="font-weight:700;">${months.map(m=>`<option value="${m}" ${factoryState.month===m?'selected':''}>${fMonthLbl(m)}</option>`).join('')}</select>`:''}
      ${factoryState.range==='custom'?`<span style="font-weight:700;">From</span><input type="date" id="fFrom" value="${factoryState.from||''}"/><span style="font-weight:700;">To</span><input type="date" id="fTo" value="${factoryState.to||isoDay()}"/>`:''}
    </div>
  </div>`;
}
function fBindPeriod() {
  $$('[data-frange]').forEach(b=> b.onclick = ()=>{ factoryState.range=b.dataset.frange; renderFactoryTab(); });
  const ms = $('#fMonthSel'); if (ms) ms.onchange = e=>{ factoryState.month=e.target.value; renderFactoryTab(); };
  const ff = $('#fFrom'); if (ff) ff.onchange = e=>{ factoryState.from=e.target.value; factoryState.range='custom'; renderFactoryTab(); };
  const ft = $('#fTo');   if (ft) ft.onchange = e=>{ factoryState.to=e.target.value; factoryState.range='custom'; renderFactoryTab(); };
}

/* ================= TAB: DASHBOARD ================= */
function fTabDashboard() {
  const p = fPeriod();
  const a = fAllTime();
  const inFactory = fTotalPendingKg();
  const periodLbl = fPeriodLbl();
  const profitColor = p.profit>=0 ? 'var(--success)' : 'var(--danger)';
  const recoverPct = a.investment>0 ? Math.min(100, Math.round(a.recovered/a.investment*100)) : 100;

  return `
    ${fPeriodBar()}

    <div class="grid-stats" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-bottom:14px;">
      <div class="stat-card"><div class="ic b1">⚖️</div><div><div class="lbl">Received (${periodLbl})</div><div class="val">${p.kg} kg</div></div></div>
      <div class="stat-card"><div class="ic b2">📦</div><div><div class="lbl">Delivered (${periodLbl})</div><div class="val">${p.delKg} kg</div></div></div>
      <div class="stat-card"><div class="ic b4">⏳</div><div><div class="lbl">In Factory Right Now</div><div class="val" style="color:${inFactory>0?'var(--warning)':'var(--success)'};">${inFactory} kg</div></div></div>
      <div class="stat-card"><div class="ic b3">💰</div><div><div class="lbl">Income (${periodLbl})</div><div class="val">${fmtMoney(p.income)}</div></div></div>
      <div class="stat-card"><div class="ic b4">💸</div><div><div class="lbl">Expenses (${periodLbl})</div><div class="val" style="color:var(--danger);">${fmtMoney(p.expenses)}</div></div></div>
      <div class="stat-card"><div class="ic b2">📈</div><div><div class="lbl">Profit / Loss (${periodLbl})</div><div class="val" style="color:${profitColor};">${fmtMoney(p.profit)}</div></div></div>
    </div>

    <!-- Profit & Loss box -->
    <div class="card" style="padding:18px;margin-bottom:14px;">
      <div style="font-weight:800;font-size:16px;margin-bottom:12px;">📊 Profit & Loss — ${periodLbl}</div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
        <span>Income (laundry billed)</span><b style="color:var(--success);">${fmtMoney(p.income)}</b></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
        <span>− Expenses (salary, fuel, chemicals...)</span><b style="color:var(--danger);">− ${fmtMoney(p.expenses)}</b></div>
      <div style="display:flex;justify-content:space-between;padding:12px 0;font-size:20px;font-weight:900;">
        <span>= NET ${p.profit>=0?'PROFIT ✅':'LOSS ⚠️'}</span><b style="color:${profitColor};">${fmtMoney(p.profit)}</b></div>
    </div>

    <!-- Investment Recovery -->
    <div class="layout" style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
      <div class="card" style="padding:18px;">
        <div style="font-weight:800;font-size:16px;margin-bottom:12px;">🏗️ Investment Recovery</div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;"><span>Total Investment</span><b>${fmtMoney(a.investment)}</b></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;color:var(--success);"><span>Recovered so far</span><b>${fmtMoney(a.recovered)}</b></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;color:var(--danger);"><span>Still to recover</span><b>${fmtMoney(a.pending)}</b></div>
        <div style="background:var(--surface-alt);border-radius:999px;height:22px;overflow:hidden;margin-top:10px;position:relative;">
          <div style="width:${recoverPct}%;height:100%;background:linear-gradient(90deg,#22c55e,#16a34a);transition:.3s;"></div>
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;color:#083;">${recoverPct}% recovered</div>
        </div>
        ${a.pending===0 && a.investment>0 ? '<div style="margin-top:10px;color:var(--success);font-weight:800;text-align:center;">🎉 Investment fully recovered!</div>':''}
      </div>

      <div class="card" style="padding:18px;">
        <div style="font-weight:800;font-size:16px;margin-bottom:12px;">💎 True Profit (after investment)</div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;"><span>All-time Income</span><b>${fmtMoney(a.income)}</b></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;"><span>− All-time Expenses</span><b>− ${fmtMoney(a.expenses)}</b></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;"><span>− Total Investment</span><b>− ${fmtMoney(a.investment)}</b></div>
        <div style="display:flex;justify-content:space-between;padding:12px 0;border-top:2px solid var(--border);font-size:20px;font-weight:900;">
          <span>${a.netPosition>=0?'Net Profit 🟢':'Still Recovering 🟡'}</span>
          <b style="color:${a.netPosition>=0?'var(--success)':'var(--warning)'};">${fmtMoney(a.netPosition)}</b></div>
        <div style="font-size:12px;color:var(--text-soft);">${a.netPosition>=0?'Investment wapas aa gayi — yeh aap ka asli munafa hai.':'Abhi investment recover ho rahi hai. Is amount ke baad pure profit shuru.'}</div>
      </div>
    </div>
  `;
}
function fBindDashboard() { fBindPeriod(); }

/* ================= TAB: WEIGHT ENTRIES & BILLING ================= */
function fTabEntries() {
  const clients = DB.all('factoryClients')||[];
  if (!factoryState.clientId && clients.length) factoryState.clientId = clients[0].id;
  const cid = factoryState.clientId;
  const client = DB.get('factoryClients', cid);
  const months = fMonthList();

  const inScope = (r)=> fInPeriod(r.date||r.createdAt);
  const entries = (DB.all('factoryEntries')||[]).filter(e=>!e._deleted && e.clientId===cid && inScope(e)).sort((a,b)=>String(b.date||b.createdAt).localeCompare(String(a.date||a.createdAt)));
  const pays = (DB.all('factoryPayments')||[]).filter(p=>!p._deleted && p.clientId===cid && inScope(p)).sort((a,b)=>String(b.date||b.createdAt).localeCompare(String(a.date||a.createdAt)));
  const dels = (DB.all('factoryDeliveries')||[]).filter(d=>!d._deleted && d.clientId===cid && inScope(d)).sort((a,b)=>String(b.date||b.createdAt).localeCompare(String(a.date||a.createdAt)));
  // client-wide totals (all time, for due + kg balance)
  const allEntries = (DB.all('factoryEntries')||[]).filter(e=>!e._deleted && e.clientId===cid);
  const allPays = (DB.all('factoryPayments')||[]).filter(p=>!p._deleted && p.clientId===cid);
  const totalBill = allEntries.reduce((s,e)=>s+(+e.amount||0),0);
  const totalPaid = allPays.reduce((s,p)=>s+(+p.amount||0),0);
  const kgt = fKgTotals(cid);
  const kg = fR1(entries.reduce((s,e)=>s+(+e.kg||0),0)), pcs = entries.reduce((s,e)=>s+(+e.pieces||0),0), amt = entries.reduce((s,e)=>s+(+e.amount||0),0);
  const delKgPeriod = fR1(dels.reduce((s,d)=>s+(+d.kg||0),0));

  return `
    <div class="card" style="padding:12px;margin-bottom:14px;">
      <div class="filter-bar" style="gap:10px;flex-wrap:wrap;align-items:center;">
        <label style="display:flex;align-items:center;gap:6px;font-weight:700;">Client:
          <select id="fClient" style="min-width:200px;">
            ${clients.length?clients.map(c=>`<option value="${c.id}" ${cid===c.id?'selected':''}>🏭 ${escapeHtml(c.name)}</option>`).join(''):'<option value="">— none —</option>'}
          </select></label>
        <button class="btn btn-secondary btn-sm" id="fEditClient" ${cid?'':'disabled'} title="Client ka naam / phone / rate theek karein">✏️ Edit Client</button>
        <button class="btn btn-secondary btn-sm" id="fAddClient">+ New Client</button>
        <div style="display:flex;gap:6px;background:var(--surface-alt);border-radius:10px;padding:4px;">
          <button class="btn ${factoryState.range==='today'?'btn-primary':'btn-ghost'} btn-sm" data-frange="today">Today</button>
          <button class="btn ${factoryState.range==='month'?'btn-primary':'btn-ghost'} btn-sm" data-frange="month">Month</button>
          <button class="btn ${factoryState.range==='all'?'btn-primary':'btn-ghost'} btn-sm" data-frange="all">All</button>
          <button class="btn ${factoryState.range==='custom'?'btn-primary':'btn-ghost'} btn-sm" data-frange="custom" title="Custom date range">📅</button>
        </div>
        ${factoryState.range==='month'?`<select id="fMonthSel">${months.map(m=>`<option value="${m}" ${factoryState.month===m?'selected':''}>${fMonthLbl(m)}</option>`).join('')}</select>`:''}
        ${factoryState.range==='custom'?`<span style="font-size:12px;font-weight:700;">From</span><input type="date" id="fFrom" value="${factoryState.from||''}"/><span style="font-size:12px;font-weight:700;">To</span><input type="date" id="fTo" value="${factoryState.to||isoDay()}"/>`:''}
        <button class="btn btn-primary" id="fAddEntry" style="margin-left:auto;">➕ Add Weight</button>
        <button class="btn btn-warning" id="fDeliver" ${cid?'':'disabled'} title="Delivered wazan record karein">📦 Deliver</button>
        <button class="btn btn-success" id="fAddPay">💰 Payment</button>
        <button class="btn btn-secondary btn-sm" id="fPrint">🖨️ Statement</button>
        <button class="btn btn-secondary btn-sm" id="fPrintDC" title="Client ko dene wali delivery challan/invoice">🧾 Delivery Challan</button>
        <button class="btn btn-secondary btn-sm" id="fSincePay" title="Aakhri payment ke aglay din se aaj tak ka record">🕒 After Last Payment</button>
        <button class="btn btn-secondary btn-sm" id="fShare" title="Delivery summary WhatsApp par bhejein">📲 Share</button>
        <button class="btn btn-secondary btn-sm" id="fCustom" title="Custom KG/rate wali invoice banayein">🧮 Custom Invoice</button>
      </div>
    </div>

    ${!cid ? '<div class="card" style="text-align:center;padding:30px;color:var(--text-soft);">Add a factory client to begin.</div>' : `
    <div class="grid-stats" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin-bottom:14px;">
      <div class="stat-card"><div class="ic b1">⚖️</div><div><div class="lbl">Received (period)</div><div class="val">${kg} kg</div></div></div>
      <div class="stat-card"><div class="ic b2">📦</div><div><div class="lbl">Delivered (period)</div><div class="val">${delKgPeriod} kg</div></div></div>
      <div class="stat-card"><div class="ic b4">⏳</div><div><div class="lbl">In Factory (all time)</div><div class="val" style="color:${kgt.pending>0?'var(--warning)':'var(--success)'};">${kgt.pending} kg</div></div></div>
      <div class="stat-card"><div class="ic b2">👕</div><div><div class="lbl">Pieces</div><div class="val">${pcs}</div></div></div>
      <div class="stat-card"><div class="ic b3">💰</div><div><div class="lbl">Bill (period)</div><div class="val">${fmtMoney(amt)}</div></div></div>
      <div class="stat-card"><div class="ic b4">⏰</div><div><div class="lbl">Total Due (all time)</div><div class="val" style="color:var(--danger);">${fmtMoney(totalBill-totalPaid)}</div></div></div>
    </div>

    <div class="card" style="padding:12px 14px;margin-bottom:14px;background:var(--surface-alt);">
      <b>📊 ${escapeHtml(client?client.name:'')} — All-time KG:</b>&nbsp;
      Received <b>${kgt.recv} kg</b> &nbsp;•&nbsp; Delivered <b style="color:var(--success);">${kgt.del} kg</b> &nbsp;•&nbsp;
      ${kgt.pending>0 ? `<b style="color:var(--warning);">⏳ ${kgt.pending} kg abhi factory mein hai</b>` : '<b style="color:var(--success);">✅ Sab delivery ho chuki</b>'}
    </div>

    <div class="card" style="padding:0;overflow:hidden;margin-bottom:14px;">
      <div style="padding:10px 14px;font-weight:800;background:var(--surface-alt);">📋 Weight Entries (Received for Wash)</div>
      <table class="tbl"><thead><tr><th>Date</th><th>KG</th><th>Pieces</th><th>Rate</th><th>Amount</th><th>Note</th><th></th></tr></thead>
      <tbody>${entries.length?entries.map(e=>`<tr>
        <td>${escapeHtml(String(e.date||'').slice(0,10))}</td><td><b>${+e.kg||0} kg</b></td><td>${+e.pieces||0}</td>
        <td>${fmtMoney(+e.rate||0)}</td><td><b style="color:var(--primary);">${fmtMoney(+e.amount||0)}</b></td>
        <td style="font-size:12px;color:var(--text-soft);">${escapeHtml(e.note||'')}</td>
        <td style="white-space:nowrap;"><button class="btn btn-ghost btn-sm" data-edit-e="${e.id}" title="Edit">✏️</button> <button class="btn btn-danger btn-sm" data-del-e="${e.id}">🗑️</button></td></tr>`).join(''):'<tr><td colspan="7"><div class="empty" style="padding:20px;"><div class="emoji">⚖️</div><h4>No entries</h4></div></td></tr>'}</tbody></table>
    </div>

    <div class="card" style="padding:0;overflow:hidden;margin-bottom:14px;">
      <div style="padding:10px 14px;font-weight:800;background:var(--surface-alt);">📦 Deliveries (Client Ko Wapas Dia)</div>
      <table class="tbl"><thead><tr><th>Date</th><th>KG</th><th>Pieces</th><th>Note</th><th></th></tr></thead>
      <tbody>${dels.length?dels.map(d=>`<tr>
        <td>${escapeHtml(String(d.date||'').slice(0,10))}</td><td><b style="color:var(--success);">${fR1(d.kg)} kg</b></td><td>${+d.pieces||0}</td>
        <td style="font-size:12px;color:var(--text-soft);">${escapeHtml(d.note||'')}</td>
        <td style="white-space:nowrap;"><button class="btn btn-ghost btn-sm" data-edit-d="${d.id}" title="Edit">✏️</button> <button class="btn btn-ghost btn-sm" data-print-d="${d.id}" title="Is delivery ki challan">🖨️</button> <button class="btn btn-danger btn-sm" data-del-d="${d.id}">🗑️</button></td></tr>`).join(''):'<tr><td colspan="5"><div class="empty" style="padding:16px;"><div class="emoji">📦</div><h4>No deliveries yet — use the 📦 Deliver button</h4></div></td></tr>'}</tbody></table>
    </div>

    <div class="card" style="padding:0;overflow:hidden;">
      <div style="padding:10px 14px;font-weight:800;background:var(--surface-alt);">💵 Payments</div>
      <table class="tbl"><thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Note</th><th></th></tr></thead>
      <tbody>${pays.length?pays.map(p=>`<tr><td>${escapeHtml(String(p.date||'').slice(0,10))}</td><td><b style="color:var(--success);">${fmtMoney(+p.amount||0)}</b></td><td>${escapeHtml(p.method||'cash')}</td><td style="font-size:12px;color:var(--text-soft);">${escapeHtml(p.note||'')}</td><td style="white-space:nowrap;"><button class="btn btn-ghost btn-sm" data-edit-p="${p.id}" title="Edit">✏️</button> <button class="btn btn-danger btn-sm" data-del-p="${p.id}">🗑️</button></td></tr>`).join(''):'<tr><td colspan="5"><div class="empty" style="padding:16px;"><div class="emoji">💵</div><h4>No payments</h4></div></td></tr>'}</tbody></table>
    </div>`}
  `;
}
function fBindEntries() {
  fBindPeriod();
  const cs=$('#fClient'); if(cs) cs.onchange = e=>{ factoryState.clientId=e.target.value; renderFactoryTab(); };
  const ac=$('#fAddClient'); if(ac) ac.onclick=()=>openFactoryClientForm();
  const ec=$('#fEditClient'); if(ec) ec.onclick=()=>{ const c=DB.get('factoryClients',factoryState.clientId); if(c) openFactoryClientForm(c); };
  const ae=$('#fAddEntry'); if(ae) ae.onclick=()=>{ if(!factoryState.clientId){toast('Add a client first','error');return;} openFactoryEntryForm(); };
  const dv=$('#fDeliver'); if(dv) dv.onclick=()=>{ if(!factoryState.clientId){toast('Add a client first','error');return;} openFactoryDeliveryForm(); };
  const ap=$('#fAddPay'); if(ap) ap.onclick=()=>{ if(!factoryState.clientId){toast('Add a client first','error');return;} openFactoryPaymentForm(); };
  const pr=$('#fPrint'); if(pr) pr.onclick=()=>printFactoryStatement();
  const pdc=$('#fPrintDC'); if(pdc) pdc.onclick=()=>printFactoryDeliveryChallan();
  const sh=$('#fShare'); if(sh) sh.onclick=()=>shareFactoryDeliverySummary();
  const cu=$('#fCustom'); if(cu) cu.onclick=()=>openFactoryCustomInvoice();
  const sp=$('#fSincePay'); if(sp) sp.onclick=()=>{
    if(!factoryState.clientId){toast('Add a client first','error');return;}
    const lp=fLastPayment(factoryState.clientId);
    if(!lp){ toast('Is client ki koi payment record nahi mili — pehle 💰 Payment se record karein','error'); return; }
    const lpDay=String(lp.date||lp.createdAt).slice(0,10);
    factoryState.range='custom'; factoryState.from=fNextDay(lpDay); factoryState.to=isoDay();
    renderFactoryTab();
    toast(`📄 ${fmtMoney(+lp.amount||0)} payment (${lpDay}) ke baad ka record dikhaya ja raha hai`,'success');
  };
  $$('[data-print-d]').forEach(b=>b.onclick=()=>printFactoryDeliveryChallan(b.dataset.printD));
  $$('[data-edit-e]').forEach(b=>b.onclick=()=>openFactoryEntryForm(DB.get('factoryEntries',b.dataset.editE)));
  $$('[data-del-e]').forEach(b=>b.onclick=()=>confirmDialog('Delete this entry?',()=>{DB.remove('factoryEntries',b.dataset.delE);toast('Deleted','success');renderFactoryTab();}));
  $$('[data-edit-d]').forEach(b=>b.onclick=()=>openFactoryDeliveryForm(DB.get('factoryDeliveries',b.dataset.editD)));
  $$('[data-del-d]').forEach(b=>b.onclick=()=>confirmDialog('Delete this delivery?',()=>{DB.remove('factoryDeliveries',b.dataset.delD);toast('Deleted','success');renderFactoryTab();}));
  $$('[data-edit-p]').forEach(b=>b.onclick=()=>openFactoryPaymentForm(DB.get('factoryPayments',b.dataset.editP)));
  $$('[data-del-p]').forEach(b=>b.onclick=()=>confirmDialog('Delete this payment?',()=>{DB.remove('factoryPayments',b.dataset.delP);toast('Deleted','success');renderFactoryTab();}));
}

/* ================= TAB: EXPENSES ================= */
function fTabExpenses() {
  const inScope=(r)=> fInPeriod(r.date||r.createdAt);
  const list=(DB.all('factoryExpenses')||[]).filter(e=>!e._deleted && inScope(e)).sort((a,b)=>String(b.date||b.createdAt).localeCompare(String(a.date||a.createdAt)));
  const total=list.reduce((s,e)=>s+(+e.amount||0),0);
  const byCat={}; list.forEach(e=>{byCat[e.category]=(byCat[e.category]||0)+(+e.amount||0);});
  return `
    ${fPeriodBar()}
    <div class="card" style="padding:14px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
      <div><div class="lbl" style="color:var(--text-soft);font-size:12px;">TOTAL EXPENSES</div><div style="font-size:26px;font-weight:900;color:var(--danger);">${fmtMoney(total)}</div></div>
      <button class="btn btn-primary" id="fAddExp">➕ Add Expense</button>
    </div>
    ${Object.keys(byCat).length?`<div class="card" style="padding:14px;margin-bottom:14px;"><div style="font-weight:700;margin-bottom:8px;">By Category</div>${Object.entries(byCat).map(([c,v])=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);"><span>${escapeHtml(c)}</span><b>${fmtMoney(v)}</b></div>`).join('')}</div>`:''}
    <div class="card" style="padding:0;overflow:hidden;">
      <table class="tbl"><thead><tr><th>Date</th><th>Category</th><th>Amount</th><th>Note</th><th></th></tr></thead>
      <tbody>${list.length?list.map(e=>`<tr><td>${escapeHtml(String(e.date||'').slice(0,10))}</td><td>${escapeHtml(e.category||'Other')}</td><td><b style="color:var(--danger);">${fmtMoney(+e.amount||0)}</b></td><td style="font-size:12px;color:var(--text-soft);">${escapeHtml(e.note||'')}</td><td style="white-space:nowrap;"><button class="btn btn-ghost btn-sm" data-edit-x="${e.id}" title="Edit">✏️</button> <button class="btn btn-danger btn-sm" data-del-x="${e.id}">🗑️</button></td></tr>`).join(''):'<tr><td colspan="5"><div class="empty" style="padding:20px;"><div class="emoji">💸</div><h4>No expenses</h4></div></td></tr>'}</tbody></table>
    </div>`;
}
function fBindExpenses() {
  fBindPeriod();
  const a=$('#fAddExp'); if(a) a.onclick=()=>openFactoryExpenseForm();
  $$('[data-edit-x]').forEach(b=>b.onclick=()=>openFactoryExpenseForm(DB.get('factoryExpenses',b.dataset.editX)));
  $$('[data-del-x]').forEach(b=>b.onclick=()=>confirmDialog('Delete this expense?',()=>{DB.remove('factoryExpenses',b.dataset.delX);toast('Deleted','success');renderFactoryTab();}));
}

/* ================= TAB: INVESTMENT ================= */
function fTabInvestment() {
  const list=(DB.all('factoryInvestments')||[]).filter(e=>!e._deleted).sort((a,b)=>String(b.date||b.createdAt).localeCompare(String(a.date||a.createdAt)));
  const a=fAllTime();
  const recoverPct = a.investment>0?Math.min(100,Math.round(a.recovered/a.investment*100)):0;
  return `
    <div class="card" style="padding:18px;margin-bottom:14px;">
      <div style="font-weight:800;font-size:16px;margin-bottom:10px;">🏗️ Investment Recovery</div>
      <div style="display:flex;justify-content:space-between;padding:5px 0;"><span>Total Invested</span><b>${fmtMoney(a.investment)}</b></div>
      <div style="display:flex;justify-content:space-between;padding:5px 0;color:var(--success);"><span>Recovered (from profit)</span><b>${fmtMoney(a.recovered)}</b></div>
      <div style="display:flex;justify-content:space-between;padding:5px 0;color:var(--danger);"><span>Still to recover</span><b>${fmtMoney(a.pending)}</b></div>
      <div style="background:var(--surface-alt);border-radius:999px;height:24px;overflow:hidden;margin-top:10px;position:relative;">
        <div style="width:${recoverPct}%;height:100%;background:linear-gradient(90deg,#22c55e,#16a34a);"></div>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;">${recoverPct}% recovered</div>
      </div>
    </div>
    <div class="card" style="padding:14px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
      <div style="font-weight:700;">All investments (machines, CCTV, setup...)</div>
      <button class="btn btn-primary" id="fAddInv">➕ Add Investment</button>
    </div>
    <div class="card" style="padding:0;overflow:hidden;">
      <table class="tbl"><thead><tr><th>Date</th><th>Item</th><th>Amount</th><th>Note</th><th></th></tr></thead>
      <tbody>${list.length?list.map(e=>`<tr><td>${escapeHtml(String(e.date||'').slice(0,10))}</td><td><b>${escapeHtml(e.name||'')}</b></td><td><b>${fmtMoney(+e.amount||0)}</b></td><td style="font-size:12px;color:var(--text-soft);">${escapeHtml(e.note||'')}</td><td style="white-space:nowrap;"><button class="btn btn-ghost btn-sm" data-edit-i="${e.id}" title="Edit">✏️</button> <button class="btn btn-danger btn-sm" data-del-i="${e.id}">🗑️</button></td></tr>`).join(''):'<tr><td colspan="5"><div class="empty" style="padding:20px;"><div class="emoji">🏗️</div><h4>No investments yet</h4></div></td></tr>'}</tbody></table>
    </div>`;
}
function fBindInvestment() {
  const a=$('#fAddInv'); if(a) a.onclick=()=>openFactoryInvestmentForm();
  $$('[data-edit-i]').forEach(b=>b.onclick=()=>openFactoryInvestmentForm(DB.get('factoryInvestments',b.dataset.editI)));
  $$('[data-del-i]').forEach(b=>b.onclick=()=>confirmDialog('Delete this investment?',()=>{DB.remove('factoryInvestments',b.dataset.delI);toast('Deleted','success');renderFactoryTab();}));
}

/* ================= TAB: EMPLOYEES ================= */
function fTabEmployees() {
  const list=(DB.all('factoryEmployees')||[]).filter(e=>!e._deleted);
  const totalSalary=list.filter(e=>e.active!==false).reduce((s,e)=>s+(+e.salary||0),0);
  return `
    <div class="card" style="padding:14px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
      <div><div class="lbl" style="color:var(--text-soft);font-size:12px;">MONTHLY SALARY (active staff)</div><div style="font-size:24px;font-weight:900;">${fmtMoney(totalSalary)}</div></div>
      <button class="btn btn-primary" id="fAddEmp">➕ Add Employee</button>
    </div>
    <div class="card" style="padding:0;overflow:hidden;">
      <table class="tbl"><thead><tr><th>Name</th><th>Role</th><th>Monthly Salary</th><th>Phone</th><th>Status</th><th></th></tr></thead>
      <tbody>${list.length?list.map(e=>`<tr><td><b>${escapeHtml(e.name||'')}</b></td><td>${escapeHtml(e.role||'')}</td><td><b>${fmtMoney(+e.salary||0)}</b></td><td>${escapeHtml(e.phone||'')}</td><td>${e.active===false?'<span class="badge" style="background:#fee2e2;color:#991b1b;">Inactive</span>':'<span class="badge paid">Active</span>'}</td><td style="white-space:nowrap;"><button class="btn btn-secondary btn-sm" data-pay-emp="${e.id}">💰 Pay Salary</button> <button class="btn btn-ghost btn-sm" data-edit-emp="${e.id}" title="Edit">✏️</button> <button class="btn btn-danger btn-sm" data-del-emp="${e.id}">🗑️</button></td></tr>`).join(''):'<tr><td colspan="6"><div class="empty" style="padding:20px;"><div class="emoji">👷</div><h4>No employees yet</h4></div></td></tr>'}</tbody></table>
    </div>
    <div style="font-size:12px;color:var(--text-soft);margin-top:8px;">💡 "Pay Salary" ek expense (Salary category) bana deta hai. ✏️ se staff ki salary/role kabhi bhi theel kar sakte hain.</div>`;
}
function fBindEmployees() {
  const a=$('#fAddEmp'); if(a) a.onclick=()=>openFactoryEmployeeForm();
  $$('[data-edit-emp]').forEach(b=>b.onclick=()=>openFactoryEmployeeForm(DB.get('factoryEmployees',b.dataset.editEmp)));
  $$('[data-del-emp]').forEach(b=>b.onclick=()=>confirmDialog('Delete this employee?',()=>{DB.remove('factoryEmployees',b.dataset.delEmp);toast('Deleted','success');renderFactoryTab();}));
  $$('[data-pay-emp]').forEach(b=>b.onclick=()=>{
    const emp=DB.get('factoryEmployees',b.dataset.payEmp); if(!emp)return;
    openFactoryExpenseForm({category:'Salary', amount:emp.salary, note:`Salary — ${emp.name}`});
  });
}

/* ================= FORMS ================= */
function openFactoryClientForm(existing){
  const c=existing||{name:'',phone:'',address:'',rate:''};
  openModal(`<h3>${existing?'✏️ Edit':'New'} Factory Client</h3>
    <div class="form-row cols-1"><div class="field"><label>Client / Factory Name *</label><input id="fcName" value="${escapeHtml(c.name)}"/></div></div>
    <div class="form-row"><div class="field"><label>Phone</label><input id="fcPhone" value="${escapeHtml(c.phone||'')}"/></div>
    <div class="field"><label>Rate/KG override (optional)</label><input type="number" id="fcRate" value="${c.rate||''}" placeholder="${factoryRate()}"/></div></div>
    <div class="form-row cols-1"><div class="field"><label>Address</label><input id="fcAddr" value="${escapeHtml(c.address||'')}"/></div></div>
    <div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="s">${existing?'💾 Update':' Save'}</button></div>`,
  {onOpen(m){$('#s',m).onclick=()=>{const name=$('#fcName',m).value.trim();if(!name){toast('Name required','error');return;}
    const data={name,phone:$('#fcPhone',m).value.trim(),address:$('#fcAddr',m).value.trim(),rate:+$('#fcRate',m).value||0};
    let saved=existing?DB.update('factoryClients',existing.id,data):DB.insert('factoryClients',data);
    factoryState.clientId=saved.id;closeModal();toast(existing?'Client updated':'Saved','success');renderFactory();};}});
}
function openFactoryEntryForm(existing){
  existing=existing||null;
  const ex=existing||{};
  const cid = existing ? existing.clientId : factoryState.clientId;
  const clients=DB.all('factoryClients')||[];
  const client=DB.get('factoryClients',cid)||{};
  const rate=+ex.rate || +client.rate || factoryRate();
  openModal(`<h3>${existing?'✏️ Edit Weight Entry':'➕ Add Weight'} ${existing?'':'— '+escapeHtml(client.name||'')}</h3>
    <div class="form-row"><div class="field"><label>Client</label><select id="eCl">${clients.map(c=>`<option value="${c.id}" ${c.id===cid?'selected':''}>🏭 ${escapeHtml(c.name)}</option>`).join('')}</select></div>
    <div class="field"><label>Date</label><input type="date" id="eD" value="${ex.date||isoDay()}"/></div></div>
    <div class="form-row"><div class="field"><label>Weight (KG) *</label><input type="number" step="0.1" id="eK" value="${ex.kg||''}" placeholder="25"/></div><div class="field"><label>Pieces</label><input type="number" id="eP" value="${ex.pieces||''}" placeholder="60"/></div></div>
    <div class="form-row"><div class="field"><label>Rate/KG</label><input type="number" id="eR" value="${rate}"/></div><div class="field"></div></div>
    <div class="form-row cols-1"><div class="field"><label>Note</label><input id="eN" value="${escapeHtml(ex.note||'')}" placeholder="Bag #, remarks"/></div></div>
    <div id="eC" style="background:var(--primary-light);border-radius:10px;padding:12px;text-align:center;font-weight:800;font-size:18px;color:var(--primary);margin-bottom:12px;">Amount: Rs. 0</div>
    <div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="s">${existing?'💾 Update':'💾 Save'}</button></div>`,
  {onOpen(m){const calc=()=>{const k=+$('#eK',m).value||0,r=+$('#eR',m).value||0;$('#eC',m).textContent=`Amount: ${fmtMoney(Math.round(k*r))}`;};['#eK','#eR'].forEach(i=>$(i,m).oninput=calc);calc();
    $('#s',m).onclick=()=>{const k=+$('#eK',m).value||0,r=+$('#eR',m).value||0;if(k<=0){toast('Enter KG','error');return;}
      const cid2=$('#eCl',m).value;
      const data={clientId:cid2,date:$('#eD',m).value||isoDay(),kg:k,pieces:+$('#eP',m).value||0,rate:r,amount:Math.round(k*r),note:$('#eN',m).value.trim()};
      const cname=(DB.get('factoryClients',cid2)||{}).name||'';
      if(existing){DB.update('factoryEntries',existing.id,data);}
      else{data.branchId=(typeof getActiveBranchId==='function')?getActiveBranchId():'main';DB.insert('factoryEntries',data);}
      if(typeof logAction==='function')logAction(existing?'factory.entry.edit':'factory.entry',`${cname}: ${k}kg`);closeModal();toast(existing?'Entry updated':'Saved','success');renderFactoryTab();};}});
}
function openFactoryDeliveryForm(existing){
  existing=existing||null;
  const ex=existing||{};
  const cid = existing ? existing.clientId : factoryState.clientId;
  const client=DB.get('factoryClients',cid)||{};
  const t=fKgTotals(cid);
  // how much we MAY deliver: pending + (this delivery's own kg, when editing)
  const maxKg = fR1(t.pending + (existing?(+ex.kg||0):0));
  if(!existing && maxKg<=0){ toast('Is client ka saara weight already deliver ho chuka — pehle naya weight add karein','error'); return; }
  openModal(`<h3>📦 ${existing?'✏️ Edit Delivery':'Record Delivery'} — ${escapeHtml(client.name||'')}</h3>
    <div style="background:var(--surface-alt);border-radius:8px;padding:10px;margin-bottom:12px;font-size:13px;">
      Received: <b>${t.recv} kg</b> • Delivered: <b style="color:var(--success);">${t.del} kg</b> •
      Abhi baki: <b style="color:var(--warning);">${t.pending} kg</b>
      ${existing?`<span style="color:var(--text-soft);">(edit ke waqt max ${maxKg} kg)</span>`:''}
    </div>
    <div class="form-row"><div class="field"><label>Date</label><input type="date" id="vD" value="${ex.date||isoDay()}"/></div>
    <div class="field"><label>Delivered Weight (KG) * — max ${maxKg}</label><input type="number" step="0.1" id="vK" value="${existing?(+ex.kg||0):maxKg}"/></div></div>
    <div class="form-row"><div class="field"><label>Pieces (optional)</label><input type="number" id="vP" value="${ex.pieces||''}"/></div>
    <div class="field"><label>Note</label><input id="vN" value="${escapeHtml(ex.note||'')}" placeholder="e.g. Delivered via shop boy, 6 bags"/></div></div>
    <div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-warning" id="s">${existing?'💾 Update':' Record Delivery'}</button></div>`,
  {onOpen(m){$('#s',m).onclick=()=>{const k=fR1(+$('#vK',m).value||0);
    if(k<=0){toast('Enter KG','error');return;}
    if(k>maxKg){toast(`Zyada se zyada ${maxKg} kg deliver kar sakte hain (bache ${t.pending} kg se)`,'error');return;}
    const data={clientId:cid,date:$('#vD',m).value||isoDay(),kg:k,pieces:+$('#vP',m).value||0,note:$('#vN',m).value.trim(),rate:+ex.rate||+((DB.get('factoryClients',cid)||{}).rate)||factoryRate()};
    if(existing){DB.update('factoryDeliveries',existing.id,data);}
    else{DB.insert('factoryDeliveries',data);}
    if(typeof logAction==='function')logAction(existing?'factory.delivery.edit':'factory.delivery',`${client.name||''}: ${k}kg delivered`);
    closeModal();toast(existing?'Delivery updated':'Delivery recorded ✅','success');
    const nt=fKgTotals(cid); if(nt.pending>0) toast(`⏳ Abhi bhi ${nt.pending} kg client ka maal factory mein hai`,'info');
    renderFactoryTab();};}});
}
function openFactoryPaymentForm(existing){
  existing=existing||null;
  const ex=existing||{};
  const cid = existing ? existing.clientId : factoryState.clientId;
  const client=DB.get('factoryClients',cid)||{};
  const allE=(DB.all('factoryEntries')||[]).filter(e=>!e._deleted&&e.clientId===cid).reduce((s,e)=>s+(+e.amount||0),0);
  const allP=(DB.all('factoryPayments')||[]).filter(p=>!p._deleted&&p.clientId===cid).reduce((s,p)=>s+(+p.amount||0),0);
  const due=allE-allP;
  openModal(`<h3>💰 ${existing?'✏️ Edit Payment':'Payment'} — ${escapeHtml(client.name||'')}</h3>
    ${existing?'':`<div style="background:var(--surface-alt);border-radius:8px;padding:10px;margin-bottom:12px;font-size:13px;">Bill: <b>${fmtMoney(allE)}</b> • Paid: <b>${fmtMoney(allP)}</b> • <span style="color:var(--danger);">Due: <b>${fmtMoney(due)}</b></span></div>`}
    <div class="form-row"><div class="field"><label>Date</label><input type="date" id="pD" value="${ex.date||isoDay()}"/></div><div class="field"><label>Amount *</label><input type="number" id="pA" value="${existing?(+ex.amount||0):(due>0?due:'')}"/></div></div>
    <div class="form-row"><div class="field"><label>Method</label><select id="pM">${['cash','bank','jazzcash','easypaisa','cheque'].map(mm=>`<option value="${mm}" ${(ex.method||'cash')===mm?'selected':''}>${mm[0].toUpperCase()+mm.slice(1)}</option>`).join('')}</select></div><div class="field"><label>Note</label><input id="pN" value="${escapeHtml(ex.note||'')}"/></div></div>
    <div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-success" id="s">${existing?'💾 Update':'💾 Record'}</button></div>`,
  {onOpen(m){$('#s',m).onclick=()=>{const a=+$('#pA',m).value||0;if(a<=0){toast('Enter amount','error');return;}
    const data={date:$('#pD',m).value||isoDay(),amount:a,method:$('#pM',m).value,note:$('#pN',m).value.trim()};
    if(existing){DB.update('factoryPayments',existing.id,data);}
    else{data.clientId=cid;DB.insert('factoryPayments',data);}
    if(typeof logAction==='function')logAction(existing?'factory.payment.edit':'factory.payment',`${client.name||''}: ${fmtMoney(a)}`);closeModal();toast(existing?'Payment updated':'Recorded','success');renderFactoryTab();};}});
}
function openFactoryExpenseForm(presetOrExisting){
  const p=presetOrExisting||{};
  const existing=p.id?p:null;
  const ex=existing||{};
  openModal(`<h3>${existing?'✏️ Edit Factory Expense':'➕ Factory Expense'}</h3>
    <div class="form-row"><div class="field"><label>Date</label><input type="date" id="xD" value="${ex.date||isoDay()}"/></div>
    <div class="field"><label>Category</label><select id="xC">${F_EXP_CATS.map(c=>`<option value="${c}" ${(ex.category||p.category)===c?'selected':''}>${c}</option>`).join('')}</select></div></div>
    <div class="form-row"><div class="field"><label>Amount *</label><input type="number" id="xA" value="${ex.amount||p.amount||''}"/></div>
    <div class="field"><label>Note</label><input id="xN" value="${escapeHtml(ex.note||p.note||'')}"/></div></div>
    <div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="s">${existing?'💾 Update':'💾 Save'}</button></div>`,
  {onOpen(m){$('#s',m).onclick=()=>{const a=+$('#xA',m).value||0;if(a<=0){toast('Enter amount','error');return;}
    const data={date:$('#xD',m).value||isoDay(),category:$('#xC',m).value,amount:a,note:$('#xN',m).value.trim()};
    if(existing){DB.update('factoryExpenses',existing.id,data);}
    else{data.branchId=(typeof getActiveBranchId==='function')?getActiveBranchId():'main';DB.insert('factoryExpenses',data);}
    if(typeof logAction==='function')logAction(existing?'factory.expense.edit':'factory.expense',`${data.category}: ${fmtMoney(a)}`);closeModal();toast(existing?'Expense updated':'Saved','success');renderFactoryTab();};}});
}
function openFactoryInvestmentForm(existing){
  existing=existing||null;
  const ex=existing||{};
  openModal(`<h3>🏗️ ${existing?'✏️ Edit Investment':'Add Investment'}</h3>
    <div class="form-row"><div class="field"><label>Date</label><input type="date" id="iD" value="${ex.date||isoDay()}"/></div><div class="field"><label>Amount *</label><input type="number" id="iA" value="${ex.amount||''}" placeholder="e.g. 150000"/></div></div>
    <div class="form-row cols-1"><div class="field"><label>Item / Name *</label><input id="iN" value="${escapeHtml(ex.name||'')}" placeholder="e.g. Washing Machine, CCTV, Setup"/></div></div>
    <div class="form-row cols-1"><div class="field"><label>Note</label><input id="iNo" value="${escapeHtml(ex.note||'')}"/></div></div>
    <div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="s">${existing?'💾 Update':'💾 Save'}</button></div>`,
  {onOpen(m){$('#s',m).onclick=()=>{const a=+$('#iA',m).value||0,name=$('#iN',m).value.trim();if(a<=0||!name){toast('Enter item & amount','error');return;}
    const data={date:$('#iD',m).value||isoDay(),name,amount:a,note:$('#iNo',m).value.trim()};
    if(existing){DB.update('factoryInvestments',existing.id,data);}
    else{DB.insert('factoryInvestments',data);}
    if(typeof logAction==='function')logAction(existing?'factory.investment.edit':'factory.investment',`${name}: ${fmtMoney(a)}`);closeModal();toast(existing?'Investment updated':'Saved','success');renderFactoryTab();};}});
}
function openFactoryEmployeeForm(existing){
  const e=existing||{name:'',role:'',salary:'',phone:'',active:true};
  openModal(`<h3>${existing?'✏️ Edit Employee':'Add Employee'}</h3>
    <div class="form-row"><div class="field"><label>Name *</label><input id="mN" value="${escapeHtml(e.name)}"/></div><div class="field"><label>Role</label><input id="mR" value="${escapeHtml(e.role||'')}" placeholder="Washer, Quality, Supervisor"/></div></div>
    <div class="form-row"><div class="field"><label>Monthly Salary *</label><input type="number" id="mS" value="${e.salary||''}"/></div><div class="field"><label>Phone</label><input id="mP" value="${escapeHtml(e.phone||'')}"/></div></div>
    <div class="form-row cols-1"><div class="field"><label><input type="checkbox" id="mA" ${e.active!==false?'checked':''}/> Active</label></div></div>
    <div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="s">${existing?'💾 Update':' Save'}</button></div>`,
  {onOpen(m){$('#s',m).onclick=()=>{const name=$('#mN',m).value.trim();if(!name){toast('Name required','error');return;}
    const data={name,role:$('#mR',m).value.trim(),salary:+$('#mS',m).value||0,phone:$('#mP',m).value.trim(),active:$('#mA',m).checked};
    existing?DB.update('factoryEmployees',existing.id,data):DB.insert('factoryEmployees',data);closeModal();toast(existing?'Employee updated':'Saved','success');renderFactoryTab();};}});
}

/* ================= SHARE DELIVERY SUMMARY (WhatsApp / copy) =================
   E.g. client company ko batana ho: "we delivered you total 589 kg" —
   ready-made summary text with kg, amount, payments received & balance due. */
function fShareText(){
  const client=DB.get('factoryClients',factoryState.clientId); if(!client) return '';
  const s=DB.settings(); const rateNow=+client.rate||factoryRate();
  const inScope=(d)=> fInPeriod(d.date||d.createdAt);
  const dels=(DB.all('factoryDeliveries')||[]).filter(d=>!d._deleted&&d.clientId===client.id&&inScope(d)).sort((a,b)=>String(a.date||a.createdAt).localeCompare(String(b.date||b.createdAt)));
  const kg=dels.reduce((x,d)=>x+fR1(+d.kg||0),0), pcs=dels.reduce((x,d)=>x+(+d.pieces||0),0);
  const amt=dels.reduce((x,d)=>x+Math.round((+d.kg||0)*(+d.rate||rateNow)),0);
  const allE=(DB.all('factoryEntries')||[]).filter(e=>!e._deleted&&e.clientId===client.id).reduce((x,e)=>x+(+e.amount||0),0);
  const allP=(DB.all('factoryPayments')||[]).filter(p=>!p._deleted&&p.clientId===client.id).reduce((x,p)=>x+(+p.amount||0),0);
  const due=Math.max(0,Math.round(allE-allP));
  const lp=fLastPayment(client.id);
  const kgt=fKgTotals(client.id);
  const lines=[
    `${s.shopName||'Mr Laundry'} — DELIVERY CONFIRMATION`,
    `Client: ${client.name}`,
    `Period: ${fPeriodLbl()}`,
    `• Total delivered: ${fR1(kg)} kg${pcs?' / '+pcs+' pcs':''} (${dels.length} delivery${dels.length>1?'ies':''})`
  ];
  if(dels.length && dels.length<=8) lines.push(`• Break-up: ${dels.map(d=>`${String(d.date||'').slice(5,10)}: ${fR1(+d.kg||0)}kg`).join(', ')}`);
  if(kgt.pending>0) lines.push(`• Balance with us (not yet delivered): ${kgt.pending} kg`);
  lines.push(`• Total amount: ${fmtMoney(amt)}${dels.length && dels.every(d=>+d.rate)?'':` (at Rs. ${(+rateNow).toLocaleString()}/kg)`}`);
  lines.push(`• Payments received: ${fmtMoney(allP)}${lp?` — last ${fmtMoney(+lp.amount||0)} on ${String(lp.date||lp.createdAt||'').slice(0,10)}`:''}`);
  lines.push(due>0?`• Balance due: ${fmtMoney(due)}`:`• Balance: PAID ✅`);
  lines.push('Kindly confirm the above. Thank you!');
  lines.push(`— ${s.shopName||'Mr Laundry'}${s.phone?' ('+s.phone+')':''}`);
  return lines.join('\n');
}
/* Renders a clean invoice card (PNG) — "Total delivery of 589 kg dated today
   with total bill" — and shares it via Web Share (WhatsApp) or downloads it. */
function fMakeShareImage(){
  const client=DB.get('factoryClients',factoryState.clientId);
  const s=DB.settings();
  const rateNow=+client.rate||factoryRate();
  const dels=(DB.all('factoryDeliveries')||[]).filter(d=>!d._deleted&&d.clientId===client.id&&fInPeriod(d.date||d.createdAt)).sort((a,b)=>String(a.date||a.createdAt).localeCompare(String(b.date||b.createdAt)));
  if(!dels.length){toast('Is period mein koi delivery nahi mili','error');return;}
  const kg=dels.reduce((x,d)=>x+fR1(+d.kg||0),0), pcs=dels.reduce((x,d)=>x+(+d.pieces||0),0);
  const amt=dels.reduce((x,d)=>x+Math.round((+d.kg||0)*(+d.rate||rateNow)),0);
  const allP=(DB.all('factoryPayments')||[]).filter(p=>!p._deleted&&p.clientId===client.id).reduce((x,p)=>x+(+p.amount||0),0);
  const allE=(DB.all('factoryEntries')||[]).filter(e=>!e._deleted&&e.clientId===client.id).reduce((x,e)=>x+(+e.amount||0),0);
  const due=Math.max(0,Math.round(allE-allP));
  const kgt=fKgTotals(client.id);
  const rows=[
    ['Client', client.name, ''],
    ['Invoice Date', isoDay(), ''],
    ['Period', fPeriodLbl(), '']
  ];
  dels.slice(0,6).forEach((d,i)=>rows.push(['Delivery '+(i+1), `${String(d.date||'').slice(0,10)} — ${fR1(+d.kg||0)} kg`, '']));
  if(dels.length>6) rows.push(['','+ '+(dels.length-6)+' more deliveries','']);
  rows.push(['Total Delivered', `${fR1(kg)} kg${pcs?' / '+pcs+' pcs':''}`, 'hl']);
  rows.push(['Total Bill Amount', fmtMoney(amt), 'amt']);
  rows.push(['Received to Date', fmtMoney(allP), 'grn']);
  rows.push(['Balance Due', fmtMoney(due), due>0?'red':'grn']);
  if(kgt.pending>0) rows.push(['With Us (to deliver)', kgt.pending+' kg','']);
  const W=1080, HH=150+rows.length*70+190;
  const cv=document.createElement('canvas'); cv.width=W; cv.height=HH;
  const c=cv.getContext('2d');
  const draw=(withLogo,logo)=>{
    c.fillStyle='#f4f7fb'; c.fillRect(0,0,W,HH);
    c.fillStyle='#ffffff'; c.fillRect(30,30,W-60,HH-60);
    c.strokeStyle='#dbe3f3'; c.lineWidth=2; c.strokeRect(30,30,W-60,HH-60);
    const g=c.createLinearGradient(30,30,W,30); g.addColorStop(0,'#4f7cff'); g.addColorStop(1,'#6a5cff');
    c.fillStyle=g; c.fillRect(30,30,W-60,110);
    if(withLogo&&logo) { try{ c.drawImage(logo,52,45,80,80); }catch(e){} }
    c.fillStyle='#fff'; c.font='800 33px Arial'; c.textBaseline='middle';
    c.fillText(`${s.shopName||'Mr Laundry'} — DELIVERY INVOICE`, (withLogo&&logo)?150:60, 85);
    c.fillStyle='#d97706'; c.font='800 26px Arial'; c.textAlign='right';
    c.fillText((due>0?'UNPAID DUE: '+fmtMoney(due):'PAID ✓'), W-60, 85);
    c.textAlign='left';
    let y=195;
    rows.forEach(([k,v,st])=>{
      if(st==='hl'){ c.fillStyle='#eff6ff'; c.fillRect(60,y-26,W-120,54); }
      c.textBaseline='middle'; c.font='700 27px Arial'; c.fillStyle='#64748b'; c.fillText(k,76,y);
      c.font='900 30px Arial';
      c.fillStyle = st==='red'?'#dc2626' : st==='grn'?'#16a34a' : st==='amt'?'#4f7cff' : '#0f172a';
      c.textAlign='right'; c.fillText(v, W-76, y); c.textAlign='left';
      y+=70;
    });
    c.strokeStyle='#e2e8f0'; c.beginPath(); c.moveTo(76,y+8); c.lineTo(W-76,y+8); c.stroke();
    c.fillStyle='#64748b'; c.font='600 22px Arial';
    c.fillText(`Kindly confirm the above delivery. Thank you!   — ${s.shopName||'Mr Laundry'}${s.phone?' ('+s.phone+')':''}`, 76, y+42);
    c.strokeStyle='#94a3b8'; c.beginPath(); c.moveTo(W-360,y+80); c.lineTo(W-90,y+80); c.stroke();
    c.fillStyle='#334155'; c.font='700 20px Arial'; c.fillText('Authorised Signature', W-340, y+108);
  };
  const finish=()=>{
    try{
      cv.toBlob(b=>{
        if(!b){toast('Image ban nahi saki','error');return;}
        const file=new File([b],`Delivery-Invoice-${client.name.replace(/[^A-Za-z0-9]+/g,'-')}-${isoDay()}.png`,{type:'image/png'});
        if(navigator.canShare&&navigator.canShare({files:[file]})){
          navigator.share({files:[file],title:'Delivery Invoice',text:`Total delivery ${fR1(kg)} kg — ${fmtMoney(amt)} — ${client.name}`}).catch(()=>{});
        } else {
          const url=URL.createObjectURL(b); const a=document.createElement('a');
          a.href=url; a.download=file.name; document.body.appendChild(a); a.click(); a.remove();
          setTimeout(()=>URL.revokeObjectURL(url),8000);
          toast('🖼️ Image download ho gayi — WhatsApp par attach kar dein','success');
        }
      },'image/png');
    }catch(e){ // tainted canvas (remote logo) — redraw without logo
      try{ draw(false,null); cv.toBlob(nb=>{ if(nb){ const url=URL.createObjectURL(nb); const a=document.createElement('a'); a.href=url; a.download='delivery-invoice.png'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),8000);} },'image/png'); }catch(e2){ toast('Image export fail: '+e2.message,'error'); }
    }
  };
  if(s.logoImage){ const img=new Image(); img.onload=()=>{ draw(true,img); finish(); }; img.onerror=()=>{ draw(false,null); finish(); }; img.src=s.logoImage; }
  else { draw(false,null); finish(); }
}

/* ================= CUSTOM BILLING INVOICE =================
   Ad-hoc / handmaiden invoice: aap khud total KG, rate, discount, date dein —
   document turant print/PDF, image (WhatsApp) ya text ban jata hai. Records
   ko chhedne ka option alag se checkbox par hai (default OFF). */
function fCustomInvoiceData(v){
  const client=DB.get('factoryClients',v.clientId)||{};
  const kg=fR1(+v.kg||0), rate=+v.rate||0, disc=+v.disc||0, pcs=+v.pcs||0;
  const gross=Math.round(kg*rate);
  const net=Math.max(0,gross-disc);
  const allE=(DB.all('factoryEntries')||[]).filter(e=>!e._deleted&&e.clientId===v.clientId).reduce((x,e)=>x+(+e.amount||0),0);
  const allP=(DB.all('factoryPayments')||[]).filter(p=>!p._deleted&&p.clientId===v.clientId).reduce((x,p)=>x+(+p.amount||0),0);
  const due=Math.max(0,Math.round(allE-allP));
  const d={...v, client, kg, rate, disc, pcs, gross, net, allE, allP, due,
    ref:'CI-'+String(v.date||isoDay()).replace(/-/g,''), shop:DB.settings()};
  return d;
}
function fCustomText(d){
  const L=[`${d.shop.shopName||'Mr Laundry'} — ${d.title}`.toUpperCase(),
    `Bill To: ${d.client.name||''}${d.client.phone?' ('+d.client.phone+')':''}`,
    `Invoice: ${d.ref}  •  Date: ${d.date}`,
    `• Total billed: ${d.kg} kg${d.pcs?' / '+d.pcs+' pcs':''} @ Rs. ${(+d.rate).toLocaleString()}/kg = ${fmtMoney(d.gross)}`];
  if(d.disc>0) L.push(`• Discount: − ${fmtMoney(d.disc)}`);
  L.push(`• TOTAL BILL AMOUNT: ${fmtMoney(d.net)}`);
  if(d.includeAcct){ L.push(`• Payments received: ${fmtMoney(d.allP)}`); L.push(d.due>0?`• Balance due: ${fmtMoney(d.due)}`:`• Balance: PAID ✅`); }
  if(d.note) L.push(`Note: ${d.note}`);
  L.push('Kindly confirm and settle. Thank you!');
  L.push(`— ${d.shop.shopName||'Mr Laundry'}${d.shop.phone?' ('+d.shop.phone+')':''}`);
  return L.join('\n');
}
function fCustomHtml(d){
  return `<div class="invoice-page" style="max-width:720px;font-size:14px;">
    <div style="text-align:center;margin-bottom:8px;">${d.shop.logoImage?`<img src="${d.shop.logoImage}" style="max-height:70px;object-fit:contain;background:#000;padding:6px;border-radius:6px;"/>`:''}
    <h2 style="margin:6px 0 0;">${escapeHtml(d.shop.shopName||'Mr Laundry')}</h2><div style="font-size:12px;">${escapeHtml(d.shop.address||'')}${d.shop.phone?' • '+escapeHtml(d.shop.phone):''}</div></div>
    <div style="text-align:center;font-weight:800;letter-spacing:1px;border-top:1px solid #000;border-bottom:1px solid #000;padding:6px 0;margin:8px 0;">${escapeHtml(d.title.toUpperCase())}</div>
    <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:10px;">
      <div><b>Bill To:</b> ${escapeHtml(d.client.name||'')}<br>${d.client.phone?'📞 '+escapeHtml(d.client.phone):''}</div>
      <div style="text-align:right;"><b>Invoice:</b> ${d.ref}<br><b>Date:</b> ${escapeHtml(d.date)}</div></div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;" border="1" cellpadding="6">
      <thead><tr style="background:#f0f0f0;"><th>Description</th><th style="text-align:right;">KG</th><th style="text-align:right;">Pcs</th><th style="text-align:right;">Rate</th><th style="text-align:right;">Amount</th></tr></thead>
      <tbody>
        <tr><td>Laundry — total billed weight${d.note?'<br><small>'+escapeHtml(d.note)+'</small>':''}</td><td style="text-align:right;"><b>${d.kg}</b></td><td style="text-align:right;">${d.pcs||''}</td><td style="text-align:right;">${fmtMoney(d.rate)}</td><td style="text-align:right;"><b>${fmtMoney(d.gross)}</b></td></tr>
        ${d.disc>0?`<tr><td>Discount</td><td></td><td></td><td></td><td style="text-align:right;">− ${fmtMoney(d.disc)}</td></tr>`:''}
      </tbody>
      <tfoot><tr style="font-weight:800;background:#f7f7f7;"><td colspan="4">TOTAL BILL AMOUNT</td><td style="text-align:right;font-size:16px;">${fmtMoney(d.net)}</td></tr></tfoot>
    </table>
    ${d.includeAcct?`<div style="margin-top:12px;font-size:14px;border:1px solid #000;border-radius:8px;padding:10px;">
      <div style="font-weight:800;margin-bottom:4px;">💰 ACCOUNT SUMMARY</div>
      <div style="display:flex;justify-content:space-between;padding:3px 0;"><span>Total billed (all-time):</span><b>${fmtMoney(d.allE)}</b></div>
      <div style="display:flex;justify-content:space-between;padding:3px 0;color:green;"><span>Received to date:</span><b>${fmtMoney(d.allP)}</b></div>
      <div style="display:flex;justify-content:space-between;padding:5px 0 0;border-top:1px solid #999;font-size:17px;"><span><b>BALANCE DUE:</b></span><b style="color:${d.due>0?'#c00':'green'};">${fmtMoney(d.due)}</b></div></div>`:''}
    <div style="display:flex;justify-content:space-between;margin-top:36px;font-size:13px;">
      <div style="border-top:1px solid #000;padding-top:4px;width:210px;text-align:center;">Received By (Client)</div>
      <div style="border-top:1px solid #000;padding-top:4px;width:180px;text-align:center;">For ${escapeHtml(d.shop.shopName||'Mr Laundry')}</div></div>
    <div style="text-align:center;margin-top:14px;font-size:12px;color:#555;">Kindly confirm and settle • Thank you for your business</div></div>`;
}
function fCustomWrap(d){ const w=document.createElement('div'); w.className='print-slip'; w.innerHTML=fCustomHtml(d); return w; }
function fCustomImage(d){
  const rows=[['Bill To',d.client.name||'',''],['Invoice',d.ref,''],['Date',d.date,''],
    [`Total billed @ Rs. ${(+d.rate).toLocaleString()}/kg`,`${d.kg} kg${d.pcs?' / '+d.pcs+' pcs':''}`,'hl']];
  if(d.disc>0) rows.push(['Discount','− '+fmtMoney(d.disc),'']);
  rows.push(['TOTAL BILL AMOUNT',fmtMoney(d.net),'amt']);
  if(d.includeAcct){ rows.push(['Received to date',fmtMoney(d.allP),'grn']); rows.push(['Balance due',fmtMoney(d.due),d.due>0?'red':'grn']); }
  if(d.note) rows.push(['Note',d.note,'']);
  const W=1080, H=170+rows.length*70+150;
  const cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  const c=cv.getContext('2d');
  const draw=(withLogo,logo)=>{
    c.fillStyle='#f4f7fb'; c.fillRect(0,0,W,H);
    c.fillStyle='#ffffff'; c.fillRect(30,30,W-60,H-60);
    c.strokeStyle='#dbe3f3'; c.lineWidth=2; c.strokeRect(30,30,W-60,H-60);
    const g=c.createLinearGradient(30,30,W,30); g.addColorStop(0,'#4f7cff'); g.addColorStop(1,'#6a5cff');
    c.fillStyle=g; c.fillRect(30,30,W-60,120);
    if(withLogo&&logo){ try{ c.drawImage(logo,52,50,80,80); }catch(e){} }
    c.fillStyle='#fff'; c.font='800 33px Arial'; c.textBaseline='middle';
    c.fillText(`${d.shop.shopName||'Mr Laundry'} — ${d.title.toUpperCase()}`, (withLogo&&logo)?150:60, 90);
    let y=215;
    rows.forEach(([k,v,st])=>{
      if(st==='hl'){ c.fillStyle='#eff6ff'; c.fillRect(60,y-26,W-120,54); }
      if(st==='amt'){ c.fillStyle='#fff7ed'; c.fillRect(60,y-26,W-120,54); }
      c.font='700 26px Arial'; c.fillStyle='#64748b'; c.fillText(String(k).slice(0,42),76,y);
      c.font='900 30px Arial';
      c.fillStyle = st==='red'?'#dc2626' : st==='grn'?'#16a34a' : st==='amt'?'#4f7cff' : '#0f172a';
      c.textAlign='right'; c.fillText(String(v), W-76, y); c.textAlign='left';
      y+=70;
    });
    c.strokeStyle='#94a3b8'; c.beginPath(); c.moveTo(W-360,y+40); c.lineTo(W-90,y+40); c.stroke();
    c.fillStyle='#334155'; c.font='700 20px Arial'; c.fillText('Authorised Signature', W-340, y+66);
  };
  const finish=()=>{
    try{
      cv.toBlob(b=>{
        if(!b){toast('Image ban nahi saki','error');return;}
        const file=new File([b],`${d.ref}-${String(d.client.name||'').replace(/[^A-Za-z0-9]+/g,'-')}.png`,{type:'image/png'});
        if(navigator.canShare&&navigator.canShare({files:[file]})){ navigator.share({files:[file],title:'Invoice',text:fCustomText(d)}).catch(()=>{}); }
        else { const url=URL.createObjectURL(b); const a=document.createElement('a'); a.href=url; a.download=file.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),8000); toast('🖼️ Image download ho gayi — WhatsApp par attach kar dein','success'); }
      },'image/png');
    }catch(e){
      try{ draw(false,null); cv.toBlob(nb=>{ if(nb){ const url=URL.createObjectURL(nb); const a=document.createElement('a'); a.href=url; a.download=d.ref+'.png'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),8000); } },'image/png'); }catch(e2){ toast('Image export fail','error'); }
    }
  };
  if(d.shop.logoImage){ const img=new Image(); img.onload=()=>{ draw(true,img); finish(); }; img.onerror=()=>{ draw(false,null); finish(); }; img.src=d.shop.logoImage; }
  else { draw(false,null); finish(); }
}
function openFactoryCustomInvoice(){
  const clients=DB.all('factoryClients')||[];
  if(!clients.length){toast('Add a client first','error');return;}
  const cur=factoryState.clientId;
  const rate=+((DB.get('factoryClients',cur)||{}).rate)||factoryRate();
  let addedId=null;
  openModal(`<h3>🧮 Custom Billing Invoice</h3>
    <p class="sub" style="font-size:12px;">Khud total KG / rate likhein — foran print, image ya WhatsApp text ban jayega.</p>
    <div class="form-row">
      <div class="field"><label>Client</label><select id="ciClient">${clients.map(c=>`<option value="${c.id}" ${c.id===cur?'selected':''}>🏭 ${escapeHtml(c.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Invoice Date</label><input type="date" id="ciDate" value="${isoDay()}"/></div>
    </div>
    <div class="form-row">
      <div class="field"><label>Total KG *</label>
        <div style="display:flex;gap:6px;"><input type="number" step="0.1" id="ciKg" style="flex:1" placeholder="589"/><button class="btn btn-secondary btn-sm" id="ciFill" title="Is client ki total delivered kg se bhar dein">📦 Auto</button></div></div>
      <div class="field"><label>Rate / KG</label><input type="number" id="ciRate" value="${rate}"/></div>
    </div>
    <div class="form-row">
      <div class="field"><label>Pieces (optional)</label><input type="number" id="ciPcs"/></div>
      <div class="field"><label>Discount Rs. (optional)</label><input type="number" id="ciDisc" value="0"/></div>
    </div>
    <div class="form-row cols-1"><div class="field"><label>Title</label><input id="ciTitle" value="DELIVERY BILL / INVOICE"/></div></div>
    <div class="form-row cols-1"><div class="field"><label>Note on invoice (optional)</label><input id="ciNote" placeholder="e.g. Monthly billing — September 2026"/></div></div>
    <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:13px;margin-bottom:6px;">
      <label style="display:flex;gap:6px;align-items:center;"><input type="checkbox" id="ciAcct" checked/> Account summary dikhayein (received / balance due)</label>
      <label style="display:flex;gap:6px;align-items:center;"><input type="checkbox" id="ciAdd"/> Isko weight entry ke tor par records mein bhi add karein</label>
    </div>
    <div id="ciCalc" style="background:var(--primary-light);border-radius:10px;padding:10px;text-align:center;font-weight:800;font-size:15px;color:var(--primary);margin-bottom:10px;">Bill: Rs. 0</div>
    <div class="modal-footer" style="flex-wrap:wrap;">
      <button class="btn btn-ghost" onclick="closeModal()">Close</button>
      <button class="btn btn-secondary" id="ciCopy">📋 Copy Text</button>
      <button class="btn btn-primary" id="ciImg">🖼️ Share Image</button>
      <button class="btn btn-secondary" id="ciPrint">🧾 Print / PDF</button>
      <button class="btn btn-success" id="ciWa">💚 WhatsApp</button>
    </div>`,
  {onOpen(m){
    const g=id=>$(id,m);
    const num=id=>{const el=g(id);return +String((el&&el.value)||0)||0;};
    const calc=()=>{
      const gross=Math.round(num('#ciKg')*num('#ciRate')), disc=num('#ciDisc'), net=Math.max(0,gross-disc);
      const el=g('#ciCalc');
      if(el) el.textContent=`Bill: ${fmtMoney(net)}  (${fR1(num('#ciKg'))} kg × ${fmtMoney(num('#ciRate'))}${disc?` − discount ${fmtMoney(disc)}`:''})`;
    };
    ['#ciKg','#ciRate','#ciDisc'].forEach(id=>{const e=g(id); if(e)e.oninput=calc;}); calc();
    const fe=g('#ciFill');
    if(fe) fe.onclick=()=>{ const cid=g('#ciClient').value; const t=fKgTotals(cid); const el=g('#ciKg'); if(el){ el.value=t.del||t.recv||0; } calc(); toast(t.del?`Total delivered ${t.del} kg bhar diya`:`Deliveries nahi mili — total received ${t.recv} kg bhar diya`,'success'); };
    const build=()=>{
      const v={ clientId:g('#ciClient').value, date:g('#ciDate').value||isoDay(), kg:fR1(num('#ciKg')), pcs:num('#ciPcs'), rate:num('#ciRate'), disc:num('#ciDisc'),
        title:String((g('#ciTitle')||{}).value||'DELIVERY BILL / INVOICE').trim(), note:String((g('#ciNote')||{}).value||'').trim(),
        includeAcct:!!(g('#ciAcct')||{}).checked };
      if(!(v.kg>0)||!(v.rate>0)){ toast('Total KG aur rate likhein','error'); return null; }
      if((g('#ciAdd')||{}).checked && !addedId){
        const d0=fCustomInvoiceData(v);
        const ins=DB.insert('factoryEntries',{clientId:v.clientId,date:v.date,kg:v.kg,pieces:v.pcs,rate:v.rate,amount:d0.net,note:`${v.title} ${d0.ref} — custom invoice${v.note?' — '+v.note:''}`,branchId:(typeof getActiveBranchId==='function')?getActiveBranchId():'main'});
        addedId=ins.id;
        toast('⚖️ Bill ki weight entry records mein add ho gayi','success');
      }
      return fCustomInvoiceData(v);
    };
    const wa=g('#ciWa'); if(wa) wa.onclick=()=>{ const d=build(); if(!d)return; let ph=String(d.client.phone||'').replace(/\D/g,''); if(ph.startsWith('0'))ph='92'+ph.slice(1); window.open('https://wa.me/'+ph+'?text='+encodeURIComponent(fCustomText(d)),'_blank'); };
    const pr=g('#ciPrint'); if(pr) pr.onclick=()=>{ const d=build(); if(!d)return; closeModal(); printElement(fCustomWrap(d),{title:'Invoice',thermal:false}); if(typeof logAction==='function')logAction('factory.custominvoice',`${d.client.name||''}: ${d.kg}kg ${fmtMoney(d.net)}`); };
    const im=g('#ciImg'); if(im) im.onclick=()=>{ const d=build(); if(d) fCustomImage(d); };
    const cp=g('#ciCopy'); if(cp) cp.onclick=()=>{ const d=build(); if(!d)return; const t=fCustomText(d);
      if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(()=>toast('Invoice text copy ho gaya ✅','success')); }
      else toast('Copy support nahi — WhatsApp button use karein','error'); };
  }});
}

function shareFactoryDeliverySummary(){
  if(!factoryState.clientId){toast('Add a client first','error');return;}
  const client=DB.get('factoryClients',factoryState.clientId);
  const dels=(DB.all('factoryDeliveries')||[]).filter(d=>!d._deleted&&d.clientId===client.id&&fInPeriod(d.date||d.createdAt));
  if(!dels.length){toast('Is period mein koi delivery nahi mili','error');return;}
  const text=fShareText();
  let ph=String(client.phone||'').replace(/\D/g,'');
  if(ph.startsWith('0')) ph='92'+ph.slice(1);
  const waUrl='https://wa.me/'+ph+'?text='+encodeURIComponent(text);
  openModal(`<h3>📲 Delivery Summary — ${escapeHtml(client.name)}</h3>
    <p class="sub" style="font-size:12px;">WhatsApp par bhejne ke liye ready text — zaroorat ho to yahan edit bhi kar sakte hain.</p>
    <textarea id="fsTxt" rows="12" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;font-size:13px;">${escapeHtml(text)}</textarea>
    <div class="modal-footer" style="flex-wrap:wrap;">
      <button class="btn btn-ghost" onclick="closeModal()">Close</button>
      <button class="btn btn-secondary" id="fsCopy">📋 Copy Text</button>
      <button class="btn btn-secondary" id="fsPrint">🧾 Print Challan</button>
      <button class="btn btn-primary" id="fsImg">🖼️ Share as Image</button>
      <a class="btn btn-success" id="fsWa" href="${waUrl}" target="_blank" rel="noopener">💚 WhatsApp par bhejein</a>
    </div>`,
  {onOpen(m){
    $('#fsCopy',m).onclick=()=>{
      const el=$('#fsTxt',m);
      if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(el.value).then(()=>toast('Text copy ho gaya ✅','success')); }
      else { el.select(); try{document.execCommand('copy');toast('Copied','success');}catch(e){} }
    };
    $('#fsPrint',m).onclick=()=>{ closeModal(); printFactoryDeliveryChallan(); };
    $('#fsImg',m).onclick=()=>{ fMakeShareImage(); };
  }});
}

/* ================= PRINT DELIVERY CHALLAN / INVOICE =================
   Client company ko dene ke liye: "is date itne KG deliver kie, total
   amount itna hua" — poora period (Today/Month/All) ya ek single delivery. */
function printFactoryDeliveryChallan(deliveryId){
  const client=DB.get('factoryClients',factoryState.clientId);
  if(!client){toast('Select a client','error');return;}
  const inScope=(d)=> fInPeriod(d.date||d.createdAt);
  const rateNow=+client.rate||factoryRate();
  let dels;
  if(deliveryId){ const d=DB.get('factoryDeliveries',deliveryId); dels=(d&&!d._deleted)?[d]:[]; }
  else dels=(DB.all('factoryDeliveries')||[]).filter(d=>!d._deleted&&d.clientId===client.id&&inScope(d)).sort((a,b)=>String(a.date||a.createdAt).localeCompare(String(b.date||b.createdAt)));
  if(!dels.length){ toast('Is period mein koi delivery record nahi mili — pehle 📦 Deliver se entry karein','error'); return; }
  const kg=dels.reduce((x,d)=>x+fR1(+d.kg||0),0), pcs=dels.reduce((x,d)=>x+(+d.pieces||0),0);
  const amt=dels.reduce((x,d)=>x+Math.round((+d.kg||0)*(+d.rate||rateNow)),0);
  const periodLbl = deliveryId ? 'Single Delivery' : (factoryState.range==='all' ? 'All Deliveries' : fPeriodLbl());
  // Payment status for the client (all-time account position of this client)
  const allE=(DB.all('factoryEntries')||[]).filter(e=>!e._deleted&&e.clientId===client.id).reduce((x,e)=>x+(+e.amount||0),0);
  const allP=(DB.all('factoryPayments')||[]).filter(p=>!p._deleted&&p.clientId===client.id).reduce((x,p)=>x+(+p.amount||0),0);
  const due=Math.round(allE-allP);
  const stamp = due>0
    ? `<div style="float:right;border:3px solid #c00;color:#c00;font-weight:900;padding:4px 14px;border-radius:8px;font-size:15px;text-align:center;line-height:1.3;">DUE<br><span style="font-size:18px;">${fmtMoney(due)}</span></div>`
    : `<div style="float:right;border:3px solid #16a34a;color:#16a34a;font-weight:900;padding:4px 14px;border-radius:8px;font-size:15px;text-align:center;line-height:1.3;">PAID ✓</div>`;
  const ref='DC-'+isoDay().replace(/-/g,'')+(dels.length>1?'-'+dels.length:'');
  const kgt=fKgTotals(client.id);
  const s=DB.settings();
  const rows=dels.map((d,i)=>{const r=+d.rate||rateNow; return `<tr><td>${i+1}</td><td>${escapeHtml(String(d.date||'').slice(0,10))}</td><td style="text-align:right;"><b>${fR1(+d.kg||0)} kg</b></td><td style="text-align:right;">${+d.pieces||0}</td><td style="text-align:right;">${fmtMoney(r)}</td><td style="text-align:right;"><b>${fmtMoney(Math.round((+d.kg||0)*r))}</b></td><td style="font-size:11px;">${escapeHtml(d.note||'')}</td></tr>`;}).join('');
  const html=`<div class="invoice-page" style="max-width:720px;font-size:14px;">
    <div style="text-align:center;margin-bottom:8px;">${s.logoImage?`<img src="${s.logoImage}" style="max-height:70px;object-fit:contain;background:#000;padding:6px;border-radius:6px;"/>`:''}
    <h2 style="margin:6px 0 0;">${escapeHtml(s.shopName||'Mr Laundry')}</h2><div style="font-size:12px;">${escapeHtml(s.address||'')}${s.phone?' • '+escapeHtml(s.phone):''}</div></div>
    <div style="text-align:center;font-weight:800;letter-spacing:1px;border-top:1px solid #000;border-bottom:1px solid #000;padding:6px 0;margin:8px 0;">DELIVERY CHALLAN / INVOICE</div>
    ${stamp}
    <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:10px;">
      <div><b>Client:</b> ${escapeHtml(client.name)}${client.phone?'<br>📞 '+escapeHtml(client.phone):''}</div>
      <div style="text-align:right;"><b>Ref:</b> ${ref}<br><b>Date:</b> ${isoDay()}<br><b>Period:</b> ${escapeHtml(periodLbl)}</div></div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;" border="1" cellpadding="6">
      <thead><tr style="background:#f0f0f0;"><th>#</th><th>Delivered On</th><th style="text-align:right;">KG</th><th style="text-align:right;">Pcs</th><th style="text-align:right;">Rate/KG</th><th style="text-align:right;">Amount</th><th>Note</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr style="font-weight:800;background:#f7f7f7;"><td colspan="2">TOTAL DELIVERED</td><td style="text-align:right;">${fR1(kg)} kg</td><td style="text-align:right;">${pcs}</td><td></td><td style="text-align:right;">${fmtMoney(amt)}</td><td></td></tr></tfoot>
    </table>
    <div style="margin-top:14px;font-size:15px;border:2px solid #000;border-radius:8px;padding:10px;display:flex;justify-content:space-between;align-items:center;">
      <span><b>Total Amount (${dels.length} delivery${dels.length>1?'ies':''} — ${fR1(kg)} KG):</b></span>
      <b style="font-size:20px;">${fmtMoney(amt)}</b></div>
    <div style="margin-top:6px;font-size:12px;color:#444;">Charged at ${deliveryId?`Rs. ${(+(dels[0].rate||rateNow)).toLocaleString()}/kg`:`client rate Rs. ${rateNow.toLocaleString()}/kg`}. ${kgt.pending>0?`Baqi: ${kgt.pending} kg abhi factory mein hai.`:'Sab deliver ho chuka ✅'}</div>
    <div style="margin-top:10px;font-size:13px;border:1px solid #000;border-radius:8px;padding:10px;">
      <div style="font-weight:800;margin-bottom:4px;">💰 PAYMENT STATUS</div>
      <div style="display:flex;justify-content:space-between;padding:3px 0;"><span>Total Billed (all deliveries):</span><b>${fmtMoney(allE)}</b></div>
      <div style="display:flex;justify-content:space-between;padding:3px 0;color:green;"><span>Received so far:</span><b>${fmtMoney(allP)}</b></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0 2px;border-top:1px solid #999;font-size:17px;"><span><b>BALANCE DUE:</b></span><b style="color:${due>0?'#c00':'#16a34a'};">${fmtMoney(Math.max(0,due))}</b></div>
      ${due>0?'<div style="font-size:11px;color:#555;">Kindly arrange payment of the outstanding balance at your earliest convenience. Thank you.</div>':'<div style="font-size:11px;color:#16a34a;">All accounts settled — thank you for your business! ✅</div>'}
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:34px;font-size:13px;">
      <div style="border-top:1px solid #000;padding-top:4px;width:210px;text-align:center;">Received By (Client)</div>
      <div style="border-top:1px solid #000;padding-top:4px;width:180px;text-align:center;">For ${escapeHtml(s.shopName||'Mr Laundry')}</div></div>
    <div style="text-align:center;margin-top:14px;font-size:12px;color:#555;">Thank you for your business — ${escapeHtml(s.shopName||'Mr Laundry')} • Generated ${new Date().toLocaleString()}</div></div>`;
  const wrap=document.createElement('div');wrap.className='print-slip';wrap.innerHTML=html;
  if(typeof printElement==='function')printElement(wrap,{title:'Delivery Challan',thermal:false});
  if(typeof logAction==='function')logAction('factory.challan',`${client.name}: ${dels.length} deliveries, ${fR1(kg)}kg, ${fmtMoney(amt)}`);
}

/* ================= PRINT STATEMENT ================= */
function printFactoryStatement(){
  const client=DB.get('factoryClients',factoryState.clientId);
  if(!client){toast('Select a client','error');return;}
  const inScope=(r)=> fInPeriod(r.date||r.createdAt);
  const lp=fLastPayment(client.id);
  const entries=(DB.all('factoryEntries')||[]).filter(e=>!e._deleted&&e.clientId===client.id&&inScope(e)).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const dels=(DB.all('factoryDeliveries')||[]).filter(d=>!d._deleted&&d.clientId===client.id&&inScope(d)).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const pays=(DB.all('factoryPayments')||[]).filter(p=>!p._deleted&&p.clientId===client.id&&inScope(p)).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  // all-time money & kg totals for the summary box
  const allE=(DB.all('factoryEntries')||[]).filter(e=>!e._deleted&&e.clientId===client.id).reduce((s,e)=>s+(+e.amount||0),0);
  const allP=(DB.all('factoryPayments')||[]).filter(p=>!p._deleted&&p.clientId===client.id).reduce((s,p)=>s+(+p.amount||0),0);
  const kgt=fKgTotals(client.id);
  const s=DB.settings();
  const kg=fR1(entries.reduce((x,e)=>x+(+e.kg||0),0)),pcs=entries.reduce((x,e)=>x+(+e.pieces||0),0),amt=entries.reduce((x,e)=>x+(+e.amount||0),0);
  const dkg=fR1(dels.reduce((x,d)=>x+(+d.kg||0),0)),dpcs=dels.reduce((x,d)=>x+(+d.pieces||0),0);
  const pAmtPeriod=pays.reduce((x,p)=>x+(+p.amount||0),0);
  const lbl=fPeriodLbl();
  const rows=entries.map(e=>`<tr><td>${escapeHtml(String(e.date||'').slice(0,10))}</td><td style="text-align:right;">${+e.kg||0}</td><td style="text-align:right;">${+e.pieces||0}</td><td style="text-align:right;">${fmtMoney(+e.rate||0)}</td><td style="text-align:right;"><b>${fmtMoney(+e.amount||0)}</b></td><td style="font-size:11px;">${escapeHtml(e.note||'')}</td></tr>`).join('');
  const dRows=dels.map(d=>`<tr><td>${escapeHtml(String(d.date||'').slice(0,10))}</td><td style="text-align:right;">${fR1(d.kg)}</td><td style="text-align:right;">${+d.pieces||0}</td><td style="font-size:11px;">${escapeHtml(d.note||'')}</td></tr>`).join('');
  const html=`<div class="invoice-page" style="max-width:720px;font-size:14px;">
    <div style="text-align:center;margin-bottom:8px;">${s.logoImage?`<img src="${s.logoImage}" style="max-height:70px;object-fit:contain;background:#000;padding:6px;border-radius:6px;"/>`:''}
    <h2 style="margin:6px 0 0;">${escapeHtml(s.shopName||'Mr Laundry')}</h2><div style="font-size:12px;">${escapeHtml(s.address||'')} ${s.phone?'• '+escapeHtml(s.phone):''}</div></div>
    <div style="text-align:center;font-weight:800;letter-spacing:1px;border-top:1px solid #000;border-bottom:1px solid #000;padding:6px 0;margin:8px 0;">FACTORY LAUNDRY STATEMENT</div>
    <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:10px;"><div><b>Client:</b> ${escapeHtml(client.name)}<br>${client.phone?'📞 '+escapeHtml(client.phone):''}</div><div style="text-align:right;"><b>Period:</b> ${lbl}<br><b>Rate:</b> Rs. ${+client.rate||factoryRate()}/kg</div></div>

    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:10px;" border="1" cellpadding="6">
      <tr style="background:#f0f0f0;"><th colspan="2" style="text-align:center;">⚖️ WEIGHT ACCOUNTING (All Time)</th></tr>
      <tr><td>Total kg Received (wash ke liye lia)</td><td style="text-align:right;"><b>${kgt.recv} kg</b></td></tr>
      <tr><td>Total kg Delivered (client ko wapas dia)</td><td style="text-align:right;"><b style="color:green;">${kgt.del} kg</b></td></tr>
      <tr><td>Balance kg — abhi factory mein</td><td style="text-align:right;"><b style="color:${kgt.pending>0?'#b45309':'green'};">${kgt.pending} kg</b></td></tr>
    </table>

    <div style="font-weight:800;margin:10px 0 4px;">📋 Wash Entries — ${lbl}</div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;" border="1" cellpadding="6"><thead><tr style="background:#f0f0f0;"><th>Date</th><th style="text-align:right;">KG</th><th style="text-align:right;">Pcs</th><th style="text-align:right;">Rate</th><th style="text-align:right;">Amount</th><th>Note</th></tr></thead>
    <tbody>${rows||'<tr><td colspan="6" style="text-align:center;">No entries</td></tr>'}</tbody>
    <tfoot><tr style="font-weight:800;background:#f7f7f7;"><td>TOTAL</td><td style="text-align:right;">${kg}</td><td style="text-align:right;">${pcs}</td><td></td><td style="text-align:right;">${fmtMoney(amt)}</td><td></td></tr></tfoot></table>

    ${dels.length?`<div style="font-weight:800;margin:12px 0 4px;">📦 Deliveries — ${lbl}</div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;" border="1" cellpadding="6"><thead><tr style="background:#f0f0f0;"><th>Date</th><th style="text-align:right;">KG</th><th style="text-align:right;">Pcs</th><th>Note</th></tr></thead>
    <tbody>${dRows}</tbody>
    <tfoot><tr style="font-weight:800;background:#f7f7f7;"><td>TOTAL</td><td style="text-align:right;">${dkg}</td><td style="text-align:right;">${dpcs}</td><td></td></tr></tfoot></table>`:''}

    <div style="margin-top:14px;font-size:15px;">
      <div style="font-weight:800;margin-bottom:4px;">💰 MONEY SUMMARY</div>
      <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Total Bill Amount (period ${lbl}):</span><b>${fmtMoney(amt)}</b></div>
      <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Paid/Received (period ${lbl}):</span><b style="color:green;">${fmtMoney(pAmtPeriod)}</b></div>
      <div style="display:flex;justify-content:space-between;padding:4px 0;border-top:1px solid #999;"><span>Total Bill (all-time):</span><b>${fmtMoney(allE)}</b></div>
      <div style="display:flex;justify-content:space-between;padding:4px 0;color:green;"><span>Total Received (all-time):</span><b>${fmtMoney(allP)}</b></div>
      ${lp?`<div style="display:flex;justify-content:space-between;padding:4px 0;color:#555;font-size:12px;"><span>💳 Last payment received:</span><b>${fmtMoney(+lp.amount||0)} on ${escapeHtml(String(lp.date||'').slice(0,10))}</b></div>`:''}
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-top:2px solid #000;font-size:18px;"><span>PENDING BALANCE (Due):</span><b style="color:#c00;">${fmtMoney(allE-allP)}</b></div>
    </div>
    ${kgt.pending>0?`<div style="margin-top:8px;padding:8px;border:2px dashed #b45309;border-radius:8px;font-size:13px;text-align:center;"><b>⏳ Note:</b> ${kgt.pending} kg client ka maal abhi factory mein mojood hai — delivery baqi hai.</div>`:''}
    <div style="text-align:center;margin-top:16px;font-size:12px;color:#555;">Generated ${new Date().toLocaleString()} — Thank you, ${escapeHtml(s.shopName||'Mr Laundry')}</div></div>`;
  const wrap=document.createElement('div');wrap.className='print-slip';wrap.innerHTML=html;
  if(typeof printElement==='function')printElement(wrap,{title:'Factory Statement',thermal:false});
}
