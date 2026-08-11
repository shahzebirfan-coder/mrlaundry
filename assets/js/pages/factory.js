/* ============================================================
   FACTORY / WHOLESALE (Per-KG) BUSINESS MODULE
   ------------------------------------------------------------
   Complete B2B factory management, separate from retail POS:
     • Per-KG laundry income (clients, weight entries, payments)
     • Factory expenses (salary, fuel, chemicals, utilities...)
     • Employees (name + monthly salary)
     • Investments (machines, CCTV, setup...) + recovery tracker
     • Today / Monthly views + Profit & Loss

   Tables:
     factoryClients   {id,name,phone,address,rate,createdAt}
     factoryEntries   {id,clientId,date,kg,pieces,rate,amount,note,...}
     factoryPayments  {id,clientId,date,amount,method,note,...}
     factoryEmployees {id,name,role,salary,phone,active,createdAt}
     factoryExpenses  {id,date,category,amount,note,createdAt}
     factoryInvestments {id,date,name,amount,note,createdAt}
   ============================================================ */

function factoryRate() { return +DB.settings().factoryRatePerKg || 200; }
const F_EXP_CATS = ['Salary','Fuel','Chemicals','Utilities','Maintenance','Rent','Other'];

let factoryState = { tab:'dashboard', clientId:'', month:'', range:'month' };

