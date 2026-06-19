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
      <p style="color:#991b1b;font-size:12px;margin-bottom:14px;">Manage subscription validity. Requires IT ADMIN PASSWORD.</p>
      <button class="btn btn-danger btn-block" id="openSubBtnTop">🔑 Manage Subscription</button>
    </div>

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
          <p style="color:var(--text-soft);font-size:12px;margin-bottom:14px;">Real-time sync via Firebase. Premium feature. Contact IT Department to enable.</p>
          <button class="btn btn-primary btn-block" id="openCloudBtn">🔄 Configure Cloud Sync (IT Admin)</button>
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
            <!-- Use label + hidden input for bulletproof cross-browser file picker -->
            <label class="btn btn-secondary" style="cursor:pointer;text-align:center;position:relative;display:block;">
              📤 Restore from Backup
              <input type="file" id="importFile" accept=".json,.txt,application/json" style="display:none;"/>
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
    promptPasswordModal('Unlock Settings Save', (pwd) => {
      let itPwd = window._IT_BRAND.pwd;
      if (pwd !== itPwd) {
        toast('Incorrect IT ADMIN Password!', 'error');
        return;
      }
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
    });
  };

  $('#exportBtn').onclick = doBackup;
  $('#openInvCustBtn').onclick = () => openInvoiceCustomizer();
  if ($('#openPortalCfg')) $('#openPortalCfg').onclick = () => openPortalConfigDialog();
  if ($('#openQRBtn')) $('#openQRBtn').onclick = () => openQRMenuPoster();
  if ($('#openARBtn')) $('#openARBtn').onclick = () => openAutoReplyEditor();
  if ($('#checkStorageBtn')) $('#checkStorageBtn').onclick = () => showStorageStatus();
  if ($('#openWaTplBtn'))  $('#openWaTplBtn').onclick  = () => openWhatsAppTemplateEditor();
  if ($('#openGDriveBtn')) $('#openGDriveBtn').onclick = () => {
    promptPasswordModal('Access GDrive Settings', (pwd) => {
      let itPwd = window._IT_BRAND.pwd;
      if (pwd === itPwd) openGDriveManager();
      else toast('Incorrect IT ADMIN Password!', 'error');
    });
  };
  if ($('#openMasterCodeBtn')) $('#openMasterCodeBtn').onclick = () => openMasterCodeSetup();
  if ($('#openCloudBtn')) $('#openCloudBtn').onclick  = () => {
    promptPasswordModal('Access Cloud Sync Settings', (pwd) => {
      let itPwd = window._IT_BRAND.pwd;
      if (pwd === itPwd) openCloudSyncManager();
      else toast('Incorrect IT ADMIN Password!', 'error');
    });
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

  // Restore from Backup — bulletproof cross-browser handler
  const importFileInput = $('#importFile');
  if (importFileInput) {
    importFileInput.onchange = (e) => {
      const file = e.target.files[0];
      console.log('[Restore] File selected:', file ? file.name : 'none');
      if (!file) { toast('No file selected', 'error'); return; }

      const name = file.name.toLowerCase();
      if (!name.endsWith('.json') && !name.endsWith('.txt')) {
        toast('Please select a .json or .txt backup file', 'error');
        e.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => { toast('Failed to read file', 'error'); console.error('[Restore] FileReader error'); };
      reader.onload = () => {
        console.log('[Restore] File read, length:', reader.result.length);
        confirmDialog('This will REPLACE all current data with the backup. Continue?', () => {
          try {
            console.log('[Restore] Calling DB.importJSON...');
            const result = DB.importJSON(reader.result);
            console.log('[Restore] importJSON result:', result);
            
            let msg = 'Restored! Saving to persistent storage...';
            if (result && result.warning) {
              msg = '✅ ' + result.warning;
              console.log('[Restore] Warning:', result.warning);
            }
            toast(msg, 'success');

            // CRITICAL: Prevent persistent.js from overwriting with old data
            sessionStorage.setItem('mrLaundryRestoring', 'true');

            // Save to IndexedDB immediately so persistent.js restores THIS data on next load
            if (typeof Persistent !== 'undefined' && Persistent.backupAll) {
              console.log('[Restore] Backing up to IndexedDB...');
              Persistent.backupAll().then(() => {
                console.log('[Restore] IndexedDB backed up. Reloading...');
                location.reload();
              }).catch(err => {
                console.warn('[Restore] IndexedDB backup failed, reloading anyway:', err);
                location.reload();
              });
            } else {
              console.log('[Restore] Persistent not available, reloading...');
              location.reload();
            }
          }
          catch(err) {
            console.error('[Restore] ERROR:', err);
            alert('Restore failed: ' + err.message);
            toast('Invalid backup file: ' + err.message, 'error');
          }
        });
      };
      reader.readAsText(file);
      e.target.value = ''; // reset so same file can be selected again
    };
  }

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
  promptPasswordModal('Access Subscription Settings', (pwd) => {
    let itPwd = window._IT_BRAND.pwd;
    if (pwd !== itPwd) {
      toast('Incorrect IT ADMIN Password!', 'error');
      return;
    }
    
    const s = DB.settings();
    const expiry = s.subscriptionExpiry || 0;
    let expiryStr = expiry > 0 ? new Date(expiry).toLocaleString() : 'Not Set';
    if (s.lifetimeLicense) expiryStr = '<span style="color:green;">🌟 Lifetime Active</span>';
    const daysLeft = s.lifetimeLicense ? 'Unlimited' : (expiry > 0 ? Math.ceil((expiry - Date.now())/(1000*60*60*24)) : 0);
    
    openModal(`
      <h3>📅 Subscription Management</h3>
      <div style="background:#f1f5f9;padding:10px;border-radius:8px;margin-bottom:15px;">
        <b>Current Expiry:</b> ${expiryStr}<br>
        <b>Days Remaining:</b> <span style="color:${daysLeft === 'Unlimited' || daysLeft > 7 ? 'green' : 'red'}">${daysLeft}</span>
      </div>
      
      <p style="font-size:13px;margin-bottom:10px;">Select validity to extend from today:</p>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:20px;">
        <button class="btn btn-secondary ext-btn" data-days="15">15 Days</button>
        <button class="btn btn-secondary ext-btn" data-days="30">1 Month</button>
        <button class="btn btn-secondary ext-btn" data-days="60">2 Months</button>
        <button class="btn btn-secondary ext-btn" data-days="180">6 Months</button>
        <button class="btn btn-secondary ext-btn" data-days="365">1 Year</button>
      </div>
      
      <div style="margin-bottom:20px; border-top:1px solid #ddd; padding-top:15px;">
        <button class="btn btn-warning ext-btn" data-days="lifetime" style="background:#f59e0b;color:#fff;border:none;width:100%;font-weight:bold;">🌟 Grant Lifetime License</button>
      </div>
      
      <p style="font-size:13px;margin-bottom:10px;">Or upload a License File:</p>
      <label class="btn btn-primary" style="display:inline-block;cursor:pointer;">
        📄 Upload License File
        <input type="file" id="licenseFile" accept=".lic,.json" style="display:none;"/>
      </label>
      
      <div class="modal-footer" style="margin-top:20px;">
        <button class="btn btn-ghost" onclick="closeModal()">Close</button>
      </div>
    `, {
      onOpen(m) {
        m.querySelectorAll('.ext-btn').forEach(b => {
          b.onclick = () => {
            const d = b.getAttribute('data-days');
            const s = DB.settings();
            if (d === 'lifetime') {
                s.lifetimeLicense = true;
                s.subscriptionExpiry = null;
                toast('Lifetime License Applied!', 'success');
            } else {
                s.lifetimeLicense = false;
                s.subscriptionExpiry = Date.now() + (parseInt(d) * 24 * 60 * 60 * 1000);
                toast(`Validity extended by ${d} days!`, 'success');
            }
            DB.saveSettings(s);
            setTimeout(() => { closeModal(); location.reload(); }, 1000);
          };
        });
        
        m.querySelector('#licenseFile').onchange = (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const data = JSON.parse(reader.result);
              if (data && data.extensionDays) {
                s.lifetimeLicense = false;
                const s = DB.settings();
                s.subscriptionExpiry = Date.now() + (parseInt(data.extensionDays) * 24 * 60 * 60 * 1000);
                DB.saveSettings(s);
                toast(`License Applied: Extended by ${data.extensionDays} days!`, 'success');
                setTimeout(() => { closeModal(); }, 1000);
              } else {
                toast('Invalid license format', 'error');
              }
            } catch(e) { toast('Error reading license file', 'error'); }
          };
          reader.readAsText(file);
        };
      }
    });
  });
}
