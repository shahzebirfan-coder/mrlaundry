const fs = require('fs');

const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { background: #cbd5e1; padding: 40px; display: flex; justify-content: center; gap: 40px; font-family: sans-serif; }
    
    .receipt { 
      background: #fff; 
      width: 320px; 
      padding: 16px; 
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); 
      color: #000;
    }
    
    .header { text-align: center; margin-bottom: 12px; line-height: 1.4; }
    .shop-name { font-size: 26px; font-weight: 900; }
    .tagline { font-size: 14px; font-weight: bold; }
    
    .copy-type { 
      text-align: center; 
      font-size: 16px; 
      font-weight: 900; 
      margin: 12px 0; 
      letter-spacing: 1px; 
      padding: 6px 0; 
      border-top: 2px dashed #000; 
      border-bottom: 2px dashed #000; 
    }
    
    .inv-box {
      border: 2px solid #000;
      border-radius: 8px;
      padding: 8px;
      text-align: center;
      margin-bottom: 16px;
    }
    .inv-box-title { font-size: 12px; font-weight: 800; letter-spacing: 1px; margin-bottom: 2px; }
    .inv-box-val { font-size: 24px; font-weight: 900; }
    
    table { width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 12px; }
    td { padding: 4px 0; }
    .right { text-align: right; }
    
    .items-table { border-top: 2px solid #000; border-bottom: 2px solid #000; margin-bottom: 12px; }
    .items-table th { text-align: left; padding: 6px 0; border-bottom: 1px solid #000; font-size: 14px; font-weight: 900; }
    .items-table td { padding: 6px 0; font-weight: bold; }
    
    .totals-table { font-size: 16px; }
    .totals-table td { padding: 6px 0; }
    .gross { border-top: 2px solid #000; font-weight: bold; }
    
    /* NEW PROMINENT DISCOUNT STYLE */
    .discount { font-size: 18px; font-weight: 900; color: #000; }
    
    .net-total { border-top: 1px dashed #000; font-size: 18px; font-weight: 900; }
    .net-val { font-size: 22px; font-weight: 900; }
    .due-row { font-size: 18px; font-weight: 900; }
    
  </style>
</head>
<body>

  <!-- Example 1: Customer Copy (10% Discount) -->
  <div class="receipt">
    <div class="header">
      <div class="shop-name">Mr Laundry</div>
      <div class="tagline">Quality Dry Cleaner Service</div>
    </div>
    
    <div class="copy-type">★ CUSTOMER COPY ★</div>
    
    <div class="inv-box">
      <div class="inv-box-title">INVOICE NO.</div>
      <div class="inv-box-val">INV-1167</div>
    </div>
    
    <table class="items-table">
      <thead>
        <tr><th>ITEMS</th><th class="right">TOTAL</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>Shalwar Suit<br><small style="font-weight:normal;">2 × Rs. 500</small></td>
          <td class="right">Rs. 1,000</td>
        </tr>
      </tbody>
    </table>
    
    <table class="totals-table">
      <tr class="gross">
        <td>Gross Total</td>
        <td class="right">Rs. 1,000</td>
      </tr>
      
      <!-- HIGHLIGHTED DISCOUNT ROW -->
      <tr class="discount">
        <td>🎉 Discount (10%)</td>
        <td class="right">- Rs. 100</td>
      </tr>
      
      <tr class="net-total">
        <td style="padding-top:8px;">NET TOTAL</td>
        <td class="right net-val" style="padding-top:8px;">Rs. 900</td>
      </tr>
      <tr>
        <td>Paid</td>
        <td class="right">Rs. 0</td>
      </tr>
      <tr class="due-row">
        <td style="padding-top:8px;">Payment Due</td>
        <td class="right" style="padding-top:8px;">Rs. 900</td>
      </tr>
    </table>
  </div>

  <!-- Example 2: Customer Copy (30% Loyalty) -->
  <div class="receipt">
    <div class="header">
      <div class="shop-name">Mr Laundry</div>
      <div class="tagline">Quality Dry Cleaner Service</div>
    </div>
    
    <div class="copy-type">★ CUSTOMER COPY ★</div>
    
    <div class="inv-box">
      <div class="inv-box-title">INVOICE NO.</div>
      <div class="inv-box-val">INV-1168</div>
    </div>
    
    <table class="items-table">
      <thead>
        <tr><th>ITEMS</th><th class="right">TOTAL</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>Blanket<br><small style="font-weight:normal;">1 × Rs. 1,000</small></td>
          <td class="right">Rs. 1,000</td>
        </tr>
      </tbody>
    </table>
    
    <table class="totals-table">
      <tr class="gross">
        <td>Gross Total</td>
        <td class="right">Rs. 1,000</td>
      </tr>
      
      <!-- HIGHLIGHTED DISCOUNT ROW -->
      <tr class="discount">
        <td>⭐ Loyalty (30%)</td>
        <td class="right">- Rs. 300</td>
      </tr>
      
      <tr class="net-total">
        <td style="padding-top:8px;">NET TOTAL</td>
        <td class="right net-val" style="padding-top:8px;">Rs. 700</td>
      </tr>
      <tr>
        <td>Paid</td>
        <td class="right">Rs. 700</td>
      </tr>
      <tr class="due-row">
        <td style="padding-top:8px;">Payment</td>
        <td class="right" style="padding-top:8px;">Rs. 700</td>
      </tr>
    </table>
  </div>

</body>
</html>
`;

fs.writeFileSync('discount_preview.html', html);
