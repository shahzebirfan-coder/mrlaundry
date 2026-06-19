const CACHE_NAME = 'mr-laundry-pos-v16';
const urlsToCache = [
  '/',
  '/index.html',
  '/assets/css/style.css',
  '/assets/css/responsive.css',
  '/assets/img/logo.jpeg',
  '/assets/js/app.js',
  '/assets/js/auth-recovery.js',
  '/assets/js/it-core.js',
  '/assets/js/client-config.js',
  '/assets/js/cloud-autoconfig.js',
  '/assets/js/cloudsync.js',
  '/assets/js/components.js',
  '/assets/js/db.js',
  '/assets/js/extras.js',
  '/assets/js/gdrive.js',
  '/assets/js/i18n.js',
  '/assets/js/inventory-auto.js',
  '/assets/js/marketing.js',
  '/assets/js/notifications.js',
  '/assets/js/permissions.js',
  '/assets/js/persistent.js',
  '/assets/js/portal-helpers.js',
  '/assets/js/portal-i18n.js',
  '/assets/js/qrcode.min.js',
  '/assets/js/refund.js',
  '/assets/js/security.js',
  '/assets/js/shortcuts.js',
  '/assets/js/sounds.js',
  '/assets/js/utils.js',
  '/assets/js/whatsapp.js',
  '/assets/js/pages/auditLog.js',
  '/assets/js/pages/branches.js',
  '/assets/js/pages/cashbook.js',
  '/assets/js/pages/claims.js',
  '/assets/js/pages/customers.js',
  '/assets/js/pages/dashboard.js',
  '/assets/js/pages/delivery.js',
  '/assets/js/pages/drawings.js',
  '/assets/js/pages/expenses.js',
  '/assets/js/pages/inbox.js',
  '/assets/js/pages/inventory.js',
  '/assets/js/pages/invoice.js',
  '/assets/js/pages/ledger.js',
  '/assets/js/pages/login.js',
  '/assets/js/pages/marketing.js',
  '/assets/js/pages/orders.js',
  '/assets/js/pages/photos.js',
  '/assets/js/pages/pos.js',
  '/assets/js/pages/products.js',
  '/assets/js/pages/promoAdmin.js',
  '/assets/js/pages/purchaseOrders.js',
  '/assets/js/pages/reportBuilder.js',
  '/assets/js/pages/reports.js',
  '/assets/js/pages/settings.js',
  '/assets/js/pages/taskboard.js',
  '/assets/js/pages/users.js',
  '/assets/js/pages/vendors.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Never cache API or auth requests
  if (event.request.url.includes('googleapis.com') || 
      event.request.url.includes('googleusercontent.com')) {
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Update cache with fresh response
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
