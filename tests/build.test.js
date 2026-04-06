const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { buildApp, noJekyllFileName } = require('../scripts/build.js');

test('buildApp recreates build output from public assets', function () {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'lcfm-ecwid-build-'));
  const publicDir = path.join(tempRoot, 'public');
  const buildDir = path.join(tempRoot, 'build');

  fs.mkdirSync(publicDir, { recursive: true });
  fs.mkdirSync(buildDir, { recursive: true });
  fs.writeFileSync(path.join(buildDir, 'stale.txt'), 'stale');
  fs.writeFileSync(path.join(publicDir, 'index.html'), '<html><body>demo</body></html>');
  fs.writeFileSync(path.join(publicDir, 'app.js'), 'console.log("demo");');
  fs.mkdirSync(path.join(publicDir, 'nested'), { recursive: true });
  fs.writeFileSync(path.join(publicDir, 'nested', 'asset.txt'), 'nested');

  const result = buildApp(tempRoot);

  assert.equal(result.rootDir, tempRoot);
  assert.equal(fs.existsSync(path.join(buildDir, 'stale.txt')), false);
  assert.equal(fs.readFileSync(path.join(buildDir, 'index.html'), 'utf8'), '<html><body>demo</body></html>');
  assert.equal(fs.readFileSync(path.join(buildDir, 'app.js'), 'utf8'), 'console.log("demo");');
  assert.equal(fs.readFileSync(path.join(buildDir, 'nested', 'asset.txt'), 'utf8'), 'nested');
  assert.equal(fs.existsSync(path.join(buildDir, noJekyllFileName)), true);

  fs.rmSync(tempRoot, { recursive: true, force: true });
});