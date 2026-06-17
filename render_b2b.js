const fs = require('fs');

const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: sans-serif; background: #f1f5f9; padding: 20px; display: flex; gap: 20px; flex-wrap: wrap; justify-content: center; }
    .card { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    
    /* Challan Slip */
    .slip { width: 300px; color: #000; font-family: monospace; border: 1px solid #ccc; }
    .slip-header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
    .slip-title { font-size: 18px; font-weight: bold; }
    .slip-sub { font-size: 14px; font-weight: bold; margin-top: 4px; }
    
    /* Monthly Statement */
    .statement { width: 600px; }
    .st-header { display: flex; justify-content: space-between; border-bottom: 4px solid #1e293b; padding-bottom: 10px; margin-bottom: 20px; }
    .st-title { font-size: 24px; color: #1e293b; font-weight: 900; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #f8fafc; text-align: left; padding: 10px; border-bottom: 2px solid #cbd5e1; font-size: 13px; color: #475569; }
    td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    .total-box { float: right; width: 250px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
    .total-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
    .total-final { display: flex; justify-content: space-between; font-size: 18px; font-weight: 900; border-top: 2px solid #cbd5e1; padding-top: 8px; color: #0f172a; }
  </style>
</head>
<body>

  <!-- Thermal Challan Preview -->
  <div class="card slip">
    <div class="slip-header">
      <div class="slip-title">MR LAUNDRY</div>
      <div class="slip-sub">DELIVERY CHALLAN</div>
    </div>
    <div style="font-size:14px; margin-bottom: 10px; line-height: 1.5;">
      <b>B2B Client:</b> Pearl Continental Hotel<br>
      <b>Challan No:</b> CH-0145<br>
      <b>Date:</b> 12 Jun 2026
    </div>
    <div style="border-top:1px solid #000; border-bottom:1px solid #000; padding: 6px 0; margin-bottom: 10px; font-size: 14px;">
      <b>ITEMS DELIVERED:</b><br>
      • White Towel (Large) &nbsp; × 45<br>
      • Bed Sheet (Double) &nbsp; &nbsp;× 12<br>
      • Pillow Case &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; × 24
    </div>
    <div style="text-align:center; font-size: 12px; margin-bottom: 30px;">
      * No Cash Required *<br>Amount will be added to monthly bill.
    </div>
    <div style="border-top:1px solid #000; padding-top: 4px; text-align: center; font-size: 12px;">
      Receiver Signature & Stamp
    </div>
  </div>

  <!-- A4 Monthly Statement Preview -->
  <div class="card statement">
    <div class="st-header">
      <div>
        <div class="st-title">MONTHLY STATEMENT</div>
        <div style="color:#64748b; font-size: 14px; margin-top: 4px;">Statement Period: 01 May 2026 - 31 May 2026</div>
      </div>
      <div style="text-align: right;">
        <h3 style="margin:0;">Mr Laundry</h3>
        <div style="font-size:13px; color:#64748b;">SMCHS, Karachi</div>
      </div>
    </div>
    
    <div style="margin-bottom: 20px;">
      <b style="font-size: 15px;">Bill To:</b><br>
      <span style="font-size: 18px; font-weight: 600;">Pearl Continental Hotel</span><br>
      <span style="font-size: 14px; color: #475569;">Attn: Procurement Manager</span>
    </div>

    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Challan #</th>
          <th>Items Summary</th>
          <th style="text-align:right;">Amount (Rs.)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>01 May 2026</td>
          <td>CH-0112</td>
          <td>Towels ×30, Sheets ×10</td>
          <td style="text-align:right;">4,500</td>
        </tr>
        <tr>
          <td>02 May 2026</td>
          <td>CH-0115</td>
          <td>Towels ×45, Pillow Cases ×20</td>
          <td style="text-align:right;">5,200</td>
        </tr>
        <tr>
          <td>05 May 2026</td>
          <td>CH-0121</td>
          <td>Staff Uniforms ×15</td>
          <td style="text-align:right;">3,000</td>
        </tr>
        <tr>
          <td colspan="4" style="text-align:center; color:#94a3b8; font-style:italic;">... (24 more deliveries hidden) ...</td>
        </tr>
      </tbody>
    </table>

    <div class="total-box">
      <div class="total-row"><span>Total Deliveries:</span> <b>27</b></div>
      <div class="total-row"><span>Total Pieces:</span> <b>1,450</b></div>
      <div class="total-row"><span>B2B Discount (10%):</span> <b style="color:#16a34a;">-12,500</b></div>
      <div class="total-final"><span>Total Due:</span> <span>Rs. 112,500</span></div>
    </div>
    
    <div style="clear:both;"></div>
    <div style="margin-top: 40px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px;">
      Please make cheques payable to <b>Mr Laundry</b>. Direct bank transfer: IBAN PK34MEZN000012345678. Payment is due within 7 days.
    </div>
  </div>

</body>
</html>
`;

fs.writeFileSync('b2b_preview.html', html);
