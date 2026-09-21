const http = require('http');
const { spawn } = require('child_process');

// Wait for a port to be ready
function waitForPort(port, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const req = http.get(`http://127.0.0.1:${port}`, (res) => {
        clearInterval(interval);
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - startTime > timeout) {
          clearInterval(interval);
          reject(new Error('Timeout waiting for port'));
        }
      });
    }, 500);
  });
}

async function run() {
  const preview = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1'], {
    cwd: './frontend',
    stdio: 'ignore'
  });
  
  try {
    await waitForPort(4173);
    const { execSync } = require('child_process');
    // Assuming Chrome is at the standard MacOS path
    const chromePath = '/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome';
    execSync(`${chromePath} --headless --disable-gpu --dump-dom http://127.0.0.1:4173 > local_dom.html`);
    const dom = require('fs').readFileSync('local_dom.html', 'utf8');
    
    if (dom.includes('id="root"') && dom.includes('FlowForge') && !dom.includes('<div id="root"></div>')) {
      console.log('SUCCESS: React rendered content inside #root');
    } else {
      console.error('FAILURE: React did not render properly into #root');
      console.error(dom.substring(0, 1000));
    }
  } catch (err) {
    console.error('Error during headless test:', err);
  } finally {
    preview.kill();
    try { require('fs').unlinkSync('local_dom.html'); } catch(e){}
  }
}

run();
