import sys

with open('assets/js/pages/pos.js', 'r') as f:
    content = f.read()

# If backdateInput is empty, new Date("") returns Invalid Date, which throws RangeError when .toISOString() is called!
old_save = """        createdAt: ($('#backdateInput', m) && $('#backdateInput', m).value) ? new Date($('#backdateInput', m).value).toISOString() : new Date().toISOString(),"""
new_save = """        createdAt: ($('#backdateInput', m) && $('#backdateInput', m).value) ? new Date($('#backdateInput', m).value).toISOString() : new Date().toISOString(),"""

# Let's write a safer version
new_save_safe = """        createdAt: ($('#backdateInput', m) && $('#backdateInput', m).value) ? (new Date($('#backdateInput', m).value).toISOString() || new Date().toISOString()) : new Date().toISOString(),"""
# Wait, if Date is invalid, toISOString throws error.
safe_logic = """
      let createdTs = new Date().toISOString();
      if ($('#backdateInput', m) && $('#backdateInput', m).value) {
        try { createdTs = new Date($('#backdateInput', m).value).toISOString(); } catch(e) {}
      }
"""

old_block = """      const order = {
        invoiceNo: DB.nextInvoiceNumber(),"""

new_block = """      let createdTs = new Date().toISOString();
      if ($('#backdateInput', m) && $('#backdateInput', m).value) {
        try { createdTs = new Date($('#backdateInput', m).value).toISOString(); } catch(e) {}
      }

      const order = {
        invoiceNo: DB.nextInvoiceNumber(),"""

content = content.replace(old_block, new_block)
content = content.replace(old_save, "        createdAt: createdTs,")

with open('assets/js/pages/pos.js', 'w') as f:
    f.write(content)
