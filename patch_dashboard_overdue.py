import sys

with open('assets/js/pages/dashboard.js', 'r') as f:
    content = f.read()

# We need to calculate overdue orders: status === 'ready' and createdAt > 14 days ago.
# Wait, createdAt or updatedAt? Actually if status is ready, we check if today - createdAt > 14 days. Or we can just filter by status === 'ready'.

overdue_logic = """  const pending = orders.filter(o => ['pending','washing'].includes(o.status)).length;
  const ready = orders.filter(o => o.status === 'ready').length;
  
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const cutoff = fourteenDaysAgo.toISOString().slice(0, 10);
  
  const overdueOrders = orders.filter(o => o.status === 'ready' && (o.createdAt || '').slice(0, 10) < cutoff);
  overdueOrders.sort((a,b) => a.createdAt.localeCompare(b.createdAt));
"""

# replace the pending calculation
content = content.replace("const pending = orders.filter(o => ['pending','washing','ready'].includes(o.status)).length;", overdue_logic)

# Replace the pending banner and insert overdue banner
old_banner = """    ${pending > 0 ? `
      <div onclick="app.go('orders')" style="background:linear-gradient(135deg,#e0e7ff,#eff6ff);border:1px solid #c7d2fe;border-radius:12px;padding:12px 18px;margin-bottom:18px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;transition:transform .2s ease;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform=''">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="font-size:26px;">⏳</div>
          <div>
            <div style="font-weight:700;font-size:14px;color:#3730a3;">${pending} order${pending>1?'s':''} in progress</div>
            <div style="font-size:12px;color:#6366f1;">Click to view pending / washing / ready orders</div>
          </div>
        </div>
        <div style="font-weight:700;color:#4f7cff;font-size:13px;">View All -></div>
      </div>
    ` : ''}"""

new_banner = """    ${(pending > 0 || ready > 0) ? `
      <div onclick="app.go('orders')" style="background:linear-gradient(135deg,#e0e7ff,#eff6ff);border:1px solid #c7d2fe;border-radius:12px;padding:12px 18px;margin-bottom:14px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;transition:transform .2s ease;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform=''">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="font-size:26px;">⏳</div>
          <div>
            <div style="font-weight:700;font-size:14px;color:#3730a3;">${pending} in progress • <span style="color:#059669;">${ready} ready for pickup</span></div>
            <div style="font-size:12px;color:#6366f1;">Click to view all active orders</div>
          </div>
        </div>
        <div style="font-weight:700;color:#4f7cff;font-size:13px;">View All -></div>
      </div>
    ` : ''}

    ${overdueOrders.length > 0 ? `
      <div style="background:#fff;border-radius:12px;padding:16px;margin-bottom:18px;border-top:4px solid #ef4444;box-shadow:0 2px 4px rgba(0,0,0,0.05);">
        <h3 style="margin:0 0 10px 0;color:#b91c1c;display:flex;align-items:center;gap:6px;font-size:16px;">⚠️ Overdue / Uncollected Orders (${overdueOrders.length})</h3>
        <p style="font-size:12px;color:#475569;margin-bottom:12px;">These orders have been "Ready" for more than 14 days.</p>
        <div style="overflow-x:auto;">
          <table class="tbl" style="width:100%;font-size:13px;">
            <thead><tr><th>Invoice</th><th>Customer</th><th>Booked Date</th><th>Status</th><th style="text-align:right;">Action</th></tr></thead>
            <tbody>
              ${overdueOrders.map(o => {
                const c = DB.get('customers', o.customerId) || {};
                const days = Math.floor((new Date() - new Date(o.createdAt)) / 86400000);
                const phoneWa = (c.phone||'').replace(/[^\d+]/g, '');
                const waNum = phoneWa.startsWith('0') && phoneWa.length===11 ? '92'+phoneWa.substring(1) : (phoneWa.startsWith('+') ? phoneWa.substring(1) : phoneWa);
                const msg = encodeURIComponent(`Hi ${c.name}, this is a gentle reminder from Mr Laundry that your order (INV-${o.invoiceNo||o.id.slice(-6).toUpperCase()}) has been ready for ${days} days. Please collect it soon!`);
                return `<tr>
                  <td><b>INV-${o.invoiceNo || o.id.slice(-6).toUpperCase()}</b>${o.location ? `<br><span style="font-size:10px;background:#fef08a;padding:2px 4px;border-radius:4px;border:1px solid #f59e0b;">📍 ${escapeHtml(o.location)}</span>` : ''}</td>
                  <td>${escapeHtml(c.name)}<br><small style="color:var(--text-soft);">${escapeHtml(c.phone||'-')}</small></td>
                  <td>${fmtDateShort(o.createdAt)}<br><small style="color:#ef4444;font-weight:bold;">${days} days ago</small></td>
                  <td><span class="badge cancelled" style="font-size:10px;">Overdue</span></td>
                  <td style="text-align:right;">
                    <a href="https://wa.me/${waNum}?text=${msg}" target="_blank" class="btn btn-success btn-sm" style="padding:4px 8px;font-size:11px;text-decoration:none;">📱 Warn</a>
                    <button class="btn btn-ghost btn-sm" onclick="app.go('orders')">View</button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : ''}"""

content = content.replace(old_banner, new_banner)

with open('assets/js/pages/dashboard.js', 'w') as f:
    f.write(content)
