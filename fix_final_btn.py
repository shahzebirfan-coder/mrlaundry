import sys

with open('assets/js/pages/pos.js', 'r') as f:
    content = f.read()

# Instead of blindly doing addEventListener, let's fix the root DOM rewriting logic if it exists, or just ensure onclick doesn't get rewritten.
# The only issue is `$('#confirmBtn', m).onclick = () => {`
# Is it possible `updateDue` is recreating the button?
# No, `updateDue` only updates `$('#dueLine', m).innerHTML`.
# Why would `onclick` fail? Maybe `m` is referring to the wrong modal if there are multiple? No, `openModal` returns `m` inside `onOpen`.
# Wait, look at this: `$('#confirmBtn', m).onclick = () => {`
# If we change it back to `addEventListener('click', ...)` but avoid the syntax error? Let's do that!

old_save = """    $('#confirmBtn', m).onclick = () => {"""
new_save = """    $('#confirmBtn', m).addEventListener('click', () => {"""

content = content.replace(old_save, new_save)

old_back = """    $('#backBtn', m).onclick = () => { closeModal(); openBookingForm(); };"""
new_back = """    $('#backBtn', m).addEventListener('click', () => { closeModal(); openBookingForm(); });"""

content = content.replace(old_back, new_back)

# FIX THE SYNTAX ERROR PROPERLY
# The end of the block is:
#       openInvoice(saved.id);
#     };
#   }});
# }

old_end = """      openInvoice(saved.id);
    };
  }});
}"""

new_end = """      openInvoice(saved.id);
    });
  }});
}"""

content = content.replace(old_end, new_end)

with open('assets/js/pages/pos.js', 'w') as f:
    f.write(content)
