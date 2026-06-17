import sys

with open('assets/js/app.js', 'r') as f:
    content = f.read()

old_admin = "const adminOnly = ['users','settings','inbox','promoAdmin','delivery','reportBuilder','refundLog'];"
new_admin = "const adminOnly = ['users','settings','inbox','promoAdmin','marketing','delivery','reportBuilder','refundLog'];"

content = content.replace(old_admin, new_admin)

with open('assets/js/app.js', 'w') as f:
    f.write(content)
