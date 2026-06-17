import sys

with open('assets/js/app.js', 'r') as f:
    content = f.read()

old_req = "                       'renderPurchaseOrders','renderLedger','renderInventory','renderCashbook',"
new_req = "                       'renderPurchaseOrders','renderLedger','renderInventory','renderCashbook','renderTaskBoard',"

content = content.replace(old_req, new_req)

with open('assets/js/app.js', 'w') as f:
    f.write(content)
