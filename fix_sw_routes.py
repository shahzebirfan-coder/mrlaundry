import sys

with open('sw.js', 'r') as f:
    content = f.read()

# Browsers are very strict about the start_url caching. 
# Vercel defaults the start_url to `/` but sometimes Chrome caches `index.html`. We need both.
# We also need a generic fetch fallback that returns index.html for navigation requests.

new_fetch = """self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // Return from cache
        }
        
        // If not in cache, try network
        return fetch(event.request).then(networkResponse => {
           return networkResponse;
        }).catch(() => {
           // Network failed. If it's a navigation request (like refreshing the page), return the cached index.html!
           if (event.request.mode === 'navigate') {
             return caches.match('./index.html');
           }
        });
      })
  );
});"""

import re
content = re.sub(r"self\.addEventListener\('fetch'.*?\}\);", new_fetch, content, flags=re.DOTALL)

# Bump cache version to force browser to re-download the SW
content = content.replace("'mr-laundry-pos-v3'", "'mr-laundry-pos-v4'")

with open('sw.js', 'w') as f:
    f.write(content)

