import sys

with open('assets/js/pages/ledger.js', 'r') as f:
    content = f.read()

old_ledger_header = """    <h3>📜 ${escapeHtml(c.name)} — Full Ledger</h3>
    <div style="display:flex;flex-wrap:wrap;gap:10px;font-size:13px;color:var(--text-soft);margin-bottom:10px;">
      <div>📞 ${escapeHtml(c.phone||'-')}</div>
      ${c.loyaltyActive?`<div>⭐ ${escapeHtml(c.loyaltyNo)} (${c.loyaltyDiscountPercent}%)</div>`:''}
      ${c.address?`<div>🏠 ${escapeHtml(c.address)}</div>`:''}
    </div>"""

new_ledger_header = """    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">
      <div>
        <h3>📜 ${escapeHtml(c.name)} — Full Ledger ${c.isB2B ? `<span style="font-size:12px;background:#2563eb;color:#fff;padding:2px 6px;border-radius:4px;vertical-align:middle;margin-left:6px;">B2B</span>` : ''}</h3>
        <div style="display:flex;flex-wrap:wrap;gap:10px;font-size:13px;color:var(--text-soft);margin-bottom:10px;">
          <div>📞 ${escapeHtml(c.phone||'-')}</div>
          ${c.loyaltyActive?`<div>⭐ ${escapeHtml(c.loyaltyNo)} (${c.loyaltyDiscountPercent}%)</div>`:''}
          ${c.isB2B?`<div style="color:#2563eb;">🏢 Corporate Discount: ${c.b2bDiscount||0}%</div>`:''}
          ${c.address?`<div>🏠 ${escapeHtml(c.address)}</div>`:''}
        </div>
      </div>
      ${c.isB2B ? `<button class="btn btn-primary" id="btnGenB2B" style="padding:6px 12px;font-size:13px;font-weight:bold;">📄 Generate Monthly Statement</button>` : ''}
    </div>"""

content = content.replace(old_ledger_header, new_ledger_header)

old_onopen = """    $('#ledgPrint', m).onclick = () => printCustomerLedger(custId);
  }});
}"""

