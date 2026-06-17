import sys

with open('sw.js', 'r') as f:
    content = f.read()

# Make sure celinesoft logo is cached too, and we catch everything.
# Also sometimes Chrome acts weird with `/` vs `index.html`. We should just cache all.
new_cache = """const CACHE_NAME = 'mr-laundry-pos-v3';
const urlsToCache = [
  './',
  './index.html',
  './assets/css/style.css',
  './assets/css/responsive.css',
  './assets/img/logo.jpeg',
  './assets/img/celinesoft_logo.png',
  './assets/js/qrcode.min.js',
  './assets/js/i18n.js',
  './assets/js/portal-i18n.js',
  './assets/js/permissions.js',
  './assets/js/db.js',
  './assets/js/utils.js',
  './assets/js/sounds.js',
  './assets/js/security.js',
  './assets/js/refund.js',
  './assets/js/whatsapp.js',
  './assets/js/gdrive.js',
  './assets/js/cloud-autoconfig.js',
  './assets/js/cloudsync.js',
  './assets/js/inventory-auto.js',
  './assets/js/portal-helpers.js',
  './assets/js/shortcuts.js',
  './assets/js/extras.js',
  './assets/js/auth-recovery.js',
  './assets/js/components.js',
  './assets/js/notifications.js',
  './assets/js/persistent.js',
  './assets/js/pages/login.js',
  './assets/js/pages/dashboard.js',
  './assets/js/pages/taskboard.js',
  './assets/js/pages/pos.js',
  './assets/js/pages/orders.js',
  './assets/js/pages/customers.js',
  './assets/js/pages/products.js',
  './assets/js/pages/expenses.js',
  './assets/js/pages/reports.js',
  './assets/js/pages/users.js',
  './assets/js/pages/settings.js',
  './assets/js/pages/invoice.js',
  './assets/js/pages/vendors.js',
  './assets/js/pages/purchaseOrders.js',
  './assets/js/pages/ledger.js',
  './assets/js/pages/photos.js',
  './assets/js/pages/inventory.js',
  './assets/js/pages/cashbook.js',
  './assets/js/pages/auditLog.js',
  './assets/js/pages/branches.js',
  './assets/js/pages/inbox.js',
  './assets/js/pages/promoAdmin.js',
  './assets/js/pages/claims.js',
  './assets/js/pages/delivery.js',
  './assets/js/pages/drawings.js',
  './assets/js/pages/reportBuilder.js',
  './assets/js/pages/marketing.js',
  './assets/js/app.js'
];"""

import re
content = re.sub(r"const CACHE_NAME.*?assets/js/app\.js'\n\];", new_cache, content, flags=re.DOTALL)

with open('sw.js', 'w') as f:
    f.write(content)

