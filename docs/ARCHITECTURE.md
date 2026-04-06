# Architecture

This repo is an Ecwid admin iframe app, not a server-backed platform integration. It exists to give merchants a checkout-friction audit they can open from their Ecwid dashboard without paying for infrastructure.

## System shape

```text
Ecwid Admin
    -> loads static app page
    -> EcwidApp SDK exposes store_id + access_token
    -> browser fetches Ecwid REST data directly
    -> audit engine scores friction risk
    -> dashboard stores preferences in localStorage
```

## Runtime surfaces

### Admin iframe

Files: `public/index.html`, `public/app.css`, `public/app.js`

This is the only runtime surface in the repo. The page is designed for store owners inside the Ecwid dashboard.

Responsibilities:

- Initialize `EcwidApp`.
- Read the merchant payload.
- Fetch store profile, products, categories, and coupons directly from Ecwid.
- Render merchant-facing recommendations.
- Resize itself correctly inside the iframe.

### Audit core

File: `public/dashboard-core.js`

This module keeps the scoring and storage logic separate from the DOM code.

Responsibilities:

- Normalize Ecwid collection responses.
- Summarize catalog health.
- Build checks, priorities, and positive signals.
- Save and load browser-local settings per store ID.
- Provide preview data for demos and local development.

### Tests

Files: `tests/dashboard-core.test.js`, `scripts/smoke-test.js`

- Unit tests cover the scoring and local settings logic.
- Smoke tests verify the static assets still load with no stale backend references.

## Data flow

### Live mode

```text
Ecwid admin iframe
    -> getPayload()
    -> access_token + store_id
    -> GET /profile on Ecwid
    -> GET /products on Ecwid
    -> GET /categories on Ecwid
    -> GET /discount_coupons on Ecwid
    -> build merchant audit
    -> render score, actions, and notes
```

### Preview mode

```text
Merchant enables preview mode
    -> browser loads sample dataset
    -> audit engine builds a demo scorecard
    -> dashboard shows realistic owner-facing actions
```

## Storage model

Only browser-local settings are persisted.

- Key format: `live-checkout-friction-monitor:ecwid:{storeId}`
- Values stored: preview mode, low-stock threshold, hide-healthy-checks flag, owner notes, last-saved timestamp
- No remote database writes
- No Redis
- No file storage

## Why this version is cheaper

The WooCommerce plugin can ingest events because it already lives inside WordPress and can write short-lived local files. Ecwid does not give you that same free hosting surface. To avoid extra cost in Ecwid, this repo chooses an audit model instead of live shopper telemetry.

That tradeoff gives you:

- No backend bills
- No webhook endpoint to maintain
- No database migration work
- Easier static deployment

## Known limits

This repo intentionally does not provide:

- Live checkout event capture from shoppers
- Cross-device settings sync
- Historical event retention
- Webhook automation
- Any visitor-facing storefront behavior

If you later want real live-feed friction monitoring in Ecwid, you will need to add a visitor-side data source and some persistent receiving layer.
