/* ============================================================
   Google Drive Auto-Backup — persistent server-side OAuth

   Browser GIS access tokens expire quickly. This version uses a Firebase
   Functions authorization-code exchange; the Google refresh token stays
   encrypted on the server and is never returned to the browser.
   ============================================================ */

const GDRIVE = {
  CLIENT_ID_KEY: 'mrLaundryGDriveClientId',
  CONNECTED_KEY: 'mrLaundryGDriveServerConnected',
  LEGACY_TOKEN_KEY: 'mrLaundryGDriveToken',
  FOLDER_KEY: 'mrLaundryGDriveFolderId',
  LAST_BACKUP_KEY: 'mrLaundryGDriveLastBackup',
  AUTH_APP_NAME: 'mrLaundryGDriveAuth',
  FUNCTION_REGION: 'us-central1',
  SCOPE: 'https://www.googleapis.com/auth/drive.file',
  _auth: null,
  _authApp: null,
  _authSetupPromise: null,
  _gsiPromise: null,
  _firebaseScriptPromises: {},

  isConfigured() { return !!this.getClientId(); },
  isConnected() { return localStorage.getItem(this.CONNECTED_KEY) === 'true'; },
  getClientId() { return localStorage.getItem(this.CLIENT_ID_KEY) || ''; },
  setClientId(id) {
    const previous = this.getClientId();
    localStorage.setItem(this.CLIENT_ID_KEY, id);
    if (previous && previous !== id) {
      // A changed OAuth client cannot use the prior server-side grant.
      localStorage.removeItem(this.CONNECTED_KEY);
      localStorage.removeItem(this.LEGACY_TOKEN_KEY);
      localStorage.removeItem(this.FOLDER_KEY);
    }
  },
  getFirebaseConfig() {
    try {
      return typeof CLOUD !== 'undefined' && CLOUD.getConfig ? CLOUD.getConfig() : null;
    } catch (e) { return null; }
  },
  getFunctionUrl() {
    const cfg = this.getFirebaseConfig();
    if (!cfg || !cfg.projectId) {
      throw new Error('Set up Firebase Cloud Sync first; the persistent Drive backup needs your Firebase project.');
    }
    const region = String(cfg.functionsRegion || this.FUNCTION_REGION).trim();
    return `https://${region}-${cfg.projectId}.cloudfunctions.net/gdriveApi`;
  },

  loadScript(src) {
    if (this._firebaseScriptPromises[src]) return this._firebaseScriptPromises[src];
    this._firebaseScriptPromises[src] = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Could not load Firebase Auth. Check your internet connection and refresh.'));
      document.head.appendChild(script);
    });
    return this._firebaseScriptPromises[src];
  },

  async loadFirebaseAuthSdk() {
    if (!window.firebase) {
      await this.loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
    }
    if (!window.firebase?.auth) {
      await this.loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js');
    }
  },

  async loadGSI() {
    if (window.google?.accounts?.oauth2) return;
    if (this._gsiPromise) return this._gsiPromise;
    this._gsiPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Could not load Google sign-in. Check your internet connection and refresh.'));
      document.head.appendChild(script);
    });
    return this._gsiPromise;
  },

  async prepareAuth() {
    if (this._authSetupPromise) return this._authSetupPromise;
    this._authSetupPromise = (async () => {
      const cfg = this.getFirebaseConfig();
      if (!cfg || !cfg.projectId || !cfg.apiKey || !cfg.authDomain) {
        throw new Error('Configure Firebase Cloud Sync first, then enable Authentication → Google in that Firebase project.');
      }
      await Promise.all([this.loadFirebaseAuthSdk(), this.loadGSI()]);
      this._authApp = (firebase.apps || []).find(app => app.name === this.AUTH_APP_NAME) ||
        firebase.initializeApp(cfg, this.AUTH_APP_NAME);
      this._auth = this._authApp.auth();
      await this._auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      const user = await this.waitForAuthReady();
      return { auth: this._auth, user };
    })().catch(error => {
      this._authSetupPromise = null;
      throw error;
    });
    return this._authSetupPromise;
  },

  waitForAuthReady() {
    if (!this._auth) return Promise.resolve(null);
    if (this._auth.currentUser) return Promise.resolve(this._auth.currentUser);
    return new Promise((resolve, reject) => {
      let unsubscribe = () => {};
      unsubscribe = this._auth.onAuthStateChanged(
        user => { unsubscribe(); resolve(user || null); },
        error => { unsubscribe(); reject(error); }
      );
    });
  },

  async signInFirebase() {
    if (!this._auth) throw new Error('Firebase Auth is not ready. Close and reopen this window.');
    if (this._auth.currentUser) return this._auth.currentUser;
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await this._auth.signInWithPopup(provider);
    return result.user;
  },

  requestDriveAuthorization(onSuccess, onError) {
    const user = this._auth && this._auth.currentUser;
    const clientId = this.getClientId();
    if (!user) { onError(new Error('Sign in to Firebase with Google first.')); return; }
    if (!clientId) { onError(new Error('Enter and save your Google OAuth Client ID first.')); return; }
    if (!window.google?.accounts?.oauth2) { onError(new Error('Google sign-in is still loading. Close and reopen this window.')); return; }

    try {
      const client = google.accounts.oauth2.initCodeClient({
        client_id: clientId,
        scope: `openid email profile ${this.SCOPE}`,
        ux_mode: 'popup',
        login_hint: user.email || undefined,
        callback: response => {
          if (response.error || !response.code) {
            onError(new Error(response.error_description || response.error || 'Google did not return an authorization code.'));
            return;
          }
          this.exchangeAuthorizationCode(response.code)
            .then(onSuccess)
            .catch(onError);
        },
        error_callback: error => onError(new Error(error && error.type ? `Google sign-in popup ${error.type}.` : 'Google sign-in popup failed.'))
      });
      // This must run directly from the button click so Chrome allows the popup.
      client.requestCode();
    } catch (error) { onError(error); }
  },

  async exchangeAuthorizationCode(code) {
    const auth = this._auth;
    const user = auth && auth.currentUser;
    if (!user) throw new Error('Firebase Google sign-in expired. Sign in and connect again.');
    const idToken = await user.getIdToken();
    const result = await this.callApi('connect', {
      code,
      clientId: this.getClientId(),
      redirectUri: window.location.origin
    }, { idToken, csrf: true });
    localStorage.setItem(this.CONNECTED_KEY, 'true');
    localStorage.removeItem(this.LEGACY_TOKEN_KEY);
    localStorage.removeItem(this.FOLDER_KEY);
    return result;
  },

  async callApi(action, payload = {}, options = {}) {
    const setup = await this.prepareAuth();
    const user = setup.user || (setup.auth && setup.auth.currentUser);
    if (!user) throw new Error('Sign in with Google to Firebase before using persistent Drive backup.');
    const idToken = options.idToken || await user.getIdToken();
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    };
    if (options.csrf) headers['X-Requested-With'] = 'XmlHttpRequest';
    const response = await fetch(this.getFunctionUrl(), {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, ...payload })
    });
    let data = {};
    try { data = await response.json(); } catch (e) {}
    if (!response.ok) {
      if (data.code === 'DRIVE_REAUTH_REQUIRED' || data.code === 'DRIVE_NOT_CONNECTED') {
        localStorage.removeItem(this.CONNECTED_KEY);
      }
      throw new Error(data.error || `Firebase Drive service returned ${response.status}.`);
    }
    return data;
  },

  async getConnectionStatus() {
    const status = await this.callApi('status');
    if (status.connected) localStorage.setItem(this.CONNECTED_KEY, 'true');
    else localStorage.removeItem(this.CONNECTED_KEY);
    return status;
  },

  async uploadBackup() {
    if (!this.isConnected()) throw new Error('Connect the persistent Google Drive service first.');
    const file = await this.callApi('upload', { content: DB.exportJSON() });
    localStorage.setItem(this.LAST_BACKUP_KEY, new Date().toISOString());
    return file;
  },

  async listBackups() {
    const result = await this.callApi('list');
    return result.files || [];
  },

  async downloadBackup(fileId) {
    const result = await this.callApi('download', { fileId });
    return result.content;
  },

  async pruneOldBackups(keep) {
    const result = await this.callApi('prune', { keep });
    return result.removed || 0;
  },

  async disconnect() {
    if (this.isConnected()) await this.callApi('disconnect');
    localStorage.removeItem(this.CONNECTED_KEY);
    localStorage.removeItem(this.LEGACY_TOKEN_KEY);
    localStorage.removeItem(this.FOLDER_KEY);
  }
};

