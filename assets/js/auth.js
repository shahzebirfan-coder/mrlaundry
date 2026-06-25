/* ============================================================
   Auth — login page
   ============================================================ */
function renderLogin() {
  // Verify DB is loaded and has admin user
  const hasAdmin = DB._data && DB._data.users && DB._data.users.find(u => u.username === 'admin');
  const adminPwd = hasAdmin ? DB._data.users.find(u => u.username === 'admin').password : '???';

  document.getElementById('app').innerHTML = `
    <div class="login-page">
      <div class="login-card">
        <div class="login-logo">🧺</div>
        <div class="login-title">Mr Laundry POS</div>
        <div class="login-subtitle">Sign in to continue</div>
        <form id="loginForm">
          <div class="form-group">
            <label class="form-label">Username</label>
            <input type="text" class="form-input" id="loginUsername" autocomplete="username" value="admin" required />
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" class="form-input" id="loginPassword" autocomplete="current-password" value="admin123" required />
          </div>
          <button type="submit" class="btn btn-primary btn-block btn-lg">Sign In</button>
        </form>
        <div class="text-center text-sm text-soft mt-3">
          Default credentials:<br />
          <strong>admin / admin123</strong> (full access)<br />
          <strong>cashier / cashier123</strong> (POS only)
        </div>
        <div class="text-center mt-3">
          <button class="btn btn-ghost btn-sm" id="resetBtn">🔄 Reset to defaults</button>
        </div>
        ${!hasAdmin ? `
          <div class="text-center text-sm text-danger mt-3" id="dbErrorMsg">
            ⚠️ Database issue — try Reset button below
          </div>
        ` : ''}
      </div>
    </div>
  `;

  $('#loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const username = $('#loginUsername').value.trim();
    const password = $('#loginPassword').value;

    // Debug: show what we're checking
    console.log('[Login] trying:', username, '/', password);
    console.log('[Login] users in DB:', DB._data.users.map(u => ({ username: u.username, password: u.password })));

    const user = DB.login(username, password);
    if (!user) {
      toast('Invalid username or password', 'error');
      console.error('[Login] FAILED — user not found. Expected: admin/admin123');
      $('#loginPassword').value = '';
      $('#loginPassword').focus();
      return;
    }
    toast(`Welcome, ${user.name}!`, 'success');
    app.go(user.role === 'admin' ? 'dashboard' : 'pos');
  });

  // Reset button — clears everything and reseeds
  $('#resetBtn').onclick = () => {
    confirmDialog('This will RESET all data to defaults and restore admin/admin123 login. Continue?', () => {
      confirmDialog('Are you absolutely sure? All data will be lost.', () => {
        try {
          localStorage.removeItem('mrLaundryDB');
          DB.clearBackup().then(() => {
            DB._data = null;
            DB.load();
            toast('Reset complete! Try admin / admin123', 'success');
            setTimeout(() => renderLogin(), 500);
          });
        } catch (e) {
          // Even if IDB clear fails, try just resetting in memory
          DB._data = seedData();
          DB._saveSilent();
          toast('Reset complete! Try admin / admin123', 'success');
          setTimeout(() => renderLogin(), 500);
        }
      });
    });
  };

  // Focus password field so user can type immediately
  setTimeout(() => {
    const pwd = $('#loginPassword');
    if (pwd) { pwd.focus(); pwd.select(); }
  }, 100);
}
