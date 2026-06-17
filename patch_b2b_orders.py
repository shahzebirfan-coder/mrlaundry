import sys

with open('assets/js/pages/orders.js', 'r') as f:
    content = f.read()

# Add Print Challan button if customer is B2B
old_btns = """        <button class="btn btn-secondary btn-sm" data-act="print" data-id="${o.id}" title="${t('ord.printInv')}">🖨️</button>"""
new_btns = """        <button class="btn btn-secondary btn-sm" data-act="print" data-id="${o.id}" title="${t('ord.printInv')}">🖨️</button>
        ${c.isB2B ? `<button class="btn btn-secondary btn-sm" data-act="challan" data-id="${o.id}" title="Print Delivery Challan" style="border-color:#1e40af;color:#1e40af;background:#eff6ff;">📄 Challan</button>` : ''}"""

content = content.replace(old_btns, new_btns)

old_act = """    if (b.dataset.act === 'view' || b.dataset.act === 'print') openInvoice(id, b.dataset.act === 'print');"""
new_act = """    if (b.dataset.act === 'view' || b.dataset.act === 'print') openInvoice(id, b.dataset.act === 'print');
    else if (b.dataset.act === 'challan') printChallan(id);"""

content = content.replace(old_act, new_act)

with open('assets/js/pages/orders.js', 'w') as f:
    f.write(content)

