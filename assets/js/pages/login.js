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
    ? `<img class="login-art-logo-image" src="${escapeHtml(s.logoImage)}" alt="${escapeHtml(s.shopName || 'Mr Laundry')}" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"/><div class="login-art-logo-fallback" style="display:none;">${escapeHtml(s.logo || '🧺')}</div>`
    : `<div class="login-art-logo-fallback">${escapeHtml(s.logo || '🧺')}</div>`;

  const html = `
    <main class="login-wrap">
      <section class="login-art" aria-label="${escapeHtml(s.shopName || 'Mr Laundry')} welcome">
        <svg class="login-art-lines" viewBox="0 0 800 760" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M800 118c-112-15-170 30-176 103-5 61 44 85 82 121 49 47 36 111-18 142" opacity=".34"/>
            <circle cx="576" cy="97" r="54" opacity=".38"/>
            <path d="M576 77c-1-12 16-14 18-1l-3 9m-15-8 28 19-47 4-24-5 40-18Z" opacity=".72"/>
            <path d="M600 98h-48l-18 12 18 4v29h48v-29l18-4-18-12Z" opacity=".54"/>
            <path d="M800 404c-94-12-145 14-165 65-15 37 2 67 30 92" opacity=".30"/>
            <rect x="573" y="414" width="112" height="130" rx="13" opacity=".5"/>
            <circle cx="630" cy="489" r="35" opacity=".62"/>
            <circle cx="630" cy="489" r="24" opacity=".34"/>
            <path d="M591 438h11m9 0h5" opacity=".65"/>
            <path d="M0 566c103-2 163-46 157-108-4-42-35-57-63-78" opacity=".34"/>
            <path d="M0 527h57l25-22-30-8 47-28 40 22-31 6 28 22h50" opacity=".78"/>
            <path d="M0 563h123" opacity=".44"/>
            <circle cx="99" cy="468" r="56" opacity=".35"/>
            <path d="M99 444c-1-12 15-14 17-2l-2 8m-15-7 28 17-46 4-23-5 41-16Z" opacity=".72"/>
            <path d="M530 620c61-9 106-4 150 22" opacity=".26"/>
            <path d="M695 644h44l21 18-21 18h-44l-21-18 21-18Z" opacity=".42"/>
            <path d="M705 655v14m10-14v14m10-14v14m10-14v14" opacity=".54"/>
          </g>
          <g fill="currentColor" opacity=".56">
            <circle cx="489" cy="196" r="4"/><circle cx="508" cy="179" r="6"/><circle cx="529" cy="201" r="3"/>
            <circle cx="705" cy="335" r="4"/><circle cx="724" cy="319" r="7"/><circle cx="744" cy="340" r="3"/>
            <circle cx="208" cy="177" r="3"/><circle cx="225" cy="162" r="6"/><circle cx="245" cy="182" r="4"/>
          </g>
        </svg>
        <div class="login-art-inner">
          <div class="login-art-logo">${logoHtml}</div>
          <div class="login-art-eyebrow">LAUNDRY CARE • MADE SIMPLE</div>
          <h1>Welcome to <span>${escapeHtml(s.shopName || 'Mr Laundry')}</span></h1>
          <div class="login-art-tagline">${escapeHtml(s.tagline || 'Quality Dry Cleaner Service')}</div>
          <p>Sign in to manage sales, customers, orders &amp; reports —<br class="login-desktop-break"> all in one place.</p>
          <div class="login-art-rule"><span></span><i></i><span></span></div>
          <div class="login-art-caption">Care for every garment. Confidence in every order.</div>
        </div>
      </section>

      <section class="login-form-side" aria-label="Staff sign in">
        <div class="login-security"><span class="login-security-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></span> SECURE STAFF ACCESS</div>
        <div class="login-card">
          <div class="login-brand">
            <div class="login-brand-mark" aria-hidden="true">${escapeHtml(s.logo || '🧺')}</div>
            <div class="login-brand-copy">
              <strong>${escapeHtml(s.shopName || 'Mr Laundry')}</strong>
              <span>${escapeHtml(s.tagline || 'Quality Dry Cleaner Service')}</span>
            </div>
          </div>

          <div class="login-form-heading">
            <div class="login-kicker">STAFF PORTAL</div>
            <h2>${t('login.signin')}</h2>
            <p class="sub">Please enter your credentials to continue.</p>
          </div>

          <form id="loginForm">
            <div class="field">
              <label for="loginUsername">${t('login.username')}</label>
              <div class="login-input-wrap">
                <svg class="login-input-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.5-3.6 3.1-5.5 7-5.5s6.5 1.9 7 5.5"/></svg>
                <input id="loginUsername" name="username" autocomplete="username" required placeholder="e.g. adminshahzeb" />
              </div>
            </div>
            <div class="field">
              <label for="loginPassword">${t('login.password')}</label>
              <div class="login-input-wrap">
                <svg class="login-input-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 8.7-8.7 2 2-2.2 2.2 1.7 1.7-2.2 2.2-1.7-1.7-3.5 3.5"/></svg>
                <input id="loginPassword" name="password" type="password" autocomplete="current-password" required placeholder="••••••••" />
              </div>
            </div>
            <button type="submit" class="login-submit">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/></svg>
              <span>${t('login.signin')}</span>
            </button>
            <div class="login-forgot">
              <button type="button" id="forgotBtn">${t('login.forgot')}</button>
            </div>
          </form>
          <div class="login-form-footer"><span></span>Authorized staff only<span></span></div>
        </div>
        <div class="login-side-bottom">${escapeHtml(s.shopName || 'Mr Laundry')} <span>•</span> Staff sign-in</div>
      </section>
    </main>
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
