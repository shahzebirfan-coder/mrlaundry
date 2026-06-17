import sys

with open('assets/js/components.js', 'r') as f:
    content = f.read()

# Add to navigation list
old_nav = "{ id:'dashboard', icon:'📊', label:t('nav.dashboard') },"
new_nav = "{ id:'dashboard', icon:'📊', label:t('nav.dashboard') },\n    { id:'taskboard', icon:'📋', label:'Task Board' },"

content = content.replace(old_nav, new_nav)

with open('assets/js/components.js', 'w') as f:
    f.write(content)
