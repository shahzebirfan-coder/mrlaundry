/* ===================== LOGIN PAGE =====================
   MR LAUNDRY EDITION (v3)
   Split-screen brand sign-in:
     LEFT  — navy hero with brand logo, welcome line, address / phone / hours
     RIGHT — cream panel with the sign-in card
   Identity (name, tagline, address, phone, hours, logo) comes from
   Settings → Shop Information. The bundled defaults are the Mr Laundry
   brand assets shipped with this build.
   ============================================================ */

const BRAND_LOGO = 'assets/img/mr-laundry-logo.jpg';

/* Resolve which logo to show: shop's uploaded logo wins, else brand default. */
function lgBrandLogoImg() {
  const s = DB.settings();
  const img = (s.logoImage || '').trim();
  const isDefault = !img || img === 'assets/img/logo.jpeg' || img === BRAND_LOGO;
  return isDefault ? BRAND_LOGO : img;
}

function lgTelHref(raw) {
  const digits = (raw || '').replace(/[^\d+]/g, '');
  return digits ? 'tel:' + digits : '';
}

/* shopHours is stored as "Mon-Sat: 9:00 AM - 9:00 PM\nSunday: Closed" */
function lgHoursOneLine(raw) {
  return String(raw || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean).join('  ·  ');
}

