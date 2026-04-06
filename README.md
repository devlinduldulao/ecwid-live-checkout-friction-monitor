# Live Checkout Friction Monitor for Ecwid

Static Ecwid admin app for merchants who want a checkout-friction dashboard without paying for a custom database, Redis, or an always-on Node.js server.

## What this build is

This Ecwid version is intentionally merchant-facing only. It runs inside the Ecwid admin dashboard, reads store data directly from Ecwid using the iframe payload token, and stores lightweight preferences in the current browser.

It does not inject visitor-side storefront code, capture shopper sessions, or depend on your own backend.

## What it ships

- Admin dashboard for Ecwid business owners.
- Checkout-readiness audit based on store profile, catalog, categories, and coupons.
- Merchant scorecard with action priorities and strengths.
- Owner preview mode with a dedicated toggle button for demos and local development.
- Browser-local notes and thresholds stored per Ecwid store ID.
- Static deployment model that works on cheap or free hosting.
- Unit tests for audit logic and smoke tests for static assets.

## Cost model

- No custom database.
- No Redis.
- No webhook endpoint.
- No always-on Node.js server.
- No background jobs.

The only runtime requirement is static hosting for the files in `public/`.

## Important limits

Because this version stays static and admin-only, it cannot do the parts of live checkout monitoring that require shopper-side collection or server-side ingestion.

- No live customer event stream.
- No cross-device sync for notes or settings.
- No webhook-driven order or checkout automation.
- No historical event retention outside the current browser.

For a true live-feed product in Ecwid, you would need a visitor-side script plus some kind of server or storage layer. This repo deliberately avoids that cost.

## Project structure

```text
live-checkout-friction-monitor/
    public/
        index.html
        app.css
        app.js
        dashboard-core.js
    docs/
        API.md
        ARCHITECTURE.md
        DEPLOYMENT.md
        DEVELOPMENT.md
    scripts/
        setup.sh
        smoke-test.js
    tests/
        dashboard-core.test.js
    AGENTS.md
    package.json
```

## Quick start

1. Install the small local toolchain.

```bash
npm install
```

2. Run the checks.

```bash
npm run check
```

3. Build the static deployable output.

```bash
npm run build
```

4. Run the app locally.

```bash
npm run dev
```

Or serve the built output:

```bash
npm run start
```

5. Serve the `public/` directory with any static host for preview.

Examples:

```bash
python3 -m http.server 4173 --directory public
```

Or use VS Code Live Server pointed at `public/index.html`.

6. Open the app inside Ecwid admin after you register the static page URL in the Ecwid app settings.

## Merchant workflow

1. Open the app from the Ecwid dashboard.
2. Let it pull the store profile, products, categories, and coupons directly from Ecwid.
3. Review the checkout-readiness score and action list.
4. Toggle Owner Preview Mode when you want to simulate the dashboard with fake data.
5. Save local notes or change the low-stock threshold.

## Available scripts

- `npm run build` copies the static app into `build/`.
- `npm run dev` serves `public/` locally on port `4173` by default.
- `npm run start` serves `build/` locally on port `4173` by default.
- `npm run lint` checks JavaScript syntax for the dashboard and tests.
- `npm test` runs unit tests and static smoke tests.
- `npm run check` runs both.

## Deployment summary

Deploy only the `public/` directory to a static host, then register that URL as your Ecwid app page. The app reads Ecwid data directly from the iframe context, so there is no server bootstrap or environment file to maintain.

For the current app behavior, the minimal Ecwid scope set is:

- `read_store_profile`
- `read_catalog`
- `read_discount_coupons`

The current repo does not need Ecwid secrets in GitHub Actions or the static build pipeline.

## Publishing assets

This repo now includes marketplace assets in `assets/marketplace/`, including editable SVG sources plus generated PNG files for icon, banner, and screenshots.

Marketplace screenshots should be regenerated from the running app whenever the UI changes so the submission visuals stay aligned with the real product.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md), [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md), and [docs/API.md](docs/API.md) for the current repo model.
See [docs/PUBLISHING.md](docs/PUBLISHING.md) and [docs/LISTING-ASSETS.md](docs/LISTING-ASSETS.md) for submission prep.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a deep dive into the architecture.

## Development

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the full development guide.

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for deployment instructions.

---

## Ecwid Resources

### Getting Started

