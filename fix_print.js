const fs = require('fs');

let content = fs.readFileSync('assets/js/utils.js', 'utf8');

// The issue might be that the print modal gets blocked or fails when trying to load local resources. Let's make sure print window opens reliably.
// Actually, is `printElement` correctly handling errors from fetch?
content = content.replace("reader.readAsDataURL(blob);", "reader.readAsDataURL(blob);\n        })).catch(() => { console.warn('Could not fetch image for print'); })");

fs.writeFileSync('assets/js/utils.js', content);