/* ---------- helpers ---------- */
function fMonthList() {
  const set = new Set();
  ['factoryEntries','factoryExpenses','factoryPayments','factoryInvestments'].forEach(tbl=>{
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
  return d.slice(0,7) === (factoryState.month || new Date().toISOString().slice(0,7));
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
  const expenses = (DB.all('factoryExpenses')||[]).filter(e=>!e._deleted && fInPeriod(e.date||e.createdAt)).reduce((s,e)=>s+(+e.amount||0),0);
  const invest = (DB.all('factoryInvestments')||[]).filter(e=>!e._deleted && fInPeriod(e.date||e.createdAt)).reduce((s,e)=>s+(+e.amount||0),0);
  const paymentsIn = (DB.all('factoryPayments')||[]).filter(e=>!e._deleted && fInPeriod(e.date||e.createdAt)).reduce((s,e)=>s+(+e.amount||0),0);
  return { income, kg, pcs, expenses, invest, paymentsIn, profit: income - expenses };
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
    <p class="page-sub">Wholesale laundry billing, expenses, investment & profit — separate from retail.</p>
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
      </div>
      ${factoryState.range==='month'?`<select id="fMonthSel" style="font-weight:700;">${months.map(m=>`<option value="${m}" ${factoryState.month===m?'selected':''}>${fMonthLbl(m)}</option>`).join('')}</select>`:''}
    </div>
  </div>`;
}
function fBindPeriod() {
  $$('[data-frange]').forEach(b=> b.onclick = ()=>{ factoryState.range=b.dataset.frange; renderFactoryTab(); });
  const ms = $('#fMonthSel'); if (ms) ms.onchange = e=>{ factoryState.month=e.target.value; renderFactoryTab(); };
}

/* ================= TAB: DASHBOARD ================= */
function fTabDashboard() {
  const p = fPeriod();
  const a = fAllTime();
  const periodLbl = factoryState.range==='today'?'Today':factoryState.range==='all'?'All Time':fMonthLbl(factoryState.month);
  const profitColor = p.profit>=0 ? 'var(--success)' : 'var(--danger)';
  const recoverPct = a.investment>0 ? Math.min(100, Math.round(a.recovered/a.investment*100)) : 100;

  return `
    ${fPeriodBar()}

    <div class="grid-stats" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));margin-bottom:14px;">
      <div class="stat-card"><div class="ic b1">⚖️</div><div><div class="lbl">Weight (${periodLbl})</div><div class="val">${p.kg} kg</div></div></div>
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

  const inScope = (r)=> (factoryState.range==='all') ? true : (factoryState.range==='today' ? String(r.date||r.createdAt).slice(0,10)===isoDay() : String(r.date||r.createdAt).slice(0,7)===factoryState.month);
  const entries = (DB.all('factoryEntries')||[]).filter(e=>!e._deleted && e.clientId===cid && inScope(e)).sort((a,b)=>String(b.date||b.createdAt).localeCompare(String(a.date||a.createdAt)));
  const pays = (DB.all('factoryPayments')||[]).filter(p=>!p._deleted && p.clientId===cid && inScope(p)).sort((a,b)=>String(b.date||b.createdAt).localeCompare(String(a.date||a.createdAt)));
  // client-wide totals (all time, for due)
  const allEntries = (DB.all('factoryEntries')||[]).filter(e=>!e._deleted && e.clientId===cid);
  const allPays = (DB.all('factoryPayments')||[]).filter(p=>!p._deleted && p.clientId===cid);
  const totalBill = allEntries.reduce((s,e)=>s+(+e.amount||0),0);
  const totalPaid = allPays.reduce((s,p)=>s+(+p.amount||0),0);
  const kg = entries.reduce((s,e)=>s+(+e.kg||0),0), pcs = entries.reduce((s,e)=>s+(+e.pieces||0),0), amt = entries.reduce((s,e)=>s+(+e.amount||0),0);

  return `
    <div class="card" style="padding:12px;margin-bottom:14px;">
      <div class="filter-bar" style="gap:10px;flex-wrap:wrap;align-items:center;">
        <label style="display:flex;align-items:center;gap:6px;font-weight:700;">Client:
          <select id="fClient" style="min-width:200px;">
            ${clients.length?clients.map(c=>`<option value="${c.id}" ${cid===c.id?'selected':''}>🏭 ${escapeHtml(c.name)}</option>`).join(''):'<option value="">— none —</option>'}
          </select></label>
        <div style="display:flex;gap:6px;background:var(--surface-alt);border-radius:10px;padding:4px;">
          <button class="btn ${factoryState.range==='today'?'btn-primary':'btn-ghost'} btn-sm" data-frange="today">Today</button>
          <button class="btn ${factoryState.range==='month'?'btn-primary':'btn-ghost'} btn-sm" data-frange="month">Month</button>
          <button class="btn ${factoryState.range==='all'?'btn-primary':'btn-ghost'} btn-sm" data-frange="all">All</button>
        </div>
        ${factoryState.range==='month'?`<select id="fMonthSel">${months.map(m=>`<option value="${m}" ${factoryState.month===m?'selected':''}>${fMonthLbl(m)}</option>`).join('')}</select>`:''}
        <button class="btn btn-secondary btn-sm" id="fAddClient">+ New Client</button>
        <button class="btn btn-primary" id="fAddEntry" style="margin-left:auto;">➕ Add Weight</button>
        <button class="btn btn-success" id="fAddPay">💰 Payment</button>
        <button class="btn btn-secondary btn-sm" id="fPrint">🖨️ Statement</button>
      </div>
    </div>

    ${!cid ? '<div class="card" style="text-align:center;padding:30px;color:var(--text-soft);">Add a factory client to begin.</div>' : `
    <div class="grid-stats" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:14px;">
      <div class="stat-card"><div class="ic b1">⚖️</div><div><div class="lbl">Weight</div><div class="val">${kg} kg</div></div></div>
      <div class="stat-card"><div class="ic b2">👕</div><div><div class="lbl">Pieces</div><div class="val">${pcs}</div></div></div>
      <div class="stat-card"><div class="ic b3">💰</div><div><div class="lbl">Bill (period)</div><div class="val">${fmtMoney(amt)}</div></div></div>
      <div class="stat-card"><div class="ic b4">⏰</div><div><div class="lbl">Total Due (all time)</div><div class="val" style="color:var(--danger);">${fmtMoney(totalBill-totalPaid)}</div></div></div>
    </div>

    <div class="card" style="padding:0;overflow:hidden;margin-bottom:14px;">
      <div style="padding:10px 14px;font-weight:800;background:var(--surface-alt);">📋 Weight Entries</div>
      <table class="tbl"><thead><tr><th>Date</th><th>KG</th><th>Pieces</th><th>Rate</th><th>Amount</th><th>Note</th><th></th></tr></thead>
      <tbody>${entries.length?entries.map(e=>`<tr>
        <td>${escapeHtml(String(e.date||'').slice(0,10))}</td><td><b>${+e.kg||0} kg</b></td><td>${+e.pieces||0}</td>
        <td>${fmtMoney(+e.rate||0)}</td><td><b style="color:var(--primary);">${fmtMoney(+e.amount||0)}</b></td>
        <td style="font-size:12px;color:var(--text-soft);">${escapeHtml(e.note||'')}</td>
        <td><button class="btn btn-danger btn-sm" data-del-e="${e.id}">🗑️</button></td></tr>`).join(''):'<tr><td colspan="7"><div class="empty" style="padding:20px;"><div class="emoji">⚖️</div><h4>No entries</h4></div></td></tr>'}</tbody></table>
    </div>

    <div class="card" style="padding:0;overflow:hidden;">
      <div style="padding:10px 14px;font-weight:800;background:var(--surface-alt);">💵 Payments</div>
      <table class="tbl"><thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Note</th><th></th></tr></thead>
      <tbody>${pays.length?pays.map(p=>`<tr><td>${escapeHtml(String(p.date||'').slice(0,10))}</td><td><b style="color:var(--success);">${fmtMoney(+p.amount||0)}</b></td><td>${escapeHtml(p.method||'cash')}</td><td style="font-size:12px;color:var(--text-soft);">${escapeHtml(p.note||'')}</td><td><button class="btn btn-danger btn-sm" data-del-p="${p.id}">🗑️</button></td></tr>`).join(''):'<tr><td colspan="5"><div class="empty" style="padding:16px;"><div class="emoji">💵</div><h4>No payments</h4></div></td></tr>'}</tbody></table>
    </div>`}
  `;
}
function fBindEntries() {
  fBindPeriod();
  const cs=$('#fClient'); if(cs) cs.onchange = e=>{ factoryState.clientId=e.target.value; renderFactoryTab(); };
  const a=$('#fAddClient'); if(a) a.onclick=()=>openFactoryClientForm();
  const ae=$('#fAddEntry'); if(ae) ae.onclick=()=>{ if(!factoryState.clientId){toast('Add a client first','error');return;} openFactoryEntryForm(); };
  const ap=$('#fAddPay'); if(ap) ap.onclick=()=>{ if(!factoryState.clientId){toast('Add a client first','error');return;} openFactoryPaymentForm(); };
  const pr=$('#fPrint'); if(pr) pr.onclick=()=>printFactoryStatement();
  $$('[data-del-e]').forEach(b=>b.onclick=()=>confirmDialog('Delete this entry?',()=>{DB.remove('factoryEntries',b.dataset.delE);toast('Deleted','success');renderFactoryTab();}));
  $$('[data-del-p]').forEach(b=>b.onclick=()=>confirmDialog('Delete this payment?',()=>{DB.remove('factoryPayments',b.dataset.delP);toast('Deleted','success');renderFactoryTab();}));
}

