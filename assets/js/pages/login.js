/* ===================== LOGIN PAGE ===================== */
function showBrandBootOverlay() {
  const s = DB.settings();
  const overlay = document.createElement('div');
  overlay.id = 'brandBootOverlay';
  overlay.className = 'brand-boot-overlay';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');
  overlay.innerHTML = `
    <div class="brand-boot-card${s.logoImage === 'assets/img/logo.jpeg' ? ' brand-boot-card--default-logo' : ''}">
      <div class="brand-boot-stage" aria-hidden="true">
        <div class="brand-boot-orbit"></div>
        <div class="brand-boot-bubbles">
          <span class="brand-boot-bubble brand-boot-bubble--one"></span>
          <span class="brand-boot-bubble brand-boot-bubble--two"></span>
          <span class="brand-boot-bubble brand-boot-bubble--three"></span>
          <span class="brand-boot-bubble brand-boot-bubble--four"></span>
          <span class="brand-boot-bubble brand-boot-bubble--five"></span>
          <span class="brand-boot-bubble brand-boot-bubble--six"></span>
          <span class="brand-boot-bubble brand-boot-bubble--seven"></span>
        </div>
        <div class="brand-boot-mark">${brandLogoHTML(320)}</div>
        <div class="brand-boot-clothes">
          <span class="brand-boot-garment brand-boot-garment--shirt">
            <svg viewBox="0 0 64 64"><path d="M21 8 32 14 43 8 57 18 49 31 43 27 43 57H21V27l-6 4-8-13L21 8Z"/></svg>
          </span>
          <span class="brand-boot-garment brand-boot-garment--sock">
            <svg viewBox="0 0 64 64"><path d="M22 7h21v26l12 8v10H22c-10 0-12-12-4-17l6-4-2-23Z"/></svg>
          </span>
          <span class="brand-boot-garment brand-boot-garment--pants">
            <svg viewBox="0 0 64 64"><path d="M16 8h32l-3 22-4 26H29l-2-20-3 20H12L9 30 7 8h9Z"/></svg>
          </span>
          <span class="brand-boot-garment brand-boot-garment--coat">
            <svg viewBox="0 0 64 64"><path d="M22 8h20l12 10 4 18-9 3-4-12v29H19V27l-4 12-9-3 4-18L22 8Z"/></svg>
          </span>
        </div>
      </div>
      <div class="brand-boot-name">${escapeHtml(s.shopName || 'Mr Laundry')}</div>
      <div class="brand-boot-message">${escapeHtml(t('login.bootMessage'))}</div>
      <div class="brand-boot-progress" aria-hidden="true"><span></span></div>
    </div>`;
  document.body.appendChild(overlay);
  return overlay;
}

function hideBrandBootOverlay(overlay) {
  if (!overlay || !overlay.isConnected) return;
  overlay.classList.add('is-leaving');
  window.setTimeout(() => overlay.remove(), 320);
}

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
    const submitButton = e.currentTarget.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    const overlay = showBrandBootOverlay();
    try {
      app.go(u.role === 'admin' ? 'dashboard' : 'pos');
    } finally {
      // Keep the animated brand screen visible while the destination page paints.
      window.setTimeout(() => hideBrandBootOverlay(overlay), 1450);
    }
  };
}
