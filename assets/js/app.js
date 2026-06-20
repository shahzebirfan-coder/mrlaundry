/* ============================================================
   App router with permission-based access
   ============================================================ */
const app = {
  current: 'login',
  go(page) {
    const user = DB.currentUser();
    if (page !== 'login' && !user) { this.current = 'login'; renderLogin(); return; }

    // Support "page?param=value" routing
    let param = null;
    if (page && page.includes('?')) {
      const [p, qs] = page.split('?');
      page = p;
      param = Object.fromEntries(new URLSearchParams(qs));
    }

    // Admin-only pages (no override possible)
    const adminOnly = ['users','settings','inbox','promoAdmin','delivery','reportBuilder','refundLog'];

    if (page !== 'login' && user.role !== 'admin') {
      if (adminOnly.includes(page)) {
        toast('Admin access only', 'error');
        // Redirect to first allowed page
        const allowed = (typeof getUserPermissions === 'function') ? getUserPermissions(user) : ['pos'];
        page = allowed[0] || 'pos';
      } else if (typeof hasPermission === 'function' && !hasPermission(page)) {
        toast('You don\u2019t have permission for this page. Contact admin.', 'error');
        const allowed = getUserPermissions(user);
        page = allowed[0] || 'pos';
      }
    }

    this.current = page;
    switch(page) {
      case 'login':           return renderLogin();
      case 'dashboard':       return renderDashboard();
      case 'pos':             return renderPOS();
      case 'orders':          return renderOrders();
      case 'customers':       return renderCustomers();
      case 'products':        return renderProducts();
      case 'expenses':        return renderExpenses();
      case 'reports':         return renderReports();
      case 'users':           return renderUsers();
      case 'settings':        return renderSettings();
      case 'vendors':         return renderVendors();
      case 'purchaseOrders':  return renderPurchaseOrders(param?.vendor);
      case 'ledger':          return renderLedger();
      case 'inventory':       return renderInventory();
      case 'cashbook':        return renderCashbook();
      case 'auditLog':        return renderAuditLog();
      case 'branches':        return renderBranches();
      case 'inbox':           return renderInbox();
      case 'promoAdmin':      return renderPromoAdmin();
      case 'claims':          return renderClaims();
      case 'delivery':        return renderDelivery();
      case 'drawings':        return renderDrawings();
      case 'reportBuilder':   return renderReportBuilder();
      default:                return renderDashboard();
    }
  }
};

// Boot
window.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('mrLaundryTheme') || 'light';
  document.documentElement.dataset.theme = saved;

  const u = DB.currentUser();
  if (typeof initShortcuts === 'function') initShortcuts();
  if (u) {
    // Land on first allowed page
    if (u.role === 'admin') {
      app.go('dashboard');
    } else {
      const allowed = (typeof getUserPermissions === 'function') ? getUserPermissions(u) : ['pos'];
      // Prefer dashboard > pos > first allowed
      if (allowed.includes('dashboard')) app.go('dashboard');
      else if (allowed.includes('pos')) app.go('pos');
      else app.go(allowed[0] || 'pos');
    }
  } else {
    app.go('login');
  }
});

// === Safety check: detect missing page modules ===
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const required = ['renderDashboard','renderPOS','renderOrders','renderCustomers','renderProducts',
                       'renderExpenses','renderReports','renderUsers','renderSettings','renderVendors',
                       'renderPurchaseOrders','renderLedger','renderInventory','renderCashbook',
                       'renderAuditLog','renderBranches','renderInbox','renderPromoAdmin','renderClaims'];
    const missing = required.filter(fn => typeof window[fn] !== 'function');
    if (missing.length > 0 && typeof console !== 'undefined') {
      console.warn('[Mr Laundry] Missing page modules:', missing.join(', '));
      console.warn('[Mr Laundry] These pages will not work. Check that all <script> tags in index.html are loaded correctly.');
    }
  }, 1500);
});