| Resource | Link |
|----------|------|
| Ecwid Developer Portal (register apps) | https://developers.ecwid.com/ |
| App Development Guide | https://api-docs.ecwid.com/docs/get-started |
| Ecwid App Market (see published apps) | https://www.ecwid.com/apps |
| Sign Up for Free Ecwid Account | https://www.ecwid.com/ |
| Ecwid Control Panel (store admin) | https://my.ecwid.com/ |

### REST API v3

| Resource | Link |
|----------|------|
| API Overview & Reference | https://api-docs.ecwid.com/reference/overview |
| Products API | https://api-docs.ecwid.com/reference/products |
| Orders API | https://api-docs.ecwid.com/reference/orders |
| Customers API | https://api-docs.ecwid.com/reference/customers |
| Categories API | https://api-docs.ecwid.com/reference/categories |
| Discount Coupons API | https://api-docs.ecwid.com/reference/discount-coupons |
| Store Profile API | https://api-docs.ecwid.com/reference/store-profile |
| Product Variations API | https://api-docs.ecwid.com/reference/product-variations |
| Abandoned Carts API | https://api-docs.ecwid.com/reference/abandoned-carts |
| Shipping Options API | https://api-docs.ecwid.com/reference/shipping-options |
| Tax Settings API | https://api-docs.ecwid.com/reference/taxes |
| Application Storage API | https://api-docs.ecwid.com/reference/storage |
| Starter Site API | https://api-docs.ecwid.com/reference/starter-site |

### Authentication & Security

| Resource | Link |
|----------|------|
| OAuth 2.0 Authentication | https://api-docs.ecwid.com/docs/authentication |
| Access Scopes Reference | https://api-docs.ecwid.com/docs/access-scopes |
| API Tokens & Keys | https://api-docs.ecwid.com/docs/api-tokens |

### Storefront Customisation

| Resource | Link |
|----------|------|
| JavaScript Storefront API | https://api-docs.ecwid.com/docs/customize-storefront |
| Storefront JS API Reference | https://api-docs.ecwid.com/docs/storefront-js-api-reference |
| Custom CSS for Storefront | https://api-docs.ecwid.com/docs/customize-appearance |
| Page Events (OnPageLoaded, etc.) | https://api-docs.ecwid.com/docs/page-events |
| Cart Methods (add, remove, get) | https://api-docs.ecwid.com/docs/cart-methods |
| Public App Config (storefront injection) | https://api-docs.ecwid.com/docs/public-app-config |
| SEO for Ecwid Stores | https://api-docs.ecwid.com/docs/seo |

### App Development

| Resource | Link |
|----------|------|
| Native Apps (admin iframe) | https://api-docs.ecwid.com/docs/native-apps |
| Ecwid App UI CSS Framework | https://api-docs.ecwid.com/docs/ecwid-css-framework |
| EcwidApp JS SDK Reference | https://api-docs.ecwid.com/docs/ecwidapp-js-sdk |
| App Storage (key-value per store) | https://api-docs.ecwid.com/docs/app-storage |
| Webhooks | https://api-docs.ecwid.com/docs/webhooks |
| Webhook Events Reference | https://api-docs.ecwid.com/docs/webhook-events |
| Custom Shipping Methods | https://api-docs.ecwid.com/docs/add-shipping-method |
| Custom Payment Methods | https://api-docs.ecwid.com/docs/add-payment-method |
| Custom Discount Logic | https://api-docs.ecwid.com/docs/add-custom-discount |
| App Listing Requirements | https://api-docs.ecwid.com/docs/app-listing-requirements |

### Embedding & Widgets

| Resource | Link |
|----------|------|
| Add Ecwid to Any Website | https://api-docs.ecwid.com/docs/add-ecwid-to-a-site |
| Product Browser Widget Config | https://api-docs.ecwid.com/docs/product-browser |
| Buy Now Buttons | https://api-docs.ecwid.com/docs/buy-now-buttons |
| Single Sign-On (SSO) | https://api-docs.ecwid.com/docs/single-sign-on |

### Guides & Tutorials

| Resource | Link |
|----------|------|
| API Rate Limits | https://api-docs.ecwid.com/docs/rate-limits |
| Error Codes Reference | https://api-docs.ecwid.com/docs/errors |
| Testing Your App | https://api-docs.ecwid.com/docs/testing |
| Publishing to App Market | https://api-docs.ecwid.com/docs/publishing |
| Ecwid Community Forum | https://community.ecwid.com/ |
| Ecwid Help Center | https://support.ecwid.com/ |
| Ecwid Status Page | https://status.ecwid.com/ |
| Ecwid Blog | https://www.ecwid.com/blog |

---

## License

MIT
