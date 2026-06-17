import sys

with open('assets/js/pages/pos.js', 'r') as f:
    content = f.read()

old_cust = """  const cust = DB.get('customers', posState.customerId);
  const custLabel = cust
    ? `${cust.name}${cust.phone? ` • ${cust.phone}`:''}${cust.loyaltyActive? ` ⭐${cust.loyaltyDiscountPercent}%`:''}`
    : 'Walk-in Customer';
  $('#custName').textContent = custLabel;"""

new_cust = """  const cust = DB.get('customers', posState.customerId);
  
  // Loyalty expiry check
  if (cust && cust.loyaltyActive && cust.loyaltyExpiry && cust.loyaltyExpiry < isoDay()) {
    cust.loyaltyActive = false; // Expired for this transaction
    if (!posState._loyaltyWarned) {
      toast(`Loyalty card expired on ${fmtDateShort(cust.loyaltyExpiry)}`, 'error');
      posState._loyaltyWarned = true;
    }
  }

  const custLabel = cust
    ? `${cust.name}${cust.phone? ` • ${cust.phone}`:''}${cust.loyaltyActive? ` ⭐${cust.loyaltyDiscountPercent}%`: (cust.loyaltyExpiry && cust.loyaltyExpiry < isoDay() ? ' ❌ Expired' : '')}`
    : 'Walk-in Customer';
  $('#custName').textContent = custLabel;"""

content = content.replace(old_cust, new_cust)

old_tot = """  if (cust && cust.loyaltyActive) {"""
new_tot = """  if (cust && cust.loyaltyActive && (!cust.loyaltyExpiry || cust.loyaltyExpiry >= isoDay())) {"""

content = content.replace(old_tot, new_tot)

with open('assets/js/pages/pos.js', 'w') as f:
    f.write(content)
