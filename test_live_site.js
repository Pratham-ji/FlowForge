const { spawn } = require('child_process');
const http = require('http');

async function run() {
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    'https://flowforgein.netlify.app'
  ]);

  await new Promise(r => setTimeout(r, 4000)); // wait for load

  // I don't have ws. I can use the HTTP JSON API? No, the HTTP API only lists targets.
  // Wait, I can use puppeteer... but it's not installed.
  // Is there any way to capture console without ws?
  // Let's just dump the DOM first to see if it even loaded the JS.
  chrome.kill();
}
run();
