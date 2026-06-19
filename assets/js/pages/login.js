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
            
            ${(typeof CLOUD !== 'undefined' && CLOUD.isEnabled() && CLOUD.isReady()) ? `
            <div style="text-align:center;margin-top:20px;border-top:1px solid #e2e8f0;padding-top:14px;">
              <button type="button" id="loginSyncBtn" style="background:none;border:1px solid #10b981;color:#10b981;border-radius:6px;padding:6px 12px;cursor:pointer;font-weight:700;font-size:12px;">
                ☁️ Force Cloud Sync
              </button>
              <div style="font-size:10px;color:#64748b;margin-top:4px;">Click if having trouble logging in</div>
            </div>
            ` : ''}

          
            <div style="text-align:center;margin-top:20px;border-top:1px solid #e2e8f0;padding-top:14px;font-size:12px;color:#64748b;line-height:1.6;">
              <b>Need Help? Contact IT Department</b><br>
              📞 ${window._IT_BRAND.p}
              
              <div style="margin-top:15px; padding-top:10px; border-top:1px dashed #e2e8f0; display:flex; align-items:center; justify-content:center; color:#0f172a;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f7cff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                <span style="font-weight:800; font-size:13px; letter-spacing:0.5px;">Powered by: CelineSoft</span>
              </div>
            </div>
    
          </form>
          </div>
      </div>
    </div>
  `;
  $('#app').innerHTML = html;
  $('#forgotBtn').onclick = () => { if (typeof openForgotPassword === 'function') openForgotPassword(); };
  if ($('#loginSyncBtn')) {
    $('#loginSyncBtn').onclick = async (e) => {
      e.preventDefault();
      const btn = e.target;
      btn.innerHTML = '⏳ Syncing...';
      btn.disabled = true;
      try {
        await CLOUD.init();
        await CLOUD.pullAndMerge();
        CLOUD._initialMergeDone = true;
        toast('✅ Cloud Sync Complete! You can now log in.', 'success');
      } catch(err) {
        toast('Sync Error: ' + err.message, 'error');
      }
      btn.innerHTML = '☁️ Force Cloud Sync';
      btn.disabled = false;
    };
  }
  $('#loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const btn = e.target.querySelector('button[type="submit"]');
    
    let u = DB.login(f.get('username').trim(), f.get('password'));
    
    // If login fails, check if Cloud Sync is still initializing. If so, wait for it!
    if (!u && typeof CLOUD !== 'undefined' && CLOUD.isEnabled() && CLOUD.isReady() && !CLOUD._initialMergeDone) {
      const origText = btn.innerHTML;
      btn.innerHTML = '⏳ Syncing cloud data...';
      btn.disabled = true;
      try {
        await CLOUD.init();
        await CLOUD.pullAndMerge();
        CLOUD._initialMergeDone = true;
      } catch(e) {}
      btn.innerHTML = origText;
      btn.disabled = false;
      u = DB.login(f.get('username').trim(), f.get('password'));
    }

    if (!u) { toast(t('login.invalid') || 'Invalid username or password', 'error'); return; }
    toast(`Welcome, ${u.name}!`, 'success');
    console.log('Login success. User:', u);
    console.log('Attempting to go to:', u.role === 'admin' ? 'dashboard' : 'pos');
    
    setTimeout(() => {
        app.go(u.role === 'admin' ? 'dashboard' : 'pos');
    }, 100);

  };
}
