import sys

with open('assets/js/pages/orders.js', 'r') as f:
    content = f.read()

# Fix the specific line 548 syntax error
old_end = """      if (wantPrint) {
        setTimeout(() => printPaymentReceipt(orderId, payRecord), 300);
      }
    });"""

new_end = """      if (wantPrint) {
        setTimeout(() => printPaymentReceipt(orderId, payRecord), 300);
      }
    };"""

content = content.replace(old_end, new_end)

with open('assets/js/pages/orders.js', 'w') as f:
    f.write(content)
