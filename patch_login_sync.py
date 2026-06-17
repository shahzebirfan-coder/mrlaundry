import sys

with open('assets/js/pages/login.js', 'r') as f:
    content = f.read()

old_forgot = """              <button type="button" id="forgotBtn" style="background:none;border:none;color:#4f7cff;cursor:pointer;font-weight:600;text-decoration:underline;font-size:13px;">
                🔐 ${t('login.forgot')}
              </button>
            </div>
          </form>"""

new_forgot = """              <button type="button" id="forgotBtn" style="background:none;border:none;color:#4f7cff;cursor:pointer;font-weight:600;text-decoration:underline;font-size:13px;">
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

          </form>"""

content = content.replace(old_forgot, new_forgot)

old_bind = """  $('#forgotBtn').onclick = () => { if (typeof openForgotPassword === 'function') openForgotPassword(); };"""
new_bind = """  $('#forgotBtn').onclick = () => { if (typeof openForgotPassword === 'function') openForgotPassword(); };
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
  }"""

content = content.replace(old_bind, new_bind)

with open('assets/js/pages/login.js', 'w') as f:
    f.write(content)
