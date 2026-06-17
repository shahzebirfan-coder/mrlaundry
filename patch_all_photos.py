import sys

with open('assets/js/pages/photos.js', 'r') as f:
    content = f.read()

# I will add a new function renderAllPhotos() that creates a page showing all orders that have photos, and allows 1-click deletion to clear up storage quickly!
all_photos_page = """
/* ===================== ALL PHOTOS DASHBOARD (STORAGE MANAGER) ===================== */
function renderAllPhotos() {
  if (DB.currentUser().role !== 'admin') { toast('Admin only','error'); app.go('dashboard'); return; }

  const orders = DB.all('orders');
  // Find all orders that have photos
  const ordersWithPhotos = orders.filter(o => o.photos && o.photos.length > 0);
  
  // Calculate total storage used by photos
  let totalBytes = 0;
  let totalPhotos = 0;
  ordersWithPhotos.forEach(o => {
    o.photos.forEach(p => {
      totalBytes += p.size || Math.round(p.data.length * 0.75); // approx base64 size if size property missing
      totalPhotos++;
    });
  });
  
  const totalMb = (totalBytes / (1024 * 1024)).toFixed(2);

  const content = `
    <h1 class="page-title">📸 Photo Storage Manager</h1>
    <p class="page-sub">View and delete old order photos to free up your device's memory.</p>

    <div style="background:var(--surface);border-radius:12px;padding:16px;border:1px solid var(--border);margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;">
      <div>
        <div style="font-size:12px;color:var(--text-soft);font-weight:bold;text-transform:uppercase;">Memory Used by Photos</div>
        <div style="font-size:28px;font-weight:900;color:var(--danger);">${totalMb} MB</div>
        <div style="font-size:13px;color:var(--text-soft);">${totalPhotos} total photos across ${ordersWithPhotos.length} orders</div>
      </div>
      <div>
        <button class="btn btn-danger" id="clearDeliveredBtn" style="font-weight:bold;">🗑️ Delete Photos from ALL 'Delivered' Orders</button>
      </div>
    </div>

    <div class="card" style="padding:0;overflow:hidden;">
      <table class="tbl">
        <thead>
          <tr>
            <th>Order Date</th>
            <th>Invoice</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Photos</th>
            <th>Memory Used</th>
            <th style="text-align:right;">Actions</th>
          </tr>
        </thead>
        <tbody id="allPhotosBody">
          ${ordersWithPhotos.length === 0 ? `<tr><td colspan="7"><div class="empty"><div class="emoji">🎉</div><h4>Storage is clean!</h4><p>No photos are currently saved in the database.</p></div></td></tr>` : ''}
          ${ordersWithPhotos.map(o => {
            const c = DB.get('customers', o.customerId) || {};
            const inv = o.invoiceNo ? \`INV-${o.invoiceNo}\` : '#' + o.id.slice(-6).toUpperCase();
            let oBytes = 0;
            o.photos.forEach(p => oBytes += p.size || Math.round(p.data.length * 0.75));
            const oKb = Math.round(oBytes / 1024);
            
            return `<tr>
              <td>${fmtDateShort(o.createdAt)}</td>
              <td><b>${escapeHtml(inv)}</b></td>
              <td>${escapeHtml(c.name || 'Walk-in')}</td>
              <td><span class="badge ${o.status}">${o.status}</span></td>
              <td><b style="font-size:16px;">${o.photos.length}</b> 📸</td>
              <td style="color:var(--danger);font-weight:bold;">${oKb} KB</td>
              <td style="text-align:right;">
                <button class="btn btn-secondary btn-sm" onclick="openOrderPhotos('${o.id}')">👁️ View</button>
                <button class="btn btn-danger btn-sm" onclick="deletePhotosForOrder('${o.id}')">🗑️ Delete</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  $('#app').innerHTML = renderLayout('allPhotos', content);
  bindLayout();

  const clearDeliveredBtn = document.getElementById('clearDeliveredBtn');
  if (clearDeliveredBtn) {
    clearDeliveredBtn.onclick = () => {
      confirmDialog('Are you sure you want to permanently delete ALL photos from orders that are marked as "Delivered"? This will free up significant memory.', () => {
        let freed = 0;
        let count = 0;
        ordersWithPhotos.forEach(o => {
          if (o.status === 'delivered') {
            o.photos.forEach(p => freed += p.size || Math.round(p.data.length * 0.75));
            count += o.photos.length;
            DB.update('orders', o.id, { photos: [] });
          }
        });
        toast(`✅ Deleted ${count} photos! Freed up ${(freed / (1024*1024)).toFixed(2)} MB.`, 'success');
        renderAllPhotos();
      });
    };
  }
}

window.deletePhotosForOrder = function(orderId) {
  confirmDialog('Permanently delete all photos for this order?', () => {
    DB.update('orders', orderId, { photos: [] });
    toast('Photos deleted', 'success');
    renderAllPhotos();
  });
};
"""

content += all_photos_page

with open('assets/js/pages/photos.js', 'w') as f:
    f.write(content)
