import sys

with open('assets/js/pages/orders.js', 'r') as f:
    content = f.read()

# We need to close the addEventListener '(' which was opened at line 492
old_end = """      if (wantPrint) {
        setTimeout(() => printPaymentReceipt(orderId, payRecord), 300);
      }
    };"""

new_end = """      if (wantPrint) {
        setTimeout(() => printPaymentReceipt(orderId, payRecord), 300);
      }
    });"""

content = content.replace(old_end, new_end)

with open('assets/js/pages/orders.js', 'w') as f:
    f.write(content)
