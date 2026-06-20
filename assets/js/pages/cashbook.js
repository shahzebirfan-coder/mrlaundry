/* ===================== DAILY CASH RECONCILIATION ===================== */
function renderCashbook() {
  const today = isoDay();
  const content = `
    <h1 class="page-title">💵 Cash Book / Daily Reconciliation</h1>
    <p class="page-sub">End-of-day cash counting. Match expected cash vs actual cash to detect discrepancies.</p>

    <div class="filter-bar">
      <label>Date <input type="date" id="cbDate" value="${today}"/></label>
      <button class="btn btn-primary" id="closeDayBtn">📕 Close This Day</button>
    </div>

    <div id="cbContent"></div>
  `;
  $('#app').innerHTML = renderLayout('cashbook', content);
  bindLayout();
  $('#cbDate').onchange = renderCashbookContent;
  $('#closeDayBtn').onclick = openCloseDayDialog;
  renderCashbookContent();
}

function renderCashbookContent() {
  const date = $('#cbDate').value || isoDay();
  const orders = DB.all('orders').filter(o => o.createdAt.slice(0,10) === date);
  const expenses = DB.all('expenses').filter(e => e.date === date);
  const closures = DB.all('dayClosures').filter(c => c.date === date);
  const lastClosure = closures.sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];

  // Cash payments only (excluding card/bank/online)
  const cashOrders = orders.filter(o => (o.paymentMethod||'cash') === 'cash');
  const cashIn = cashOrders.reduce((s,o)=>s+(o.paid||0), 0);
  const cashExpenses = expenses.reduce((s,e)=>s+(e.amount||0), 0);

  // Non-cash sales
  const cardIn = orders.filter(o=>o.paymentMethod==='card').reduce((s,o)=>s+(o.paid||0),0);
  const bankIn = orders.filter(o=>o.paymentMethod==='bank').reduce((s,o)=>s+(o.paid||0),0);
  const onlineIn = orders.filter(o=>o.paymentMethod==='online').reduce((s,o)=>s+(o.paid||0),0);
  const totalSales = orders.reduce((s,o)=>s+(o.paid||0),0);

  const opening = lastClosure ? lastClosure.openingCash : 0;
  const expected = opening + cashIn - cashExpenses;

  $('#cbContent').innerHTML = `
    <div class="grid-stats" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));">
      <div class="stat-card"><div class="ic b1">📥</div><div><div class="lbl">Opening Cash</div><div class="val">${fmtMoney(opening)}</div></div></div>
      <div class="stat-card"><div class="ic b2">💵</div><div><div class="lbl">Cash Sales</div><div class="val" style="color:var(--success);">${fmtMoney(cashIn)}</div></div></div>
      <div class="stat-card"><div class="ic b3">💸</div><div><div class="lbl">Cash Expenses</div><div class="val" style="color:var(--danger);">${fmtMoney(cashExpenses)}</div></div></div>
      <div class="stat-card"><div class="ic b4">📊</div><div><div class="lbl">Expected Cash in Drawer</div><div class="val" style="color:var(--primary);">${fmtMoney(expected)}</div></div></div>
    </div>

    <div style="display:grid;gap:20px;grid-template-columns:1fr 1fr;">
      <div class="card">
        <div class="card-header"><h3>💵 Cash Movement</h3></div>
        <table class="tbl">
          <tr><td>Opening Cash:</td><td style="text-align:right;"><b>${fmtMoney(opening)}</b></td></tr>
          <tr><td>+ Cash Sales (${cashOrders.length} orders):</td><td style="text-align:right;color:var(--success);"><b>+${fmtMoney(cashIn)}</b></td></tr>
          <tr><td>− Cash Expenses (${expenses.length} items):</td><td style="text-align:right;color:var(--danger);"><b>−${fmtMoney(cashExpenses)}</b></td></tr>
          <tr style="border-top:2px solid var(--border);"><td style="padding-top:10px;"><b>Expected Cash:</b></td><td style="text-align:right;padding-top:10px;font-size:18px;color:var(--primary);"><b>${fmtMoney(expected)}</b></td></tr>
        </table>
      </div>

      <div class="card">
        <div class="card-header"><h3>📊 All Payments Today</h3></div>
        <table class="tbl">
          <tr><td>💵 Cash:</td><td style="text-align:right;"><b>${fmtMoney(cashIn)}</b></td></tr>
          <tr><td>💳 Card:</td><td style="text-align:right;"><b>${fmtMoney(cardIn)}</b></td></tr>
          <tr><td>🏦 Bank Transfer:</td><td style="text-align:right;"><b>${fmtMoney(bankIn)}</b></td></tr>
          <tr><td>📱 JazzCash/Easypaisa:</td><td style="text-align:right;"><b>${fmtMoney(onlineIn)}</b></td></tr>
          <tr style="border-top:2px solid var(--border);"><td style="padding-top:10px;"><b>Total Collected:</b></td><td style="text-align:right;padding-top:10px;font-size:18px;color:var(--success);"><b>${fmtMoney(totalSales)}</b></td></tr>
        </table>
      </div>
    </div>

    ${closures.length ? `
      <div class="card" style="margin-top:20px;">
        <div class="card-header"><h3>📕 Day Closures for ${date}</h3></div>
        <table class="tbl">
          <thead><tr><th>Time</th><th>Closed By</th><th>Expected</th><th>Actual Counted</th><th>Difference</th><th>Note</th></tr></thead>
          <tbody>${closures.map(cl => {
            const diff = (cl.actualCash||0) - (cl.expectedCash||0);
            return `<tr>
              <td>${fmtDate(cl.createdAt)}</td>
              <td>${escapeHtml(cl.userName||'-')}</td>
              <td>${fmtMoney(cl.expectedCash)}</td>
              <td><b>${fmtMoney(cl.actualCash)}</b></td>
              <td><b style="color:${diff===0?'var(--success)':(diff>0?'var(--warning)':'var(--danger)')};">${diff>0?'+':''}${fmtMoney(diff)}</b></td>
              <td>${escapeHtml(cl.note||'-')}</td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>
    ` : ''}
  `;
}

function openCloseDayDialog() {
  const date = $('#cbDate').value || isoDay();
  const orders = DB.all('orders').filter(o => o.createdAt.slice(0,10) === date);
  const expenses = DB.all('expenses').filter(e => e.date === date);
  const closures = DB.all('dayClosures').filter(c => c.date === date);
  const lastClosure = closures.sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
  const opening = lastClosure ? lastClosure.openingCash : 0;
  const cashIn = orders.filter(o=>(o.paymentMethod||'cash')==='cash').reduce((s,o)=>s+(o.paid||0), 0);
  const cashExpenses = expenses.reduce((s,e)=>s+(e.amount||0), 0);
  const expected = opening + cashIn - cashExpenses;

  openModal(`
    <h3>📕 Close Day — ${date}</h3>
    <p class="sub">Count the actual cash in your drawer and enter it below. System will calculate the difference.</p>

    <div style="background:var(--primary-light);padding:14px;border-radius:10px;margin-bottom:14px;text-align:center;">
      <div style="font-size:12px;color:var(--text-soft);">Expected Cash in Drawer</div>
      <div style="font-size:28px;font-weight:900;color:var(--primary);">${fmtMoney(expected)}</div>
    </div>

    <div class="form-row">
      <div class="field"><label>Actual Cash Counted (Rs.) *</label><input type="number" id="actualCash" value="${expected}" min="0" autofocus style="font-size:18px;font-weight:700;"/></div>
      <div class="field"><label>Opening Cash for Tomorrow (Rs.)</label><input type="number" id="openTomorrow" value="${expected}" min="0"/></div>
    </div>
    <div id="diffLine" style="padding:12px;background:var(--surface-alt);border-radius:8px;margin-bottom:10px;text-align:center;font-weight:700;font-size:15px;"></div>
    <div class="form-row cols-1">
      <div class="field"><label>Notes (optional)</label><input id="closeNote" placeholder="e.g. Cashier handover, short by Rs.50, etc."/></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="saveBtn">📕 Save Closure</button>
    </div>
  `, { onOpen(m){
    const updateDiff = () => {
      const actual = +$('#actualCash', m).value || 0;
      const diff = actual - expected;
      let txt;
      if (diff === 0) txt = '<span style="color:var(--success);">✅ Cash matches perfectly!</span>';
      else if (diff > 0) txt = `<span style="color:var(--warning);">⚠️ Surplus: +${fmtMoney(diff)} (extra cash)</span>`;
      else txt = `<span style="color:var(--danger);">❌ Short by ${fmtMoney(Math.abs(diff))}</span>`;
      $('#diffLine', m).innerHTML = txt;
    };
    updateDiff();
    $('#actualCash', m).oninput = updateDiff;
    $('#saveBtn', m).onclick = () => {
      const actual = +$('#actualCash', m).value || 0;
      const openTomorrow = +$('#openTomorrow', m).value || 0;
      DB.insert('dayClosures', {
        date,
        expectedCash: expected,
        actualCash: actual,
        difference: actual - expected,
        cashSales: cashIn,
        cashExpenses: cashExpenses,
        openingCash: openTomorrow,
        note: $('#closeNote', m).value.trim(),
        userId: DB.currentUser().id,
        userName: DB.currentUser().name
      });
      closeModal(); toast('Day closed successfully','success'); renderCashbookContent();
      if (typeof logAction === 'function') logAction('day.close', `${date}: ${fmtMoney(actual)}`);
      if (typeof triggerGDriveOnDayClose === 'function') triggerGDriveOnDayClose();
    };
  }});
}
