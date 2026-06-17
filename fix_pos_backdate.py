import sys

with open('assets/js/pages/pos.js', 'r') as f:
    content = f.read()

# Fix the bug where backdateInput breaks if it doesn't exist for cashiers
old_save = """        createdAt: $('#backdateInput', m).value ? new Date($('#backdateInput', m).value).toISOString() : new Date().toISOString(),"""
new_save = """        createdAt: ($('#backdateInput', m) && $('#backdateInput', m).value) ? new Date($('#backdateInput', m).value).toISOString() : new Date().toISOString(),"""

content = content.replace(old_save, new_save)

with open('assets/js/pages/pos.js', 'w') as f:
    f.write(content)
