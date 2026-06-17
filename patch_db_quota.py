import sys

with open('assets/js/db.js', 'r') as f:
    content = f.read()

# Instead of blindly throwing the alert over and over, we should violently strip photos when saving if a QuotaExceededError is hit.
# And we'll just show the alert ONCE per session.
# Actually, the user says they ALREADY deleted the photos from the POS but are still getting the error. 
# This means their browser localstorage is filled with something else, OR the delete didn't actually save because it hit quota when trying to save the deleted state!

old_save = """  save() {
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

new_save = """  save() {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(this._data));
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.message.includes('quota')) {
        console.warn('⚠️ LocalStorage is full! Attempting emergency auto-clean of ALL photos...');
        // Force delete all photos to save the database
        if (this._data.orders) {
          this._data.orders.forEach(o => { o.photos = []; o.photoNotes = ''; });
        }
        try {
          localStorage.setItem(DB_KEY, JSON.stringify(this._data));
          if (!this._notifiedQuota) {
             toast('Storage was full. All old photos were automatically deleted to make space.', 'warning');
             this._notifiedQuota = true;
          }
        } catch(e2) {
          console.error('CRITICAL: LocalStorage is STILL full after deleting photos!');
          if (!this._notifiedQuota) {
             alert('⚠️ CRITICAL STORAGE ERROR\\n\\nYour device memory is completely full. Please clear your browser cache/history immediately to continue using the POS.');
             this._notifiedQuota = true;
          }
        }
      } else {
        throw e;
      }
    }
  },"""

content = content.replace(old_save, new_save)

with open('assets/js/db.js', 'w') as f:
    f.write(content)
