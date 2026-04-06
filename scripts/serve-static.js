const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const inputDir = process.argv[2] || 'public';
const serveDir = path.resolve(rootDir, inputDir);
const port = Number(process.env.PORT || 4173);

if (!fs.existsSync(serveDir)) {
  console.error(`Directory does not exist: ${serveDir}`);
  process.exit(1);
}

function contentType(filePath) {
  if (filePath.endsWith('.css')) {
    return 'text/css; charset=utf-8';
  }

  if (filePath.endsWith('.js')) {
    return 'application/javascript; charset=utf-8';
  }

  if (filePath.endsWith('.json')) {
    return 'application/json; charset=utf-8';
  }

  return 'text/html; charset=utf-8';
}

http.createServer(function (req, res) {
  const requestPath = req.url === '/' ? '/index.html' : req.url;
  const normalizedPath = path.normalize(requestPath).replace(/^\/+/, '');
  const filePath = path.join(serveDir, normalizedPath);

  if (!filePath.startsWith(serveDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  res.writeHead(200, { 'Content-Type': contentType(filePath) });
  res.end(fs.readFileSync(filePath));
}).listen(port, function () {
  console.log(`Serving ${path.relative(rootDir, serveDir)} at http://127.0.0.1:${port}`);
});