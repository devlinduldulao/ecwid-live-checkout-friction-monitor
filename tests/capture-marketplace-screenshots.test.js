const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  getMarketplacePaths,
  getScreenshotScenarios,
} = require('../scripts/capture-marketplace-screenshots.js');

test('getMarketplacePaths points to assets/marketplace', function () {
  const paths = getMarketplacePaths('/tmp/demo');

  assert.equal(paths.marketplaceDir, path.join('/tmp/demo', 'assets', 'marketplace'));
  assert.equal(paths.screenshotDashboard, path.join('/tmp/demo', 'assets', 'marketplace', 'screenshot-dashboard.png'));
  assert.equal(paths.screenshotPreview, path.join('/tmp/demo', 'assets', 'marketplace', 'screenshot-preview.png'));
  assert.equal(paths.screenshotSettings, path.join('/tmp/demo', 'assets', 'marketplace', 'screenshot-settings.png'));
});

test('getScreenshotScenarios defines the expected marketplace screenshots', function () {
  const scenarios = getScreenshotScenarios('http://127.0.0.1:4173');

  assert.equal(scenarios.length, 3);
  assert.deepEqual(
    scenarios.map(function (scenario) {
      return scenario.name;
    }),
    ['screenshot-dashboard', 'screenshot-preview', 'screenshot-settings']
  );
  assert.equal(scenarios[0].settings.previewMode, true);
  assert.equal(scenarios[2].settings.previewMode, false);
  assert.equal(scenarios[1].selector, '.preview-panel');
});