import sys

with open('assets/js/cloudsync.js', 'r') as f:
    content = f.read()

old_save = """  DB.save = function() {
    origSave();
    localStorage.setItem('mrLaundryLocalVersion', Date.now());
    if (CLOUD._suppressPush) return;
    if (!CLOUD.isEnabled() || !CLOUD.isReady()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      CLOUD.push().catch(e => console.warn('Push failed:', e));
    }, 1500);
  };"""

new_save = """  DB.save = function() {
    origSave();
    try { localStorage.setItem('mrLaundryLocalVersion', Date.now()); } catch(e) {}
    if (CLOUD._suppressPush) return;
    if (!CLOUD.isEnabled() || !CLOUD.isReady()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      CLOUD.push().catch(e => console.warn('Push failed:', e));
    }, 1500);
  };"""

content = content.replace(old_save, new_save)

with open('assets/js/cloudsync.js', 'w') as f:
    f.write(content)
