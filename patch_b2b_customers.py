import sys

with open('assets/js/pages/customers.js', 'r') as f:
    content = f.read()

old_form = """    <div style="background:var(--surface-alt);border-radius:10px;padding:14px;margin-top:10px;">
      <div style="font-weight:700;margin-bottom:10px;">⭐ Loyalty Card</div>"""

new_form = """    <div style="background:var(--surface-alt);border-radius:10px;padding:14px;margin-top:10px;">
      <div style="font-weight:700;margin-bottom:10px;">🏢 Corporate / B2B Account</div>
      <label style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">
        <input type="checkbox" id="cIsB2B" ${c.isB2B?'checked':''}/> Enable B2B Corporate Billing
      </label>
      <div class="form-row cols-1" id="b2bFields" style="display:${c.isB2B?'flex':'none'};">
        <div class="field"><label>Corporate Discount %</label><input type="number" id="cB2bDisc" value="${c.b2bDiscount||0}" min="0" max="100"/></div>
      </div>
    </div>

    <div style="background:var(--surface-alt);border-radius:10px;padding:14px;margin-top:10px;">
      <div style="font-weight:700;margin-bottom:10px;">⭐ Loyalty Card</div>"""

content = content.replace(old_form, new_form)

old_save = """        loyaltyDiscountPercent: Math.max(0, +$('#cLoyPct', m).value || 0),
        loyaltyActive: $('#cLoyActive', m).checked
      };"""

new_save = """        loyaltyDiscountPercent: Math.max(0, +$('#cLoyPct', m).value || 0),
        loyaltyActive: $('#cLoyActive', m).checked,
        isB2B: $('#cIsB2B', m).checked,
        b2bDiscount: Math.max(0, +$('#cB2bDisc', m).value || 0)
      };"""

content = content.replace(old_save, new_save)

old_open_logic = """    $('#cancelBtn', m).onclick = closeModal;"""
new_open_logic = """    $('#cIsB2B', m).onchange = (e) => { $('#b2bFields', m).style.display = e.target.checked ? 'flex' : 'none'; };
    $('#cancelBtn', m).onclick = closeModal;"""

content = content.replace(old_open_logic, new_open_logic)

with open('assets/js/pages/customers.js', 'w') as f:
    f.write(content)