/* ===== UI: Google Drive Setup & Manager ===== */
function openGDriveManager() {
  const connected = GDRIVE.isConnected();
  const last = localStorage.getItem(GDRIVE.LAST_BACKUP_KEY);
  const clientId = GDRIVE.getClientId();
  const s = DB.settings();
  const firebaseReady = !!GDRIVE.getFirebaseConfig();
  const legacyTokenExists = !!localStorage.getItem(GDRIVE.LEGACY_TOKEN_KEY);

  openModal(`
    <h3>☁️ Google Drive Backup</h3>
    <p class="sub">Backups go to your Google Drive. A secure Firebase Function keeps the Drive permission alive; the refresh token is encrypted on the server, not saved in this browser.</p>

    ${!firebaseReady ? `
      <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px;border-radius:8px;margin-bottom:14px;font-size:13px;">
        ⚠️ <b>Firebase setup required.</b> Configure Firebase Cloud Sync, enable Google under Firebase Authentication, then deploy the Drive Functions once.
      </div>
    ` : ''}
    <button class="btn btn-secondary btn-sm" id="setupGuideBtn" style="margin-bottom:12px;">📖 Setup / deploy instructions</button>
    ${legacyTokenExists && !connected ? `
      <div style="background:#dbeafe;border-left:4px solid #3b82f6;padding:10px;border-radius:8px;margin-bottom:12px;font-size:12px;">
        Your old browser token expired. Connect once to move this backup to persistent server-side authorization.
      </div>
    ` : ''}

    <div class="field">
      <label>Google Cloud OAuth Client ID</label>
      <input id="gdClientId" value="${escapeHtml(clientId)}" placeholder="xxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com"/>
      <small style="color:var(--text-soft);">Must match the Client ID configured in Firebase Functions.</small>
    </div>

    <div id="gdStatus" style="padding:12px;background:${connected?'#d1fae5':'#fee2e2'};border-radius:8px;margin-bottom:14px;text-align:center;font-weight:600;">
      ${connected ? '✅ Persistent Google Drive connection saved' : '❌ Not connected'}
      ${last ? `<br><span style="font-size:11px;font-weight:400;">Last backup: ${new Date(last).toLocaleString()}</span>` : ''}
    </div>

    <div style="background:var(--surface-alt);border-radius:8px;padding:12px;margin-bottom:14px;">
      <div style="font-weight:700;margin-bottom:8px;">⚙️ Auto-Backup Settings</div>
      <div class="form-row">
        <div class="field" style="margin:0;">
          <label>Schedule</label>
          <select id="gdSchedule">
            <option value="off"    ${(s.gdriveSchedule||'daily')==='off'?'selected':''}>❌ Off (manual only)</option>
            <option value="daily"  ${(s.gdriveSchedule||'daily')==='daily'?'selected':''}>📅 Daily (once per day)</option>
            <option value="hourly" ${s.gdriveSchedule==='hourly'?'selected':''}>⏰ Every 4 hours</option>
            <option value="onclose" ${s.gdriveSchedule==='onclose'?'selected':''}>📕 On Day Close</option>
          </select>
        </div>
        <div class="field" style="margin:0;">
          <label>Keep Last N Backups</label>
          <input type="number" id="gdKeep" value="${s.gdriveKeepN||30}" min="5" max="365"/>
        </div>
      </div>
      <small style="display:block;color:var(--text-soft);margin-top:8px;">Automatic backup runs while the POS is open (and at next open). For unattended backups while the device is off, the POS data also needs a server sync.</small>
    </div>

    <div style="display:flex;flex-direction:column;gap:8px;">
      ${!connected ? `<button class="btn btn-primary btn-block" id="connectBtn">🔗 Connect to Google Drive</button>` : `
        <button class="btn btn-success btn-block" id="backupNowBtn">☁️ Backup Now</button>
        <button class="btn btn-secondary" id="listBtn">📋 View Cloud Backups</button>
        <button class="btn btn-warning" id="restoreBtn">📤 Restore from Cloud</button>
        <button class="btn btn-ghost btn-sm" id="disconnectBtn">🚪 Disconnect</button>
      `}
    </div>

    <div id="gdLog" style="margin-top:10px;font-size:12px;color:var(--text-soft);"></div>

    <div class="modal-footer">
      <button class="btn btn-primary" id="saveCfgBtn">💾 Save Settings</button>
      <button class="btn btn-ghost" onclick="closeModal()">Close</button>
    </div>
  `, { large: true, onOpen(m) {
    const log = (msg, type='') => {
      const colors = { error:'var(--danger)', success:'var(--success)', '':'var(--text-soft)' };
      $('#gdLog', m).innerHTML = `<div style="padding:8px;background:var(--surface-alt);border-radius:6px;color:${colors[type]};">${escapeHtml(msg)}</div>`;
    };

    $('#setupGuideBtn', m)?.addEventListener('click', () => { closeModal(); openGDriveSetupGuide(); });

    $('#saveCfgBtn', m).onclick = () => {
      const newId = $('#gdClientId', m).value.trim();
      if (newId !== clientId) GDRIVE.setClientId(newId);
      DB.saveSettings({
        gdriveSchedule: $('#gdSchedule', m).value,
        gdriveKeepN: Math.max(5, +$('#gdKeep', m).value || 30)
      });
      toast('Settings saved','success');
      closeModal();
    };

    const connectBtn = $('#connectBtn', m);
    if (connectBtn) {
      connectBtn.disabled = true;
      GDRIVE.prepareAuth().then(async ({user}) => {
        connectBtn.disabled = false;
        connectBtn.textContent = user ? '🔗 Authorize Google Drive' : '🔐 Sign in with Google';
        if (user) {
          try {
            const status = await GDRIVE.getConnectionStatus();
            if (status.connected) {
              closeModal();
              openGDriveManager();
              return;
            }
          } catch (error) {
            log('⚠️ Backup service status could not be checked yet: ' + error.message, 'error');
            return;
          }
        }
        log(user ? 'Secure sign-in is ready. Click to authorize Drive once.' : 'Sign in to Firebase with your Google account first.');
      }).catch(error => {
        connectBtn.disabled = true;
        log('❌ ' + error.message, 'error');
      });

      connectBtn.onclick = () => {
        if (connectBtn.disabled) return;
        const enteredId = $('#gdClientId', m).value.trim();
        if (!enteredId) { toast('Enter your Client ID first','error'); return; }
        if (enteredId !== GDRIVE.getClientId()) GDRIVE.setClientId(enteredId);
        const auth = GDRIVE._auth;
        if (!auth) { log('Firebase Auth is not ready. Close and reopen this window.', 'error'); return; }
        if (!auth.currentUser) {
          connectBtn.disabled = true;
          GDRIVE.signInFirebase().then(async () => {
            try {
              const status = await GDRIVE.getConnectionStatus();
              if (status.connected) {
                closeModal();
                openGDriveManager();
                return;
              }
            } catch (error) {
              connectBtn.disabled = false;
              log('Google sign-in worked, but the backup service is not reachable: ' + error.message, 'error');
              return;
            }
            connectBtn.disabled = false;
            connectBtn.textContent = '🔗 Authorize Google Drive';
            log('Google sign-in complete. Click Authorize Google Drive once to grant Drive permission.', 'success');
          }).catch(error => {
            connectBtn.disabled = false;
            log('❌ ' + error.message, 'error');
          });
          return;
        }
        connectBtn.disabled = true;
        log('Opening Google Drive permission…');
        GDRIVE.requestDriveAuthorization(result => {
          log(`✅ Connected to Google Drive as ${result.email || 'your Google account'}.`, 'success');
          if (typeof logAction === 'function') logAction('gdrive.connect', result.email || '');
          setTimeout(() => { closeModal(); openGDriveManager(); }, 900);
        }, error => {
          connectBtn.disabled = false;
          log('❌ ' + (error && error.message ? error.message : String(error)), 'error');
        });
      };
    }

    $('#backupNowBtn', m)?.addEventListener('click', async () => {
      log('Uploading backup to Google Drive...');
      try {
        const file = await GDRIVE.uploadBackup();
        log(`✅ Uploaded: ${file.name}`, 'success');
        const removed = await GDRIVE.pruneOldBackups(+$('#gdKeep', m).value || 30);
        if (removed) log(`✅ Uploaded. Pruned ${removed} old backups.`, 'success');
        if (typeof logAction === 'function') logAction('gdrive.backup', file.name);
        toast('Backup uploaded to Google Drive','success');
      } catch(e) { log('❌ ' + e.message, 'error'); }
    });

    $('#listBtn', m)?.addEventListener('click', async () => {
      log('Loading...');
      try {
        const files = await GDRIVE.listBackups();
        if (!files.length) { log('No backups found yet'); return; }
        $('#gdLog', m).innerHTML = `
          <div style="background:var(--surface-alt);border-radius:8px;padding:10px;max-height:240px;overflow-y:auto;">
            <div style="font-weight:700;margin-bottom:8px;">${files.length} backup(s) in Google Drive:</div>
            ${files.map(f => `
              <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px;">
                <span>${escapeHtml(f.name)}</span>
                <span style="color:var(--text-soft);">${Math.round((f.size||0)/1024)} KB</span>
              </div>
            `).join('')}
          </div>
        `;
      } catch(e) { log('❌ ' + e.message, 'error'); }
    });

    $('#restoreBtn', m)?.addEventListener('click', async () => {
      log('Loading backup list...');
      try {
        const files = await GDRIVE.listBackups();
        if (!files.length) { log('No backups to restore'); return; }
        const html = files.slice(0,20).map((f,i) => `
          <label style="display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid var(--border);cursor:pointer;">
            <input type="radio" name="bk" value="${escapeHtml(f.id)}" ${i===0?'checked':''}/>
            <div style="flex:1;">
              <div style="font-weight:600;font-size:13px;">${escapeHtml(f.name)}</div>
              <div style="font-size:11px;color:var(--text-soft);">${new Date(f.createdTime).toLocaleString()} • ${Math.round((f.size||0)/1024)} KB</div>
            </div>
          </label>
        `).join('');
        $('#gdLog', m).innerHTML = `
          <div style="background:#fee2e2;border:1px solid var(--danger);padding:8px;border-radius:6px;margin-bottom:8px;font-size:12px;color:#7f1d1d;">
            ⚠️ Restoring will REPLACE all your current data. Make a local backup first!
          </div>
          <div style="background:var(--surface-alt);border-radius:8px;padding:10px;max-height:220px;overflow-y:auto;">${html}</div>
          <button class="btn btn-danger btn-block" id="confirmRestoreBtn" style="margin-top:8px;">🔄 Restore Selected Backup</button>
        `;
        $('#confirmRestoreBtn', m).onclick = async () => {
          const sel = m.querySelector('input[name="bk"]:checked');
          if (!sel) return;
          confirmDialog('This will REPLACE all your current data. Continue?', async () => {
            try {
              const json = await GDRIVE.downloadBackup(sel.value);
              DB.importJSON(json);
              toast('Restored! Reloading...','success');
              setTimeout(() => location.reload(), 1000);
            } catch(e) { log('❌ ' + e.message, 'error'); }
          });
        };
      } catch(e) { log('❌ ' + e.message, 'error'); }
    });

    $('#disconnectBtn', m)?.addEventListener('click', () => {
      confirmDialog('Disconnect Google Drive, revoke its saved grant, and delete the server-side refresh token?', async () => {
        try {
          await GDRIVE.disconnect();
          toast('Disconnected from Google Drive','success');
          closeModal();
          openGDriveManager();
        } catch(e) { log('❌ ' + e.message, 'error'); }
      });
    });

    if (connected) {
      GDRIVE.getConnectionStatus().then(status => {
        if (!status.connected) {
          closeModal();
          openGDriveManager();
          return;
        }
        const statusEl = $('#gdStatus', m);
        if (statusEl) statusEl.innerHTML = `✅ Persistent Google Drive connection saved${status.email ? `<br><span style="font-size:11px;font-weight:400;">${escapeHtml(status.email)}</span>` : ''}${last ? `<br><span style="font-size:11px;font-weight:400;">Last backup: ${new Date(last).toLocaleString()}</span>` : ''}`;
      }).catch(error => {
        const statusEl = $('#gdStatus', m);
        if (statusEl) statusEl.innerHTML = `⚠️ Could not verify backend connection: ${escapeHtml(error.message)}`;
      });
    }
  }});
}

