import sys

with open('assets/js/components.js', 'r') as f:
    content = f.read()

old_nav = "{ id:'promoAdmin',icon:'🎁', label:'Promo Codes' },"
new_nav = "{ id:'promoAdmin',icon:'🎁', label:'Promo Codes' },\n    { id:'marketing', icon:'📢', label:'Marketing Studio' },"

content = content.replace(old_nav, new_nav)

with open('assets/js/components.js', 'w') as f:
    f.write(content)

with open('assets/js/app.js', 'r') as f:
    content = f.read()

old_route = "case 'promoAdmin':      return renderPromoAdmin();"
new_route = "case 'promoAdmin':      return renderPromoAdmin();\n      case 'marketing':       return renderMarketing();"
content = content.replace(old_route, new_route)

old_req = "'renderInbox','renderPromoAdmin','renderClaims'];"
new_req = "'renderInbox','renderPromoAdmin','renderClaims','renderMarketing'];"
content = content.replace(old_req, new_req)

with open('assets/js/app.js', 'w') as f:
    f.write(content)

with open('index.html', 'r') as f:
    content = f.read()

old_script = '<script src="assets/js/pages/promoAdmin.js?v=20260607.0839"></script>'
new_script = '<script src="assets/js/pages/promoAdmin.js?v=20260607.0839"></script>\n  <script src="assets/js/pages/marketing.js"></script>'
content = content.replace(old_script, new_script)

with open('index.html', 'w') as f:
    f.write(content)

print("Linked Marketing Studio")
