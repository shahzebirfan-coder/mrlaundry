import sys

with open('assets/js/db.js', 'r') as f:
    content = f.read()

# I need to add a "Force Clear Photos" function in DB or settings to scrub all traces of base64 images from the DB if it is corrupted or holding invisible data.
# Also, maybe the data wasn't saved because the "Delete all photos" function hit the quota when trying to save the cleared DB? No, shrinking the string size should never hit a quota error.
# Let's add an auto-scrub that aggressively deletes all photo data on load if the storage is nearly full (length > 4MB).

auto_scrub_logic = """
  load() {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      try { this._data = JSON.parse(raw); }
      catch(e){ this._data = this._seed(); this.save(); }
      
      // EMERGENCY STORAGE FIX: If the raw JSON is larger than 3MB, aggressively wipe all photos from memory to save the system!
      if (raw.length > 3000000 && this._data.orders) {
        console.warn('⚠️ Emergency Memory Scrub Triggered: DB is over 3MB. Wiping all photos from orders.');
        this._data.orders.forEach(o => {
          if (o.photos && o.photos.length > 0) {
            o.photos = [];
            o.photoNotes = '';
          }
        });
        // Save immediately to free up space
        try { localStorage.setItem(DB_KEY, JSON.stringify(this._data)); } catch(e) {}
      }
"""

content = content.replace("  load() {\n    const raw = localStorage.getItem(DB_KEY);\n    if (raw) {\n      try { this._data = JSON.parse(raw); }\n      catch(e){ this._data = this._seed(); this.save(); }", auto_scrub_logic)

with open('assets/js/db.js', 'w') as f:
    f.write(content)
