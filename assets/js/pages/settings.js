/* ===================== SETTINGS ===================== */
function renderSettings() {
  if (DB.currentUser().role !== 'admin') { app.go('dashboard'); return; }
  const s = DB.settings();
  const lastBackup = localStorage.getItem('mrLaundryLastBackup');
  const lastBackupTxt = lastBackup ? new Date(lastBackup).toLocaleString() : 'Never';

  const content = `
    <h1 class="page-title">⚙️ Settings</h1>
    <p class="page-sub">Customize your shop info, loyalty defaults, and manage your data.</p>

    <!-- IT ADMIN DEMO & SUBSCRIPTION SECTION - TOP VISIBILITY -->
    <div class="card" style="margin-bottom:20px;background:#fef2f2;border:2px solid #ef4444;">
      <div class="card-header"><h3 style="color:#b91c1c;">📅 Demo & Subscription (IT Admin)</h3></div>
      ${(() => {
        const st = getLicenseState();
        const map = {
          lifetime: ['#ecfdf5', '#15803d', '🌟 Lifetime licence — never expires'],
          active:   ['#eff6ff', '#1d4ed8', `✅ Active — expires ${new Date(st.expiry).toLocaleString()} (${st.daysLeft} day${st.daysLeft === 1 ? '' : 's'} left)`],
          expired:  ['#fef2f2', '#b91c1c', `❌ Expired on ${new Date(st.expiry).toLocaleDateString()} — POS blocked`],
          missing:  ['#fef2f2', '#b91c1c', '⚠️ No licence set — treated as expired']
        };
        const [bg, fg, text] = map[st.kind] || map.missing;
        return `<div style="background:${bg};color:${fg};padding:9px 12px;border-radius:8px;font-weight:700;font-size:12.5px;margin-bottom:12px;">
          ${text}${st.updated ? `<div style="font-weight:500;font-size:11px;opacity:.8;margin-top:3px;">Last change: ${escapeHtml(st.updated)}</div>` : ''}
        </div>`;
      })()}
      <p style="color:#991b1b;font-size:12px;margin-bottom:14px;">Manage subscription validity. Requires IT ADMIN PASSWORD.</p>
      <button class="btn btn-danger btn-block" id="openSubBtnTop">🔑 Manage Subscription</button>
    </div>

    <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;align-items:start;">
      <div>
        <div class="card" style="margin-bottom:20px;">
          <div class="card-header"><h3>🏪 Shop Information</h3></div>

          <div class="field" style="margin-bottom:18px;">
            <label style="display:flex;align-items:center;gap:8px;">
              Brand Logo
              <span style="display:inline-flex;align-items:center;gap:5px;background:#ecfdf5;color:#15803d;border:1px solid #86efac;border-radius:999px;padding:2px 9px;font-size:10.5px;font-weight:800;letter-spacing:.04em;">🔒 LOCKED BRAND</span>
            </label>
            <div style="display:flex;align-items:center;gap:16px;padding:14px;background:#0f172a;border-radius:10px;">
              <div style="background:#fff;padding:8px;border-radius:8px;">
                ${s.logoImage
                  ? `<img id="logoPreview" src="${s.logoImage}" style="width:150px;height:120px;object-fit:contain;display:block;"/>`
                  : `<div id="logoPreview" style="width:120px;height:120px;display:flex;align-items:center;justify-content:center;color:#0f172a;font-size:60px;">${s.logo||'🧺'}</div>`}
              </div>
              <div style="flex:1;color:#fff;">
                <div style="font-size:12px;font-weight:700;margin-bottom:8px;">Modern Dry Cleaners — official lockup</div>
                <label class="btn btn-primary" style="cursor:pointer;display:inline-block;">
                  📤 Replace Logo
                  <input type="file" id="logoFile" accept="image/*" style="display:none;"/>
                </label>
                <button class="btn btn-ghost" id="removeLogoBtn" style="color:#fff;border:1px solid #444;margin-left:8px;">↺ Restore Brand Logo</button>
                <div style="font-size:11px;opacity:.72;margin-top:8px;line-height:1.5;">
                  🔒 The bundled brand asset is locked to <b>assets/img/brand-logo.png</b>.
                  Replacing it needs the IT Admin password, and “Restore Brand Logo” always brings the official art back.<br>
                  PNG, JPG, SVG · white background preferred · max 2 MB.
                </div>
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="field"><label>Shop Name</label><input id="sName" value="${escapeHtml(s.shopName)}"/></div>
            <div class="field"><label>Fallback Logo (emoji)</label><input id="sLogo" value="${escapeHtml(s.logo)}" maxlength="4" style="font-size:20px;text-align:center;"/></div>
          </div>
          <div class="form-row cols-1">
            <div class="field"><label>Tagline</label><input id="sTag" value="${escapeHtml(s.tagline||'')}"/></div>
          </div>
          <div class="form-row">
            <div class="field"><label>Phone</label><input id="sPhone" value="${escapeHtml(s.phone||'')}"/></div>
            <div class="field"><label>Currency Symbol</label><input id="sCurrency" value="${escapeHtml(s.currency)}"/></div>
          </div>
          <div class="form-row cols-1">
            <div class="field"><label>Address</label><textarea id="sAddr" rows="2">${escapeHtml(s.address||'')}</textarea></div>
          </div>
          <div class="form-row cols-1">
            <div class="field">
              <label>Shop Timings (printed on invoices &amp; portal)</label>
              <textarea id="sTimings" rows="4" style="font-family:inherit;font-size:12.5px;">${escapeHtml(s.shopTimingText||'')}</textarea>
              <small style="color:var(--text-soft);">Winter / Summer timings + Sunday closed. Leave blank to hide.</small>
            </div>
          </div>
          <div class="form-row">
            <div class="field">
              <label>Facebook Page</label>
              <input id="sFb" value="${escapeHtml(s.facebook||'')}" placeholder="facebook.com/yourpage"/>
              <small style="color:var(--text-soft);">Shown on the login screen. Paste a full URL or just the page name.</small>
            </div>
            <div class="field">
              <label>WhatsApp Number</label>
              <input id="sWa" value="${escapeHtml(s.whatsapp||s.phone||'')}" placeholder="03xx-xxxxxxx"/>
              <small style="color:var(--text-soft);">Leave blank to use the Phone number above.</small>
            </div>
          </div>
          <div class="form-row">
            <div class="field"><label>Tax Percent (%)</label><input type="number" id="sTax" value="${s.taxPercent||0}"/></div>
            <div class="field"><label>Invoice URL Base (for QR)</label><input id="sBase" value="${escapeHtml(s.baseUrl||'')}" placeholder="https://yourshop.com (optional)"/></div>
          </div>
          <div class="form-row cols-1">
            <div class="field"><label>Invoice Footer Message</label><input id="sFooter" value="${escapeHtml(s.invoiceFooter||'')}"/></div>
          </div>
        </div>

        <div class="card" style="margin-bottom:20px;">
          <div class="card-header"><h3>⭐ Loyalty & Delivery Defaults</h3></div>
          <div class="form-row">
            <div class="field"><label>Loyalty Card Prefix</label><input id="sLoyPrefix" value="${escapeHtml(s.loyaltyPrefix||'MRL')}" maxlength="6" style="text-transform:uppercase;"/><small style="color:var(--text-soft);">Auto-generated cards look like: MRL-1001, MRL-1002…</small></div>
            <div class="field"><label>Default Loyalty Discount %</label><input type="number" id="sLoyPct" value="${s.defaultLoyaltyDiscountPercent||10}" min="0" max="100"/></div>
          </div>
          <div class="form-row">
            <div class="field"><label>Default Delivery Days</label>
              <select id="sDeliveryDays">
                ${[1,2,3,4,5,7].map(n => `<option value="${n}" ${(s.defaultDeliveryDays||2)==n?'selected':''}>${n} day${n>1?'s':''}</option>`).join('')}
              </select>
            </div>
            <div class="field"><label>Backup Reminder</label>
              <select id="sBackupReminder">
                <option value="true"  ${s.autoBackupReminder!==false?'selected':''}>✅ Show daily reminder</option>
                <option value="false" ${s.autoBackupReminder===false?'selected':''}>❌ Disabled</option>
              </select>
            </div>
          </div>
        </div>

        <button class="btn btn-primary btn-lg" id="saveSetBtn">💾 Save All Settings</button>
      </div>

      <div>
        <div class="card" style="margin-bottom:20px;">
          <div class="card-header"><h3>🔐 Password &amp; Credential Security</h3></div>
          ${(() => {
            const vi = (window.MDC_VAULT && MDC_VAULT.info) ? MDC_VAULT.info() : { users: [], supported: false, seedActive: false };
            const seeds = vi.seedActive;
            const ucount = vi.users.length;
            return `<div style="font-size:12px;line-height:1.9;color:var(--text-soft);margin-bottom:12px;">
              Storage: <b style="color:${ucount ? '#15803d' : '#b45309'};">${ucount ? 'Hashed (PBKDF2 · one-way)' : 'Not initialised'}</b><br>
              Protected logins: <b style="color:var(--text);">${ucount}</b><br>
              First-run seed: <b style="color:${seeds ? '#b45309' : '#15803d'};">${seeds ? 'still active (sign in once to retire it)' : 'retired ✓'}</b><br>
              DevTools shield: <b style="color:var(--text);">${(window.MDC_GUARD ? 'ON' : 'off')}</b>
            </div>
            <div style="background:#ecfdf5;border:1px solid #86efac;border-radius:8px;padding:10px;font-size:11.5px;line-height:1.7;color:#14532d;margin-bottom:12px;">
              Passwords are no longer stored as text anywhere — not in the database, not in the IndexedDB backup, not in the source files.
              Reading storage (F12 → Application) now shows only a PBKDF2 verifier, which cannot be reversed into the password.
            </div>
            <button class="btn btn-secondary btn-block" id="rotateITBtn" style="margin-bottom:8px;">🔑 Change IT Admin Password</button>
            <button class="btn btn-ghost btn-block" id="secReportBtn">📋 Open Security Report</button>`;
          })()}
        </div>

        <div class="card" style="margin-bottom:20px;">
          <div class="card-header"><h3>🔢 Invoice Numbering</h3></div>
          ${(() => {
            const n = DB.invoiceCounterInfo();
            return `<div style="font-size:12px;line-height:1.8;color:var(--text-soft);margin-bottom:12px;">
              Next invoice: <b style="color:var(--text);font-size:15px;">${escapeHtml(n.next)}</b><br>
              Numbers already used up to: <b style="color:var(--text);">${n.highest || '—'}</b><br>
              Total invoices: <b style="color:var(--text);">${n.issued}</b>
            </div>
            <div class="form-row">
              <div class="field"><label>Prefix</label><input id="invPrefix" value="${escapeHtml(n.prefix)}" maxlength="8" placeholder="INV-"/></div>
              <div class="field"><label>Digits</label>
                <select id="invPad">
                  ${[1,2,3,4,5].map(d => `<option value="${d}" ${n.pad===d?'selected':''}>${d} — ${String(1).padStart(d,'0')}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="field" style="margin-bottom:10px;">
              <label>Start counting from</label>
              <input type="number" id="invNext" min="1" step="1" value="${n.nextNumber}"/>
              <small style="color:var(--text-soft);">Set <b>1</b> to start at ${escapeHtml(n.prefix)}001. Test/sample invoices aap baad me delete kar dein, phir yahan number wapas set kar dein.</small>
            </div>
            <button class="btn btn-primary btn-block" id="saveInvNumBtn" style="margin-bottom:8px;">💾 Save Numbering</button>
            <button class="btn btn-secondary btn-block" id="resetInvNumBtn">↺ Start Fresh at 001</button>`;
          })()}
        </div>

        <div class="card" style="margin-bottom:20px;">
          <div class="card-header"><h3>🧾 Invoice Customization</h3></div>
          <p style="color:var(--text-soft);font-size:12px;margin-bottom:14px;">Control what shows on printed invoices — font size, paper width, what details to display.</p>
          <button class="btn btn-primary btn-block" id="openInvCustBtn">⚙️ Open Invoice Customizer</button>
        </div>

        <div class="card" style="margin-bottom:20px;">
          <div class="card-header"><h3>🖨️ Thermal Print Setup</h3></div>
          <div style="font-size:12px;line-height:1.9;color:var(--text-soft);margin-bottom:12px;">
            Paper: <b style="color:var(--text);">${(+s.invoicePaper === 58 ? '58mm' : '80mm')}</b><br>
            Logo width: <b style="color:var(--text);">${+s.invoiceLogoSize || 70}% of paper</b><br>
            Logo height cap: <b style="color:var(--text);">${+s.invoiceLogoMaxMm || 20}mm</b><br>
            Margin: <b style="color:var(--text);">${s.invoiceMarginMm == null ? 2 : +s.invoiceMarginMm}mm</b><br>
            1-bit logo: <b style="color:var(--text);">${s.invoiceLogoMono !== false ? 'ON (crisp thermal)' : 'OFF (colour)'}</b>
          </div>
          <button class="btn btn-secondary btn-block" id="resetPrintBtn" style="margin-bottom:8px;">↺ Reset to Recommended (80mm · 70% logo · 20mm)</button>
          <button class="btn btn-ghost btn-block" id="wideLogoBtn" style="margin-bottom:8px;">↔ Wider Logo (70% · 26mm tall)</button>
          <small style="color:var(--text-soft);font-size:11px;display:block;line-height:1.6;">
            Use these if prints come out too big / the logo looks blurry.<br>
            In the browser print dialog keep <b>Scale = Default (100%)</b> and <b>Margins = None / Minimum</b> — that is what keeps a thermal receipt at its true size.
          </small>
        </div>

        <div class="card" style="margin-bottom:20px;">
          <div class="card-header"><h3>📱 QR Posters for Counter</h3></div>
          <p style="color:var(--text-soft);font-size:12px;margin-bottom:14px;">Print QR posters — customers scan with phone camera to view price list, track orders, or read reviews.</p>
          <button class="btn btn-primary btn-block" id="openQRBtn">📱 Generate QR Posters</button>
        </div>

        <div class="card" style="margin-bottom:20px;">
          <div class="card-header"><h3>🤖 Auto-Reply Rules</h3></div>
          <p style="color:var(--text-soft);font-size:12px;margin-bottom:14px;">When customer sends a message with trigger words, system suggests reply automatically.</p>
          <button class="btn btn-primary btn-block" id="openARBtn">🤖 Configure Auto-Reply</button>
        </div>

        <div class="card" style="margin-bottom:20px;">
          <div class="card-header"><h3>🌐 Customer Portal Settings</h3></div>
          <p style="color:var(--text-soft);font-size:12px;margin-bottom:14px;">Configure what customers see on the portal page.</p>
          <button class="btn btn-primary btn-block" id="openPortalCfg">🌐 Configure Portal</button>
        </div>

        <div class="card" style="margin-bottom:20px;">
          <div class="card-header"><h3>🚚 Pickup &amp; Delivery Charges</h3></div>
          <p style="color:var(--text-soft);font-size:12px;margin-bottom:10px;">
            Booking screen par cashier ye charge khud likhta hai. Ye <b>discount ke baad</b> add hota hai —
            discount is par kabhi lagta nahi.
          </p>
          <div class="form-row cols-1" style="margin-bottom:8px;">
            <div class="field">
              <label>Field on booking screen</label>
              <select id="dcEnabled">
                <option value="1" ${s.deliveryChargeEnabled !== false ? 'selected' : ''}>✅ Show — cashier decides</option>
                <option value="0" ${s.deliveryChargeEnabled === false ? 'selected' : ''}>🔕 Hide — counter only</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="field"><label>Default amount</label><input type="number" id="dcDefault" min="0" value="${s.defaultDeliveryCharge || 0}"/></div>
            <div class="field"><label>Max allowed</label><input type="number" id="dcMax" min="0" value="${s.deliveryChargeMax == null ? 5000 : s.deliveryChargeMax}"/></div>
          </div>
          <div class="form-row cols-1" style="margin-bottom:8px;">
            <div class="field"><label>Label on invoice</label><input id="dcLabel" value="${escapeHtml(s.deliveryChargeLabel || 'Delivery Charges')}"/></div>
          </div>
          <button class="btn btn-primary btn-block" id="saveDcBtn">💾 Save Delivery Charges</button>
        </div>

        <div class="card" style="margin-bottom:20px;">
          <div class="card-header"><h3>🎉 Occasion Themes</h3></div>
          <p style="color:var(--text-soft);font-size:12px;margin-bottom:10px;">
            Login screen &amp; portal automatically dress up for Pakistan's gazetted holidays
            (Iqbal Day, Eid, 14 August …), starting a few days before the event.
          </p>
          <div id="ocStatus" style="font-size:12px;margin-bottom:12px;"></div>
          <button class="btn btn-primary btn-block" id="openOccasionsBtn">🎉 Manage Occasion Themes</button>
        </div>

        <div class="card" style="margin-bottom:20px;">
          <div class="card-header"><h3>📱 WhatsApp Templates</h3></div>
          <p style="color:var(--text-soft);font-size:12px;margin-bottom:14px;">Customize auto-prompted messages sent when order status changes.</p>
          <button class="btn btn-primary btn-block" id="openWaTplBtn">📱 Customize WhatsApp Templates</button>
        </div>

        <div class="card" style="margin-bottom:20px;">
          <div class="card-header"><h3>☁️ Google Drive Backup</h3></div>
          <p style="color:var(--text-soft);font-size:12px;margin-bottom:14px;">Auto-save backups to your personal Google Drive.</p>
          <button class="btn btn-primary btn-block" id="openGDriveBtn">☁️ Configure Google Drive</button>
          <div id="gdriveStatus" style="font-size:11px;color:var(--text-soft);margin-top:8px;text-align:center;"></div>
        </div>

        <div class="card" style="margin-bottom:20px;background:linear-gradient(135deg,#fef3c7 0%,#fffbeb 100%);border:2px solid #f59e0b;">
          <div class="card-header"><h3>🔑 Master Recovery Code <span class="badge" style="background:${(s.masterRecoveryCodeHash||s.masterRecoveryCode)?'#10b981':'#ef4444'};color:#fff;">${(s.masterRecoveryCodeHash||s.masterRecoveryCode)?'✅ SET':'⚠️ NOT SET'}</span></h3></div>
          <p style="color:#78350f;font-size:12px;margin-bottom:14px;">
            🔐 <b>CRITICAL FOR LAUNCH!</b> A special PIN that resets any user password if forgotten. Like a bank PIN — keep safe!
          </p>
          <button class="btn btn-warning btn-block" id="openMasterCodeBtn" style="background:#f59e0b;color:#fff;border:none;font-weight:700;">
            🔑 ${(s.masterRecoveryCodeHash||s.masterRecoveryCode)?'Change':'Set Up'} Master Recovery Code
          </button>
          ${(s.masterRecoveryCodeHash||s.masterRecoveryCode) ? `<small style="display:block;text-align:center;color:#78350f;margin-top:8px;">Set on: ${new Date(s.masterRecoveryCodeSetAt||Date.now()).toLocaleDateString()} · stored as a one-way hash</small>` : ''}
        </div>


        <div class="card" style="margin-bottom:20px;">
          <div class="card-header"><h3>🔄 Cloud Sync (Multi-Device)
            <span class="badge" style="background:${(typeof CLOUD !== 'undefined' && CLOUD.isEnabled()) ? '#10b981' : '#ef4444'};color:#fff;">${(typeof CLOUD !== 'undefined' && CLOUD.isEnabled()) ? '✅ ON' : '⏸️ OFF'}</span>
          </h3></div>
          <p style="color:var(--text-soft);font-size:12px;margin-bottom:14px;">
            Mobile / PC / tablet — sab par ek hi data. Project pehle se configured hai.
          </p>
          <button class="btn btn-primary btn-block btn-lg" id="openCloudBtn" style="font-weight:800;">⚙️ Cloud Sync Settings kholein</button>
          ${(typeof CLOUD !== 'undefined' && !CLOUD.isEnabled() && CLOUD.hasDefaults()) ? `
            <button class="btn btn-success btn-block" id="cloudQuickOn" style="margin-top:8px;font-weight:800;">☁️ Abhi connect karein (agar khud ON na hua ho)</button>
            <small style="display:block;text-align:center;color:var(--text-soft);margin-top:6px;">Aam tor par zaroorat nahi — login hote hi sync khud ON ho jata hai</small>
          ` : ''}
          <button class="btn btn-ghost btn-block btn-sm" id="cloudAdvancedBtn" style="margin-top:8px;">🔒 Advanced (IT Admin password)</button>
          <div id="cloudStatus" style="font-size:11px;color:var(--text-soft);margin-top:8px;text-align:center;"></div>
          <small id="cloudAutoNote" style="display:block;text-align:center;color:var(--success);margin-top:4px;">⚡ Auto-sync ON — har naye device par login karte hi khud connect ho jata hai</small>
        </div>

        <div class="card" style="margin-bottom:20px;">
          <div class="card-header"><h3>🏢 Multi-Branch</h3></div>
          <p style="color:var(--text-soft);font-size:12px;margin-bottom:14px;">Manage multiple shop locations from one system.</p>
          <button class="btn btn-primary btn-block" data-page="branches">🏢 Manage Branches</button>
        </div>

        <div class="card" style="margin-bottom:20px;">
          <div class="card-header"><h3>🔒 Storage Persistence</h3></div>
          <p style="color:var(--text-soft);font-size:12px;margin-bottom:14px;">Prevent browser from auto-clearing your data. Critical for online use!</p>
          <button class="btn btn-primary btn-block" id="checkStorageBtn">🔒 Check Storage Status</button>
        </div>

        <div class="card" style="margin-bottom:20px;">
          <div class="card-header"><h3>📷 Photo Cleanup</h3></div>
          <p style="color:var(--text-soft);font-size:12px;margin-bottom:10px;">Automatically delete photos from delivered orders to save browser storage.</p>
          <div class="form-row">
            <div class="field" style="margin:0;">
              <label>Retention (days after delivery)</label>
              <input type="number" id="sPhotoDays" value="${s.photoRetentionDays||30}" min="1" max="365"/>
            </div>
            <div class="field" style="margin:0;">
              <label>Auto-Cleanup</label>
              <select id="sPhotoAuto">
                <option value="true"  ${s.photoAutoCleanup!==false?'selected':''}>✅ Enabled</option>
                <option value="false" ${s.photoAutoCleanup===false?'selected':''}>❌ Disabled</option>
              </select>
            </div>
          </div>
          <button class="btn btn-warning btn-block" id="cleanupNowBtn" style="margin-top:10px;">🧹 Clean Up Now</button>
          <div id="photoStorageInfo" style="font-size:11px;color:var(--text-soft);margin-top:8px;text-align:center;"></div>
        </div>

        <div class="card" style="margin-bottom:20px;">
          <div class="card-header"><h3>💾 Backup & Restore</h3></div>
          <div style="padding:10px;background:var(--surface-alt);border-radius:8px;margin-bottom:14px;font-size:12px;">
            <b>Last Backup:</b> ${lastBackupTxt}<br>
            <b>Total Records:</b><br>
            • Orders: ${DB.all('orders').length}<br>
            • Customers: ${DB.all('customers').length}<br>
            • Products: ${DB.all('products').length}
          </div>
          <p style="color:var(--text-soft);font-size:12px;margin-bottom:14px;">Your data lives in your browser. <b>Always keep a recent backup!</b></p>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <button class="btn btn-success btn-lg" id="exportBtn">📥 Download Backup</button>
            <label class="btn btn-secondary" style="cursor:pointer;text-align:center;">
              📤 Restore from Backup
              <input type="file" id="importFile" accept="application/json" style="display:none;"/>
            </label>
            <hr style="margin:8px 0;border:none;border-top:1px solid var(--border);"/>
            <button class="btn btn-danger" id="resetBtn">⚠️ Reset All Data</button>
          </div>
        </div>
      </div>
    </div>
  `;
  $('#app').innerHTML = renderLayout('settings', content);
  bindLayout();

  let pendingLogoDataUrl = null;
  $('#logoFile').onchange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast('Logo must be under 2 MB','error'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      pendingLogoDataUrl = reader.result;
      const prev = $('#logoPreview');
      if (prev.tagName === 'IMG') prev.src = pendingLogoDataUrl;
      else prev.outerHTML = `<img id="logoPreview" src="${pendingLogoDataUrl}" style="width:150px;height:120px;object-fit:contain;display:block;"/>`;
      toast('Logo loaded — click Save to apply','success');
    };
    reader.readAsDataURL(file);
  };

  // Brand logo is locked: this never blanks the logo, it restores the bundled
  // Modern Dry Cleaners artwork (applied on Save, which is password-gated).
  $('#removeLogoBtn').onclick = () => {
    pendingLogoDataUrl = (window.BRAND_INFO ? BRAND_INFO.logoImage : 'assets/img/brand-logo.png');
    const prev = $('#logoPreview');
    if (prev.tagName === 'IMG') prev.src = pendingLogoDataUrl;
    else prev.outerHTML = `<img id="logoPreview" src="${pendingLogoDataUrl}" style="width:150px;height:120px;object-fit:contain;display:block;"/>`;
    toast('Official brand logo restored — click Save to apply','success');
  };

  $('#saveSetBtn').onclick = () => {
    promptPasswordModal('Unlock Settings Save', () => {
      const patch = {
        shopName: $('#sName').value.trim(),
      logo: $('#sLogo').value.trim() || '🧺',
      tagline: $('#sTag').value.trim(),
      phone: $('#sPhone').value.trim(),
      facebook: ($('#sFb')?.value || '').trim(),
      whatsapp: ($('#sWa')?.value || '').trim(),
      currency: $('#sCurrency').value.trim() || 'Rs.',
      address: $('#sAddr').value.trim(),
      shopTimingText: ($('#sTimings')?.value || '').trim(),
      taxPercent: Math.max(0, +$('#sTax').value || 0),
      baseUrl: $('#sBase').value.trim(),
      invoiceFooter: $('#sFooter').value.trim(),
      loyaltyPrefix: ($('#sLoyPrefix').value || 'MRL').toUpperCase(),
      defaultLoyaltyDiscountPercent: Math.max(0, +$('#sLoyPct').value || 0),
      defaultDeliveryDays: +$('#sDeliveryDays').value || 2,
      autoBackupReminder: $('#sBackupReminder').value === 'true',
      photoRetentionDays: Math.max(1, +($('#sPhotoDays')?.value || 30)),
      photoAutoCleanup: ($('#sPhotoAuto')?.value || 'true') === 'true'
    };
    if (pendingLogoDataUrl !== null) patch.logoImage = pendingLogoDataUrl;
    DB.saveSettings(patch);
    toast('Settings saved','success');
    renderSettings();
    });
  };

  $('#exportBtn').onclick = doBackup;
  $('#openInvCustBtn').onclick = () => openInvoiceCustomizer();

  /* ---- Credential security ---- */
  if ($('#rotateITBtn')) $('#rotateITBtn').onclick = async () => {
    const cur = prompt('Current IT Admin password:');
    if (!cur) return;
    if (!(await verifyITAdminPassword(cur))) { toast('Current password is wrong', 'error'); return; }
    const np = prompt('New IT Admin password (min 8 characters):');
    if (!np || np.length < 8) { toast('Use at least 8 characters', 'error'); return; }
    const np2 = prompt('Type it again to confirm:');
    if (np !== np2) { toast('Passwords do not match', 'error'); return; }
    if (window.MDC_CODE_VAULT) {
      await MDC_CODE_VAULT.set('itadmin', np);
      toast('IT Admin password updated (stored hashed)', 'success');
      if (typeof logAction === 'function') logAction('security.itAdminPassword', 'rotated');
    }
  };

  if ($('#secReportBtn')) $('#secReportBtn').onclick = () => openSecurityReport();

  /* ---- Invoice numbering ---- */
  if ($('#saveInvNumBtn')) $('#saveInvNumBtn').onclick = () => {
    const prefix = ($('#invPrefix').value || '').trim();
    const pad = Math.max(1, Math.min(8, +$('#invPad').value || 3));
    const next = parseInt($('#invNext').value, 10);
    if (!isFinite(next) || next < 1) { toast('Start number must be 1 or more', 'error'); return; }
    DB.saveSettings({ invoicePrefix: prefix, invoicePad: pad });
    DB.setInvoiceNextNumber(next);
    toast('Invoice numbering saved — next: ' + DB.peekInvoiceNumber(), 'success');
    if (typeof logAction === 'function') logAction('settings.invoiceNumbering', 'next=' + next + ' prefix=' + prefix);
    renderSettings();
  };

  if ($('#resetInvNumBtn')) $('#resetInvNumBtn').onclick = () => {
    const info = DB.invoiceCounterInfo();
    const warn = info.issued
      ? `<br><br><b style="color:#b91c1c;">Warning:</b> ${info.issued} invoice(s) already exist in this system. Restarting at 001 will create <b>duplicate invoice numbers</b> for real orders. Test/sample invoices ko pehle delete karein.`
      : '<br><br>No invoices exist yet — safe to start at 001.';
    confirmDialog('Start invoice numbering fresh at 001?' + warn, () => {
      DB.saveSettings({ invoicePrefix: $('#invPrefix').value.trim() || 'INV-', invoicePad: +$('#invPad').value || 3 });
      DB.setInvoiceNextNumber(1);
      toast('Numbering restarted — next invoice: ' + DB.peekInvoiceNumber(), 'success');
      if (typeof logAction === 'function') logAction('settings.invoiceNumbering', 'restart at 1');
      renderSettings();
    });
  };

  /* One-click, shop-ready thermal print setup ("print too big" fix). */
  if ($('#resetPrintBtn')) $('#resetPrintBtn').onclick = () => {
    confirmDialog('Apply the recommended thermal print setup?<br><br><b>80mm paper · logo 70% width · max 20mm tall · 2mm margin · crisp 1-bit logo</b><br><br>You can fine-tune it any time in the Invoice Customizer.', () => {
      DB.saveSettings({
        invoicePaper: '80',
        invoiceLogoSize: 70,
        invoiceLogoMaxMm: 20,
        invoiceLogoThreshold: 185,
        invoiceLogoMono: true,
        invoiceMarginMm: 2,
        invoiceFontSize: 13,
        invoiceWidth: 360
      });
      if (window.THERMAL) { try { THERMAL.clearCache(); THERMAL.prime(); } catch (e) {} }
      toast('Recommended print settings saved', 'success');
      renderSettings();
    });
  };

  if ($('#wideLogoBtn')) $('#wideLogoBtn').onclick = () => {
    DB.saveSettings({
      invoicePaper: '80',
      invoiceLogoSize: 70,
      invoiceLogoMaxMm: 26,
      invoiceLogoThreshold: 185,
      invoiceLogoMono: true,
      invoiceMarginMm: 2
    });
    if (window.THERMAL) { try { THERMAL.clearCache(); THERMAL.prime(); } catch (e) {} }
    toast('Wide logo settings saved', 'success');
    renderSettings();
  };
  if ($('#openPortalCfg')) $('#openPortalCfg').onclick = () => openPortalConfigDialog();

  /* ---- Pickup & delivery charges ---- */
  if ($('#saveDcBtn')) $('#saveDcBtn').onclick = () => {
    const label = ($('#dcLabel').value || '').trim() || 'Delivery Charges';
    const def = Math.max(0, +$('#dcDefault').value || 0);
    const max = Math.max(def, +$('#dcMax').value || 0);
    DB.saveSettings({
      deliveryChargeEnabled: $('#dcEnabled').value === '1',
      defaultDeliveryCharge: def,
      deliveryChargeMax: max,
      deliveryChargeLabel: label
    });
    if (typeof logAction === 'function') logAction('settings.deliveryCharge', 'default=' + def + ' max=' + max);
    toast('Delivery charges saved', 'success');
    renderSettings();
  };

  /* ---- Occasion themes ---- */
  const ocEl = $('#ocStatus');
  if (ocEl) {
    if (!window.OCCASIONS) ocEl.innerHTML = '<span style="color:#b91c1c;">Engine not loaded</span>';
    else if (OCCASIONS.config().enabled === false) ocEl.innerHTML = '<span style="color:var(--text-soft);">🔕 Switched off</span>';
    else {
      const act = OCCASIONS.active();
      const nxt = OCCASIONS.upcoming(1)[0];
      ocEl.innerHTML = act
        ? `<span style="color:#16a34a;font-weight:700;">🟢 Live now: ${escapeHtml(act.occasion.name)}</span>` +
          `<div style="color:var(--text-soft);margin-top:2px;">${escapeHtml(OCCASIONS.chipText(act))}</div>`
        : (nxt
            ? `<span style="color:var(--text-soft);">Next: <b>${escapeHtml(nxt.occasion.name)}</b> — theme starts ` +
              `${escapeHtml(OCCASIONS.prettyDate(nxt.start))} (${nxt.daysTo - OCCASIONS.config().defaultLead > 0 ? (nxt.daysTo) + ' days away' : 'soon'})</span>`
            : '<span style="color:var(--text-soft);">No upcoming occasion in the plan</span>');
    }
  }
  if ($('#openOccasionsBtn')) $('#openOccasionsBtn').onclick = () => openOccasionManager();
  if ($('#openQRBtn')) $('#openQRBtn').onclick = () => openQRMenuPoster();
  if ($('#openARBtn')) $('#openARBtn').onclick = () => openAutoReplyEditor();
  if ($('#checkStorageBtn')) $('#checkStorageBtn').onclick = () => showStorageStatus();
  if ($('#openWaTplBtn'))  $('#openWaTplBtn').onclick  = () => openWhatsAppTemplateEditor();
  if ($('#openGDriveBtn')) $('#openGDriveBtn').onclick = () => {
    promptPasswordModal('Access GDrive Settings', () => openGDriveManager());
  };
  if ($('#openMasterCodeBtn')) $('#openMasterCodeBtn').onclick = () => openMasterCodeSetup();
  /* Main entry — ab password ke baghair khulta hai (config pehle se app ke andar hai) */
  if ($('#openCloudBtn')) $('#openCloudBtn').onclick = () => {
    if (typeof openCloudSyncManager === 'function') openCloudSyncManager();
    else toast('Cloud Sync module load nahi hua — page refresh karein (Ctrl+Shift+R)', 'error');
  };
  /* 1-click ON — manager khulta hai aur andar progress dikhta hai */
  if ($('#cloudQuickOn')) $('#cloudQuickOn').onclick = () => {
    if (typeof openCloudSyncManager === 'function') openCloudSyncManager({ autoEnable: true });
    else toast('Cloud Sync module load nahi hua — page refresh karein (Ctrl+Shift+R)', 'error');
  };
  /* Advanced (destructive actions) — IT Admin password ke peeche */
  if ($('#cloudAdvancedBtn')) $('#cloudAdvancedBtn').onclick = () => {
    promptPasswordModal('Cloud Sync — Advanced (IT Admin)', () => openCloudSyncManager({ advanced: true }));
  };
  if ($('#openSubBtnTop')) $('#openSubBtnTop').onclick = () => openSubscriptionManager();
  // Status indicators
  const gdEl = $('#gdriveStatus');
  if (gdEl) {
    if (GDRIVE.isConnected()) {
      const last = localStorage.getItem(GDRIVE.LAST_BACKUP_KEY);
      gdEl.innerHTML = `✅ Connected${last?' • Last backup: '+new Date(last).toLocaleString():''}`;
    } else gdEl.innerHTML = GDRIVE.getClientId() ? '⚠️ Configured but not connected' : '❌ Not set up';
  }
  const cEl = $('#cloudStatus');
  if (cEl) {
    if (CLOUD.isEnabled() && CLOUD.isReady()) {
      const last = localStorage.getItem(CLOUD.LAST_SYNC_KEY);
      cEl.innerHTML = `✅ Active • Shop ID: <b>${CLOUD.getShopId()}</b>${last?' • Last sync: '+new Date(last).toLocaleString():''}`;
    } else cEl.innerHTML = CLOUD.getConfig() ? '⏸️ Configured but paused' : '❌ Not set up';
  }

  $('#importFile').onchange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      confirmDialog('This will REPLACE all current data with the backup. Continue?', () => {
        try { DB.importJSON(reader.result); toast('Restored! Reloading...','success'); setTimeout(()=>location.reload(), 800); }
        catch(err){ toast('Invalid backup file','error'); }
      });
    };
    reader.readAsText(file);
  };

  $('#resetBtn').onclick = () => {
    confirmDialog('⚠️ This will DELETE ALL DATA and restore defaults. Continue?', () => {
      DB.reset(); toast('Reset complete','success'); setTimeout(()=>location.reload(), 800);
    });
  };
}

/* Global backup helper — usable from topbar / banner too */
function doBackup() {
  downloadFile(`mr-laundry-backup-${isoDay()}.json`, DB.exportJSON());
  localStorage.setItem('mrLaundryLastBackup', new Date().toISOString());
  toast('Backup downloaded','success');
}

function openSubscriptionManager() {
  promptPasswordModal('Access Subscription Settings', () => renderSubscriptionModal());
}


/* ============================================================
   SECURITY REPORT — what is protected and what is not
   ============================================================ */
/* ============================================================
   🎉 OCCASION THEMES  —  Pakistan gazetted holidays on screen
   ============================================================
   The shop can:
     • switch the whole feature on/off
     • start the theme N days before the occasion
     • edit a holiday's date (Eid dates move every year)
     • switch individual occasions off
     • add its own event (branch anniversary, Eid sale …)
   ============================================================ */
function openOccasionManager() {
  if (!window.OCCASIONS) { toast('Occasion engine not loaded', 'error'); return; }

  const cfg = OCCASIONS.config();
  const act = OCCASIONS.active();
  const themes = OCCASIONS.themeList();
  const todayISO = OCCASIONS.iso(new Date());

  const rows = OCCASIONS.plan()
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map(e => {
      const w = OCCASIONS.windowOf(e, cfg);
      const isNow = act && act.occasion.id === e.id;
      const past = w.end < todayISO;
      return `
        <tr data-ocrow="${escapeHtml(e.id)}" style="${past ? 'opacity:.55;' : ''}${isNow ? 'background:#ecfdf5;' : ''}">
          <td style="white-space:nowrap;">
            <input type="checkbox" class="oc-on" ${e.on !== false ? 'checked' : ''}/></td>
          <td>
            <div style="font-weight:700;">${escapeHtml(e.emoji || '🎉')} ${escapeHtml(e.name)}</div>
            <div style="font-size:11px;color:var(--text-soft);" dir="rtl">${escapeHtml(e.ur || '')}</div>
            ${isNow ? '<span class="badge" style="background:#16a34a;color:#fff;">LIVE NOW</span>' : ''}
            ${e.approx ? '<span class="badge" style="background:#f59e0b;color:#fff;" title="Lunar date — confirm with the Cabinet Division / Ruet-e-Hilal">≈ approx</span>' : ''}
          </td>
          <td><input type="date" class="oc-date" value="${escapeHtml(e.date)}" style="font-size:11.5px;padding:4px 6px;"/></td>
          <td><input type="number" class="oc-lead" min="0" max="30" value="${e.lead != null ? e.lead : cfg.defaultLead}"
                     style="width:58px;font-size:11.5px;padding:4px 6px;text-align:center;" title="days before"/></td>
          <td>
            <select class="oc-theme" style="font-size:11.5px;padding:4px 6px;max-width:150px;">
              ${themes.map(t => `<option value="${t.id}" ${t.id === e.theme ? 'selected' : ''}>${escapeHtml(t.name)}</option>`).join('')}
            </select>
          </td>
          <td style="font-size:10.5px;color:var(--text-soft);white-space:nowrap;">
            ${OCCASIONS.prettyDate(w.start)}<br>→ ${OCCASIONS.prettyDate(w.end)}
          </td>
          <td style="text-align:center;">
            <button class="btn btn-secondary btn-sm oc-preview" data-theme="${escapeHtml(e.theme)}" title="Preview">👁️</button>
            <button class="btn btn-secondary btn-sm oc-dup" title="Duplicate for next year">📄</button>
          </td>
        </tr>`;
    }).join('');

  openModal(`
    <h3>🎉 Occasion Themes</h3>
    <p class="sub">Pakistan ki gazetted holidays (Iqbal Day, Eid, 14 August, 25 December…) par login screen aur
      customer portal khud-ba-khud us occasion ke rang mein aa jate hain — event se kuch din pehle se.</p>

    <div class="form-row">
      <div class="field">
        <label>Feature</label>
        <select id="ocEnabled">
          <option value="1" ${cfg.enabled ? 'selected' : ''}>✅ ON — automatic</option>
          <option value="0" ${!cfg.enabled ? 'selected' : ''}>🔕 OFF — always normal theme</option>
        </select>
      </div>
      <div class="field">
        <label>Start how many days before</label>
        <input type="number" id="ocLead" min="0" max="30" value="${cfg.defaultLead}"/>
      </div>
    </div>
    <div class="form-row">
      <div class="field">
        <label>Language on screen</label>
        <select id="ocLang">
          <option value="both" ${cfg.lang === 'both' ? 'selected' : ''}>English + اردو</option>
          <option value="en" ${cfg.lang === 'en' ? 'selected' : ''}>English only</option>
          <option value="ur" ${cfg.lang === 'ur' ? 'selected' : ''}>اردو only</option>
        </select>
      </div>
      <div class="field">
        <label>Customer portal</label>
        <select id="ocPortal">
          <option value="1" ${cfg.showOnPortal ? 'selected' : ''}>✅ Show banner on portal</option>
          <option value="0" ${!cfg.showOnPortal ? 'selected' : ''}>🚫 Login screen only</option>
        </select>
      </div>
    </div>

    <div id="ocLiveBox" style="margin:14px 0;">${act ? OCCASIONS.previewBox(act) :
      '<div style="padding:12px;border-radius:12px;background:var(--surface-alt);font-size:12px;color:var(--text-soft);">Aaj koi occasion window active nahi hai — neeche kisi bhi occasion ke 👁️ par click kar ke theme dekh sakte hain.</div>'}</div>

    <div style="font-weight:800;margin:16px 0 8px;">📅 Holiday plan</div>
    <div style="max-height:330px;overflow:auto;border:1px solid var(--border);border-radius:10px;">
      <table class="table" style="font-size:12px;margin:0;">
        <thead><tr>
          <th style="width:34px;">On</th><th>Occasion</th><th style="width:118px;">Date</th>
          <th style="width:66px;" title="days before">Lead</th><th style="width:150px;">Theme</th>
          <th style="width:96px;">Shows</th><th style="width:76px;"></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <small style="color:var(--text-soft);display:block;margin-top:6px;">
      ≈ approx = Islamic (lunar) date. Ruet-e-Hilal announcement ke baad date yahan theek kar dein — theme usi din se shift ho jayega.
    </small>

    <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border);">
      <div style="font-weight:800;margin-bottom:8px;">➕ Apna event add karein</div>
      <div class="form-row">
        <div class="field" style="flex:2;"><label>Name</label><input id="ocNewName" placeholder="e.g. Shop Anniversary"/></div>
        <div class="field"><label>Date</label><input type="date" id="ocNewDate"/></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Urdu name (optional)</label><input id="ocNewUr" placeholder="سالگرہ مبارک" dir="rtl"/></div>
        <div class="field"><label>Theme</label>
          <select id="ocNewTheme">${themes.map(t => `<option value="${t.id}" ${t.id === 'anniversary' ? 'selected' : ''}>${escapeHtml(t.name)}</option>`).join('')}</select>
        </div>
      </div>
      <button class="btn btn-secondary btn-block" id="ocAddBtn">➕ Add to plan</button>
    </div>

    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Close</button>
      <button class="btn btn-secondary" id="ocTestBtn">👁️ Preview on this screen</button>
      <button class="btn btn-primary" id="ocSaveBtn">💾 Save</button>
    </div>
  `, { large: true, onOpen(m) {
    /* preview any theme in the box */
    m.querySelectorAll('.oc-preview').forEach(btn => {
      btn.onclick = () => {
        const fake = OCCASIONS.simulate(btn.dataset.theme);
        $('#ocLiveBox', m).innerHTML = OCCASIONS.previewBox(fake);
      };
    });
    /* duplicate a holiday to next year (handy for Eid planning) */
    m.querySelectorAll('.oc-dup').forEach(btn => {
      btn.onclick = () => {
        const tr = btn.closest('tr');
        const name = tr.querySelector('div[style*="font-weight:700"]').textContent.trim();
        const dateVal = tr.querySelector('.oc-date').value;
        const nd = new Date(dateVal + 'T00:00:00');
        nd.setFullYear(nd.getFullYear() + 1);
        $('#ocNewName', m).value = name;
        $('#ocNewDate', m).value = OCCASIONS.iso(nd);
        $('#ocNewUr', m).value = '';
        toast('Next year ka draft bana diya — neeche "Add to plan" dabayein', 'success');
      };
    });

    $('#ocAddBtn', m).onclick = () => {
      const name = $('#ocNewName', m).value.trim();
      const date = $('#ocNewDate', m).value;
      if (!name || !date) { toast('Name aur date dono chahiye', 'error'); return; }
      const custom = DB.settings().occasionPlan || [];
      custom.push({
        id: 'custom-' + Date.now(),
        name: name,
        ur: $('#ocNewUr', m).value.trim() || name,
        date: date,
        theme: $('#ocNewTheme', m).value,
        emoji: '🎉',
        lead: +$('#ocLead', m).value || cfg.defaultLead,
        days: 1,
        on: true,
        custom: true
      });
      DB.saveSettings({ occasionPlan: custom });
      toast('Event plan mein add ho gaya', 'success');
      closeModal();
      openOccasionManager();
    };

    $('#ocTestBtn', m).onclick = () => {
      const fakeAct = OCCASIONS.active() || OCCASIONS.simulate($('#ocNewTheme', m).value);
      try {
        OCCASIONS.apply(fakeAct);
        const hero = document.querySelector('.lg-hero');
        if (hero) hero.classList.add('oc-hero');
        toast('Theme applied — dashboard/portal par asar dekhne ke liye page refresh karein', 'success');
      } catch (e) { toast('Preview failed', 'error'); }
      closeModal();
    };

    $('#ocSaveBtn', m).onclick = () => {
      const overrides = [];
      const removed = [];
      const basePlan = OCCASIONS.plan();
      m.querySelectorAll('tr[data-ocrow]').forEach(tr => {
        const id = tr.dataset.ocrow;
        const base = basePlan.find(x => x.id === id) || {};
        const next = {
          id,
          on: tr.querySelector('.oc-on').checked,
          date: tr.querySelector('.oc-date').value,
          lead: Math.max(0, Math.min(30, +tr.querySelector('.oc-lead').value || 0)),
          theme: tr.querySelector('.oc-theme').value
        };
        /* keep only what actually differs from the built-in plan */
        const dirty = !base.custom &&
          (next.on !== (base.on !== false) || next.date !== base.date ||
           next.lead !== (base.lead != null ? base.lead : cfg.defaultLead) || next.theme !== base.theme);
        if (base.custom) {
          overrides.push(Object.assign({}, base, next));
        } else if (dirty) {
          overrides.push(Object.assign({ id }, next));
          if (next.on === false) removed.push(id);
        }
      });
      /* keep previously added custom events */
      (DB.settings().occasionPlan || []).forEach(c => { if (c.custom && !overrides.some(o => o.id === c.id)) overrides.push(c); });

      DB.saveSettings({
        occasionThemes: $('#ocEnabled', m).value === '1',
        occasionLeadDays: Math.max(0, Math.min(30, +$('#ocLead', m).value || 0)),
        occasionLang: $('#ocLang', m).value,
        occasionPortal: $('#ocPortal', m).value === '1',
        occasionPlan: overrides,
        occasionPlanRemoved: removed
      });
      if (typeof logAction === 'function') logAction('settings.occasions', overrides.length + ' override(s)');
      closeModal();
      toast('Occasion themes saved', 'success');
      renderSettings();
    };
  }});
}

function openSecurityReport() {
  const vi = (window.MDC_VAULT && MDC_VAULT.info) ? MDC_VAULT.info() : { users: [], supported: false, seedActive: true, iterationTarget: 0 };
  const ci = (window.MDC_CODE_VAULT) ? {
    itadmin: MDC_CODE_VAULT.has('itadmin'),
    master: !!DB.settings().masterRecoveryCodeHash
  } : {};
  let vaultRec = null;
  try { vaultRec = JSON.parse(localStorage.getItem('mdcVaultV1') || '{}'); } catch (e) {}
  const sample = vaultRec && Object.keys(vaultRec)[0] ? vaultRec[Object.keys(vaultRec)[0]] : null;

  openModal(`
    <h3>🔐 Security Report</h3>
    <p class="sub">Exactly what is stored in this browser — and what it would look like to someone pressing F12.</p>

    <div style="background:#f8fafc;border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:12px;font-size:12.5px;line-height:1.9;">
      <div><b>Password storage:</b> ${sample ? `hashed — ${escapeHtml(sample.alg)} · ${sample.it} iterations · salt ${String(sample.salt).slice(0,8)}…` : 'not initialised yet'}</div>
      <div><b>Plain-text passwords in DB:</b> <span style="color:#15803d;font-weight:800;">none</span></div>
      <div><b>Vault entries:</b> ${vi.users.length ? vi.users.map(u => escapeHtml(u.user)).join(', ') : '—'}</div>
      <div><b>IT Admin password:</b> ${ci.itadmin ? 'hashed ✓' : 'seed only'}</div>
      <div><b>Master Recovery Code:</b> ${ci.master ? 'hashed ✓' : 'not set'}</div>
      <div><b>Live Dashboard PIN:</b> ${(function(){ try { return !!JSON.parse(localStorage.getItem('mdcCodeVaultV1')||'{}').livepin; } catch(e){ return false; } })() ? 'hashed ✓' : 'not set'}</div>
      <div><b>DevTools shield:</b> ${window.MDC_GUARD ? 'active (shortcuts + relock)' : 'off'}</div>
      <div><b>Session mirroring to IndexedDB:</b> <span style="color:#15803d;font-weight:800;">disabled</span></div>
    </div>

    <div style="background:#fff7ed;border:1px solid #fdba74;border-radius:10px;padding:12px;font-size:12px;line-height:1.8;color:#7c2d12;">
      <b>Honest limit:</b> a browser app cannot make F12 impossible, and a determined person with the device
      can tamper with the page in their own browser. What is fixed here: there is no readable password left to find
      or copy, casual inspection triggers a re-login, and the session is never mirrored to disk.<br>
      For full protection put the login on a server (Firebase Auth / PHP+MySQL) — the code is already routed through
      <code>DB.login()</code> + the vault, so it is a drop-in swap.
    </div>

    <div class="modal-footer"><button class="btn btn-primary" onclick="closeModal()">Close</button></div>
  `, { large: true });
}

/* ------------------------------------------------------------------
   Licence state helpers — one source of truth for the whole app.
   A licence is either:
     • LIFETIME  (lifetimeLicense === true)
     • DATED     (subscriptionExpiry is a future/past timestamp)
     • MISSING   (neither)  → treated as EXPIRED, never as unlimited
------------------------------------------------------------------ */
function getLicenseState() {
  const s = DB.settings();
  const lifetime = s.lifetimeLicense === true;
  const expiry = Number(s.subscriptionExpiry) || 0;
  const now = Date.now();
  const daysLeft = expiry ? Math.ceil((expiry - now) / 86400000) : null;
  let kind = 'missing';
  if (lifetime) kind = 'lifetime';
  else if (expiry) kind = expiry > now ? 'active' : 'expired';

  let updated = '';
  if (s.licenseUpdatedAt) {
    updated = `${new Date(s.licenseUpdatedAt).toLocaleString()}${s.licenseUpdatedBy ? ' by ' + s.licenseUpdatedBy : ''}`;
  }
  return { lifetime, expiry, daysLeft, kind, updated, lifetimeSince: s.lifetimeGrantedAt || null };
}

function applyLicense(patch, note) {
  const s = DB.settings();
  const user = (DB.currentUser() || {});
  const next = Object.assign({}, patch, {
    licenseUpdatedAt: new Date().toISOString(),
    licenseUpdatedBy: user.name || user.username || 'IT Admin'
  });
  DB.saveSettings(next);
  try {
    if (typeof logAction === 'function') {
      logAction('license.change', note || JSON.stringify(patch));
    }
  } catch (e) {}
  return getLicenseState();
}

function renderSubscriptionModal() {
  const st = getLicenseState();
  const s = DB.settings();

  let cardBg = '#f1f5f9', cardBorder = '#e2e8f0', headline = '', detail = '';

  if (st.kind === 'lifetime') {
    cardBg = '#ecfdf5'; cardBorder = '#a7f3d0';
    headline = '<span style="color:#15803d;">🌟 Lifetime Active</span>';
    detail = 'This installation never expires.';
  } else if (st.kind === 'active') {
    cardBg = '#eff6ff'; cardBorder = '#bfdbfe';
    headline = new Date(st.expiry).toLocaleString();
    detail = `<span style="color:${st.daysLeft <= 7 ? '#b91c1c' : '#15803d'};font-weight:700;">${st.daysLeft} day${st.daysLeft === 1 ? '' : 's'} remaining</span>`;
  } else if (st.kind === 'expired') {
    cardBg = '#fef2f2'; cardBorder = '#fecaca';
    headline = `<span style="color:#b91c1c;">Expired ${new Date(st.expiry).toLocaleDateString()}</span>`;
    detail = `<span style="color:#b91c1c;font-weight:700;">${Math.abs(st.daysLeft)} day${Math.abs(st.daysLeft) === 1 ? '' : 's'} ago — POS is blocked</span>`;
  } else {
    cardBg = '#fef2f2'; cardBorder = '#fecaca';
    headline = '<span style="color:#b91c1c;">⚠ No licence set</span>';
    detail = '<span style="color:#b91c1c;">The app is treated as expired until a licence is applied.</span>';
  }

  const todayIso = new Date().toISOString().slice(0, 10);

  openModal(`
    <h3>📅 Subscription Management</h3>

    <div style="background:${cardBg};border:1px solid ${cardBorder};padding:12px;border-radius:8px;margin-bottom:14px;">
      <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;font-weight:700;">Current licence</div>
      <div style="font-size:15px;font-weight:800;margin:2px 0 4px;">${headline}</div>
      <div style="font-size:12.5px;margin-bottom:6px;">${detail}</div>
      <div style="font-size:11.5px;color:#64748b;line-height:1.6;">
        <div><b>Lifetime flag:</b> ${st.lifetime ? '✅ ON' : '⬜ OFF'} &nbsp;•&nbsp; <b>Expiry:</b> ${st.expiry ? new Date(st.expiry).toLocaleString() : 'not set'}</div>
        ${st.updated ? `<div><b>Last change:</b> ${escapeHtml(st.updated)}</div>` : ''}
      </div>
    </div>

    <p style="font-size:13px;margin-bottom:8px;font-weight:600;">Extend from today:</p>
    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px;">
      <button class="btn btn-secondary ext-btn" data-days="15">15 Days</button>
      <button class="btn btn-secondary ext-btn" data-days="30">1 Month</button>
      <button class="btn btn-secondary ext-btn" data-days="60">2 Months</button>
      <button class="btn btn-secondary ext-btn" data-days="180">6 Months</button>
      <button class="btn btn-secondary ext-btn" data-days="365">1 Year</button>
    </div>

    <div style="display:flex;gap:10px;align-items:flex-end;margin-bottom:16px;flex-wrap:wrap;">
      <div style="flex:1;min-width:170px;">
        <label style="font-size:12px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">Or set an exact expiry date</label>
        <input type="date" id="subExactDate" min="${todayIso}" value="${st.expiry && st.kind !== 'lifetime' ? new Date(st.expiry).toISOString().slice(0,10) : todayIso}"
               style="width:100%;padding:9px 10px;border:1px solid var(--border);border-radius:8px;"/>
      </div>
      <button class="btn btn-primary" id="subExactApply">Apply Date</button>
    </div>

    <div style="border-top:1px solid #e2e8f0;padding-top:14px;margin-bottom:14px;display:flex;gap:10px;flex-wrap:wrap;">
      <button class="btn btn-warning ext-btn" data-days="lifetime" style="background:#f59e0b;color:#fff;border:none;flex:1;min-width:200px;font-weight:bold;">🌟 Grant Lifetime License</button>
      ${st.lifetime ? `<button class="btn btn-danger" id="subRevokeLifetime" style="flex:1;min-width:200px;font-weight:bold;">🚫 Revoke Lifetime License</button>` : ''}
    </div>

    <p style="font-size:13px;margin-bottom:8px;">Or upload a License File (.lic / .json):</p>
    <label class="btn btn-primary" style="display:inline-block;cursor:pointer;">
      📄 Upload License File
      <input type="file" id="licenseFile" accept=".lic,.json,application/json" style="display:none;"/>
    </label>

    <div class="modal-footer" style="margin-top:20px;">
      <button class="btn btn-ghost" onclick="closeModal()">Close</button>
    </div>
  `, {
    onOpen(m) {

      /* ---- preset day buttons ---- */
      m.querySelectorAll('.ext-btn').forEach(b => {
        b.onclick = () => {
          const d = b.getAttribute('data-days');
          if (d === 'lifetime') {
            const st2 = applyLicense({
              lifetimeLicense: true,
              subscriptionExpiry: null,
              lifetimeGrantedAt: new Date().toISOString()
            }, 'lifetime granted');
            toast('🌟 Lifetime licence applied', 'success');
            afterLicenseChange(st2);
          } else {
            const days = parseInt(d, 10);
            const expiry = Date.now() + days * 86400000;
            const st2 = applyLicense({
              lifetimeLicense: false,
              subscriptionExpiry: expiry,
              lifetimeGrantedAt: null
            }, `${days} days granted (expires ${new Date(expiry).toLocaleDateString()})`);
            toast(`✅ Validity set: ${days} days (until ${new Date(expiry).toLocaleDateString()})`, 'success');
            afterLicenseChange(st2);
          }
        };
      });

      /* ---- exact date ---- */
      const applyBtn = m.querySelector('#subExactApply');
      if (applyBtn) applyBtn.onclick = () => {
        const v = m.querySelector('#subExactDate').value;
        if (!v) { toast('Pick a date first', 'error'); return; }
        // end of the chosen day, so "today" still gives you the whole day
        const expiry = new Date(v + 'T23:59:59').getTime();
        if (!expiry || isNaN(expiry)) { toast('Invalid date', 'error'); return; }
        const st2 = applyLicense({
          lifetimeLicense: false,
          subscriptionExpiry: expiry,
          lifetimeGrantedAt: null
        }, `exact expiry set to ${v}`);
        toast(`✅ Expires on ${new Date(expiry).toLocaleString()}`, 'success');
        afterLicenseChange(st2);
      };

      /* ---- revoke lifetime ---- */
      const rev = m.querySelector('#subRevokeLifetime');
      if (rev) rev.onclick = () => {
        confirmDialog('Turn OFF the lifetime licence? The app will then need a dated licence.', () => {
          // give them 30 days from now so revoking never locks them out instantly
          const expiry = Date.now() + 30 * 86400000;
          const st2 = applyLicense({
            lifetimeLicense: false,
            subscriptionExpiry: expiry,
            lifetimeGrantedAt: null
          }, `lifetime revoked — ${new Date(expiry).toLocaleDateString()} applied`);
          toast('Lifetime removed — 30 days applied so you can set the real date', 'warning');
          afterLicenseChange(st2);
        });
      };

      /* ---- licence file upload (was silently failing before) ---- */
      const fileInput = m.querySelector('#licenseFile');
      fileInput.onchange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          let data;
          try {
            data = JSON.parse(String(reader.result));
          } catch (err) {
            toast('❌ Not a valid licence file (bad JSON)', 'error');
            return;
          }

          const days = parseInt(data && (data.extensionDays || data.days || data.durationDays), 10);
          const absolute = data && (data.expiry || data.expiresAt || data.licenseExpiry);

          let expiry = 0, label = '';
          if (days > 0) {
            expiry = Date.now() + days * 86400000;
            label = `${days} days`;
          } else if (absolute) {
            const t = typeof absolute === 'number' ? absolute : Date.parse(absolute);
            if (!t || isNaN(t)) { toast('❌ Licence file has an unreadable expiry', 'error'); return; }
            expiry = t;
            label = new Date(t).toLocaleString();
          } else {
            toast('❌ Licence file has no extensionDays / expiry', 'error');
            return;
          }

          if (expiry <= Date.now()) {
            toast('❌ That licence is already expired', 'error');
            return;
          }

          const st2 = applyLicense({
            lifetimeLicense: false,
            subscriptionExpiry: expiry,
            lifetimeGrantedAt: null
          }, `licence file applied — ${label}`);
          toast(`✅ Licence applied: ${label} (until ${new Date(expiry).toLocaleDateString()})`, 'success');
          afterLicenseChange(st2);
        };
        reader.onerror = () => toast('❌ Could not read that file', 'error');
        reader.readAsText(file);
      };
    }
  });
}

/* Re-render in place (no page reload) so the success toast stays visible
   and the IT admin immediately sees the new state. */
function afterLicenseChange(st) {
  try { closeModal(); } catch (e) {}
  if (typeof renderSettings === 'function' && app.current === 'settings') renderSettings();
  if (st && (st.kind === 'expired' || st.kind === 'missing')) {
    setTimeout(() => toast('⚠️ Licence is not active — POS is blocked', 'error'), 600);
  }
}
