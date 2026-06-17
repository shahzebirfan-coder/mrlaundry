const fs = require('fs');

let content = fs.readFileSync('assets/js/pages/dashboard.js', 'utf8');

// The logic requires o.status === 'ready' and createdAt > 14 days ago. Let's make sure it handles both 'ready' and dates properly.
const newLogic = `
  const pending = orders.filter(o => ['pending','washing'].includes(o.status)).length;
  const ready = orders.filter(o => o.status === 'ready').length;
  
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  
  const overdueOrders = orders.filter(o => o.status === 'ready' && (o.createdAt || '').slice(0, 10) < cutoffStr);
  overdueOrders.sort((a,b) => a.createdAt.localeCompare(b.createdAt));
`;

content = content.replace(/const pending = orders\.filter\(o => \['pending','washing'\]\.includes\(o\.status\)\)\.length;[\s\S]*?overdueOrders\.sort\(\(a,b\) => a\.createdAt\.localeCompare\(b\.createdAt\)\);/, newLogic.trim());

fs.writeFileSync('assets/js/pages/dashboard.js', content);
