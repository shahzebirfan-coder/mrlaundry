import sys

with open('assets/js/pages/customers.js', 'r') as f:
    content = f.read()

old_loyalty_html = """      <div class="form-row">
        <div class="field" style="margin:0;">
          <label>Loyalty Number</label>
          <div style="display:flex;gap:6px;">
            <input id="cLoyNo" value="${escapeHtml(c.loyaltyNo||'')}" placeholder="auto-generated"/>
            <button type="button" class="btn btn-secondary btn-sm" id="genBtn">🎫 Generate</button>
          </div>
        </div>
        <div class="field" style="margin:0;">
          <label>Discount %</label>
          <input type="number" id="cLoyPct" value="${c.loyaltyDiscountPercent || defaultPct}" min="0" max="100"/>
        </div>
      </div>"""

new_loyalty_html = """      <div class="form-row">
        <div class="field" style="margin:0;">
          <label>Loyalty Number</label>
          <div style="display:flex;gap:6px;">
            <input id="cLoyNo" value="${escapeHtml(c.loyaltyNo||'')}" placeholder="auto-generated"/>
            <button type="button" class="btn btn-secondary btn-sm" id="genBtn">🎫</button>
          </div>
        </div>
        <div class="field" style="margin:0;">
          <label>Discount %</label>
          <input type="number" id="cLoyPct" value="${c.loyaltyDiscountPercent || defaultPct}" min="0" max="100"/>
        </div>
        <div class="field" style="margin:0;">
          <label>Expiry Date</label>
          <input type="date" id="cLoyExp" value="${escapeHtml(c.loyaltyExpiry||'')}"/>
        </div>
      </div>"""

content = content.replace(old_loyalty_html, new_loyalty_html)

old_save = """        loyaltyDiscountPercent: Math.max(0, +$('#cLoyPct', m).value || 0),
        loyaltyActive: $('#cLoyActive', m).checked,"""

new_save = """        loyaltyDiscountPercent: Math.max(0, +$('#cLoyPct', m).value || 0),
        loyaltyActive: $('#cLoyActive', m).checked,
        loyaltyExpiry: $('#cLoyExp', m).value,"""

content = content.replace(old_save, new_save)

with open('assets/js/pages/customers.js', 'w') as f:
    f.write(content)

