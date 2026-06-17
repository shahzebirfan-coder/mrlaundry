import sys

with open('assets/js/utils.js', 'r') as f:
    content = f.read()

old_bad = """        .then(blob => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => { img.src = reader.result; resolve(); };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })).catch(() => { console.warn('Could not fetch image for print'); })
        }))
        .catch(() => { /* leave URL as-is */ })"""

new_good = """        .then(blob => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => { img.src = reader.result; resolve(); };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        }))
        .catch(() => { /* leave URL as-is */ })"""

content = content.replace(old_bad, new_good)

with open('assets/js/utils.js', 'w') as f:
    f.write(content)
