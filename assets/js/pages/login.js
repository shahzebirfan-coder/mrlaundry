/* ===================== LOGIN PAGE ===================== */
function renderLogin() {
  const s = DB.settings();
  const logoHtml = s.logoImage
    ? `<img src="${s.logoImage}" alt="${escapeHtml(s.shopName)}" style="max-width:280px;max-height:240px;object-fit:contain;margin-bottom:18px;filter:drop-shadow(0 6px 20px rgba(0,0,0,.35));" onerror="this.outerHTML='<div style=\\'font-size:120px;margin-bottom:20px;\\'>${s.logo||'🧺'}</div>'"/>`
    : `<div class="emoji">${s.logo || '🧺'}</div>`;

  const html = `
    <div class="login-wrap">
      <div class="login-art">
        <div class="login-art-inner">
          ${logoHtml}
          <h1>Welcome to ${escapeHtml(s.shopName)}</h1>
          <p>${escapeHtml(s.tagline || 'Modern POS for your laundry business')}<br><br>
          Sign in to manage sales, customers, orders &amp; reports — all in one place.</p>
        </div>
      </div>
      <div class="login-form-side">
        <div class="login-card">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
            ${brandLogoHTML(48)}
            <div>
              <div style="font-weight:800;font-size:18px;">${escapeHtml(s.shopName)}</div>
              <div style="font-size:12px;color:var(--text-soft);">${escapeHtml(s.tagline||'')}</div>
            </div>
          </div>
          <h2>${t('login.signin')}</h2>
          <p class="sub">Please enter your credentials to continue.</p>
          <form id="loginForm">
            <div class="field">
              <label>${t('login.username')}</label>
              <input name="username" autocomplete="username" required placeholder="e.g. adminshahzeb" />
            </div>
            <div class="field">
              <label>${t('login.password')}</label>
              <input name="password" type="password" autocomplete="current-password" required placeholder="••••••••" />
            </div>
            <button type="submit" class="btn btn-primary btn-block">🔓 ${t('login.signin')}</button>
            <div style="text-align:center;margin-top:14px;">
              <button type="button" id="forgotBtn" style="background:none;border:none;color:#4f7cff;cursor:pointer;font-weight:600;text-decoration:underline;font-size:13px;">
                🔐 ${t('login.forgot')}
              </button>
            </div>
          </form>
          </div>
      </div>
    </div>
  `;
  $('#app').innerHTML = html;
  $('#forgotBtn').onclick = () => { if (typeof openForgotPassword === 'function') openForgotPassword(); };
  $('#loginForm').onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const u = DB.login(f.get('username').trim(), f.get('password'));
    if (!u) { toast(t('login.invalid'), 'error'); return; }
    toast(`Welcome, ${u.name}!`, 'success');
    app.go(u.role === 'admin' ? 'dashboard' : 'pos');
  };
}
