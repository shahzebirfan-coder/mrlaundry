const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const portal = fs.readFileSync('portal.html', 'utf8');

// I can't easily run it since firebase is not defined in node without compat import.
// Let's check the code manually.