function openGDriveSetupGuide() {
  openModal(`
    <h3>📖 Persistent Google Drive Backup Setup</h3>
    <p class="sub">One secure server setup is needed. After that, Google refreshes the Drive access on the server and staff do not reconnect every hour.</p>

    <ol style="font-size:13px;line-height:1.8;padding-left:20px;">
      <li>Use the same Firebase project as this POS's Cloud Sync. Enable <b>Firestore</b> and <b>Authentication → Google</b>, add the POS domain to Auth's authorized domains, and use a Firebase <b>Blaze</b> project for Functions/Secret Manager.</li>
      <li>In Google Cloud, enable <b>Google Drive API</b>, configure the OAuth consent screen, and create a <b>Web application OAuth Client ID</b>. Add <code>${escapeHtml(location.origin)}</code> to Authorized JavaScript origins. Do not leave an External consent screen in <b>Testing</b> for ongoing use: Drive grants in Testing expire after 7 days.</li>
      <li>From the project folder, select the Firebase project with <code>firebase use --add</code>. Set both server-only secrets (never paste them into this app):<br><code>firebase functions:secrets:set GDRIVE_GOOGLE_CLIENT_SECRET</code><br>Generate a 32-byte encryption key with <code>openssl rand -base64 32</code>, then set <code>GDRIVE_TOKEN_ENCRYPTION_KEY</code> the same way.</li>
      <li>Set the public Functions parameters <code>GDRIVE_GOOGLE_CLIENT_ID</code> (same Client ID as below) and <code>GDRIVE_ALLOWED_ORIGINS</code> (exact comma-separated origins), then deploy with <code>firebase deploy --only functions</code>.</li>
      <li>Configure Cloud Sync in this app with the same Firebase project, enter the Client ID below, and click <b>Connect to Google Drive</b>. Sign in with Google for Firebase, click again, and approve Drive access.</li>
    </ol>

    <div style="background:#dbeafe;padding:10px;border-radius:8px;font-size:12px;margin-top:10px;">
      🔐 The Functions backend encrypts the Google refresh token in Firestore; the token and Client Secret never go into browser localStorage or the downloadable app. Full steps are also in <code>GOOGLE_DRIVE_BACKEND_SETUP.md</code>.
    </div>

    <div class="modal-footer">
      <button class="btn btn-primary" onclick="closeModal();openGDriveManager()">← Back to Setup</button>
    </div>
  `, { large: true });
}

