const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('portal.html', 'utf8');

// The inline scripts are not run. But let's check for any blatant syntax errors in the HTML.
console.log("Checking syntax of portal inline scripts");

const dom = new JSDOM(html);
const scripts = Array.from(dom.window.document.querySelectorAll('script')).map(s => s.textContent).filter(s => s.trim().length > 0);

scripts.forEach((script, i) => {
    try {
        new Function(script);
        console.log(`Script ${i} syntax OK`);
    } catch(e) {
        console.error(`Script ${i} Syntax Error:`, e.message);
    }
});

