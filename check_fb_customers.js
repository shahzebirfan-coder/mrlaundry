const https = require('https');

const projectId = 'mr-laundry-pos-a6740';
const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/shops/shahzeb-laundry-private-pos/tables/customers`;

https.get(docUrl, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.fields && parsed.fields.data) {
         const str = parsed.fields.data.stringValue || parsed.fields.data.blobValue || '';
         console.log('Customers in cloud:', str.substring(0, 500));
         const custArr = JSON.parse(str);
         console.log('Total customers found in cloud:', custArr.length);
      } else {
         console.log('No data field found. Full response:', JSON.stringify(parsed).substring(0, 300));
      }
    } catch(e) { console.error('Error parsing:', e.message); }
  });
}).on('error', err => console.error(err));
