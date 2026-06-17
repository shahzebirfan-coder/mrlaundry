import sys

with open('assets/js/app.js', 'r') as f:
    content = f.read()

old_route = "case 'reportBuilder':   return renderReportBuilder();"
new_route = "case 'reportBuilder':   return renderReportBuilder();\n      case 'allPhotos':       return renderAllPhotos();"

content = content.replace(old_route, new_route)

old_admin = "const adminOnly = ['users','settings','inbox','promoAdmin','marketing','delivery','reportBuilder','refundLog'];"
new_admin = "const adminOnly = ['users','settings','inbox','promoAdmin','marketing','delivery','reportBuilder','refundLog','allPhotos'];"

content = content.replace(old_admin, new_admin)

with open('assets/js/app.js', 'w') as f:
    f.write(content)
