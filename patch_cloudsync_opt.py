import sys

with open('assets/js/cloudsync.js', 'r') as f:
    content = f.read()

# Add a _lastPushedJson cache
old_init = "  _lastAppliedVersion: 0,"
new_init = "  _lastAppliedVersion: 0,\n  _lastPushedJson: {},"
content = content.replace(old_init, new_init)

old_push = """      // Write each table — single doc OR chunked
      for (const tbl of Object.keys(data)) {
        const json = JSON.stringify(data[tbl] ?? null);
        totalSize += json.length;

        if (json.length < MAX_DOC_SIZE) {"""

new_push = """      // Write each table — single doc OR chunked
      for (const tbl of Object.keys(data)) {
        const json = JSON.stringify(data[tbl] ?? null);
        totalSize += json.length;
        
        // OPTIMIZATION: Only push if data actually changed to save Firebase Quota
        if (this._lastPushedJson[tbl] === json) {
          // Keep existing meta for the main doc
          if (this._lastPushedMeta && this._lastPushedMeta[tbl]) {
            tableMeta[tbl] = this._lastPushedMeta[tbl];
          } else {
             const num = Math.ceil(json.length / MAX_DOC_SIZE) || 1;
             tableMeta[tbl] = { chunks: num, size: json.length, skipped: true };
          }
          continue;
        }
        
        this._lastPushedJson[tbl] = json;

        if (json.length < MAX_DOC_SIZE) {"""

content = content.replace(old_push, new_push)

old_meta = """      // Write main meta doc — triggers listen() on other devices
      await db.collection('shops').doc(shopId).set({"""

new_meta = """      this._lastPushedMeta = tableMeta;
      // Write main meta doc — triggers listen() on other devices
      await db.collection('shops').doc(shopId).set({"""

content = content.replace(old_meta, new_meta)

with open('assets/js/cloudsync.js', 'w') as f:
    f.write(content)
