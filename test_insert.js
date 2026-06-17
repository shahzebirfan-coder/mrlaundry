const fs = require('fs');

const js = fs.readFileSync('/tmp/test-mrlaundry/assets/js/pages/pos.js', 'utf8');
try { new Function(js); console.log('Syntax OK orders'); } catch(e) { console.error('Syntax Error orders:', e.message); }

