/* ================= Firebase-backed authenticator recovery (admin/IT Desk) ================= */
function openAuthenticatorRecovery() {
  openModal(`
    <h3>🔐 Admin Password Recovery</h3>
    <p class="sub">Use the six-digit Google Authenticator code or one unused recovery code, then choose a new password.</p>
    <div class="field"><label>Admin username</label><input id="arUser" autocomplete="username" placeholder="e.g. shahzeb"/></div>
    <div class="field"><label>Authenticator code or one-time recovery code</label><input id="arCode" autocomplete="one-time-code" inputmode="text" autocapitalize="characters" spellcheck="false" placeholder="6-digit code or saved recovery code"/></div>
    <div class="field"><label>New password (at least 12 characters)</label><input id="arPass" type="password" autocomplete="new-password"/></div>
    <div class="field"><label>Confirm new password</label><input id="arPass2" type="password" autocomplete="new-password"/></div>
    <div id="arMsg" role="status" style="min-height:20px;margin-top:8px;font-size:13px;"></div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="arSubmit">Verify code &amp; reset password</button>
    </div>
    <small style="display:block;margin-top:10px;color:var(--text-soft);">This option is only for Firebase-managed admin and IT Desk accounts. A recovery code is one-use, not a reusable login password.</small>
  `, { large: true, onOpen(m) {
    const msg = (text, color = 'var(--text-soft)') => {
      const node = $('#arMsg', m);
      node.textContent = text;
      node.style.color = color;
    };
    $('#arSubmit', m).onclick = async () => {
      const username = $('#arUser', m).value.trim();
      const code = $('#arCode', m).value.trim();
      const pass = $('#arPass', m).value;
      const pass2 = $('#arPass2', m).value;
      if (!username || !code) { msg('Username aur authenticator/recovery code enter karein.', 'var(--danger)'); return; }
      if (pass.length < 12) { msg('Password kam az kam 12 characters ka hona chahiye.', 'var(--danger)'); return; }
      if (pass !== pass2) { msg('Dono passwords match nahi karte.', 'var(--danger)'); return; }
      const btn = $('#arSubmit', m);
      btn.disabled = true;
      msg('Code verify ho raha hai…');
      try {
        await SecureAdminAuth.recoverPassword(username, code, pass);
        closeModal();
        toast('Password reset ho gaya. Ab naye password se normal login karein.', 'success', 6000);
      } catch (error) {
        console.warn('[Authenticator recovery] Request failed:', error && error.code ? error.code : 'unknown');
        msg('Recovery verify nahi hui. Code check karein ya IT Desk se rabta karein.', 'var(--danger)');
      } finally {
        btn.disabled = false;
      }
    };
  }});
}

