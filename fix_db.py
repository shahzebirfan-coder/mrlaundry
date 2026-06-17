import sys

with open('assets/js/db.js', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "'inv_hanger'" in line or "'inv_shopper'" in line or "'main'" in line:
        lines[i] = line.replace('new Date().toISOString()', "'2024-01-01T00:00:00.000Z'")
    if "_seed()" in line and "{" in lines[i+1]:
        lines[i+1] = "    const now = '2024-01-01T00:00:00.000Z'; // Fixed date so remote data always overwrites local defaults on a fresh device!\n"

with open('assets/js/db.js', 'w') as f:
    f.writelines(lines)
