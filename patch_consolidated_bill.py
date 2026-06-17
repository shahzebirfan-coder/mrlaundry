import sys

with open('assets/js/pages/ledger.js', 'r') as f:
    content = f.read()

old_ledger_header = """      ${c.isB2B ? `<button class="btn btn-primary" id="btnGenB2B" style="padding:6px 12px;font-size:13px;font-weight:bold;">📄 Generate Monthly Statement</button>` : ''}
    </div>"""

new_ledger_header = """      <div style="display:flex;gap:8px;">
        ${totalDue > 0 ? `<button class="btn btn-warning" id="btnConsolidated" style="padding:6px 12px;font-size:13px;font-weight:bold;">🧾 Print Consolidated Bill</button>` : ''}
        ${c.isB2B ? `<button class="btn btn-primary" id="btnGenB2B" style="padding:6px 12px;font-size:13px;font-weight:bold;">📄 Generate Monthly Statement</button>` : ''}
      </div>
    </div>"""

content = content.replace(old_ledger_header, new_ledger_header)

old_onopen = """    if ($('#btnGenB2B', m)) {
      $('#btnGenB2B', m).onclick = () => {
        closeModal();
        openB2BMonthPicker(custId);
      };
    }
  }});
}"""

new_onopen = """    if ($('#btnGenB2B', m)) {
      $('#btnGenB2B', m).onclick = () => {
        closeModal();
        openB2BMonthPicker(custId);
      };
    }
    if ($('#btnConsolidated', m)) {
      $('#btnConsolidated', m).onclick = () => {
        closeModal();
        printConsolidatedBill(custId);
      };
    }
  }});
}

function printConsolidatedBill(custId) {
  const c = DB.get('customers', custId);
  const s = DB.settings();
  
  // Get all unpaid/partially paid orders
  const unpaidOrders = DB.all('orders')
    .filter(o => o.customerId === custId && o.due > 0)
    .sort((a,b)=>a.createdAt.localeCompare(b.createdAt));

  if (!unpaidOrders.length) {
    toast('No pending dues for this customer', 'warning');
    return;
  }

  const totalDue = unpaidOrders.reduce((sum, o) => sum + o.due, 0);

  const html = `
    <div style="font-family:'Courier New', Courier, monospace; width:280px; padding:10px; color:#000; box-sizing:border-box;">
      <div style="text-align:center; margin-bottom:12px; border-bottom:2px dashed #000; padding-bottom:8px;">
        <div style="font-size:22px; font-weight:900; margin-bottom:4px;">${escapeHtml(s.shopName)}</div>
        <div style="font-size:14px; font-weight:bold; background:#000; color:#fff; display:inline-block; padding:4px 8px; letter-spacing:1px;">CONSOLIDATED BILL</div>
      </div>
      
      <div style="font-size:13px; line-height:1.5; margin-bottom:14px;">
        <b>Customer:</b> ${escapeHtml(c.name)}<br>
        <b>Phone:</b> ${escapeHtml(c.phone||'-')}<br>
        <b>Date:</b> ${new Date().toLocaleDateString('en-GB')}
      </div>
      
      <div style="font-size:12px; font-weight:bold; border-bottom:1px solid #000; margin-bottom:6px; padding-bottom:2px;">
        <div style="display:flex; justify-content:space-between;">
          <span>DATE / INV #</span>
          <span>DUE (RS)</span>
        </div>
      </div>
      
      ${unpaidOrders.map(o => {
        const invNo = o.invoiceNo ? \`INV-${o.invoiceNo}\` : '#' + o.id.slice(-6).toUpperCase();
        return `
          <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:4px;">
            <span>${fmtDateShort(o.createdAt)}<br><b>${invNo}</b></span>
            <span style="font-weight:bold;">${fmtMoney(o.due)}</span>
          </div>
        `;
      }).join('')}
      
      <div style="border-top:2px solid #000; margin-top:10px; padding-top:10px; display:flex; justify-content:space-between; font-size:16px; font-weight:900;">
        <span>TOTAL DUE:</span>
        <span>${fmtMoney(totalDue)}</span>
      </div>
      
      <div style="text-align:center; font-size:11px; margin-top:24px; font-style:italic;">
        Please clear the outstanding balance.<br>Thank you for choosing Mr Laundry!
      </div>
    </div>
  `;

  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  if (typeof printElement === 'function') printElement(wrap, { title: 'Consolidated_Bill_' + c.name });
}
"""

content = content.replace(old_onopen, new_onopen)

with open('assets/js/pages/ledger.js', 'w') as f:
    f.write(content)
