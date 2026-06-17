import sys

with open('assets/js/pages/pos.js', 'r') as f:
    content = f.read()

# Fix syntax error caused by revert
content = content.replace("openInvoice(saved.id);\n    });\n  }});\n}", "openInvoice(saved.id);\n    };\n  }});\n}")

with open('assets/js/pages/pos.js', 'w') as f:
    f.write(content)
