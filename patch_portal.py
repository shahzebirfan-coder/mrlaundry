import sys

with open('portal.html', 'r') as f:
    content = f.read()

old_code = """    function renderOrders(orders, c) {
      orders.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
      try { maybeCelebrateReadyOrders(orders); } catch(e){}"""

new_code = """    function renderOrders(orders, c) {
      orders.forEach(o => { if (typeof getCalculatedStatus === 'function') o.status = getCalculatedStatus(o); });
      orders.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
      try { maybeCelebrateReadyOrders(orders); } catch(e){}"""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open('portal.html', 'w') as f:
        f.write(content)
    print("Portal patched")
else:
    print("Code not found in portal")
