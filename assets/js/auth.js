/* ============================================================
   Auth — login page
   ============================================================ */
function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div class="login-page">
      <div class="login-card">
        <div class="login-logo">🧺</div>
        <div class="login-title">Mr Laundry POS</div>
        <div class="login-subtitle">Sign in to continue</div>
        <form id="loginForm">
          <div class="form-group">
            <label class="form-label">Username</label>
            <input type="text" class="form-input" id="loginUsername" autocomplete="username" required />
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" class="form-input" id="loginPassword" autocomplete="current-password" required />
          </div>
          <button type="submit" class="btn btn-primary btn-block btn-lg">Sign In</button>
        </form>
        <div class="text-center text-sm text-soft mt-3">
          Default: admin / admin123<br />
          or cashier / cashier123
        </div>
      </div>
    </div>
  `;

  $('#loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const username = $('#loginUsername').value.trim();
    const password = $('#loginPassword').value;
    const user = DB.login(username, password);
    if (!user) {
      toast('Invalid username or password', 'error');
      $('#loginPassword').value = '';
      $('#loginPassword').focus();
      return;
    }
    toast(`Welcome, ${user.name}!`, 'success');
    app.go(user.role === 'admin' ? 'dashboard' : 'pos');
  });

  $('#loginUsername').focus();
}
