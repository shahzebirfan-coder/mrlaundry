import sys

with open('assets/js/pages/login.js', 'r') as f:
    content = f.read()

old_submit = """  $('#loginForm').onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const u = DB.login(f.get('username').trim(), f.get('password'));
    if (!u) { toast(t('login.invalid'), 'error'); return; }
    toast(`Welcome, ${u.name}!`, 'success');
    app.go(u.role === 'admin' ? 'dashboard' : 'pos');
  };"""

new_submit = """  $('#loginForm').onsubmit = async (e) => {
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
    app.go(u.role === 'admin' ? 'dashboard' : 'pos');
  };"""

content = content.replace(old_submit, new_submit)

with open('assets/js/pages/login.js', 'w') as f:
    f.write(content)
