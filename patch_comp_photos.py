import sys

with open('assets/js/components.js', 'r') as f:
    content = f.read()

old_nav = "{ id:'reportBuilder', icon:'📈', label:'Report Builder' },"
new_nav = "{ id:'reportBuilder', icon:'📈', label:'Report Builder' },\n    { id:'allPhotos', icon:'📸', label:'Photo Manager' },"

content = content.replace(old_nav, new_nav)

with open('assets/js/components.js', 'w') as f:
    f.write(content)
