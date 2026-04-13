const test = require('node:test');
const assert = require('node:assert/strict');

const core = require('../public/dashboard-core.js');

function createMemoryStorage() {
  const memory = new Map();

  return {
    getItem(key) {
      return memory.has(key) ? memory.get(key) : null;
    },
    removeItem(key) {
      memory.delete(key);
    },
    setItem(key, value) {
      memory.set(key, value);
    },
  };
}

test('saveSettings and loadSettings round-trip browser-local preferences', function () {
  const storage = createMemoryStorage();
  const saved = core.saveSettings(storage, '42', {
    hideHealthyChecks: true,
    lowStockThreshold: 7,
    ownerNotes: 'Review the product imagery gaps.',
    previewMode: true,
  });

  const loaded = core.loadSettings(storage, '42');

  assert.equal(saved.previewMode, true);
  assert.equal(loaded.hideHealthyChecks, true);
  assert.equal(loaded.lowStockThreshold, 7);
  assert.equal(loaded.ownerNotes, 'Review the product imagery gaps.');
  assert.match(loaded.lastSavedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test('defaultSettings returns the expected merchant defaults', function () {
  assert.deepEqual(core.defaultSettings(), {
    previewMode: false,
    hideHealthyChecks: false,
    lowStockThreshold: 3,
    ownerNotes: '',
    lastSavedAt: '',
  });
});

test('storageKey falls back to standalone demo when store id is missing', function () {
  assert.equal(
    core.storageKey(),
    'live-checkout-friction-monitor:ecwid:standalone-demo'
  );
});

test('sanitizeSettings clamps thresholds and trims owner notes', function () {
  const sanitized = core.sanitizeSettings({
    previewMode: 1,
    hideHealthyChecks: 'yes',
    lowStockThreshold: 999,
    ownerNotes: '  Investigate stalled coupon behavior.  ',
    lastSavedAt: 123,
  });

  assert.equal(sanitized.previewMode, true);
  assert.equal(sanitized.hideHealthyChecks, true);
  assert.equal(sanitized.lowStockThreshold, 50);
  assert.equal(sanitized.ownerNotes, 'Investigate stalled coupon behavior.');
  assert.equal(sanitized.lastSavedAt, '123');
});

test('sanitizeSettings falls back when threshold is invalid', function () {
  const sanitized = core.sanitizeSettings({
    lowStockThreshold: 'not-a-number',
  });

  assert.equal(sanitized.lowStockThreshold, 3);
});

test('sanitizeSettings caps ownerNotes at 2000 characters', function () {
  const longNote = 'A'.repeat(3000);
  const sanitized = core.sanitizeSettings({
    ownerNotes: longNote,
  });

  assert.equal(sanitized.ownerNotes.length, 2000);
});

test('sanitizeSettings handles special characters in ownerNotes without crashing', function () {
  const specialChars = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\ \n\t' + '日本語 emoji 🔥';
  const sanitized = core.sanitizeSettings({
    ownerNotes: specialChars,
  });

  assert.equal(typeof sanitized.ownerNotes, 'string');
  assert.ok(sanitized.ownerNotes.length > 0);
});

test('loadSettings returns defaults when storage is unavailable or invalid', function () {
  const brokenStorage = {
    getItem() {
      return '{bad json';
    },
  };

  assert.deepEqual(core.loadSettings(null, '42'), core.defaultSettings());
  assert.deepEqual(core.loadSettings(brokenStorage, '42'), core.defaultSettings());
});

test('clearSettings removes persisted values and returns defaults', function () {
  const storage = createMemoryStorage();
  core.saveSettings(storage, '55', { previewMode: true, ownerNotes: 'demo' });

  const cleared = core.clearSettings(storage, '55');

  assert.deepEqual(cleared, core.defaultSettings());
  assert.equal(storage.getItem(core.storageKey('55')), null);
});

test('normalizeCollection handles arrays, object payloads, and invalid values', function () {
  assert.deepEqual(core.normalizeCollection([{ id: 1 }]), { items: [{ id: 1 }], total: 1 });
  assert.deepEqual(core.normalizeCollection({ items: [{ id: 2 }], total: 9 }), { items: [{ id: 2 }], total: 9 });
  assert.deepEqual(core.normalizeCollection({ items: [{ id: 3 }] }), { items: [{ id: 3 }], total: 1 });
  assert.deepEqual(core.normalizeCollection('bad'), { items: [], total: 0 });
});

test('buildDashboard flags a closed store with no enabled products as urgent', function () {
  const dashboard = core.buildDashboard({
    profile: { closed: true, currency: 'USD', country: 'US' },
    products: { items: [], total: 0 },
    categories: { items: [], total: 0 },
    coupons: { items: [], total: 0 },
    payload: { lang: 'en', store_id: '1001' },
    settings: core.defaultSettings(),
    storeId: '1001',
  });

  assert.equal(dashboard.band, 'Urgent');
  assert.equal(dashboard.priorities[0].status, 'risk');
  assert.match(dashboard.summary, /closed/i);
});

test('buildDashboard produces a strong score for a healthy merchant setup', function () {
  const dashboard = core.buildDashboard({
    profile: {
      account: { email: 'merchant@example.com' },
      company: { companyName: 'Healthy Shop', phone: '+1 555 2000' },
      country: 'CA',
      currency: 'CAD',
      generalInfo: { storeTitle: 'Healthy Shop' },
    },
    products: {
      items: [
        {
          enabled: true,
          quantity: 20,
          imageUrl: 'https://example.com/a.jpg',
          description: '<p>Long-form product copy that gives shoppers clarity before they reach checkout.</p>',
        },
        {
          enabled: true,
          thumbnailUrl: 'https://example.com/b.jpg',
          quantity: 12,
          description: '<p>Another detailed description to support confident buying decisions.</p>',
        },
      ],
      total: 2,
    },
    categories: { items: [{ id: 1 }, { id: 2 }], total: 2 },
    coupons: { items: [{ id: 7 }], total: 1 },
    payload: { lang: 'fr', store_id: '2002' },
    settings: { lowStockThreshold: 3 },
    storeId: '2002',
  });

  assert.equal(dashboard.merchant.name, 'Healthy Shop');
  assert.equal(dashboard.merchant.currency, 'CAD');
  assert.equal(dashboard.merchant.language, 'fr');
  assert.equal(dashboard.band, 'Strong');
  assert.ok(dashboard.score >= 85);
  assert.equal(dashboard.priorities.length, 0);
  assert.ok(dashboard.opportunities.length > 0);
});

test('buildDashboard uses payload fallbacks when profile data is sparse', function () {
  const dashboard = core.buildDashboard({
    profile: {},
    products: { items: [], total: 0 },
    categories: { items: [], total: 0 },
    coupons: { items: [], total: 0 },
    payload: {
      country: 'GB',
      currency: 'GBP',
      email: 'owner@fallback.test',
      lang: 'en',
      store_id: '3003',
    },
    settings: core.defaultSettings(),
    storeId: '3003',
  });

  assert.equal(dashboard.merchant.email, 'owner@fallback.test');
  assert.equal(dashboard.merchant.country, 'GB');
  assert.equal(dashboard.merchant.currency, 'GBP');
  assert.equal(dashboard.merchant.storeId, '3003');
});

test('buildDashboard marks contact and promotions as weak when missing', function () {
  const dashboard = core.buildDashboard({
    profile: { country: 'US', currency: 'USD' },
    products: {
      items: [
        {
          enabled: true,
          quantity: 10,
          imageUrl: 'https://example.com/a.jpg',
          description: '<p>This description is intentionally long enough to avoid thin-copy warnings in the audit.</p>',
        },
      ],
      total: 1,
    },
    categories: { items: [{ id: 1 }], total: 1 },
    coupons: { items: [], total: 0 },
    payload: { lang: 'en', store_id: '4010' },
    settings: core.defaultSettings(),
    storeId: '4010',
  });

  const contactCheck = dashboard.checks.find(function (check) {
    return check.key === 'contact';
  });
  const promotionsCheck = dashboard.checks.find(function (check) {
    return check.key === 'promotions';
  });

  assert.equal(contactCheck.status, 'warn');
  assert.equal(promotionsCheck.status, 'info');
});

test('buildDashboard limits priorities and opportunities to four items', function () {
  const dashboard = core.buildDashboard({
    profile: { closed: true, country: 'US', currency: 'USD' },
    products: {
      items: [
        { enabled: false, quantity: 0, description: '', imageUrl: '' },
        { enabled: false, quantity: 0, description: '', imageUrl: '' },
      ],
      total: 2,
    },
    categories: { items: [], total: 0 },
    coupons: { items: [], total: 0 },
    payload: { lang: 'en', store_id: '5005' },
    settings: { lowStockThreshold: 3 },
    storeId: '5005',
  });

  assert.equal(dashboard.priorities.length, 4);
  assert.ok(dashboard.opportunities.length <= 4);
});

test('buildDashboard detects image alternatives and low stock threshold changes', function () {
  const dashboard = core.buildDashboard({
    profile: {
      company: { companyName: 'Threshold Shop', phone: '+1 555 0909' },
      country: 'US',
      currency: 'USD',
    },
    products: {
      items: [
        { enabled: true, quantity: 4, hdThumbnailUrl: 'https://example.com/hd.jpg', description: '<p>Long enough description to stay healthy for the audit output.</p>' },
        { enabled: true, quantity: 6, originalImageUrl: 'https://example.com/original.jpg', description: '<p>Long enough description to stay healthy for the audit output.</p>' },
      ],
      total: 2,
    },
    categories: { items: [{ id: 1 }], total: 1 },
    coupons: { items: [{ id: 1 }], total: 1 },
    payload: { lang: 'en', store_id: '6006' },
    settings: { lowStockThreshold: 5 },
    storeId: '6006',
  });

  const lowStockMetric = dashboard.metrics.find(function (metric) {
    return metric.label === 'Low stock items';
  });
  const missingImagesMetric = dashboard.metrics.find(function (metric) {
    return metric.label === 'Missing images';
  });

  assert.equal(lowStockMetric.value, '1');
  assert.equal(missingImagesMetric.value, '0');
});

test('buildDashboard creates warning metrics for thin descriptions and missing categories', function () {
  const dashboard = core.buildDashboard({
    profile: {
      company: { companyName: 'Thin Copy Shop', phone: '+1 555 0101' },
      country: 'US',
      currency: 'USD',
    },
    products: {
      items: [
        { enabled: true, quantity: 9, imageUrl: 'https://example.com/a.jpg', description: '<p>Short.</p>' },
      ],
      total: 1,
    },
    categories: { items: [], total: 0 },
    coupons: { items: [], total: 0 },
    payload: { lang: 'en', store_id: '7007' },
    settings: core.defaultSettings(),
    storeId: '7007',
  });

  const thinMetric = dashboard.metrics.find(function (metric) {
    return metric.label === 'Thin descriptions';
  });
  const categoryMetric = dashboard.metrics.find(function (metric) {
    return metric.label === 'Categories';
  });

  assert.equal(thinMetric.tone, 'warn');
  assert.equal(categoryMetric.tone, 'warn');
});

test('createPreviewData produces a usable merchant audit', function () {
  const preview = core.createPreviewData();
  const dashboard = core.buildDashboard({
    profile: preview.profile,
    products: preview.products,
    categories: preview.categories,
    coupons: preview.coupons,
    payload: { lang: 'en', store_id: 'preview' },
    settings: { lowStockThreshold: 3 },
    storeId: 'preview',
  });

  assert.equal(dashboard.merchant.name, 'Preview Mercantile');
  assert.equal(dashboard.metrics.length, 6);
  assert.ok(dashboard.checks.length >= 6);
  assert.equal(preview.categories.total, 3);
  assert.equal(preview.coupons.total, 1);
  assert.equal(preview.products.items.length, 5);
});

test('resolveAuditMode keeps standalone and preview as separate states', function () {
  assert.equal(core.resolveAuditMode({ previewMode: true, runtimeMode: 'standalone' }), 'preview');
  assert.equal(core.resolveAuditMode({ previewMode: false, runtimeMode: 'ecwid' }), 'live');
  assert.equal(core.resolveAuditMode({ previewMode: false, runtimeMode: 'standalone' }), 'standalone');
});

test('getPreviewUiState returns toggleable standalone messaging', function () {
  const standaloneOff = core.getPreviewUiState({ previewMode: false, runtimeMode: 'standalone' });
  const standaloneOn = core.getPreviewUiState({ previewMode: true, runtimeMode: 'standalone' });

  assert.equal(standaloneOff.active, false);
  assert.equal(standaloneOff.buttonLabel, 'Preview mode: Off');
  assert.equal(standaloneOff.sourceLabel, 'No live connection');
  assert.match(standaloneOff.statusText, /Turn it on for mock data/i);

  assert.equal(standaloneOn.active, true);
  assert.equal(standaloneOn.buttonLabel, 'Preview mode: On');
  assert.equal(standaloneOn.sourceLabel, 'Preview mode');
  assert.match(standaloneOn.statusText, /using fake merchant data/i);
});

test('getEcwidLiveRequests returns the expected real-data admin endpoints', function () {
  assert.deepEqual(core.getEcwidLiveRequests(), [
    { key: 'profile', label: 'Store profile', endpoint: '/profile' },
    { key: 'products', label: 'Products', endpoint: '/products?limit=100' },
    { key: 'categories', label: 'Categories', endpoint: '/categories?limit=100' },
    { key: 'coupons', label: 'Discount coupons', endpoint: '/discount_coupons?limit=100' },
  ]);
});

test('createEcwidApiRequest builds an authorized Ecwid admin request', function () {
  const request = core.createEcwidApiRequest({
    storeId: '123 45',
    endpoint: '/products?limit=100',
    accessToken: 'token-abc',
  });

  assert.equal(request.url, 'https://app.ecwid.com/api/v3/123%2045/products?limit=100');
  assert.deepEqual(request.options, {
    headers: {
      Authorization: 'Bearer token-abc',
    },
  });
});

test('createEcwidApiRequest rejects missing Ecwid access tokens', function () {
  assert.throws(function () {
    core.createEcwidApiRequest({
      storeId: '12345',
      endpoint: '/profile',
      accessToken: '',
    });
  }, /Missing Ecwid access token/i);
});

test('resolveEcwidLiveAudit keeps successful real-data responses on the happy path', function () {
  const requests = core.getEcwidLiveRequests();
  const result = core.resolveEcwidLiveAudit({
    requests: requests,
    settledResults: [
      { status: 'fulfilled', value: { generalInfo: { storeTitle: 'Demo' } } },
      { status: 'fulfilled', value: { items: [{ id: 1 }], total: 1 } },
      { status: 'fulfilled', value: { items: [{ id: 2 }], total: 1 } },
      { status: 'fulfilled', value: { items: [{ id: 3 }], total: 1 } },
    ],
  });

  assert.equal(result.successCount, 4);
  assert.equal(result.payload.profile.generalInfo.storeTitle, 'Demo');
  assert.equal(result.payload.products.total, 1);
  assert.equal(result.payload.categories.total, 1);
  assert.equal(result.payload.coupons.total, 1);
  assert.deepEqual(result.sources.map(function (source) { return source.status; }), ['good', 'good', 'good', 'good']);
});

test('resolveEcwidLiveAudit preserves partial success and fills empty fallbacks on unhappy paths', function () {
  const requests = core.getEcwidLiveRequests();
  const result = core.resolveEcwidLiveAudit({
    requests: requests,
    settledResults: [
      { status: 'rejected', reason: new Error('/profile returned 401') },
      { status: 'fulfilled', value: { items: [{ id: 1 }], total: 1 } },
      { status: 'rejected', reason: new Error('/categories returned 500') },
      { status: 'rejected', reason: new Error('/discount_coupons returned 404') },
    ],
  });

  assert.equal(result.successCount, 1);
  assert.deepEqual(result.payload.profile, {});
  assert.deepEqual(result.payload.categories, { items: [], total: 0 });
  assert.deepEqual(result.payload.coupons, { items: [], total: 0 });
  assert.deepEqual(result.sources.map(function (source) { return source.status; }), ['risk', 'good', 'warn', 'warn']);
  assert.match(result.sources[0].message, /401/);
  assert.match(result.sources[2].message, /500/);
});

test('resolveEcwidLiveAudit throws when all Ecwid admin reads fail', function () {
  const requests = core.getEcwidLiveRequests();

  assert.throws(function () {
    core.resolveEcwidLiveAudit({
      requests: requests,
      settledResults: [
        { status: 'rejected', reason: new Error('/profile returned 401') },
        { status: 'rejected', reason: new Error('/products returned 500') },
        { status: 'rejected', reason: new Error('/categories returned 500') },
        { status: 'rejected', reason: new Error('/discount_coupons returned 500') },
      ],
    });
  }, /No Ecwid admin data could be loaded/i);
});

test('resolveEcwidLiveAudit tolerates missing error objects with a default failure message', function () {
  const requests = core.getEcwidLiveRequests();
  const result = core.resolveEcwidLiveAudit({
    requests: requests,
    settledResults: [
      { status: 'fulfilled', value: { generalInfo: { storeTitle: 'Demo' } } },
      { status: 'rejected', reason: null },
      { status: 'rejected' },
      { status: 'rejected', reason: {} },
    ],
  });

  assert.equal(result.successCount, 1);
  assert.equal(result.sources[1].message, 'Request failed.');
  assert.equal(result.sources[2].message, 'Request failed.');
  assert.equal(result.sources[3].message, 'Request failed.');
});

// ── Data Source Banner Tests ──

test('getDataSourceBanner returns live banner for ecwid mode without preview', function () {
  const banner = core.getDataSourceBanner({ previewMode: false, runtimeMode: 'ecwid' });

  assert.equal(banner.tone, 'good');
  assert.equal(banner.icon, 'live');
  assert.equal(banner.headline, 'Live Data');
  assert.match(banner.detail, /real Ecwid store/i);
});

test('getDataSourceBanner returns sample banner when preview is on', function () {
  const banner = core.getDataSourceBanner({ previewMode: true, runtimeMode: 'ecwid' });

  assert.equal(banner.tone, 'info');
  assert.equal(banner.icon, 'preview');
  assert.equal(banner.headline, 'Sample Data');
  assert.match(banner.detail, /demo data/i);
});

test('getDataSourceBanner returns standalone warning when outside ecwid', function () {
  const banner = core.getDataSourceBanner({ previewMode: false, runtimeMode: 'standalone' });

  assert.equal(banner.tone, 'warn');
  assert.equal(banner.icon, 'standalone');
  assert.equal(banner.headline, 'No Store Connection');
  assert.match(banner.detail, /Ecwid admin dashboard/i);
});

// ── Onboarding Tests ──

test('getOnboardingSteps returns three numbered steps', function () {
  const steps = core.getOnboardingSteps();

  assert.equal(steps.length, 3);
  assert.equal(steps[0].number, '1');
  assert.equal(steps[1].number, '2');
  assert.equal(steps[2].number, '3');
  assert.ok(steps[0].title.length > 0);
  assert.ok(steps[0].detail.length > 0);
  assert.ok(steps[1].title.length > 0);
  assert.ok(steps[2].title.length > 0);
});

test('isOnboardingDismissed returns false when storage is empty or unavailable', function () {
  assert.equal(core.isOnboardingDismissed(null), false);
  assert.equal(core.isOnboardingDismissed(createMemoryStorage()), false);
});

test('dismissOnboarding and isOnboardingDismissed round-trip correctly', function () {
  const storage = createMemoryStorage();

  assert.equal(core.isOnboardingDismissed(storage), false);

  core.dismissOnboarding(storage);
  assert.equal(core.isOnboardingDismissed(storage), true);
});

test('resetOnboarding clears the dismissed state', function () {
  const storage = createMemoryStorage();

  core.dismissOnboarding(storage);
  assert.equal(core.isOnboardingDismissed(storage), true);

  core.resetOnboarding(storage);
  assert.equal(core.isOnboardingDismissed(storage), false);
});

test('ONBOARDING_KEY is a stable storage key', function () {
  assert.equal(core.ONBOARDING_KEY, 'live-checkout-friction-monitor:onboarding-dismissed');
});