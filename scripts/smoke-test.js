const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  PASS ${name}`);
    passed += 1;
  } catch (error) {
    console.log(`  FAIL ${name} - ${error.message}`);
    failed += 1;
  }
}

function contentType(filePath) {
  if (filePath.endsWith('.css')) {
    return 'text/css; charset=utf-8';
  }

  if (filePath.endsWith('.js')) {
    return 'application/javascript; charset=utf-8';
  }

  return 'text/html; charset=utf-8';
}

function createServer() {
  return http.createServer(function (req, res) {
    var requestPath = req.url === '/' ? '/index.html' : req.url;
    var safePath = path.normalize(requestPath).replace(/^\/+/, '');
    var filePath = path.join(publicDir, safePath);

    if (!filePath.startsWith(publicDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType(filePath) });
    res.end(fs.readFileSync(filePath));
  });
}

async function run() {
  var server = createServer();

  server.listen(0, async function () {
    var port = server.address().port;
    var base = `http://127.0.0.1:${port}`;

    console.log(`\nSmoke test - static server on :${port}\n`);

    await test('GET /index.html returns 200', async function () {
      var response = await fetch(`${base}/index.html`);
      if (response.status !== 200) {
        throw new Error(`status ${response.status}`);
      }

      var html = await response.text();
      if (!html.includes('Live Checkout Friction Monitor')) {
        throw new Error('missing app title');
      }

      if (!html.includes('Owner Preview Mode') || !html.includes('preview-toggle')) {
        throw new Error('missing owner preview controls');
      }

      if (html.includes('/api/settings') || html.includes('/webhooks/ecwid')) {
        throw new Error('stale backend references still present');
      }
    });

    await test('GET /app.js returns 200', async function () {
      var response = await fetch(`${base}/app.js`);
      if (response.status !== 200) {
        throw new Error(`status ${response.status}`);
      }

      var script = await response.text();
      if (!script.includes('fetchEcwid')) {
        throw new Error('missing live Ecwid runtime');
      }
    });

    await test('GET /dashboard-core.js returns 200', async function () {
      var response = await fetch(`${base}/dashboard-core.js`);
      if (response.status !== 200) {
        throw new Error(`status ${response.status}`);
      }

      var script = await response.text();
      if (!script.includes('buildDashboard')) {
        throw new Error('missing audit core');
      }
    });

    await test('GET /app.css returns 200', async function () {
      var response = await fetch(`${base}/app.css`);
      if (response.status !== 200) {
        throw new Error(`status ${response.status}`);
      }
    });

    await test('GET /support.html returns 200', async function () {
      var response = await fetch(`${base}/support.html`);
      if (response.status !== 200) {
        throw new Error(`status ${response.status}`);
      }

      var html = await response.text();
      if (!html.includes('Support | Live Checkout Friction Monitor')) {
        throw new Error('missing support page title');
      }
    });

    await test('GET /privacy.html returns 200', async function () {
      var response = await fetch(`${base}/privacy.html`);
      if (response.status !== 200) {
        throw new Error(`status ${response.status}`);
      }

      var html = await response.text();
      if (!html.includes('Privacy Policy | Live Checkout Friction Monitor')) {
        throw new Error('missing privacy page title');
      }
    });

    await test('GET /terms.html returns 200', async function () {
      var response = await fetch(`${base}/terms.html`);
      if (response.status !== 200) {
        throw new Error(`status ${response.status}`);
      }

      var html = await response.text();
      if (!html.includes('Terms of Service | Live Checkout Friction Monitor')) {
        throw new Error('missing terms page title');
      }
    });

    console.log(`\nResults: ${passed} passed, ${failed} failed\n`);

    server.close(function () {
      process.exit(failed > 0 ? 1 : 0);
    });
  });
}

run();