function renderLogin() {
  const s = DB.settings();
  const brand = (typeof window !== 'undefined' && window._IT_BRAND) ? window._IT_BRAND : {};

  const shopName   = s.shopName || 'Mr Laundry';
  const tagline    = s.tagline || 'Quality Dry Cleaner Service';
  const address    = (s.address || 'Shop 04, Gulistan E Zafar, SMCHS Block B, Karachi').trim();
  const phone      = (s.phone || '').trim();
  const hours      = lgHoursOneLine(s.shopHours || 'Mon-Sat: 9:00 AM - 9:00 PM\nSunday: Closed');
  const logoSrc    = lgBrandLogoImg();
  const telHref    = lgTelHref(phone);

  const cloudEnabled = (typeof CLOUD !== 'undefined' && CLOUD.isEnabled() && CLOUD.isReady());

  const html = `
  <div class="lg-root">

    <!-- ================= LEFT: BRAND HERO ================= -->
    <section class="lg-hero">
      <!-- decorative line art -->
      <div class="lg-art lg-art-hanger" aria-hidden="true">
        <svg viewBox="0 0 150 120" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="75" cy="118" r="1.5" fill="currentColor"/>
          <path d="M75 118 0 118" stroke="none"/>
          <path d="M12 46 66 12a13 13 0 0 1 11 0l54 34"/>
          <path d="M75 118V92"/>
          <path d="M75 22a8 8 0 1 1 8-8c0 4.6-4.2 6.4-8 8.6"/>
          <path d="M8 46a7 7 0 0 0 3 13h128a7 7 0 0 0 3-13"/>
        </svg>
      </div>
      <div class="lg-art lg-art-tag" aria-hidden="true">
        <svg viewBox="0 0 130 130" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 118 4 74l44-66 56 34-42 74z"/>
          <circle cx="30" cy="88" r="5.5"/>
          <path d="M52 44l16 10M64 30l16 10"/>
        </svg>
      </div>
      <div class="lg-art lg-art-washer" aria-hidden="true">
        <svg viewBox="0 0 132 132" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="8" y="10" width="116" height="112" rx="10"/>
          <line x1="8" y1="36" x2="124" y2="36"/>
          <circle cx="20" cy="23" r="1.6" fill="currentColor"/><circle cx="29" cy="23" r="1.6" fill="currentColor"/>
          <line x1="98" y1="23" x2="114" y2="23"/>
          <circle cx="66" cy="82" r="27"/>
          <circle cx="66" cy="82" r="16"/>
        </svg>
      </div>
      <span class="lg-bubble b1"></span><span class="lg-bubble b2"></span><span class="lg-bubble b3"></span>
      <span class="lg-bubble b4"></span><span class="lg-bubble b5"></span><span class="lg-bubble b6"></span>

      <div class="lg-hero-inner">
        <div class="lg-hero-logo">
          <img src="${escapeHtml(logoSrc)}" alt="${escapeHtml(shopName)} — brand logo" onerror="this.onerror=null;this.src='${BRAND_LOGO}'"/>
        </div>

        <div class="lg-eyebrow">LAUNDRY CARE &nbsp;·&nbsp; MADE SIMPLE</div>

        <h1 class="lg-welcome">Welcome to</h1>
        <div class="lg-brandname">${escapeHtml(shopName)}</div>
        <div class="lg-brandtag">${escapeHtml(tagline)}</div>

        <p class="lg-subcopy">Sign in to manage sales, customers, orders &amp; reports — all in one place.</p>

        <div class="lg-dot-divider" aria-hidden="true"><span></span><i></i><span></span></div>
        <div class="lg-scriptline">Care for every garment. Confidence in every order.</div>
      </div>

      <!-- address / phone / opening hours -->
      <footer class="lg-hero-foot">
        ${address ? `
        <div class="lg-foot-item">
          <svg class="lg-foot-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 6.2-9 12-9 12s-9-5.8-9-12a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3.2"/></svg>
          <span>${escapeHtml(address)}</span>
        </div>` : ''}
        ${phone ? `
        <a class="lg-foot-item" href="${lgTelHref(phone)}" style="text-decoration:none;color:inherit;">
          <svg class="lg-foot-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/></svg>
          <span><b>${escapeHtml(phone)}</b></span>
        </a>` : ''}
        ${hours ? `
        <div class="lg-foot-item">
          <svg class="lg-foot-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.2"/><polyline points="12 6.8 12 12.3 15.8 14.4"/></svg>
          <span>${escapeHtml(hours)}</span>
        </div>` : ''}
      </footer>
    </section>

    <!-- ================= RIGHT: SIGN IN ================= -->
    <section class="lg-panel">
      <div class="lg-panel-top">
        <span class="lg-online"><i></i>Online</span>
        <span class="lg-secure">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4.6" y="10.5" width="14.8" height="9.6" rx="2.2"/><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7"/></svg>
          SECURE STAFF ACCESS
        </span>
      </div>

      <div class="lg-card">
        <div class="lg-card-head">
          <div class="lg-card-logo">
            <img src="${escapeHtml(logoSrc)}" alt="" onerror="this.onerror=null;this.src='${BRAND_LOGO}'"/>
          </div>
          <div>
            <div class="lg-card-name">${escapeHtml(shopName)}</div>
            <div class="lg-card-tag">${escapeHtml(tagline)}</div>
          </div>
        </div>

        <div class="lg-portal">STAFF PORTAL</div>
        <h2 class="lg-title">Sign In</h2>
        <p class="lg-lede">Please enter your credentials to continue.</p>

        <form id="loginForm" autocomplete="on">
          <label class="lg-label" for="lgUser">Username</label>
          <div class="lg-input">
            <svg class="lg-input-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7.4" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/></svg>
            <input id="lgUser" name="username" autocomplete="username" required placeholder="Username" />
          </div>

          <label class="lg-label" for="lgPass">Password</label>
          <div class="lg-input">
            <svg class="lg-input-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="8.2" cy="15.5" r="4.6"/><line x1="11.6" y1="12" x2="20.5" y2="3.5"/><line x1="16.2" y1="7.4" x2="19" y2="10.2"/><line x1="13.4" y1="10.2" x2="15.4" y2="12.2"/></svg>
            <input id="lgPass" name="password" type="password" autocomplete="current-password" required placeholder="••••••••" />
            <button type="button" class="lg-eye" id="lgEye" aria-label="Show password">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.8-6.6 10-6.6S22 12 22 12s-3.8 6.6-10 6.6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.9"/></svg>
            </button>
          </div>

          <button type="submit" class="lg-submit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="12" x2="19.2" y2="12"/><polyline points="13.2 6 19.2 12 13.2 18"/></svg>
            <span>Sign In</span>
          </button>

          <button type="button" id="forgotBtn" class="lg-forgot">Forgot Password?</button>

          ${cloudEnabled ? `
          <button type="button" id="loginSyncBtn" class="lg-sync">
            ☁️ <span>Force Cloud Sync</span>
          </button>` : ''}
        </form>

        <div class="lg-staff-only">Authorized Staff Only</div>

        <!-- IT Department support — intentionally kept, do not remove -->
        <div class="lg-support">
          <div class="lg-support-head">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h2.2a1 1 0 0 1 1 1v3.4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V14Z"/><path d="M20 14h-2.2a1 1 0 0 0-1 1v3.4a1 1 0 0 0 1 1H19a1 1 0 0 0 1-1V14Z"/><path d="M20 19.4a2.6 2.6 0 0 1-2.6 2.6H13"/></svg>
            <span>Need Help? Contact IT Department</span>
          </div>
          <a class="lg-support-phone" href="${lgTelHref(brand.p)}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/></svg>
            <span>${escapeHtml(brand.p || '')}</span>
          </a>
        </div>

        <div class="lg-divider"></div>
        <div class="lg-powered">
          <svg class="lg-powered-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
          <span class="lg-powered-txt">Powered by:</span>
          <img class="lg-powered-badge" src="assets/img/celinesoft-badge.png" alt="" />
          <span class="lg-powered-name">${escapeHtml(brand.n || 'CelineSoft')}</span>
        </div>
      </div>

      <div class="lg-bottom-strip"><b>${escapeHtml(shopName)}</b> &nbsp;›&nbsp; Staff sign-in</div>
    </section>
  </div>`;

  const appEl = $('#app');
  appEl.innerHTML = html;
  appEl.classList.add('lg-mounted');

  /* ---- password visibility ---- */
  const passEl = $('#lgPass');
  const eyeEl = $('#lgEye');
  if (eyeEl && passEl) {
    eyeEl.onclick = () => {
      const show = passEl.type === 'password';
      passEl.type = show ? 'text' : 'password';
      eyeEl.classList.toggle('is-on', show);
      eyeEl.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    };
  }

  $('#forgotBtn').onclick = () => { if (typeof openForgotPassword === 'function') openForgotPassword(); };

  if ($('#loginSyncBtn')) {
    $('#loginSyncBtn').onclick = async (e) => {
      e.preventDefault();
      const btn = e.currentTarget;
      const label = btn.querySelector('span');
      const original = label ? label.textContent : '';
      if (label) label.textContent = 'Syncing...';
      btn.disabled = true;
      try {
        await CLOUD.init();
        await CLOUD.pullAndMerge();
        CLOUD._initialMergeDone = true;
        toast('✅ Cloud Sync Complete! You can now log in.', 'success');
      } catch (err) {
        toast('Sync Error: ' + err.message, 'error');
      }
      if (label) label.textContent = original;
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
      const origHtml = btn.innerHTML;
      btn.innerHTML = '⏳ Syncing cloud data...';
      btn.disabled = true;
      try {
        await CLOUD.init();
        await CLOUD.pullAndMerge();
        CLOUD._initialMergeDone = true;
      } catch (err) {}
      btn.innerHTML = origHtml;
      btn.disabled = false;
      u = DB.login(f.get('username').trim(), f.get('password'));
    }

    if (!u) { toast(t('login.invalid') || 'Invalid username or password', 'error'); return; }
    toast(`Welcome, ${u.name}!`, 'success');

    // Branded boot animation while the workspace loads.
    // The page mounts first (behind the overlay), then the boot
    // screen fades out once its animation has played.
    const target = u.role === 'admin' ? 'dashboard' : 'pos';
    const BOOT_MS = 1900;      // how long the animation stays on screen
    const MOUNT_DELAY = 300;   // let the boot screen paint before mounting

    if (window.BOOT) {
      BOOT.show({ min: BOOT_MS, status: `Signing in as ${u.name || u.username} — loading your workspace` });
    }

    setTimeout(() => {
      app.go(target);
      if (window.BOOT) BOOT.hide();   // hide respects the minimum duration
    }, MOUNT_DELAY);
  };
}
