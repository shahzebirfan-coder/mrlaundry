import sys

with open('sw.js', 'r') as f:
    content = f.read()

# We need to add { ignoreSearch: true } to caches.match!
old_match = "caches.match(event.request)"
new_match = "caches.match(event.request, { ignoreSearch: true })"

content = content.replace(old_match, new_match)
content = content.replace("'mr-laundry-pos-v4'", "'mr-laundry-pos-v5'")

with open('sw.js', 'w') as f:
    f.write(content)
