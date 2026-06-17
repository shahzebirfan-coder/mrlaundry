const fs = require('fs');
let sw = fs.readFileSync('sw.js', 'utf8');

// There's a subtle bug in service workers if the URL they request has query parameters like ?v=20260607.0839 but the cache matches strictly. We should instruct the service worker to ignore search params when matching.
// Wait, the errors in his screenshot literally say:
// Offline: Could not fetch https://mrlaundry.vercel.app/assets/js/pages/delivery.js?v=20260607...
// Ah! The URLs in index.html have "?v=..." but we cached them WITHOUT "?v=...".
// So caches.match(event.request) returns undefined!