/* ================= TAB: EXPENSES ================= */
function fTabExpenses() {
  const inScope=(r)=> (factoryState.range==='all')?true:(factoryState.range==='today'?String(r.date||r.createdAt).slice(0,10)===isoDay():String(r.date||r.createdAt).slice(0,7)===factoryState.month);
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
      <tbody>${list.length?list.map(e=>`<tr><td>${escapeHtml(String(e.date||'').slice(0,10))}</td><td>${escapeHtml(e.category||'Other')}</td><td><b style="color:var(--danger);">${fmtMoney(+e.amount||0)}</b></td><td style="font-size:12px;color:var(--text-soft);">${escapeHtml(e.note||'')}</td><td><button class="btn btn-danger btn-sm" data-del-x="${e.id}">🗑️</button></td></tr>`).join(''):'<tr><td colspan="5"><div class="empty" style="padding:20px;"><div class="emoji">💸</div><h4>No expenses</h4></div></td></tr>'}</tbody></table>
    </div>`;
}
function fBindExpenses() {
  fBindPeriod();
  const a=$('#fAddExp'); if(a) a.onclick=()=>openFactoryExpenseForm();
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
      <tbody>${list.length?list.map(e=>`<tr><td>${escapeHtml(String(e.date||'').slice(0,10))}</td><td><b>${escapeHtml(e.name||'')}</b></td><td><b>${fmtMoney(+e.amount||0)}</b></td><td style="font-size:12px;color:var(--text-soft);">${escapeHtml(e.note||'')}</td><td><button class="btn btn-danger btn-sm" data-del-i="${e.id}">🗑️</button></td></tr>`).join(''):'<tr><td colspan="5"><div class="empty" style="padding:20px;"><div class="emoji">🏗️</div><h4>No investments yet</h4></div></td></tr>'}</tbody></table>
    </div>`;
}
function fBindInvestment() {
  const a=$('#fAddInv'); if(a) a.onclick=()=>openFactoryInvestmentForm();
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
      <tbody>${list.length?list.map(e=>`<tr><td><b>${escapeHtml(e.name||'')}</b></td><td>${escapeHtml(e.role||'')}</td><td><b>${fmtMoney(+e.salary||0)}</b></td><td>${escapeHtml(e.phone||'')}</td><td>${e.active===false?'<span class="badge" style="background:#fee2e2;color:#991b1b;">Inactive</span>':'<span class="badge paid">Active</span>'}</td><td style="white-space:nowrap;"><button class="btn btn-secondary btn-sm" data-pay-emp="${e.id}">💰 Pay Salary</button> <button class="btn btn-ghost btn-sm" data-edit-emp="${e.id}">✏️</button> <button class="btn btn-danger btn-sm" data-del-emp="${e.id}">🗑️</button></td></tr>`).join(''):'<tr><td colspan="6"><div class="empty" style="padding:20px;"><div class="emoji">👷</div><h4>No employees yet</h4></div></td></tr>'}</tbody></table>
    </div>
    <div style="font-size:12px;color:var(--text-soft);margin-top:8px;">💡 "Pay Salary" ek expense (Salary category) bana deta hai.</div>`;
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
  openModal(`<h3>${existing?'Edit':'New'} Factory Client</h3>
    <div class="form-row cols-1"><div class="field"><label>Client / Factory Name *</label><input id="fcName" value="${escapeHtml(c.name)}"/></div></div>
    <div class="form-row"><div class="field"><label>Phone</label><input id="fcPhone" value="${escapeHtml(c.phone||'')}"/></div>
    <div class="field"><label>Rate/KG override (optional)</label><input type="number" id="fcRate" value="${c.rate||''}" placeholder="${factoryRate()}"/></div></div>
    <div class="form-row cols-1"><div class="field"><label>Address</label><input id="fcAddr" value="${escapeHtml(c.address||'')}"/></div></div>
    <div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="s">Save</button></div>`,
  {onOpen(m){$('#s',m).onclick=()=>{const name=$('#fcName',m).value.trim();if(!name){toast('Name required','error');return;}
    const data={name,phone:$('#fcPhone',m).value.trim(),address:$('#fcAddr',m).value.trim(),rate:+$('#fcRate',m).value||0};
    let saved=existing?DB.update('factoryClients',existing.id,data):DB.insert('factoryClients',data);
    factoryState.clientId=saved.id;closeModal();toast('Saved','success');renderFactory();};}});
}
function openFactoryEntryForm(){
  const client=DB.get('factoryClients',factoryState.clientId)||{};
  const rate=+client.rate||factoryRate();
  openModal(`<h3>➕ Add Weight — ${escapeHtml(client.name||'')}</h3>
    <div class="form-row"><div class="field"><label>Date</label><input type="date" id="eD" value="${isoDay()}"/></div><div class="field"><label>Weight (KG) *</label><input type="number" step="0.1" id="eK" placeholder="25"/></div></div>
    <div class="form-row"><div class="field"><label>Pieces</label><input type="number" id="eP" placeholder="60"/></div><div class="field"><label>Rate/KG</label><input type="number" id="eR" value="${rate}"/></div></div>
    <div class="form-row cols-1"><div class="field"><label>Note</label><input id="eN" placeholder="Bag #, remarks"/></div></div>
    <div id="eC" style="background:var(--primary-light);border-radius:10px;padding:12px;text-align:center;font-weight:800;font-size:18px;color:var(--primary);margin-bottom:12px;">Amount: Rs. 0</div>
    <div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="s">💾 Save</button></div>`,
  {onOpen(m){const calc=()=>{const k=+$('#eK',m).value||0,r=+$('#eR',m).value||0;$('#eC',m).textContent=`Amount: ${fmtMoney(Math.round(k*r))}`;};['#eK','#eR'].forEach(i=>$(i,m).oninput=calc);calc();
    $('#s',m).onclick=()=>{const k=+$('#eK',m).value||0,r=+$('#eR',m).value||0;if(k<=0){toast('Enter KG','error');return;}
      DB.insert('factoryEntries',{clientId:factoryState.clientId,date:$('#eD',m).value||isoDay(),kg:k,pieces:+$('#eP',m).value||0,rate:r,amount:Math.round(k*r),note:$('#eN',m).value.trim(),branchId:(typeof getActiveBranchId==='function')?getActiveBranchId():'main'});
      if(typeof logAction==='function')logAction('factory.entry',`${client.name}: ${k}kg`);closeModal();toast('Saved','success');renderFactoryTab();};}});
}
function openFactoryPaymentForm(){
  const client=DB.get('factoryClients',factoryState.clientId)||{};
  const allE=(DB.all('factoryEntries')||[]).filter(e=>!e._deleted&&e.clientId===factoryState.clientId).reduce((s,e)=>s+(+e.amount||0),0);
  const allP=(DB.all('factoryPayments')||[]).filter(p=>!p._deleted&&p.clientId===factoryState.clientId).reduce((s,p)=>s+(+p.amount||0),0);
  const due=allE-allP;
  openModal(`<h3>💰 Payment — ${escapeHtml(client.name||'')}</h3>
    <div style="background:var(--surface-alt);border-radius:8px;padding:10px;margin-bottom:12px;font-size:13px;">Bill: <b>${fmtMoney(allE)}</b> • Paid: <b>${fmtMoney(allP)}</b> • <span style="color:var(--danger);">Due: <b>${fmtMoney(due)}</b></span></div>
    <div class="form-row"><div class="field"><label>Date</label><input type="date" id="pD" value="${isoDay()}"/></div><div class="field"><label>Amount *</label><input type="number" id="pA" value="${due>0?due:''}"/></div></div>
    <div class="form-row"><div class="field"><label>Method</label><select id="pM"><option value="cash">Cash</option><option value="bank">Bank</option><option value="jazzcash">JazzCash</option><option value="easypaisa">EasyPaisa</option><option value="cheque">Cheque</option></select></div><div class="field"><label>Note</label><input id="pN"/></div></div>
    <div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-success" id="s">💾 Record</button></div>`,
  {onOpen(m){$('#s',m).onclick=()=>{const a=+$('#pA',m).value||0;if(a<=0){toast('Enter amount','error');return;}
    DB.insert('factoryPayments',{clientId:factoryState.clientId,date:$('#pD',m).value||isoDay(),amount:a,method:$('#pM',m).value,note:$('#pN',m).value.trim()});
    if(typeof logAction==='function')logAction('factory.payment',`${client.name}: ${fmtMoney(a)}`);closeModal();toast('Recorded','success');renderFactoryTab();};}});
}
function openFactoryExpenseForm(preset){
  preset=preset||{};
  openModal(`<h3>➕ Factory Expense</h3>
    <div class="form-row"><div class="field"><label>Date</label><input type="date" id="xD" value="${isoDay()}"/></div>
    <div class="field"><label>Category</label><select id="xC">${F_EXP_CATS.map(c=>`<option value="${c}" ${preset.category===c?'selected':''}>${c}</option>`).join('')}</select></div></div>
    <div class="form-row"><div class="field"><label>Amount *</label><input type="number" id="xA" value="${preset.amount||''}"/></div>
    <div class="field"><label>Note</label><input id="xN" value="${escapeHtml(preset.note||'')}"/></div></div>
    <div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="s">💾 Save</button></div>`,
  {onOpen(m){$('#s',m).onclick=()=>{const a=+$('#xA',m).value||0;if(a<=0){toast('Enter amount','error');return;}
    DB.insert('factoryExpenses',{date:$('#xD',m).value||isoDay(),category:$('#xC',m).value,amount:a,note:$('#xN',m).value.trim(),branchId:(typeof getActiveBranchId==='function')?getActiveBranchId():'main'});
    if(typeof logAction==='function')logAction('factory.expense',`${$('#xC',m).value}: ${fmtMoney(a)}`);closeModal();toast('Saved','success');renderFactoryTab();};}});
}
function openFactoryInvestmentForm(){
  openModal(`<h3>🏗️ Add Investment</h3>
    <div class="form-row"><div class="field"><label>Date</label><input type="date" id="iD" value="${isoDay()}"/></div><div class="field"><label>Amount *</label><input type="number" id="iA" placeholder="e.g. 150000"/></div></div>
    <div class="form-row cols-1"><div class="field"><label>Item / Name *</label><input id="iN" placeholder="e.g. Washing Machine, CCTV, Setup"/></div></div>
    <div class="form-row cols-1"><div class="field"><label>Note</label><input id="iNo"/></div></div>
    <div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="s">💾 Save</button></div>`,
  {onOpen(m){$('#s',m).onclick=()=>{const a=+$('#iA',m).value||0,name=$('#iN',m).value.trim();if(a<=0||!name){toast('Enter item & amount','error');return;}
    DB.insert('factoryInvestments',{date:$('#iD',m).value||isoDay(),name,amount:a,note:$('#iNo',m).value.trim()});
    if(typeof logAction==='function')logAction('factory.investment',`${name}: ${fmtMoney(a)}`);closeModal();toast('Saved','success');renderFactoryTab();};}});
}
function openFactoryEmployeeForm(existing){
  const e=existing||{name:'',role:'',salary:'',phone:'',active:true};
  openModal(`<h3>${existing?'Edit':'Add'} Employee</h3>
    <div class="form-row"><div class="field"><label>Name *</label><input id="mN" value="${escapeHtml(e.name)}"/></div><div class="field"><label>Role</label><input id="mR" value="${escapeHtml(e.role||'')}" placeholder="Washer, Quality, Supervisor"/></div></div>
    <div class="form-row"><div class="field"><label>Monthly Salary *</label><input type="number" id="mS" value="${e.salary||''}"/></div><div class="field"><label>Phone</label><input id="mP" value="${escapeHtml(e.phone||'')}"/></div></div>
    <div class="form-row cols-1"><div class="field"><label><input type="checkbox" id="mA" ${e.active!==false?'checked':''}/> Active</label></div></div>
    <div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="s">Save</button></div>`,
  {onOpen(m){$('#s',m).onclick=()=>{const name=$('#mN',m).value.trim();if(!name){toast('Name required','error');return;}
    const data={name,role:$('#mR',m).value.trim(),salary:+$('#mS',m).value||0,phone:$('#mP',m).value.trim(),active:$('#mA',m).checked};
    existing?DB.update('factoryEmployees',existing.id,data):DB.insert('factoryEmployees',data);closeModal();toast('Saved','success');renderFactoryTab();};}});
}

