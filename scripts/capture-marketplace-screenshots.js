const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const defaultChromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const defaultBaseUrl = process.env.APP_URL || 'http://127.0.0.1:4173';
const storageKey = 'live-checkout-friction-monitor:ecwid:standalone-demo';

function getMarketplacePaths(baseDir) {
  const resolvedBaseDir = baseDir || rootDir;
  const marketplaceDir = path.join(resolvedBaseDir, 'assets', 'marketplace');

  return {
    marketplaceDir: marketplaceDir,
    screenshotDashboard: path.join(marketplaceDir, 'screenshot-dashboard.png'),
    screenshotPreview: path.join(marketplaceDir, 'screenshot-preview.png'),
    screenshotSettings: path.join(marketplaceDir, 'screenshot-settings.png'),
  };
}

function getScreenshotScenarios(baseUrl) {
  const url = baseUrl || defaultBaseUrl;

  return [
    {
      name: 'screenshot-dashboard',
      outputPathKey: 'screenshotDashboard',
      selector: '.main-column',
      padding: 20,
      settings: {
        previewMode: true,
        hideHealthyChecks: false,
        lowStockThreshold: 3,
        ownerNotes: '',
      },
      url: url,
    },
    {
      name: 'screenshot-preview',
      outputPathKey: 'screenshotPreview',
      selector: '.preview-panel',
      padding: 20,
      settings: {
        previewMode: true,
        hideHealthyChecks: false,
        lowStockThreshold: 3,
        ownerNotes: 'Preview mode enabled for marketplace capture.',
      },
      url: url,
    },
    {
      name: 'screenshot-settings',
      outputPathKey: 'screenshotSettings',
      selector: '.side-column',
      padding: 20,
      settings: {
        previewMode: false,
        hideHealthyChecks: false,
        lowStockThreshold: 3,
        ownerNotes: 'Standalone mode shows the real no-live-connection behavior.',
      },
      url: url,
    },
  ];
}

