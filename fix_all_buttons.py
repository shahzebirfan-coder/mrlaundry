import sys

with open('assets/js/pages/pos.js', 'r') as f:
    content = f.read()

# Replace any lingering onclick with standard logic just in case the wrapper is somehow preventing the click.
# We will use purely standard JS DOM attachment so it's 100% immune to rendering glitches.

old_save = "$('#confirmBtn', m).addEventListener('click', () => {"
new_save = "m.querySelector('#confirmBtn').addEventListener('click', () => {"

old_back = "$('#backBtn', m).addEventListener('click', () => { closeModal(); openBookingForm(); });"
new_back = "m.querySelector('#backBtn').addEventListener('click', () => { closeModal(); openBookingForm(); });"

content = content.replace(old_save, new_save)
content = content.replace(old_back, new_back)

# Safety check for `createdTs` exception handling:
old_date = """      let createdTs = new Date().toISOString();
      if ($('#backdateInput', m) && $('#backdateInput', m).value) {
        try { createdTs = new Date($('#backdateInput', m).value).toISOString(); } catch(e) {}
      }"""
new_date = """      let createdTs = new Date().toISOString();
      const bdInp = m.querySelector('#backdateInput');
      if (bdInp && bdInp.value) {
        try { createdTs = new Date(bdInp.value).toISOString(); } catch(e) {}
      }"""

content = content.replace(old_date, new_date)

with open('assets/js/pages/pos.js', 'w') as f:
    f.write(content)