/* ===== Auto-backup scheduler ===== */
(function gdriveAutoSchedule() {
  if (typeof DB === 'undefined') return;
  let backupRunning = false;
  const checkAndBackup = async () => {
    if (backupRunning || !GDRIVE.isConnected()) return;
    const s = DB.settings();
    const schedule = s.gdriveSchedule || 'daily';
    if (schedule === 'off' || schedule === 'onclose') return;
    const last = localStorage.getItem(GDRIVE.LAST_BACKUP_KEY);
    const intervalMs = schedule === 'hourly' ? 4*60*60*1000 : 24*60*60*1000;
    if (last && Date.now() - new Date(last).getTime() < intervalMs) return;
    backupRunning = true;
    try {
      await GDRIVE.uploadBackup();
      await GDRIVE.pruneOldBackups(s.gdriveKeepN || 30);
      console.log('[Laundry POS] Auto-backup to Google Drive complete');
    } catch(e) { console.warn('[Laundry POS] Auto-backup failed:', e.message); }
    finally { backupRunning = false; }
  };
  setTimeout(checkAndBackup, 5000);
  setInterval(checkAndBackup, 30*60*1000);
  window.addEventListener('online', checkAndBackup);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkAndBackup();
  });
})();

/* Trigger on day close */
function triggerGDriveOnDayClose() {
  const s = DB.settings();
  if (s.gdriveSchedule !== 'onclose' || !GDRIVE.isConnected()) return;
  GDRIVE.uploadBackup().then(() => GDRIVE.pruneOldBackups(s.gdriveKeepN || 30))
    .then(() => toast('☁️ Backup uploaded to Google Drive','success'))
    .catch(e => console.warn('GDrive backup failed:', e));
}
