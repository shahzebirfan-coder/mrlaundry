import sys

with open('assets/js/app.js', 'r') as f:
    content = f.read()

# Add to router switch
old_route = "case 'dashboard':       return renderDashboard();"
new_route = "case 'dashboard':       return renderDashboard();\n      case 'taskboard':       return renderTaskBoard();"

content = content.replace(old_route, new_route)

# Add to index.html scripts
with open('index.html', 'r') as f:
    index_content = f.read()

old_script = '<script src="assets/js/pages/dashboard.js?v=20260607.0839"></script>'
new_script = '<script src="assets/js/pages/dashboard.js?v=20260607.0839"></script>\n  <script src="assets/js/pages/taskboard.js"></script>'

index_content = index_content.replace(old_script, new_script)

with open('assets/js/app.js', 'w') as f:
    f.write(content)

with open('index.html', 'w') as f:
    f.write(index_content)
