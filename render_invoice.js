const puppeteer = require('puppeteer');
const fs = require('fs');

const utilsSrc = fs.readFileSync('assets/js/utils.js', 'utf8');
const invoiceSrc = fs.readFileSync('assets/js/pages/invoice.js', 'utf8');

const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: sans-serif; background: #ddd; padding: 20px; display: flex; gap: 20px; align-items: flex-start; justify-content: center; }
    .invoice-page { margin: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
  </style>
</head>
<body>
  <div id="output" style="display:flex;gap:20px;"></div>
  <script>
    // Mock DB and environment
    const DB = {
      settings: () => ({
        shopName: "Mr Laundry",
        tagline: "Quality Dry Cleaner Service",
        address: "Shop 04, Gulistan E Zafar, SMCHS, Block B, Karachi, Pakistan",
        phone: "+92 334 3691210",
        invoiceFontSize: 13,
        invoiceWidth: 360,
        officeCopyWidth: 280,
        officeCopyFontSize: 11,
        invoiceShowDeliveryType: true,
        invoiceShowQR: false
      })
    };
    function escapeHtml(str) {
      if (typeof str !== 'string') return '';
      return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
      );
    }

    ${utilsSrc}
    ${invoiceSrc}

    const order = {
      id: "ord_123456",
      createdAt: "2026-06-12T19:03:00Z",
      deliveryDate: "2026-06-15",
      items: [
        { name: "Shalwar Suit", qty: 2, price: 175 }
      ],
      total: 350,
      paid: 0,
      due: 350,
      discount: 150,
      manualDiscount: 150,
      notes: ""
    };
    const c = { name: "Palejo", phone: "03232041811" };
    const cashier = { name: "Muhammad Kashif" };
    const s = DB.settings();
    const invoiceNo = "INV-1137";
    const totalPcs = 2;
    const delTypeInfo = { icon: "🧥", label: "HANGER" };

    const cSlip = buildCustomerSlip(order, c, cashier, s, invoiceNo, totalPcs, delTypeInfo);
    const oSlip = buildOfficeSlip(order, c, cashier, s, invoiceNo, totalPcs, delTypeInfo);

    document.getElementById('output').innerHTML = oSlip + cSlip;
  </script>
</body>
</html>
`;

fs.writeFileSync('preview.html', html);

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 1000 });
  await page.goto('file://' + __dirname + '/preview.html', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'invoice_preview.png', fullPage: true });
  await browser.close();
  console.log('Screenshot saved to invoice_preview.png');
})();
