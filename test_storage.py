import sys

with open('assets/js/db.js', 'r') as f:
    content = f.read()

# We need to wrap localStorage.setItem in a try catch inside DB.save() and provide a friendly alert instead of crashing the whole app.
old_save = """  save() {
    localStorage.setItem(DB_KEY, JSON.stringify(this._data));
  },"""

new_save = """  save() {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(this._data));
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.message.includes('quota')) {
        console.error('CRITICAL: LocalStorage is full!');
        if (!this._notifiedQuota) {
          alert('⚠️ CRITICAL STORAGE FULL WARNING\\n\\nYour device memory is completely full from saved photos. The POS cannot save new orders until you clear old photos.\\n\\nPlease go to Orders -> Photos, delete some old photos, or go to Settings and clear cache!');
          this._notifiedQuota = true;
        }
      } else {
        throw e;
      }
    }
  },"""

content = content.replace(old_save, new_save)

with open('assets/js/db.js', 'w') as f:
    f.write(content)

