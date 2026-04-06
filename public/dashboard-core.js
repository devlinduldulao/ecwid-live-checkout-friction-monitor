(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }

  root.LiveCheckoutFrictionMonitorCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var STORAGE_PREFIX = 'live-checkout-friction-monitor:ecwid:';

  function defaultSettings() {
    return {
      previewMode: false,
      hideHealthyChecks: false,
      lowStockThreshold: 3,
      ownerNotes: '',
      lastSavedAt: '',
    };
  }

  function storageKey(storeId) {
    return STORAGE_PREFIX + String(storeId || 'standalone-demo');
  }

  function sanitizeSettings(input) {
    var merged = Object.assign({}, defaultSettings(), input || {});
    var threshold = Number(merged.lowStockThreshold);

    return {
      previewMode: Boolean(merged.previewMode),
      hideHealthyChecks: Boolean(merged.hideHealthyChecks),
      lowStockThreshold: Number.isFinite(threshold) ? Math.max(0, Math.min(50, Math.round(threshold))) : 3,
      ownerNotes: String(merged.ownerNotes || '').trim().slice(0, 2000),
      lastSavedAt: String(merged.lastSavedAt || ''),
    };
  }

  function loadSettings(storage, storeId) {
    if (!storage || typeof storage.getItem !== 'function') {
      return defaultSettings();
    }

    try {
      var raw = storage.getItem(storageKey(storeId));
      if (!raw) {
        return defaultSettings();
      }

      return sanitizeSettings(JSON.parse(raw));
    } catch (error) {
      return defaultSettings();
    }
  }

  function saveSettings(storage, storeId, settings) {
    var sanitized = sanitizeSettings(settings);
    sanitized.lastSavedAt = new Date().toISOString();

    if (storage && typeof storage.setItem === 'function') {
      storage.setItem(storageKey(storeId), JSON.stringify(sanitized));
    }

    return sanitized;
  }

  function clearSettings(storage, storeId) {
    if (storage && typeof storage.removeItem === 'function') {
      storage.removeItem(storageKey(storeId));
    }

    return defaultSettings();
  }

  function normalizeCollection(payload) {
    if (Array.isArray(payload)) {
      return { items: payload.slice(), total: payload.length };
    }

    if (!payload || typeof payload !== 'object') {
      return { items: [], total: 0 };
    }

    var items = Array.isArray(payload.items) ? payload.items.slice() : [];
    var total = Number(payload.total);

    return {
      items: items,
      total: Number.isFinite(total) ? total : items.length,
    };
  }

  function stripHtml(value) {
    return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function summarizeProducts(products, lowStockThreshold) {
    return products.reduce(function (summary, product) {
      var isEnabled = product && product.enabled !== false;
      var quantity = Number(product && product.quantity);
      var description = stripHtml(product && product.description);
      var hasImage = Boolean(product && (product.imageUrl || product.originalImageUrl || product.thumbnailUrl || product.hdThumbnailUrl));

      if (isEnabled) {
        summary.enabledProducts += 1;
      } else {
        summary.disabledProducts += 1;
      }

      if (Number.isFinite(quantity) && quantity <= lowStockThreshold) {
        summary.lowStockProducts += 1;
      }

      if (!hasImage) {
        summary.missingImages += 1;
      }

      if (description.length < 40) {
        summary.thinDescriptions += 1;
      }

      return summary;
    }, {
      enabledProducts: 0,
      disabledProducts: 0,
      lowStockProducts: 0,
      missingImages: 0,
      thinDescriptions: 0,
    });
  }

  function resolveStoreName(profile, fallbackStoreId) {
    return (
      (profile && (profile.generalInfo && profile.generalInfo.storeTitle)) ||
      (profile && profile.company && profile.company.companyName) ||
      (profile && profile.storeUrl) ||
      ('Store ' + String(fallbackStoreId || 'Preview'))
    );
  }

  function resolveEmail(profile, payload) {
    return (
      (profile && profile.account && profile.account.email) ||
      (profile && profile.mailNotifications && profile.mailNotifications.senderEmail) ||
      (payload && payload.email) ||
      ''
    );
  }

  function resolvePhone(profile) {
    return (
      (profile && profile.company && profile.company.phone) ||
      (profile && profile.contactPhone) ||
      ''
    );
  }

  function buildChecks(context) {
    var checks = [];
    var deductions = 0;

    if (context.profile && context.profile.closed === true) {
      checks.push({
        key: 'store-open',
        status: 'risk',
        title: 'Store is marked closed',
        message: 'A closed storefront blocks conversion before checkout even starts. Re-open the store or verify the closure schedule.',
      });
      deductions += 35;
    } else {
      checks.push({
        key: 'store-open',
        status: 'good',
        title: 'Store is open for ordering',
        message: 'The storefront appears available to shoppers.',
      });
    }

    if (context.productSummary.enabledProducts === 0) {
      checks.push({
        key: 'catalog',
        status: 'risk',
        title: 'No enabled products found',
        message: 'The catalog cannot support a healthy checkout flow if no active products are available.',
      });
      deductions += 30;
    } else {
      checks.push({
        key: 'catalog',
        status: context.productSummary.disabledProducts > 0 ? 'warn' : 'good',
        title: 'Catalog availability',
        message: context.productSummary.disabledProducts > 0
          ? context.productSummary.disabledProducts + ' products are disabled. Check whether they should be live.'
          : context.productSummary.enabledProducts + ' enabled products are available for checkout.',
      });
      if (context.productSummary.disabledProducts > 0) {
        deductions += Math.min(10, context.productSummary.disabledProducts * 2);
      }
    }

    if (context.productSummary.missingImages > 0) {
      checks.push({
        key: 'imagery',
        status: 'warn',
        title: 'Product imagery gaps',
        message: context.productSummary.missingImages + ' products are missing images. Weak product confidence often shows up as cart hesitation.',
      });
      deductions += Math.min(14, 4 + context.productSummary.missingImages * 2);
    } else {
      checks.push({
        key: 'imagery',
        status: 'good',
        title: 'Product imagery coverage looks healthy',
        message: 'The sampled catalog items all include imagery.',
      });
    }

    if (context.productSummary.thinDescriptions > 0) {
      checks.push({
        key: 'descriptions',
        status: 'warn',
        title: 'Thin product descriptions detected',
        message: context.productSummary.thinDescriptions + ' products have very short descriptions. Thin detail often pushes questions into checkout.',
      });
      deductions += Math.min(12, 3 + context.productSummary.thinDescriptions * 2);
    } else {
      checks.push({
        key: 'descriptions',
        status: 'good',
        title: 'Product detail depth looks acceptable',
        message: 'The sampled products contain enough descriptive copy for a first-pass merchant audit.',
      });
    }

    if (context.productSummary.lowStockProducts > 0) {
      checks.push({
        key: 'inventory',
        status: 'warn',
        title: 'Low-stock products can increase checkout anxiety',
        message: context.productSummary.lowStockProducts + ' products are at or below the low-stock threshold of ' + context.settings.lowStockThreshold + '.',
      });
      deductions += Math.min(10, 2 + context.productSummary.lowStockProducts * 2);
    } else {
      checks.push({
        key: 'inventory',
        status: 'good',
        title: 'Inventory pressure looks stable',
        message: 'No sampled products are under the low-stock threshold.',
      });
    }

    if (context.categoryCount === 0) {
      checks.push({
        key: 'categories',
        status: 'warn',
        title: 'No categories found',
        message: 'A flat catalog can make product discovery harder before customers ever reach checkout.',
      });
      deductions += 10;
    } else {
      checks.push({
        key: 'categories',
        status: 'good',
        title: 'Category structure exists',
        message: context.categoryCount + ' categories are available for navigation.',
      });
    }

    if (!context.email && !context.phone) {
      checks.push({
        key: 'contact',
        status: 'warn',
        title: 'Merchant contact signal is thin',
        message: 'Add a support email or phone in your store profile so hesitant buyers can reach you before abandoning.',
      });
      deductions += 6;
    } else {
      checks.push({
        key: 'contact',
        status: 'good',
        title: 'Support contact is visible in store data',
        message: 'At least one merchant contact channel is present in the profile.',
      });
    }

    checks.push({
      key: 'promotions',
      status: context.couponCount > 0 ? 'good' : 'info',
      title: context.couponCount > 0 ? 'Promotions are configured' : 'No discount coupons found',
      message: context.couponCount > 0
        ? context.couponCount + ' coupons are available. Promotions can help recover uncertain carts during campaigns.'
        : 'Coupons are optional, but having no promotional offers removes one common rescue lever for hesitant shoppers.',
    });

    return { checks: checks, deductions: deductions };
  }

  function createMetric(label, value, detail, tone) {
    return {
      label: label,
      value: String(value),
      detail: detail,
      tone: tone,
    };
  }

  function createPreviewData() {
    return {
      profile: {
        closed: false,
        storeUrl: 'preview-store.example.com',
        account: { email: 'owner@example.com' },
        company: { companyName: 'Preview Mercantile', phone: '+1 555 0100' },
        country: 'US',
        currency: 'USD',
      },
      products: {
        items: [
          { enabled: true, quantity: 2, imageUrl: 'https://example.com/a.jpg', description: '<p>Handmade notebook with thick recycled paper.</p>' },
          { enabled: true, quantity: 8, description: '<p>Canvas bag.</p>' },
          { enabled: false, quantity: 0, imageUrl: 'https://example.com/b.jpg', description: '<p>Seasonal candle with citrus notes.</p>' },
          { enabled: true, quantity: 1, imageUrl: 'https://example.com/c.jpg', description: '<p>Gift card.</p>' },
          { enabled: true, quantity: 12, imageUrl: 'https://example.com/d.jpg', description: '<p>Oak desk tray sized for journals and chargers.</p>' },
        ],
        total: 5,
      },
      categories: {
        items: [{ id: 1 }, { id: 2 }, { id: 3 }],
        total: 3,
      },
      coupons: {
        items: [{ id: 1 }],
        total: 1,
      },
    };
  }

  function resolveAuditMode(input) {
    var runtimeMode = (input && input.runtimeMode) || 'standalone';

    if (input && input.previewMode) {
      return 'preview';
    }

    if (runtimeMode === 'ecwid') {
      return 'live';
    }

    return 'standalone';
  }

  function getPreviewUiState(input) {
    var mode = resolveAuditMode(input);

    if (mode === 'preview') {
      return {
        active: true,
        buttonLabel: 'Preview mode: On',
        sourceLabel: 'Preview mode',
        statusText: 'Preview mode is on and the dashboard is using fake merchant data.',
        summaryText: 'The dashboard is simulating a realistic merchant audit so you can demo the UI without touching live store data.',
      };
    }

    if (mode === 'live') {
      return {
        active: false,
        buttonLabel: 'Preview mode: Off',
        sourceLabel: 'Live Ecwid read',
        statusText: 'Preview mode is off and the dashboard will use live Ecwid data when available.',
        summaryText: 'Use preview mode when you want to demo the dashboard with safe fake data instead of live Ecwid reads.',
      };
    }

    return {
      active: false,
      buttonLabel: 'Preview mode: Off',
      sourceLabel: 'No live connection',
      statusText: 'Preview mode is off. Turn it on for mock data, or open this page inside Ecwid admin for live data.',
      summaryText: 'Preview mode can be toggled on for fake data, but live Ecwid data is only available inside the Ecwid admin iframe.',
    };
  }

  function getEcwidLiveRequests() {
    return [
      { key: 'profile', label: 'Store profile', endpoint: '/profile' },
      { key: 'products', label: 'Products', endpoint: '/products?limit=100' },
      { key: 'categories', label: 'Categories', endpoint: '/categories?limit=100' },
      { key: 'coupons', label: 'Discount coupons', endpoint: '/discount_coupons?limit=100' },
    ];
  }

  function createEcwidApiRequest(input) {
    var storeId = encodeURIComponent(String(input && input.storeId || ''));
    var endpoint = String(input && input.endpoint || '');
    var token = String(input && input.accessToken || '');

    if (!token) {
      throw new Error('Missing Ecwid access token in iframe payload.');
    }

    return {
      url: 'https://app.ecwid.com/api/v3/' + storeId + endpoint,
      options: {
        headers: {
          Authorization: 'Bearer ' + token,
        },
      },
    };
  }

  function resolveEcwidLiveAudit(input) {
    var requests = (input && input.requests) || getEcwidLiveRequests();
    var settled = (input && input.settledResults) || [];
    var payload = {};
    var sources = [];
    var successCount = 0;

    settled.forEach(function (result, index) {
      var request = requests[index];

      if (!request) {
        return;
      }

      if (result.status === 'fulfilled') {
        payload[request.key] = result.value;
        successCount += 1;
        sources.push({ label: request.label, status: 'good', message: 'Loaded from Ecwid successfully.' });
        return;
      }

      payload[request.key] = request.key === 'profile' ? {} : { items: [], total: 0 };
      sources.push({
        label: request.label,
        status: request.key === 'profile' ? 'risk' : 'warn',
        message: result.reason && result.reason.message ? result.reason.message : 'Request failed.',
      });
    });

    if (successCount === 0) {
      throw new Error('No Ecwid admin data could be loaded.');
    }

    return {
      payload: payload,
      sources: sources,
      successCount: successCount,
    };
  }

  function buildDashboard(input) {
    var settings = sanitizeSettings(input && input.settings);
    var products = normalizeCollection(input && input.products);
    var categories = normalizeCollection(input && input.categories);
    var coupons = normalizeCollection(input && input.coupons);
    var profile = (input && input.profile) || {};
    var payload = (input && input.payload) || {};
    var productSummary = summarizeProducts(products.items, settings.lowStockThreshold);
    var merchantName = resolveStoreName(profile, input && input.storeId);
    var email = resolveEmail(profile, payload);
    var phone = resolvePhone(profile);
    var categoryCount = categories.total;
    var couponCount = coupons.total;
    var checkState = buildChecks({
      profile: profile,
      settings: settings,
      productSummary: productSummary,
      categoryCount: categoryCount,
      couponCount: couponCount,
      email: email,
      phone: phone,
    });
    var score = Math.max(0, 100 - checkState.deductions);
    var band = score >= 85 ? 'Strong' : score >= 70 ? 'Stable' : score >= 50 ? 'Needs attention' : 'Urgent';
    var priorities = checkState.checks.filter(function (check) {
      return check.status === 'risk' || check.status === 'warn';
    }).slice(0, 4);
    var opportunities = checkState.checks.filter(function (check) {
      return check.status === 'good' || check.status === 'info';
    }).slice(0, 4);

    return {
      merchant: {
        name: merchantName,
        email: email || 'Not set',
        phone: phone || 'Not set',
        country: String(profile.country || payload.country || 'Unknown'),
        currency: String(profile.currency || payload.currency || 'Unknown'),
        language: String(payload.lang || 'Unknown'),
        storeId: String((input && input.storeId) || payload.store_id || 'Preview'),
      },
      score: score,
      band: band,
      summary: priorities.length > 0
        ? priorities[0].message
        : 'The current sample looks structurally healthy for a lightweight friction review.',
      metrics: [
        createMetric('Enabled products', productSummary.enabledProducts, 'Catalog items currently available for checkout.', productSummary.enabledProducts === 0 ? 'risk' : 'good'),
        createMetric('Low stock items', productSummary.lowStockProducts, 'Products at or below your low-stock threshold.', productSummary.lowStockProducts > 0 ? 'warn' : 'good'),
        createMetric('Missing images', productSummary.missingImages, 'Products with no visible imagery in the sampled catalog.', productSummary.missingImages > 0 ? 'warn' : 'good'),
        createMetric('Thin descriptions', productSummary.thinDescriptions, 'Products with very short descriptions.', productSummary.thinDescriptions > 0 ? 'warn' : 'good'),
        createMetric('Categories', categoryCount, 'Category structure supporting discovery before checkout.', categoryCount === 0 ? 'warn' : 'good'),
        createMetric('Coupons', couponCount, 'Promotions currently configured in Ecwid.', couponCount > 0 ? 'good' : 'info'),
      ],
      checks: checkState.checks,
      priorities: priorities,
      opportunities: opportunities,
      settings: settings,
    };
  }

  return {
    clearSettings: clearSettings,
    buildDashboard: buildDashboard,
    createEcwidApiRequest: createEcwidApiRequest,
    createPreviewData: createPreviewData,
    defaultSettings: defaultSettings,
    getEcwidLiveRequests: getEcwidLiveRequests,
    getPreviewUiState: getPreviewUiState,
    loadSettings: loadSettings,
    normalizeCollection: normalizeCollection,
    resolveEcwidLiveAudit: resolveEcwidLiveAudit,
    resolveAuditMode: resolveAuditMode,
    sanitizeSettings: sanitizeSettings,
    saveSettings: saveSettings,
    storageKey: storageKey,
  };
});