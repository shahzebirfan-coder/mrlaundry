const https = require('https');

// We can query the firestore REST API directly
const projectId = 'mr-laundry-pos-a6740';
const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/shops/shahzeb-laundry-private-pos`;

https.get(docUrl, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('Main Doc Fields:', Object.keys(parsed.fields));
      if (parsed.fields.tables) {
         console.log('Tables meta:', JSON.stringify(parsed.fields.tables, null, 2).substring(0, 500));
      }
    } catch(e) { console.error(e); }
  });
}).on('error', err => console.error(err));