new_onopen = """    $('#ledgPrint', m).onclick = () => printCustomerLedger(custId);
    if ($('#btnGenB2B', m)) {
      $('#btnGenB2B', m).onclick = () => {
        closeModal();
        openB2BMonthPicker(custId);
      };
    }
  }});
}

function openB2BMonthPicker(custId) {
  const today = new Date();
  const defMonth = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2, '0');
  openModal(`
    <h3>📄 Generate B2B Statement</h3>
    <p class="sub">Select the billing month to generate the A4 PDF statement.</p>
    <div class="field">
      <label>Billing Month</label>
      <input type="month" id="b2bMonth" value="${defMonth}" style="font-size:16px;padding:10px;"/>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal(); openCustomerLedger('${custId}')">Cancel</button>
      <button class="btn btn-primary" id="genStmtBtn">🖨️ Generate PDF</button>
    </div>
  `, {
    onOpen(m) {
      $('#genStmtBtn', m).onclick = () => {
        const monthStr = $('#b2bMonth', m).value;
        if (!monthStr) return;
        closeModal();
        printB2BStatement(custId, monthStr);
      };
    }
  });
}

function printB2BStatement(custId, monthStr) {
  const c = DB.get('customers', custId);
  const s = DB.settings();
  const allOrders = DB.all('orders').filter(o => o.customerId === custId && (o.createdAt||'').startsWith(monthStr));
  allOrders.sort((a,b) => (a.createdAt||'').localeCompare(b.createdAt||''));

  // Calculate Advance Paid in this month
  let advancePaid = 0;
  DB.all('orders').filter(o => o.customerId === custId).forEach(o => {
    (o.paymentsLog || []).forEach(p => {
      if ((p.at||'').startsWith(monthStr)) advancePaid += (p.amount || 0);
    });
    if ((o.createdAt||'').startsWith(monthStr)) {
      const logged = (o.paymentsLog || []).reduce((sum, p) => sum + (p.amount || 0), 0);
      const firstPay = (o.paid || 0) - logged;
      if (firstPay > 0) advancePaid += firstPay;
    }
  });

  let totalDeliveries = allOrders.length;
  let totalPieces = 0;
  let grossSubtotal = 0;

  const rowsHtml = allOrders.map(o => {
    totalPieces += o.items.reduce((sum, it) => sum + (it.qty||0), 0);
    const gross = o.items.reduce((sum, it) => sum + ((it.qty||0)*(it.price||0)), 0);
    grossSubtotal += gross;
    
    const challanNo = o.invoiceNo ? `CH-${o.invoiceNo}` : `#${o.id.slice(-6).toUpperCase()}`;
    const desc = o.items.map(it => `${it.name} ×${it.qty}`).join(', ');
    
    return `
      <tr>
        <td>${fmtDateShort(o.createdAt)}</td>
        <td><b>${challanNo}</b></td>
        <td><div style="font-size:12px;color:#475569;line-height:1.4;">${escapeHtml(desc)}</div></td>
        <td style="text-align:right;">${fmtMoney(gross)}</td>
      </tr>
    `;
  }).join('');

  const b2bDiscountVal = Math.round(grossSubtotal * (c.b2bDiscount || 0) / 100);
  const totalDue = grossSubtotal - b2bDiscountVal - advancePaid;

  const dateParts = monthStr.split('-');
  const dateObj = new Date(dateParts[0], parseInt(dateParts[1])-1, 1);
  const monthName = dateObj.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const issueDate = new Date().toLocaleDateString('en-GB', { day:'2-digit', month: 'short', year: 'numeric' });
  
  // Format IBAN if provided in settings, else dummy
  const ibanText = s.bankIban || s.jazzcashNumber || s.easypaisaNumber || 'Ask shop for payment details';

  const html = `
    <div style="width:210mm; min-height:297mm; background:#fff; padding:15mm 20mm; font-family:sans-serif; color:#334155; box-sizing:border-box;">
      <div style="display:flex; justify-content:space-between; border-bottom:2px solid #e2e8f0; padding-bottom:25px; margin-bottom:30px;">
        <div>
          <h1 style="margin:0; font-size:28px; color:#0f172a; font-weight:900;">${escapeHtml(s.shopName)}</h1>
          <p style="margin:4px 0 0 0; font-size:13px; color:#64748b; line-height:1.5;">${escapeHtml(s.address||'')}<br>Phone: ${escapeHtml(s.phone||'')}</p>
        </div>
        <div style="text-align:right;">
          <h2 style="margin:0 0 8px 0; font-size:28px; color:#2563eb; font-weight:900; letter-spacing:1px;">STATEMENT</h2>
          <div style="font-size:13px; color:#64748b; line-height:1.5;">
            <b>Issue Date:</b> ${issueDate}<br>
            <b>Period:</b> ${monthName}
          </div>
        </div>
      </div>

      <div style="display:flex; justify-content:space-between; margin-bottom:30px; background:#f8fafc; padding:20px; border-radius:12px; border:1px solid #f1f5f9;">
        <div>
          <h3 style="margin:0 0 8px 0; font-size:12px; text-transform:uppercase; color:#94a3b8; letter-spacing:1px;">Billed To</h3>
          <div style="font-size:20px; font-weight:800; color:#0f172a; margin-bottom:4px;">${escapeHtml(c.name)}</div>
          <p style="margin:0; font-size:14px; color:#475569; line-height:1.5;">${escapeHtml(c.address||'')}<br>${escapeHtml(c.phone||'')}</p>
        </div>
        <div style="text-align:right;">
          <h3 style="margin:0 0 8px 0; font-size:12px; text-transform:uppercase; color:#94a3b8; letter-spacing:1px;">Account Status</h3>
          <div style="font-size:18px; font-weight:800; color:#2563eb;">Corporate VIP</div>
          <p style="margin:0; font-size:14px; color:#475569; line-height:1.5; margin-top:4px;">Discount: ${c.b2bDiscount||0}%</p>
        </div>
      </div>

      <table style="width:100%; border-collapse:collapse; margin-bottom:30px;">
        <thead>
          <tr>
            <th style="background:#0f172a; color:#fff; text-align:left; padding:12px; font-size:13px; border-top-left-radius:8px; border-bottom-left-radius:8px;">Date</th>
            <th style="background:#0f172a; color:#fff; text-align:left; padding:12px; font-size:13px;">Challan #</th>
            <th style="background:#0f172a; color:#fff; text-align:left; padding:12px; font-size:13px;">Items Summary</th>
            <th style="background:#0f172a; color:#fff; text-align:right; padding:12px; font-size:13px; border-top-right-radius:8px; border-bottom-right-radius:8px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${allOrders.length ? rowsHtml : `<tr><td colspan="4" style="text-align:center;padding:20px;color:#94a3b8;font-style:italic;">No deliveries in this period.</td></tr>`}
        </tbody>
      </table>

      <div style="display:flex; justify-content:flex-end; margin-bottom:40px;">
        <div style="width:320px; background:#f8fafc; border-radius:12px; padding:20px; border:1px solid #e2e8f0;">
          <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:14px; color:#475569;">
            <span>Subtotal (${totalDeliveries} Deliveries)</span>
            <span style="font-weight:600; color:#0f172a;">${fmtMoney(grossSubtotal)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:14px; color:#16a34a; font-weight:500;">
            <span>Discount (${c.b2bDiscount||0}%)</span>
            <span>- ${fmtMoney(b2bDiscountVal)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:14px; color:#2563eb; font-weight:600; border-top:1px solid #e2e8f0; padding-top:10px;">
            <span>Advance Received This Month</span>
            <span>- ${fmtMoney(advancePaid)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:14px; padding-top:14px; border-top:2px dashed #cbd5e1; font-size:22px; font-weight:900; color:#b91c1c;">
            <span style="font-size:14px; text-transform:uppercase;">Balance Due</span>
            <span>${fmtMoney(totalDue)}</span>
          </div>
        </div>
      </div>

      <div style="background:#eff6ff; border-left:4px solid #3b82f6; padding:16px 20px; border-radius:0 8px 8px 0; margin-bottom:30px;">
        <h4 style="margin:0 0 8px 0; color:#1e3a8a; font-size:14px; text-transform:uppercase; letter-spacing:0.5px;">Payment Instructions</h4>
        <p style="margin:0 0 4px 0; font-size:13px; color:#1e40af;">Please make payment directly via transfer to:</p>
        <div style="font-family:monospace; font-size:15px; font-weight:700; color:#172554; background:#dbeafe; padding:4px 8px; border-radius:4px; display:inline-block; margin-top:4px;">${escapeHtml(ibanText)}</div>
      </div>

      <div style="text-align:center; color:#94a3b8; font-size:12px; border-top:1px solid #f1f5f9; padding-top:20px;">
        Thank you for your business!<br>Generated by Mr Laundry POS System.
      </div>
    </div>
  `;

  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  if (typeof printElement === 'function') printElement(wrap, { title: `Statement_${c.name}_${monthName}` });
}
"""

content = content.replace(old_onopen, new_onopen)

with open('assets/js/pages/ledger.js', 'w') as f:
    f.write(content)
