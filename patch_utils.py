import sys

with open('assets/js/utils.js', 'r') as f:
    content = f.read()

new_logic = """
/* ============================================================
   Auto Status Logic (Pending -> Washing at 5 PM)
   ============================================================ */
function getCalculatedStatus(order) {
  if (order.status !== 'pending') return order.status;
  if (!order.createdAt) return order.status;

  const d = new Date(order.createdAt);
  // Create Date object for 5 PM on the day the order was booked
  let washDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 17, 0, 0);

  // If booked after 5 PM, wash day is tomorrow at 5 PM
  if (d.getHours() >= 17) {
    washDay.setDate(washDay.getDate() + 1);
  }

  // If wash day is Sunday (0), push to Monday at 5 PM
  if (washDay.getDay() === 0) {
    washDay.setDate(washDay.getDate() + 1);
  }

  // If current time is past wash day, it should be 'washing'
  if (new Date() >= washDay) {
    return 'washing';
  }

  return 'pending';
}

function autoUpdateWashingStatus() {
  if (typeof DB === 'undefined' || !DB.all || typeof DB.update !== 'function') return;
  const orders = DB.all('orders');
  if (!orders) return;
  
  let changed = false;
  orders.forEach(o => {
    if (o.status === 'pending') {
      const calc = getCalculatedStatus(o);
      if (calc === 'washing') {
        DB.update('orders', o.id, { status: 'washing' });
        changed = true;
      }
    }
  });
  
  // If we changed something and are currently on a page that shows orders, we could reload,
  // but it's okay to just let it quietly sync in the background.
}
// Run periodically (every 5 minutes)
if (typeof window !== 'undefined') {
  setInterval(autoUpdateWashingStatus, 5 * 60 * 1000);
  setTimeout(autoUpdateWashingStatus, 8000);
}
"""

content += new_logic

with open('assets/js/utils.js', 'w') as f:
    f.write(content)

