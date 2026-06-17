import sys

with open('assets/js/components.js', 'r') as f:
    content = f.read()

old_sync = "${(typeof CLOUD !== 'undefined' && CLOUD.isEnabled() && CLOUD.isReady()) ? '<div title=\"Cloud sync active\" style=\"display:flex;align-items:center;gap:4px;color:var(--success);font-size:12px;font-weight:700;\">☁️ Sync</div>' : ''}"
new_sync = "${(typeof CLOUD !== 'undefined' && CLOUD.isEnabled() && CLOUD.isReady()) ? '<button class=\"icon-btn\" id=\"forceSyncBtn\" title=\"Force Cloud Sync\" style=\"color:var(--success);font-weight:bold;\">☁️</button>' : ''}"

content = content.replace(old_sync, new_sync)

old_bind = "  if (langToggle) langToggle.onclick = openLangPicker;"
new_bind = """  if (langToggle) langToggle.onclick = openLangPicker;
  const forceSyncBtn = document.getElementById('forceSyncBtn');
  if (forceSyncBtn) forceSyncBtn.onclick = () => {
    if (typeof CLOUD !== 'undefined') {
      toast('Syncing with cloud...', 'success');
      CLOUD.pullAndMerge().then(() => CLOUD.push()).then(() => {
        toast('✅ Cloud Sync Complete', 'success');
        setTimeout(() => location.reload(), 800);
      }).catch(e => toast('Sync Error: ' + e.message, 'error'));
    }
  };"""

content = content.replace(old_bind, new_bind)

with open('assets/js/components.js', 'w') as f:
    f.write(content)