/* ================= PRINT STATEMENT ================= */
function printFactoryStatement(){
  const client=DB.get('factoryClients',factoryState.clientId);
  if(!client){toast('Select a client','error');return;}
  const month=factoryState.range==='all'?'':factoryState.month;
  const inScope=(r)=> month? String(r.date||r.createdAt).slice(0,7)===month : true;
  const entries=(DB.all('factoryEntries')||[]).filter(e=>!e._deleted&&e.clientId===client.id&&inScope(e)).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const allE=(DB.all('factoryEntries')||[]).filter(e=>!e._deleted&&e.clientId===client.id).reduce((s,e)=>s+(+e.amount||0),0);
  const allP=(DB.all('factoryPayments')||[]).filter(p=>!p._deleted&&p.clientId===client.id).reduce((s,p)=>s+(+p.amount||0),0);
  const s=DB.settings();
  const kg=entries.reduce((x,e)=>x+(+e.kg||0),0),pcs=entries.reduce((x,e)=>x+(+e.pieces||0),0),amt=entries.reduce((x,e)=>x+(+e.amount||0),0);
  const lbl=month?fMonthLbl(month):'All Time';
  const rows=entries.map(e=>`<tr><td>${escapeHtml(String(e.date||'').slice(0,10))}</td><td style="text-align:right;">${+e.kg||0}</td><td style="text-align:right;">${+e.pieces||0}</td><td style="text-align:right;">${fmtMoney(+e.rate||0)}</td><td style="text-align:right;"><b>${fmtMoney(+e.amount||0)}</b></td></tr>`).join('');
  const html=`<div class="invoice-page" style="max-width:720px;font-size:14px;">
    <div style="text-align:center;margin-bottom:8px;">${s.logoImage?`<img src="${s.logoImage}" style="max-height:70px;object-fit:contain;background:#000;padding:6px;border-radius:6px;"/>`:''}
    <h2 style="margin:6px 0 0;">${escapeHtml(s.shopName||'Mr Laundry')}</h2><div style="font-size:12px;">${escapeHtml(s.address||'')} ${s.phone?'• '+escapeHtml(s.phone):''}</div></div>
    <div style="text-align:center;font-weight:800;letter-spacing:1px;border-top:1px solid #000;border-bottom:1px solid #000;padding:6px 0;margin:8px 0;">FACTORY LAUNDRY STATEMENT</div>
    <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:10px;"><div><b>Client:</b> ${escapeHtml(client.name)}<br>${client.phone?'📞 '+escapeHtml(client.phone):''}</div><div style="text-align:right;"><b>Period:</b> ${lbl}<br><b>Rate:</b> Rs. ${factoryRate()}/kg</div></div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;" border="1" cellpadding="6"><thead><tr style="background:#f0f0f0;"><th>Date</th><th style="text-align:right;">KG</th><th style="text-align:right;">Pcs</th><th style="text-align:right;">Rate</th><th style="text-align:right;">Amount</th></tr></thead>
    <tbody>${rows||'<tr><td colspan="5" style="text-align:center;">No entries</td></tr>'}</tbody>
    <tfoot><tr style="font-weight:800;background:#f7f7f7;"><td>TOTAL</td><td style="text-align:right;">${kg}</td><td style="text-align:right;">${pcs}</td><td></td><td style="text-align:right;">${fmtMoney(amt)}</td></tr></tfoot></table>
    <div style="margin-top:14px;font-size:15px;"><div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Total Bill (all-time):</span><b>${fmtMoney(allE)}</b></div>
    <div style="display:flex;justify-content:space-between;padding:4px 0;color:green;"><span>Paid:</span><b>${fmtMoney(allP)}</b></div>
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-top:2px solid #000;font-size:18px;"><span>DUE:</span><b style="color:#c00;">${fmtMoney(allE-allP)}</b></div></div>
    <div style="text-align:center;margin-top:16px;font-size:12px;color:#555;">Thank you — ${escapeHtml(s.shopName||'Mr Laundry')}</div></div>`;
  const wrap=document.createElement('div');wrap.className='print-slip';wrap.innerHTML=html;
  if(typeof printElement==='function')printElement(wrap,{title:'Factory Statement',thermal:false});
}
