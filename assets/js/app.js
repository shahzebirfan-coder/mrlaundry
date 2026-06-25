/* ============================================================
   App router + topbar layout
   ============================================================ */
const app = {
  current: 'login',

  go(page) {
    const user = DB.currentUser();
    if (page !== 'login' && !user) {
      this.current = 'login';
      renderLogin();
      return;
    }

    // Permission check
    const adminOnly = ['users', 'settings'];
    if (page !== 'login' && user && user.role !== 'admin' && adminOnly.includes(page)) {
      toast('Admin access only', 'error');
      page = 'pos';
    }

    this.current = page;
    const main = (page === 'login') ? renderLogin() : renderAppLayout(page);
  }
};

function renderAppLayout(page) {
  const user = DB.currentUser();
  const isAdmin = user && user.role === 'admin';

  const navItems = [
    { id: 'dashboard', label: '📊 Dashboard', adminOnly: false },
    { id: 'pos', label: '🛒 POS', adminOnly: false },
    { id: 'orders', label: '📜 Orders', adminOnly: false },
    { id: 'customers', label: '👥 Customers', adminOnly: false },
    { id: 'products', label: '🏷️ Products', adminOnly: false },
    { id: 'settings', label: '⚙️ Settings', adminOnly: true }
  ];

  const visibleNav = navItems.filter(n => !n.adminOnly || isAdmin);

  document.getElementById('app').innerHTML = `
    <div class="app-layout">
      <div class="topbar">
        <div class="topbar-brand">🧺 ${escapeHtml(DB.settings().shopName)}</div>
        <nav class="topbar-nav">
          ${visibleNav.map(n => `
            <button data-page="${n.id}" class="${page === n.id ? 'active' : ''}">${n.label}</button>
          `).join('')}
        </nav>
        <div class="topbar-user">
          <span class="user-name">${escapeHtml(user.name)}</span>
          <button id="logoutBtn">Logout</button>
        </div>
      </div>
      <div class="main" id="mainContent"></div>
    </div>
  `;

  // Nav handlers
  $$('.topbar-nav button').forEach(btn => {
    btn.onclick = () => app.go(btn.dataset.page);
  });

  $('#logoutBtn').onclick = () => {
    confirmDialog('Sign out?', () => {
      DB.logout();
      app.go('login');
    });
  };

  // Render the page
  const main = $('#mainContent');
  switch (page) {
    case 'dashboard': return renderDashboard(main);
    case 'pos': return renderPOS(main);
    case 'orders': return renderOrders(main);
    case 'customers': return renderCustomers(main);
    case 'products': return renderProducts(main);
    case 'settings': return renderSettings(main);
    default: return renderDashboard(main);
  }
}

/* Boot */
window.addEventListener('DOMContentLoaded', () => {
  const u = DB.currentUser();
  if (u) {
    app.go(u.role === 'admin' ? 'dashboard' : 'pos');
  } else {
    app.go('login');
  }
});