function delay(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function stopChromeProcess(processHandle) {
  return new Promise(function (resolve) {
    let settled = false;

    function finish() {
      if (settled) {
        return;
      }

      settled = true;
      resolve();
    }

    processHandle.once('exit', finish);
    processHandle.kill('SIGTERM');

    setTimeout(function () {
      if (!processHandle.killed) {
        processHandle.kill('SIGKILL');
      }

      finish();
    }, 1500);
  });
}

async function waitForDebugger(port, timeoutMs) {
  const deadline = Date.now() + (timeoutMs || 10000);

  while (Date.now() < deadline) {
    try {
      const response = await fetch('http://127.0.0.1:' + port + '/json/list');

      if (response.ok) {
        const pages = await response.json();
        const page = Array.isArray(pages)
          ? pages.find(function (entry) { return entry.type === 'page'; })
          : null;

        if (page && page.webSocketDebuggerUrl) {
          return page.webSocketDebuggerUrl;
        }
      }
    } catch (error) {
      // Retry until timeout.
    }

    await delay(200);
  }

  throw new Error('Chrome DevTools debugger did not start in time.');
}

function createCdpClient(wsUrl) {
  if (typeof WebSocket !== 'function') {
    throw new Error('WebSocket support is unavailable in this Node runtime.');
  }

  return new Promise(function (resolve, reject) {
    const ws = new WebSocket(wsUrl);
    let nextId = 1;
    const pending = new Map();
    const listeners = new Map();

    ws.addEventListener('open', function () {
      resolve({
        close: function () {
          ws.close();
        },
        command: function (method, params) {
          return new Promise(function (commandResolve, commandReject) {
            const id = nextId;
            nextId += 1;
            pending.set(id, { resolve: commandResolve, reject: commandReject });
            ws.send(JSON.stringify({ id: id, method: method, params: params || {} }));
          });
        },
        on: function (eventName, handler) {
          listeners.set(eventName, handler);
        },
      });
    });

    ws.addEventListener('message', function (event) {
      const payload = JSON.parse(String(event.data));

      if (payload.id) {
        const request = pending.get(payload.id);

        if (!request) {
          return;
        }

        pending.delete(payload.id);

        if (payload.error) {
          request.reject(new Error(payload.error.message || 'CDP command failed.'));
          return;
        }

        request.resolve(payload.result || {});
        return;
      }

      if (payload.method && listeners.has(payload.method)) {
        listeners.get(payload.method)(payload.params || {});
      }
    });

    ws.addEventListener('error', function (error) {
      reject(error.error || error);
    });
  });
}

async function setViewport(client, width, height) {
  await client.command('Emulation.setDeviceMetricsOverride', {
    width: width,
    height: height,
    deviceScaleFactor: 1,
    mobile: false,
  });
}

async function navigate(client, url) {
  await client.command('Page.navigate', { url: url });
  await delay(900);
}

async function setLocalSettings(client, settings) {
  const serialized = JSON.stringify({
    previewMode: Boolean(settings.previewMode),
    hideHealthyChecks: Boolean(settings.hideHealthyChecks),
    lowStockThreshold: Number(settings.lowStockThreshold),
    ownerNotes: String(settings.ownerNotes || ''),
    lastSavedAt: new Date().toISOString(),
  });

  await client.command('Runtime.evaluate', {
    expression: 'localStorage.setItem(' + JSON.stringify(storageKey) + ', ' + JSON.stringify(serialized) + ');',
  });
}

async function getClipRect(client, selector, padding) {
  const result = await client.command('Runtime.evaluate', {
    expression: '(() => {' +
      'const element = document.querySelector(' + JSON.stringify(selector) + ');' +
      'if (!element) return null;' +
      'const rect = element.getBoundingClientRect();' +
      'return {' +
        'x: Math.max(0, Math.floor(rect.left + window.scrollX - ' + padding + ')),' +
        'y: Math.max(0, Math.floor(rect.top + window.scrollY - ' + padding + ')),' +
        'width: Math.ceil(rect.width + ' + (padding * 2) + '),' +
        'height: Math.ceil(rect.height + ' + (padding * 2) + ')' +
      '};' +
    '})()',
    returnByValue: true,
  });

  if (!result.result || !result.result.value) {
    throw new Error('Could not find selector for screenshot: ' + selector);
  }

  const clip = result.result.value;
  clip.scale = 1;
  return clip;
}

async function captureScenario(client, scenario, outputPath) {
  await navigate(client, scenario.url);
  await setLocalSettings(client, scenario.settings);
  await navigate(client, scenario.url);

  const clip = await getClipRect(client, scenario.selector, scenario.padding);
  const screenshot = await client.command('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: true,
    clip: clip,
  });

  fs.writeFileSync(outputPath, Buffer.from(screenshot.data, 'base64'));
}

async function main() {
  const marketplacePaths = getMarketplacePaths(rootDir);
  const scenarios = getScreenshotScenarios(process.argv[2] || defaultBaseUrl);
  const chromePath = process.env.CHROME_PATH || defaultChromePath;
  const debugPort = Number(process.env.CHROME_DEBUG_PORT || 9222);
  const tempUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lcfm-marketplace-'));

  if (!fs.existsSync(chromePath)) {
    throw new Error('Chrome not found at ' + chromePath);
  }

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--remote-debugging-port=' + debugPort,
    '--user-data-dir=' + tempUserDataDir,
    'about:blank',
  ], {
    stdio: 'ignore',
  });

  try {
    const wsUrl = await waitForDebugger(debugPort, 10000);
    const client = await createCdpClient(wsUrl);

    await client.command('Page.enable');
    await client.command('Runtime.enable');
    await setViewport(client, 1440, 2200);

    for (const scenario of scenarios) {
      const outputPath = marketplacePaths[scenario.outputPathKey];
      await captureScenario(client, scenario, outputPath);
      console.log('Captured ' + path.relative(rootDir, outputPath));
    }

    client.close();
  } finally {
    await stopChromeProcess(chrome);

    try {
      fs.rmSync(tempUserDataDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Skipped temp profile cleanup: ' + error.message);
    }
  }
}

if (require.main === module) {
  main().catch(function (error) {
    console.error(error.message || error);
    process.exit(1);
  });
}

module.exports = {
  getMarketplacePaths: getMarketplacePaths,
  getScreenshotScenarios: getScreenshotScenarios,
};