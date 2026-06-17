import sys

with open('assets/js/pages/pos.js', 'r') as f:
    content = f.read()

# Revert to onclick because addEventListener inside an openModal onOpen function binds MULTIPLE times if opened repeatedly without clearing DOM events in some setups, OR causes context issues. The real bug is likely just something else. Wait, the problem is "click on Save and Print is not working at all".
# Is there an error in console? If there is an error inside the onclick, it fails silently.

content = content.replace("$('#confirmBtn', m).addEventListener('click', () => {", "$('#confirmBtn', m).onclick = () => {")
content = content.replace("$('#backBtn', m).addEventListener('click', () => { closeModal(); openBookingForm(); });", "$('#backBtn', m).onclick = () => { closeModal(); openBookingForm(); };")

with open('assets/js/pages/pos.js', 'w') as f:
    f.write(content)

with open('assets/js/pages/orders.js', 'r') as f:
    content = f.read()

content = content.replace("$('#rcvSave', m).addEventListener('click', () => {", "$('#rcvSave', m).onclick = () => {")

with open('assets/js/pages/orders.js', 'w') as f:
    f.write(content)
