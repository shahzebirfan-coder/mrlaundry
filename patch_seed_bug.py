import sys

with open('assets/js/db.js', 'r') as f:
    content = f.read()

# Fix the seed logic so `now` is strictly old when generating seed, to ensure it NEVER overrides cloud data on a new device.
old_seed = """  _seed() {
    const now = new Date().toISOString();"""

new_seed = """  _seed() {
    const now = '2024-01-01T00:00:00.000Z'; // Force old date so cloud data perfectly overrides this on fresh devices"""

content = content.replace(old_seed, new_seed)

with open('assets/js/db.js', 'w') as f:
    f.write(content)
