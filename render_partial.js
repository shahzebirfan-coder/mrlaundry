const fs = require('fs');

const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { background: #ddd; padding: 20px; display: flex; justify-content: center; }
    .slip { font-family: sans-serif; width: 300px; padding: 16px; color: #000; background: #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.2); }
    h2 { text-align: center; margin: 0; font-size: 24px; font-weight: 900; }
    .title { text-align: center; font-size: 14px; font-weight: bold; margin: 6px 0 14px; border-bottom: 2px dashed #000; padding-bottom: 6px; }
    .info { margin-bottom: 14px; line-height: 1.5; }
    .box { border: 2px solid #000; padding: 8px; margin-bottom: 12px; border-radius: 4px; }
    .box.dashed { border: 2px dashed #000; }
    .box-title { font-size: 13px; font-weight: 900; margin-bottom: 6px; }
    .items { font-size: 14px; line-height: 1.5; padding-left: 4px; }
    .footer { text-align: center; margin-top: 14px; font-size: 15px; font-weight: bold; border-top: 2px dashed #000; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="slip">
    <h2>Mr Laundry</h2>
    <div class="title">PARTIAL DELIVERY SLIP</div>
    
    <div class="info">
      <div style="font-size:20px;font-weight:900;">INV: INV-1137</div>
      <div style="font-size:18px;font-weight:bold;">Aslam Motiwala</div>
      <div style="font-size:16px;font-weight:bold;color:#333;">12 Jun 2026</div>
    </div>
    
    <div class="box">
      <div class="box-title">✅ GIVEN TO CUSTOMER TODAY:</div>
      <div class="items">
        • Shalwar Suit ×1<br>
        • Pant ×1
      </div>
    </div>
    
    <div class="box dashed">
      <div class="box-title">⏳ PENDING (Still in shop):</div>
      <div class="items">
        • Shalwar Suit ×1
      </div>
    </div>

    <div class="box">
      <div class="box-title">🌀 RE-WASH (Free Redo):</div>
      <div class="items">
        • Shirt ×1
      </div>
    </div>

    <div class="footer">
      Remaining Balance: Rs. 0
    </div>
  </div>
</body>
</html>
`;

fs.writeFileSync('partial_preview.html', html);
