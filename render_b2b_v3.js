const fs = require('fs');

const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>B2B Advanced Preview</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
    
    body { 
      font-family: 'Inter', sans-serif; 
      background: #cbd5e1; 
      padding: 40px; 
      display: flex; 
      gap: 40px; 
      flex-wrap: wrap; 
      justify-content: center; 
      align-items: flex-start;
      margin: 0;
    }

    /* =========================================
       A4 MONTHLY STATEMENT (PDF FORMAT)
       ========================================= */
    .a4-statement { 
      width: 210mm; /* A4 Width */
      min-height: 297mm; /* A4 Height */
      background: #ffffff; 
      padding: 15mm 20mm; 
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      border-radius: 8px;
      box-sizing: border-box;
      color: #334155;
      position: relative;
    }
    
    .st-header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 25px; margin-bottom: 30px; }
    
    .company-info h1 { margin: 0; font-size: 28px; color: #0f172a; font-weight: 900; letter-spacing: -0.5px; display: flex; align-items: center; gap: 8px; }
    .company-info p { margin: 4px 0 0 0; font-size: 13px; color: #64748b; line-height: 1.5; }
    
    .invoice-meta { text-align: right; }
    .invoice-meta h2 { margin: 0 0 8px 0; font-size: 32px; color: #2563eb; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; }
    .meta-grid { display: grid; grid-template-columns: auto auto; gap: 4px 16px; text-align: right; font-size: 13px; justify-content: end; }
    .meta-lbl { color: #64748b; font-weight: 500; }
    .meta-val { color: #0f172a; font-weight: 700; }

    .bill-to-section { display: flex; justify-content: space-between; margin-bottom: 40px; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #f1f5f9; }
    .bill-to h3 { margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; }
    .bill-to .client-name { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
    .bill-to p { margin: 0; font-size: 14px; color: #475569; line-height: 1.5; }

    .st-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .st-table th { background: #0f172a; color: #ffffff; text-align: left; padding: 12px 16px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .st-table th:first-child { border-top-left-radius: 8px; border-bottom-left-radius: 8px; }
    .st-table th:last-child { border-top-right-radius: 8px; border-bottom-right-radius: 8px; text-align: right; }
    
    .st-table td { padding: 14px 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #1e293b; vertical-align: top; }
    .st-table td:last-child { text-align: right; font-weight: 600; }
    .st-table tr:last-child td { border-bottom: none; }
    
    .desc-title { font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .desc-items { font-size: 12px; color: #64748b; line-height: 1.4; }

    .summary-section { display: flex; justify-content: flex-end; margin-bottom: 40px; }
    .summary-box { width: 340px; background: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; }
    .sum-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; color: #475569; }
    .sum-row.discount { color: #16a34a; font-weight: 500; }
    .sum-row.advance { color: #2563eb; font-weight: 600; border-top: 1px solid #e2e8f0; padding-top: 12px; }
    .sum-row.total { margin-top: 12px; padding-top: 16px; border-top: 2px dashed #cbd5e1; font-size: 24px; font-weight: 900; color: #b91c1c; align-items: center; }

    .payment-info { border-left: 4px solid #3b82f6; padding-left: 16px; margin-bottom: 40px; background: #eff6ff; padding: 16px 16px 16px 20px; border-radius: 0 8px 8px 0; }
    .payment-info h4 { margin: 0 0 8px 0; color: #1e3a8a; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
    .payment-info p { margin: 0 0 4px 0; font-size: 13px; color: #1e40af; }
    .payment-info .iban { font-family: monospace; font-size: 15px; font-weight: 700; color: #172554; background: #dbeafe; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 4px; }

    .footer { text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: auto; }
  </style>
</head>
<body>

  <!-- A4 Monthly Statement Preview -->
  <div class="a4-statement">
    
    <div class="st-header">
      <div class="company-info">
        <h1><span style="font-size:32px;">🧺</span> Mr Laundry</h1>
        <p>Shop 04, Gulistan E Zafar, SMCHS, Block B<br>Karachi, Pakistan<br>Phone: +92 334 3691210</p>
      </div>
      <div class="invoice-meta">
        <h2>STATEMENT</h2>
        <div class="meta-grid">
          <span class="meta-lbl">Statement No:</span> <span class="meta-val">STM-2026-005</span>
          <span class="meta-lbl">Issue Date:</span> <span class="meta-val">01 Jun 2026</span>
          <span class="meta-lbl">Period:</span> <span class="meta-val">01 May - 31 May 2026</span>
        </div>
      </div>
    </div>

    <div class="bill-to-section">
      <div class="bill-to">
        <h3>Billed To</h3>
        <div class="client-name">Pearl Continental Hotel</div>
        <p>Attn: Procurement & Housekeeping Dept.<br>Club Road, Karachi<br>+92 21 111 505 505</p>
      </div>
      <div class="bill-to" style="text-align: right;">
        <h3>Account Status</h3>
        <div class="client-name" style="color: #2563eb;">Corporate VIP</div>
        <p>Payment Terms: Net 7 Days<br>Contract Rate: Standard -10%</p>
      </div>
    </div>

    <table class="st-table">
      <thead>
        <tr>
          <th style="width:15%">Date</th>
          <th style="width:15%">Challan #</th>
          <th style="width:40%">Description</th>
          <th style="width:10%">Qty</th>
          <th style="width:20%">Amount (Rs)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>01 May 2026</td>
          <td><b>CH-0112</b></td>
          <td>
            <div class="desc-title">Daily Housekeeping Batch</div>
            <div class="desc-items">White Towel (Large) ×30, Bed Sheet (Double) ×10</div>
          </td>
          <td>40</td>
          <td>4,500.00</td>
        </tr>
        <tr>
          <td>02 May 2026</td>
          <td><b>CH-0115</b></td>
          <td>
            <div class="desc-title">Daily Housekeeping Batch</div>
            <div class="desc-items">White Towel (Large) ×45, Pillow Cases ×20</div>
          </td>
          <td>65</td>
          <td>5,200.00</td>
        </tr>
        <tr>
          <td>05 May 2026</td>
          <td><b>CH-0121</b></td>
          <td>
            <div class="desc-title">Staff Uniforms</div>
            <div class="desc-items">Chef Coat ×5, Waiter Uniform ×10</div>
          </td>
          <td>15</td>
          <td>3,000.00</td>
        </tr>
        <tr>
          <td colspan="5" style="text-align:center; padding: 20px; color: #94a3b8; font-style: italic; background: #f8fafc; border-radius: 8px;">
            ... 24 additional deliveries omitted for preview ...
          </td>
        </tr>
      </tbody>
    </table>

    <div class="summary-section">
      <div class="summary-box">
        <div class="sum-row">
          <span>Subtotal (27 Deliveries)</span>
          <span style="font-weight:600; color:#0f172a;">125,000.00</span>
        </div>
        <div class="sum-row discount">
          <span>Corporate Discount (10%)</span>
          <span>- 12,500.00</span>
        </div>
        <div class="sum-row advance">
          <span>Less: Advance Payment Received</span>
          <span>- 50,000.00</span>
        </div>
        <div class="sum-row total">
          <span style="font-size:14px; text-transform:uppercase; color:#7f1d1d;">Balance Due</span>
          <span>Rs. 62,500</span>
        </div>
      </div>
    </div>

    <div class="payment-info">
      <h4>Payment Instructions</h4>
      <p>Please make all cheques payable to <b>Mr Laundry</b>.</p>
      <p>For direct bank transfers, please use the following account:</p>
      <div class="iban">IBAN: PK34 MEZN 0000 1234 5678 9101</div>
    </div>

    <div class="footer">
      Thank you for your business! If you have any questions about this statement, please contact us at +92 334 3691210.<br>
      Generated by Mr Laundry POS System.
    </div>

  </div>
</body>
</html>
`;

fs.writeFileSync('b2b_advanced_preview.html', html);
