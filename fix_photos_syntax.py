import sys

with open('assets/js/pages/photos.js', 'r') as f:
    content = f.read()

# Fix the escaping of backticks inside the template literal. 
# Because it's inside a template literal being executed, we shouldn't have raw backslashes before backticks like that if it breaks Node.
# Let's replace the problematic line with a standard string concatenation.
old_line = "            const inv = o.invoiceNo ? \`INV-${o.invoiceNo}\` : '#' + o.id.slice(-6).toUpperCase();"
new_line = "            const inv = o.invoiceNo ? ('INV-' + o.invoiceNo) : ('#' + o.id.slice(-6).toUpperCase());"

content = content.replace(old_line, new_line)

with open('assets/js/pages/photos.js', 'w') as f:
    f.write(content)
