const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const html = fs.readFileSync('dist/index.html', 'utf8');
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable" });
dom.window.addEventListener('error', (event) => { console.error('JSDOM Error:', event.error); });
setTimeout(() => {
    const root = dom.window.document.getElementById('root');
    if (root && root.innerHTML.length > 0) { console.log("SUCCESS:", root.innerHTML.substring(0, 100)); } else { console.log("FAILED"); }
}, 2000);
