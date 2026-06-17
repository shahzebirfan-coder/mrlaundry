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
    .summary-box { width: 320px; background: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; }
    .sum-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; color: #475569; }
    .sum-row.discount { color: #16a34a; font-weight: 500; }
    .sum-row.total { margin-top: 16px; padding-top: 16px; border-top: 2px dashed #cbd5e1; font-size: 22px; font-weight: 900; color: #0f172a; align-items: center; }

    .payment-info { border-left: 4px solid #3b82f6; padding-left: 16px; margin-bottom: 40px; background: #eff6ff; padding: 16px 16px 16px 20px; border-radius: 0 8px 8px 0; }
    .payment-info h4 { margin: 0 0 8px 0; color: #1e3a8a; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
    .payment-info p { margin: 0 0 4px 0; font-size: 13px; color: #1e40af; }
    .payment-info .iban { font-family: monospace; font-size: 15px; font-weight: 700; color: #172554; background: #dbeafe; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 4px; }

    .footer { text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: auto; }


    /* =========================================
       THERMAL RECEIPT (DAILY CHALLAN)
       ========================================= */
    .thermal-challan {
      width: 80mm; /* Standard 80mm thermal paper */
      background: #fff;
      padding: 6mm;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      font-family: 'Courier New', Courier, monospace;
      color: #000;
      box-sizing: border-box;
    }
    .tc-header { text-align: center; margin-bottom: 15px; border-bottom: 2px dashed #000; padding-bottom: 10px; }
    .tc-logo { font-size: 24px; font-weight: 900; margin-bottom: 4px; }
    .tc-title { font-size: 16px; font-weight: bold; background: #000; color: #fff; padding: 4px; display: inline-block; letter-spacing: 1px; }
    
    .tc-meta { font-size: 12px; line-height: 1.5; margin-bottom: 15px; }
    .tc-meta b { font-size: 13px; }
    
    .tc-table { width: 100%; font-size: 12px; border-collapse: collapse; margin-bottom: 15px; border-top: 1px solid #000; border-bottom: 1px solid #000; }
    .tc-table th { text-align: left; padding: 4px 0; border-bottom: 1px dashed #000; }
    .tc-table td { padding: 4px 0; vertical-align: top; }
    
    .tc-note { text-align: center; font-size: 12px; font-weight: bold; border: 2px solid #000; padding: 6px; margin-bottom: 30px; border-radius: 4px; }
    
    .tc-sign { border-top: 1px solid #000; text-align: center; padding-top: 4px; font-size: 11px; font-weight: bold; margin-bottom: 10px; width: 80%; margin-left: 10%; }
    
    /* Barcode simulation */
    .barcode { height: 40px; background: repeating-linear-gradient(90deg, #000, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 5px, #fff 5px, #fff 8px, #000 8px, #000 10px); margin: 0 auto; width: 80%; }
  </style>
</head>
<body>

  <!-- =========================================
       1. A4 MONTHLY STATEMENT (PDF)
       ========================================= -->
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
        <div class="sum-row">
          <span>Tax (0%)</span>
          <span>0.00</span>
        </div>
        <div class="sum-row total">
          <span style="font-size:16px;">Total Due</span>
          <span>Rs. 112,500</span>
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


  <!-- =========================================
       2. THERMAL CHALLAN (DAILY DROP-OFF)
       ========================================= -->
  <div class="thermal-challan">
    <div class="tc-header">
      <div class="tc-logo">Mr Laundry</div>
      <div class="tc-title">DELIVERY CHALLAN</div>
    </div>
    
    <div class="tc-meta">
      <b>Client:</b> Pearl Continental<br>
      <b>Challan #:</b> CH-0145<br>
      <b>Date:</b> 12-Jun-2026 14:30<br>
      <b>Type:</b> B2B / Corporate
    </div>
    
    <table class="tc-table">
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align:right">Qty</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>White Towel (Large)</td>
          <td style="text-align:right; font-weight:bold;">45</td>
        </tr>
        <tr>
          <td>Bed Sheet (Double)</td>
          <td style="text-align:right; font-weight:bold;">12</td>
        </tr>
        <tr>
          <td>Pillow Case</td>
          <td style="text-align:right; font-weight:bold;">24</td>
        </tr>
      </tbody>
    </table>
    
    <div style="text-align:right; font-weight:bold; font-size:14px; margin-bottom:15px;">
      Total Pieces: 81
    </div>
    
    <div class="tc-note">
      * ZERO CASH MEMO *<br>Billed to Monthly Statement
    </div>
    
    <div style="margin-top: 40px;" class="tc-sign">
      Receiver Signature & Stamp
    </div>
    
    <div style="text-align:center; font-size:10px; margin-top:10px;">
      <div class="barcode"></div>
      <div style="margin-top:4px;">CH-0145</div>
    </div>
  </div>

</body>
</html>
`;

fs.writeFileSync('b2b_advanced_preview.html', html);
