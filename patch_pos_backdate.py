import sys

with open('assets/js/pages/pos.js', 'r') as f:
    content = f.read()

# Add Booking Date field to payment modal
old_html = """    <div class="form-row">
      <div class="field">
        <label>Total Amount</label>
        <input type="text" value="${fmtMoney(tot.total)}" readonly style="font-weight:700;font-size:16px;background:var(--primary-light);"/>
      </div>
      <div class="field">
        <label id="paidLbl">Amount Received Now</label>
        <input type="number" id="paidInput" value="${tot.total}" min="0"/>
      </div>
    </div>"""

new_html = """    <div class="form-row">
      <div class="field">
        <label>Total Amount</label>
        <input type="text" value="${fmtMoney(tot.total)}" readonly style="font-weight:700;font-size:16px;background:var(--primary-light);"/>
      </div>
      <div class="field">
        <label id="paidLbl">Amount Received Now</label>
        <input type="number" id="paidInput" value="${tot.total}" min="0"/>
      </div>
    </div>
    <div class="form-row cols-1" style="${DB.currentUser().role === 'admin' ? '' : 'display:none;'}">
      <div class="field">
        <label>🔙 Backdate Order <span style="font-weight:normal;color:#64748b;">(Optional - Leaves current date/time if empty)</span></label>
        <input type="datetime-local" id="backdateInput" />
      </div>
    </div>"""

content = content.replace(old_html, new_html)

# Add logic to save it
old_save = """        tax: tot.tax,
        total: tot.total,
        paid: actualPaid,"""

new_save = """        tax: tot.tax,
        total: tot.total,
        paid: actualPaid,
        createdAt: $('#backdateInput', m).value ? new Date($('#backdateInput', m).value).toISOString() : new Date().toISOString(),"""

content = content.replace(old_save, new_save)

with open('assets/js/pages/pos.js', 'w') as f:
    f.write(content)