function openAuthenticatorSetup() {
  openModal(`
    <h3>📲 Google Authenticator Recovery</h3>
    <p class="sub">Authenticator ko password bhoolne par identity verify karne ke liye set up karein. Normal sign-in username/password se rahega.</p>
    <div id="asStatus" class="card" style="padding:12px;margin-bottom:12px;">Recovery status check ho raha hai…</div>
    <div id="asSetup" style="display:none;">
      <p>1. Google Authenticator khol kar QR scan karein. App available na ho to secret manually enter karein.</p>
      <div style="display:flex;justify-content:center;margin:14px 0;"><canvas id="asQr" width="220" height="220" aria-label="Authenticator setup QR code"></canvas></div>
      <div class="field"><label>Manual setup key (secret)</label><code id="asManual" style="display:block;word-break:break-all;padding:10px;background:var(--surface-alt);border-radius:8px;"></code></div>
      <div class="field"><label>Google Authenticator ka current 6-digit code</label><input id="asCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="123456"/></div>
      <button class="btn btn-primary btn-block" id="asVerify">Verify &amp; create recovery codes</button>
    </div>
    <div id="asCodes" style="display:none;"></div>
    <div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Close</button></div>
  `, { large: true, onOpen(m) {
    const statusNode = $('#asStatus', m);
    const showError = text => { statusNode.textContent = text; statusNode.style.color = 'var(--danger)'; };
    const showStatus = async () => {
      try {
        const status = await SecureAdminAuth.getRecoveryStatus();
        if (status.totpEnabled) {
          statusNode.textContent = `✅ Google Authenticator recovery is enabled. Unused one-time recovery codes: ${status.unusedRecoveryCodes}. Codes are shown only once; if none remain, contact IT Desk to reset the factor.`;
          statusNode.style.color = 'var(--success)';
          return;
        }
        statusNode.textContent = 'Authenticator abhi set up nahi hai. Setup shuru karke QR scan karein.';
        $('#asSetup', m).style.display = 'block';
        $('#asSetup', m).dataset.started = 'false';
        $('#asQr', m).style.display = 'none';
        $('#asManual', m).textContent = 'Setup shuru karne ke baad yahan secret nazar aayega.';
        const start = document.createElement('button');
        start.className = 'btn btn-secondary btn-block';
        start.id = 'asStart';
        start.textContent = 'Start secure setup';
        $('#asSetup', m).prepend(start);
        start.onclick = async () => {
          start.disabled = true;
          start.textContent = 'Secure setup tayyar ho raha hai…';
          try {
            const enrollment = await SecureAdminAuth.beginAuthenticatorEnrollment();
            $('#asSetup', m).dataset.started = 'true';
            $('#asManual', m).textContent = enrollment.secret;
            const canvas = $('#asQr', m);
            canvas.style.display = 'block';
            if (typeof QRCode === 'undefined' || typeof QRCode.toCanvas !== 'function') throw new Error('QR code library is unavailable.');
            QRCode.toCanvas(canvas, enrollment.otpauthUrl, { scale: 5, border: 2 });
            start.remove();
            statusNode.textContent = 'Google Authenticator mein account add karke current six-digit code enter karein. Setup code 10 minutes tak valid hai.';
            statusNode.style.color = 'var(--text-soft)';
          } catch (error) {
            console.warn('[Authenticator setup] Start failed:', error && error.code ? error.code : 'unknown');
            const recentLoginRequired = error && String(error.code || '').includes('failed-precondition');
            showError(recentLoginRequired
              ? 'Security ke liye sign out karke dobara login karein, phir 10 minutes ke andar setup start karein.'
              : 'Setup shuru nahi hua. IT Desk se check karwaein.');
            start.disabled = false;
            start.textContent = 'Try setup again';
          }
        };
        $('#asVerify', m).onclick = async () => {
          if ($('#asSetup', m).dataset.started !== 'true') { showError('Pehle setup shuru karein.'); return; }
          const code = $('#asCode', m).value.trim();
          if (!/^\d{6}$/.test(code)) { showError('Authenticator ka 6-digit code enter karein.'); return; }
          const verifyButton = $('#asVerify', m);
          verifyButton.disabled = true;
          try {
            const result = await SecureAdminAuth.confirmAuthenticatorEnrollment(code);
            $('#asSetup', m).style.display = 'none';
            $('#asManual', m).textContent = '';
            const qrCanvas = $('#asQr', m);
            if (qrCanvas && qrCanvas.getContext) qrCanvas.getContext('2d').clearRect(0, 0, qrCanvas.width, qrCanvas.height);
            $('#asCodes', m).style.display = 'block';
            $('#asCodes', m).innerHTML = `
              <div style="background:#fff7e6;border:1px solid #f1d28e;border-radius:10px;padding:12px;margin:10px 0;">
                <b>Save these one-time recovery codes now.</b> They will not be shown again. Keep them offline in a secure place; each code works once.
              </div>
              <pre id="asCodeList" style="white-space:pre-wrap;background:var(--surface-alt);padding:14px;border-radius:10px;font-size:16px;line-height:1.8;">${result.recoveryCodes.map(codeValue => escapeHtml(codeValue)).join('\n')}</pre>
              <button class="btn btn-primary btn-block" id="asSaved">I saved these codes securely</button>`;
            $('#asSaved', m).onclick = () => {
              $('#asCodes', m).innerHTML = '<div class="card" style="padding:12px;color:var(--success);">✅ Setup complete. Authenticator is ready for account recovery.</div>';
            };
          } catch (error) {
            console.warn('[Authenticator setup] Verify failed:', error && error.code ? error.code : 'unknown');
            const recentLoginRequired = error && String(error.code || '').includes('failed-precondition');
            showError(recentLoginRequired
              ? 'Setup session expire ho gaya. Sign out karke dobara login karein aur setup restart karein.'
              : 'Code verify nahi hua. Phone ka time automatic rakhein aur naya code try karein.');
            verifyButton.disabled = false;
          }
        };
      } catch (error) {
        console.warn('[Authenticator setup] Status failed:', error && error.code ? error.code : 'unknown');
        showError('Firebase recovery status nahi mila. Account migration/deployment complete honi chahiye.');
      }
    };
    showStatus();
  }});
}

function openMandatoryAdminPasswordChange(expired = false) {
  if (expired) {
    openModal(`<h3>⏰ Temporary password expired</h3><p class="sub">IT Desk ka temporary password expire ho gaya. Forgot Password se Google Authenticator/recovery code use karein, ya IT Desk se naya temporary password lein.</p><div class="modal-footer"><button class="btn btn-primary" onclick="closeModal();DB.logout();app.go('login')">Back to login</button></div>`);
    return;
  }
  openModal(`
    <h3>🔐 Set your own password</h3>
    <p class="sub">IT Desk ke temporary password se login hua. Normal app access se pehle apna naya password set karein.</p>
    <div class="field"><label>New password (at least 12 characters)</label><input id="atp1" type="password" autocomplete="new-password"/></div>
    <div class="field"><label>Confirm new password</label><input id="atp2" type="password" autocomplete="new-password"/></div>
    <div id="atpMsg" role="status" style="min-height:18px;color:var(--danger);"></div>
    <div class="modal-footer"><button class="btn btn-primary" id="atpSave">Change password</button></div>
  `, { onOpen(m) {
    $('#atpSave', m).onclick = async () => {
      const p1 = $('#atp1', m).value;
      const p2 = $('#atp2', m).value;
      if (p1.length < 12 || p1 !== p2) { $('#atpMsg', m).textContent = 'Passwords match hone chahiye aur kam az kam 12 characters hon.'; return; }
      $('#atpSave', m).disabled = true;
      try {
        await SecureAdminAuth.completeTemporaryPasswordChange(p1);
        await SecureAdminAuth.signOut();
        closeModal();
        toast('Password change ho gaya. Ab naye password se login karein.', 'success');
        app.go('login');
      } catch (error) {
        console.warn('[Temporary password change] Failed:', error && error.code ? error.code : 'unknown');
        $('#atpMsg', m).textContent = 'Password change nahi hua. Temporary password expire ho sakta hai; recovery code use karein.';
        $('#atpSave', m).disabled = false;
      }
    };
  }});
}

window.openAuthenticatorRecovery = openAuthenticatorRecovery;
window.openAuthenticatorSetup = openAuthenticatorSetup;
window.openMandatoryAdminPasswordChange = openMandatoryAdminPasswordChange;
