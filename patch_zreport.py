import sys

with open('assets/js/pages/cashbook.js', 'r') as f:
    content = f.read()

# Modify the openCloseDayDialog to include Print Z-Report
old_footer = """    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="saveBtn">📕 Save Closure</button>
    </div>"""

new_footer = """    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-warning" id="printZBtn" style="display:none;">🖨️ Print Z-Report</button>
      <button class="btn btn-primary" id="saveBtn">📕 Save Closure</button>
    </div>"""

content = content.replace(old_footer, new_footer)

old_save = """    $('#saveBtn', m).onclick = () => {
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
    };"""

new_save = """    
    let savedClosureId = null;
    $('#saveBtn', m).onclick = () => {
      const actual = +$('#actualCash', m).value || 0;
      const openTomorrow = +$('#openTomorrow', m).value || 0;
      const closureData = {
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
      };
      const rec = DB.insert('dayClosures', closureData);
      savedClosureId = rec.id;
      
      $('#saveBtn', m).style.display = 'none';
      $('#printZBtn', m).style.display = 'inline-flex';
      
      toast('Day closed successfully','success'); renderCashbookContent();
      if (typeof logAction === 'function') logAction('day.close', `${date}: ${fmtMoney(actual)}`);
      if (typeof triggerGDriveOnDayClose === 'function') triggerGDriveOnDayClose();
    };

    $('#printZBtn', m).onclick = () => {
      if (!savedClosureId) return;
      printZReport(savedClosureId);
      closeModal();
    };"""

content = content.replace(old_save, new_save)

zreport_logic = """
function printZReport(closureId) {
  const closure = DB.get('dayClosures', closureId);
  if (!closure) return;
  const s = DB.settings();
  
  const html = `
    <div style="font-family:sans-serif;width:280px;padding:10px;color:#000;">
      <h2 style="text-align:center;margin:0;font-size:22px;font-weight:900;">${escapeHtml(s.shopName)}</h2>
      <div style="text-align:center;font-size:16px;font-weight:bold;margin:4px 0 10px;border-bottom:2px dashed #000;padding-bottom:4px;">
        Z-REPORT (DAY CLOSURE)
      </div>
      <div style="font-size:13px;margin-bottom:14px;border-bottom:1px dashed #000;padding-bottom:8px;">
        <b>Date:</b> ${closure.date}<br>
        <b>Time:</b> ${new Date(closure.createdAt).toLocaleTimeString()}<br>
        <b>Cashier:</b> ${escapeHtml(closure.userName)}
      </div>
      
      <table style="width:100%;font-size:14px;margin-bottom:10px;border-collapse:collapse;">
        <tr><td style="padding:2px 0;">Opening Cash</td><td style="text-align:right;">${fmtMoney(closure.expectedCash - closure.cashSales + closure.cashExpenses)}</td></tr>
        <tr><td style="padding:2px 0;">+ Cash Sales</td><td style="text-align:right;">${fmtMoney(closure.cashSales)}</td></tr>
        <tr><td style="padding:2px 0;">- Cash Expenses</td><td style="text-align:right;color:#000;">${fmtMoney(closure.cashExpenses)}</td></tr>
        <tr style="border-top:1px solid #000;"><td style="padding:6px 0;font-weight:bold;">Expected Drawer</td><td style="text-align:right;font-weight:bold;">${fmtMoney(closure.expectedCash)}</td></tr>
      </table>
      
      <div style="border:2px solid #000;border-radius:6px;padding:8px;margin-bottom:10px;">
        <table style="width:100%;font-size:15px;font-weight:bold;">
          <tr><td>Actual Counted:</td><td style="text-align:right;">${fmtMoney(closure.actualCash)}</td></tr>
          <tr><td style="padding-top:4px;">Difference:</td><td style="text-align:right;padding-top:4px;">${closure.difference < 0 ? '-' : (closure.difference > 0 ? '+' : '')}${fmtMoney(Math.abs(closure.difference))}</td></tr>
        </table>
      </div>

      <table style="width:100%;font-size:13px;margin-bottom:10px;">
        <tr><td><b>Opening for Tomorrow:</b></td><td style="text-align:right;">${fmtMoney(closure.openingCash)}</td></tr>
      </table>
      
      ${closure.note ? `<div style="font-size:12px;font-style:italic;margin-top:10px;border-top:1px dashed #000;padding-top:6px;">Notes: ${escapeHtml(closure.note)}</div>` : ''}
      
      <div style="text-align:center;font-size:10px;margin-top:14px;">
        End of Shift Report - Powered by Mr Laundry POS
      </div>
    </div>
  `;
  
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  if (typeof printElement === 'function') printElement(wrap, { title: 'Z-Report' });
}
"""

content += zreport_logic

with open('assets/js/pages/cashbook.js', 'w') as f:
    f.write(content)

