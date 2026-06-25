/* ===================== SETTINGS ===================== */
function renderSettings() {
  if (DB.currentUser().role !== 'admin') { app.go('dashboard'); return; }
  const s = DB.settings();
  const lastBackup = localStorage.getItem('mrLaundryLastBackup');
  const lastBackupTxt = lastBackup ? new Date(lastBackup).toLocaleString() : 'Never';

  const content = `
    <h1 class="page-title">⚙️ Settings</h1>
    <p class="page-sub">Customize your shop info, loyalty defaults, and manage your data.</p>

    <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;align-items:start;">
      <div>
        <div class="card" style="margin-bottom:20px;">
          <div class="card-header"><h3>🏪 Shop Information</h3></div>

          <div class="field" style="margin-bottom:18px;">
            <label>Brand Logo</label>
            <div style="display:flex;align-items:center;gap:16px;padding:14px;background:#000;border-radius:10px;">
              <div style="background:#000;padding:8px;border-radius:8px;">
                ${s.logoImage
                  ? `<img id="logoPreview" src="${s.logoImage}" style="width:120px;height:120px;object-fit:contain;display:block;"/>`
                  : `<div id="logoPreview" style="width:120px;height:120px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:60px;">${s.logo||'🧺'}</div>`}
              </div>
              <div style="flex:1;color:#fff;">
                <label class="btn btn-primary" style="cursor:pointer;display:inline-block;">
                  📤 Upload New Logo
                  <input type="file" id="logoFile" accept="image/*" style="display:none;"/>
                </label>
                <button class="btn btn-ghost" id="removeLogoBtn" style="color:#fff;border:1px solid #444;margin-left:8px;">Remove</button>
                <div style="font-size:11px;opacity:.7;margin-top:8px;">PNG, JPG, SVG. Best on dark background. Max 2MB.</div>
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="field"><label>Shop Name 🔒</label><input id="sName" value="${escapeHtml(s.shopName)}" readonly/></div>
            <div class="field"><label>Fallback Logo (emoji)</label><input id="sLogo" value="${escapeHtml(s.logo)}" maxlength="4" style="font-size:20px;text-align:center;"/></div>
          </div>
          <div class="form-row cols-1">
            <div class="field"><label>Tagline</label><input id="sTag" value="${escapeHtml(s.tagline||'')}"/></div>
          </div>
          <div class="form-row">
            <div class="field"><label>Phone 🔒</label><input id="sPhone" value="${escapeHtml(s.phone||'')}" readonly/></div>
            <div class="field"><label>Currency Symbol</label><input id="sCurrency" value="${escapeHtml(s.currency)}"/></div>
          </div>
          <div class="form-row cols-1">
            <div class="field"><label>Address 🔒</label><textarea id="sAddr" rows="2" readonly>${escapeHtml(s.address||'')}</textarea><small style="color:var(--text-soft);">Locked in private build</small></div>
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
          <div class="card-header"><h3>🧾 Invoice Customization</h3></div>
          <p style="color:var(--text-soft);font-size:12px;margin-bottom:14px;">Control what shows on printed invoices — font size, paper width, what details to display.</p>
          <button class="btn btn-primary btn-block" id="openInvCustBtn">⚙️ Open Invoice Customizer</button>
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
          <div class="card-header"><h3>🔑 Master Recovery Code <span class="badge" style="background:${s.masterRecoveryCode?'#10b981':'#ef4444'};color:#fff;">${s.masterRecoveryCode?'✅ SET':'⚠️ NOT SET'}</span></h3></div>
          <p style="color:#78350f;font-size:12px;margin-bottom:14px;">
            🔐 <b>CRITICAL FOR LAUNCH!</b> A special PIN that resets any user password if forgotten. Like a bank PIN — keep safe!
          </p>
          <button class="btn btn-warning btn-block" id="openMasterCodeBtn" style="background:#f59e0b;color:#fff;border:none;font-weight:700;">
            🔑 ${s.masterRecoveryCode?'Change':'Set Up'} Master Recovery Code
          </button>
          ${s.masterRecoveryCode ? `<small style="display:block;text-align:center;color:#78350f;margin-top:8px;">Set on: ${new Date(s.masterRecoveryCodeSetAt||Date.now()).toLocaleDateString()}</small>` : ''}
        </div>

        <div class="card" style="margin-bottom:20px;">
          <div class="card-header"><h3>🔄 Cloud Sync (Multi-Device)</h3></div>
          <p style="color:var(--text-soft);font-size:12px;margin-bottom:14px;">Real-time sync via Firebase. Free tier supports small/medium shops.</p>
          <button class="btn btn-primary btn-block" id="openCloudBtn">🔄 Configure Cloud Sync</button>
          <div id="cloudStatus" style="font-size:11px;color:var(--text-soft);margin-top:8px;text-align:center;"></div>
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
      else prev.outerHTML = `<img id="logoPreview" src="${pendingLogoDataUrl}" style="width:120px;height:120px;object-fit:contain;display:block;"/>`;
      toast('Logo loaded — click Save to apply','success');
    };
    reader.readAsDataURL(file);
  };

  $('#removeLogoBtn').onclick = () => {
    pendingLogoDataUrl = '';
    const prev = $('#logoPreview');
    prev.outerHTML = `<div id="logoPreview" style="width:120px;height:120px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:60px;">${$('#sLogo').value || '🧺'}</div>`;
  };

  $('#saveSetBtn').onclick = () => {
    const patch = {
      shopName: $('#sName').value.trim(),
      logo: $('#sLogo').value.trim() || '🧺',
      tagline: $('#sTag').value.trim(),
      phone: $('#sPhone').value.trim(),
      currency: $('#sCurrency').value.trim() || 'Rs.',
      address: $('#sAddr').value.trim(),
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
  };

  $('#exportBtn').onclick = doBackup;
  $('#openInvCustBtn').onclick = () => openInvoiceCustomizer();
  if ($('#openPortalCfg')) $('#openPortalCfg').onclick = () => openPortalConfigDialog();
  if ($('#openQRBtn')) $('#openQRBtn').onclick = () => openQRMenuPoster();
  if ($('#openARBtn')) $('#openARBtn').onclick = () => openAutoReplyEditor();
  if ($('#checkStorageBtn')) $('#checkStorageBtn').onclick = () => showStorageStatus();
  if ($('#openWaTplBtn'))  $('#openWaTplBtn').onclick  = () => openWhatsAppTemplateEditor();
  if ($('#openGDriveBtn')) $('#openGDriveBtn').onclick = () => openGDriveManager();
  if ($('#openMasterCodeBtn')) $('#openMasterCodeBtn').onclick = () => openMasterCodeSetup();
  if ($('#openCloudBtn')) $('#openCloudBtn').onclick  = () => openCloudSyncManager();
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
