(function () {
  'use strict';

  var appId = 'live-checkout-friction-monitor';
  var core = window.LiveCheckoutFrictionMonitorCore;
  var state = {
    mode: 'boot',
    payload: null,
    settings: core ? core.defaultSettings() : {},
    storeId: 'standalone-demo',
  };

  var elements = {
    checks: document.getElementById('checks-list'),
    connectionStatus: document.getElementById('connection-status'),
    dataSourceBanner: document.getElementById('data-source-banner'),
    dataSourceDetail: document.getElementById('data-source-detail'),
    dataSourceHeadline: document.getElementById('data-source-headline'),
    dataSourceIcon: document.getElementById('data-source-icon'),
    dataStatuses: document.getElementById('data-statuses'),
    dismissOnboarding: document.getElementById('dismiss-onboarding'),
    lastRefresh: document.getElementById('dashboard-last-refresh'),
    hideHealthyChecks: document.getElementById('hide-healthy-checks'),
    lowStockThreshold: document.getElementById('low-stock-threshold'),
    merchantMeta: document.getElementById('merchant-meta'),
    merchantName: document.getElementById('merchant-name'),
    merchantProfile: document.getElementById('merchant-profile'),
    metrics: document.getElementById('metrics-grid'),
    onboardingBanner: document.getElementById('onboarding-banner'),
    onboardingSteps: document.getElementById('onboarding-steps'),
    opportunities: document.getElementById('opportunities-list'),
    ownerNotes: document.getElementById('owner-notes'),
    previewMode: document.getElementById('preview-mode'),
    previewPanelCard: document.getElementById('preview-panel-card'),
    previewStatus: document.getElementById('preview-status'),
    previewSummary: document.getElementById('preview-summary'),
    previewToggle: document.getElementById('preview-toggle'),
    priorities: document.getElementById('priority-list'),
    refreshDashboard: document.getElementById('refresh-dashboard'),
    resetSettings: document.getElementById('reset-settings'),
    saveSettings: document.getElementById('save-settings'),
    scoreBand: document.getElementById('score-band'),
    scoreSummary: document.getElementById('score-summary'),
    scoreValue: document.getElementById('score-value'),
    settingsStatus: document.getElementById('settings-status'),
    showOnboarding: document.getElementById('show-onboarding'),
    sourcePill: document.getElementById('source-pill'),
  };

  bindEvents();
  renderOnboarding();
  boot();

  function boot() {
    if (!core) {
      setConnection('Core logic unavailable', 'risk');
      return;
    }

    if (!window.EcwidApp || typeof window.EcwidApp.init !== 'function') {
      enterStandaloneMode();
      return;
    }

    try {
      var app = window.EcwidApp.init({ appId: appId });
      app.getPayload(function (payload) {
        if (!payload || !payload.store_id) {
          enterStandaloneMode();
          return;
        }

        state.mode = 'ecwid';
        state.payload = payload;
        state.storeId = String(payload.store_id);
        state.settings = core.loadSettings(window.localStorage, state.storeId);
        hydrateControls();
        setConnection('Connected to Ecwid admin', 'good');
        refreshDashboard();
      });
    } catch (error) {
      enterStandaloneMode();
    }
  }

  function enterStandaloneMode() {
    state.mode = 'standalone';
    state.payload = {
      lang: 'en',
      store_id: 'standalone-demo',
    };
    state.storeId = 'standalone-demo';
    state.settings = core.loadSettings(window.localStorage, state.storeId);
    hydrateControls();
    setConnection('Standalone dashboard', 'info');
    refreshDashboard();
  }

  function bindEvents() {
    elements.refreshDashboard.addEventListener('click', function () {
      refreshDashboard();
    });

    elements.previewToggle.addEventListener('click', function () {
      togglePreviewMode();
    });

    elements.saveSettings.addEventListener('click', function () {
      persistSettings('Local settings saved for this browser.');
    });

    elements.resetSettings.addEventListener('click', function () {
      state.settings = core.clearSettings(window.localStorage, state.storeId);
      hydrateControls();
      renderSettingsStatus('Local settings reset to defaults.');
      refreshDashboard();
    });

    elements.previewMode.addEventListener('change', function () {
      setPreviewMode(elements.previewMode.checked, 'Preview preference updated.');
    });

    elements.dismissOnboarding.addEventListener('click', function () {
      core.dismissOnboarding(window.localStorage);
      elements.onboardingBanner.hidden = true;
      resizeIframe();
    });

    elements.showOnboarding.addEventListener('click', function () {
      core.resetOnboarding(window.localStorage);
      elements.onboardingBanner.hidden = false;
      resizeIframe();
    });
  }

  function collectSettings() {
    return core.sanitizeSettings({
      hideHealthyChecks: elements.hideHealthyChecks.checked,
      lowStockThreshold: elements.lowStockThreshold.value,
      ownerNotes: elements.ownerNotes.value,
      previewMode: elements.previewMode.checked,
    });
  }

  function persistSettings(message) {
    state.settings = core.saveSettings(window.localStorage, state.storeId, collectSettings());
    hydrateControls();
    renderSettingsStatus(message);
  }

  function togglePreviewMode() {
    var nextValue = !elements.previewMode.checked;
    setPreviewMode(nextValue, nextValue ? 'Owner preview mode enabled.' : 'Owner preview mode turned off.');
  }

  function setPreviewMode(enabled, message) {
    elements.previewMode.checked = Boolean(enabled);
    persistSettings(message);
    refreshDashboard();
  }

  function hydrateControls() {
    elements.hideHealthyChecks.checked = Boolean(state.settings.hideHealthyChecks);
    elements.lowStockThreshold.value = String(state.settings.lowStockThreshold);
    elements.ownerNotes.value = state.settings.ownerNotes;
    elements.previewMode.checked = Boolean(state.settings.previewMode);
    renderPreviewControls();
  }

  async function refreshDashboard() {
    state.settings = collectSettings();
    var auditMode = core.resolveAuditMode({
      previewMode: state.settings.previewMode,
      runtimeMode: state.mode,
    });

    renderSettingsStatus('Refreshing audit…');
    elements.lastRefresh.textContent = 'Refreshing audit';

    try {
      var result = auditMode === 'preview'
        ? buildPreviewAudit()
        : auditMode === 'live'
          ? await buildLiveAudit()
          : buildStandaloneAudit();

      renderDashboard(result.dashboard, result.sources);
      renderSettingsStatus(state.settings.lastSavedAt ? 'Local settings loaded.' : 'Settings stay in this browser only.');
    } catch (error) {
      var fallback = buildPreviewAudit();
      renderDashboard(fallback.dashboard, [{ label: 'Live Ecwid data', status: 'warn', message: error.message }]);
      setConnection('Live audit unavailable, showing preview', 'warn');
      renderSettingsStatus('Preview loaded after a live data error.');
    }

    resizeIframe();
  }

  function buildPreviewAudit() {
    var preview = core.createPreviewData();

    setConnection(state.mode === 'standalone' ? 'Standalone preview mode' : 'Preview mode enabled', 'info');

    return {
      dashboard: core.buildDashboard({
        categories: preview.categories,
        coupons: preview.coupons,
        payload: state.payload,
        products: preview.products,
        profile: preview.profile,
        settings: state.settings,
        storeId: state.storeId,
      }),
      sources: [
        { label: 'Preview dataset', status: 'info', message: 'Using local sample data for owner demos and development.' },
        { label: 'Browser storage', status: 'good', message: 'Settings are stored locally for this store ID.' },
      ],
    };
  }

  function buildStandaloneAudit() {
    setConnection('No live Ecwid connection', 'warn');

    return {
      dashboard: core.buildDashboard({
        categories: { items: [], total: 0 },
        coupons: { items: [], total: 0 },
        payload: state.payload,
        products: { items: [], total: 0 },
        profile: {},
        settings: state.settings,
        storeId: state.storeId,
      }),
      sources: [
        { label: 'Standalone mode', status: 'warn', message: 'Live Ecwid data is unavailable outside the Ecwid admin iframe.' },
        { label: 'Preview mode', status: 'info', message: 'Turn preview mode on to inspect the UI with fake merchant data.' },
      ],
    };
  }

  async function buildLiveAudit() {
    var requests = core.getEcwidLiveRequests();
    var settled = await Promise.allSettled(requests.map(function (request) {
      return fetchEcwid(request.endpoint);
    }));
    var resolved = core.resolveEcwidLiveAudit({ requests: requests, settledResults: settled });

    setConnection('Connected to Ecwid admin', 'good');

    return {
      dashboard: core.buildDashboard({
        categories: resolved.payload.categories,
        coupons: resolved.payload.coupons,
        payload: state.payload,
        products: resolved.payload.products,
        profile: resolved.payload.profile,
        settings: state.settings,
        storeId: state.storeId,
      }),
      sources: resolved.sources,
    };
  }

  async function fetchEcwid(endpoint) {
    var request = core.createEcwidApiRequest({
      storeId: state.storeId,
      endpoint: endpoint,
      accessToken: state.payload?.access_token,
    });

    var response = await fetch(request.url, request.options);

    if (!response.ok) {
      throw new Error(endpoint + ' returned ' + response.status);
    }

    return response.json();
  }

  function renderDashboard(dashboard, sources) {
    var previewUi = core.getPreviewUiState({
      previewMode: state.settings.previewMode,
      runtimeMode: state.mode,
    });
    var auditMode = core.resolveAuditMode({
      previewMode: state.settings.previewMode,
      runtimeMode: state.mode,
    });

    renderDataSourceBanner();
    renderMetrics(dashboard.metrics, auditMode);
    renderSignalList(elements.priorities, dashboard.priorities, dashboard.settings.hideHealthyChecks ? 'No warnings to show.' : 'No high-priority actions right now.');
    renderSignalList(
      elements.checks,
      dashboard.checks.filter(function (check) {
        return !(dashboard.settings.hideHealthyChecks && check.status === 'good');
      }),
      'No checks matched your current filters.'
    );
    renderSignalList(elements.opportunities, dashboard.opportunities, 'No positive signals available yet.');
    renderSourceStatuses(sources || []);
    renderMerchantProfile(dashboard.merchant);

    elements.merchantName.textContent = dashboard.merchant.name;
    elements.merchantMeta.textContent = dashboard.merchant.currency + ' · ' + dashboard.merchant.country + ' · Store ID ' + dashboard.merchant.storeId;
    elements.scoreValue.textContent = String(dashboard.score);
    elements.scoreBand.textContent = dashboard.band;
    elements.scoreSummary.textContent = dashboard.summary;
    elements.sourcePill.textContent = previewUi.sourceLabel;
    elements.lastRefresh.textContent = 'Updated ' + new Date().toLocaleTimeString();
    renderPreviewControls();
  }

  function renderPreviewControls() {
    var previewUi = core.getPreviewUiState({
      previewMode: state.settings.previewMode,
      runtimeMode: state.mode,
    });

    elements.previewToggle.textContent = previewUi.buttonLabel;
    elements.previewToggle.setAttribute('aria-pressed', previewUi.active ? 'true' : 'false');
    elements.previewStatus.textContent = previewUi.statusText;
    elements.previewSummary.textContent = previewUi.summaryText;
  }

  function renderMetrics(metrics, auditMode) {
    var isSample = auditMode === 'preview';
    elements.metrics.innerHTML = metrics.map(function (metric) {
      return '' +
        '<article class="metric-card metric-card--' + escapeHtml(metric.tone) + '">' +
          '<span class="metric-card__label">' + escapeHtml(metric.label) + '</span>' +
          '<strong class="metric-card__value">' + escapeHtml(metric.value) + '</strong>' +
          '<div class="metric-card__detail">' + escapeHtml(metric.detail) + '</div>' +
          (isSample ? '<span class="metric-card__sample-tag">Sample</span>' : '') +
        '</article>';
    }).join('');
  }

  function renderSignalList(container, items, emptyMessage) {
    if (!items.length) {
      container.innerHTML = '<li class="signal-list__empty">' + escapeHtml(emptyMessage) + '</li>';
      return;
    }

    container.innerHTML = items.map(function (item) {
      return '' +
        '<li>' +
          '<div class="signal-list__title-row">' +
            '<div>' +
              '<strong class="signal-list__title">' + escapeHtml(item.title || item.label) + '</strong>' +
              '<div class="signal-list__meta">' + escapeHtml(item.message || item.detail || '') + '</div>' +
            '</div>' +
            '<span class="pill pill--' + escapeHtml(item.status || item.tone || 'info') + '">' + escapeHtml(item.status || item.tone || 'info') + '</span>' +
          '</div>' +
        '</li>';
    }).join('');
  }

  function renderSourceStatuses(sources) {
    renderSignalList(elements.dataStatuses, sources, 'No source health data available.');
  }

  function renderMerchantProfile(merchant) {
    elements.merchantProfile.innerHTML = [
      createProfileItem('Store', merchant.name),
      createProfileItem('Email', merchant.email),
      createProfileItem('Phone', merchant.phone),
      createProfileItem('Country', merchant.country),
      createProfileItem('Currency', merchant.currency),
      createProfileItem('Language', merchant.language),
    ].join('');
  }

  function createProfileItem(label, value) {
    return '<div><dt>' + escapeHtml(label) + '</dt><dd>' + escapeHtml(value) + '</dd></div>';
  }

  function renderSettingsStatus(message) {
    elements.settingsStatus.textContent = message;
  }

  function setConnection(message, tone) {
    elements.connectionStatus.className = 'pill pill--' + tone;
    elements.connectionStatus.textContent = message;
  }

  function renderOnboarding() {
    var dismissed = core.isOnboardingDismissed(window.localStorage);
    elements.onboardingBanner.hidden = dismissed;

    var steps = core.getOnboardingSteps();
    elements.onboardingSteps.innerHTML = steps.map(function (step) {
      return '' +
        '<li class="onboarding-step">' +
          '<span class="onboarding-step__number">' + escapeHtml(step.number) + '</span>' +
          '<div class="onboarding-step__body">' +
            '<strong>' + escapeHtml(step.title) + '</strong>' +
            '<span>' + escapeHtml(step.detail) + '</span>' +
          '</div>' +
        '</li>';
    }).join('');
  }

  function renderDataSourceBanner() {
    var banner = core.getDataSourceBanner({
      previewMode: state.settings.previewMode,
      runtimeMode: state.mode,
    });

    var iconMap = { live: '\u25CF', preview: '\u25CB', standalone: '\u25B2' };

    elements.dataSourceBanner.className = 'data-source-banner data-source-banner--' + banner.tone;
    elements.dataSourceIcon.textContent = iconMap[banner.icon] || '\u25CF';
    elements.dataSourceHeadline.textContent = banner.headline;
    elements.dataSourceDetail.textContent = banner.detail;
  }

  function resizeIframe() {
    if (!window.EcwidApp || typeof window.EcwidApp.setSize !== 'function') {
      return;
    }

    setTimeout(function () {
      window.EcwidApp.setSize({ height: document.body.scrollHeight + 24 });
    }, 100);
  }

  function escapeHtml(value) {
    var node = document.createElement('div');
    node.appendChild(document.createTextNode(String(value || '')));
    return node.innerHTML;
  }
})();