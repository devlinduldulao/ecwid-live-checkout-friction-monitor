# Live Checkout Friction Monitor for Ecwid — AI Agent Instructions

> Conventions and patterns for AI coding agents working on this project.
> This file is read automatically by GitHub Copilot, Cursor, Cline, and similar AI assistants.

---

## Project Overview

| Key | Value                                                        |
|-----|--------------------------------------------------------------|
| Plugin Name | live-checkout-friction-monitor                               |
| Platform | Ecwid by Lightspeed (SaaS e-commerce widget)                 |
| Architecture | Static admin iframe + direct Ecwid REST reads + browser localStorage |
| Store API | Ecwid REST API v3                                            |
| Storefront API | Not used by this project runtime                              |
| Auth | EcwidApp payload token inside the admin iframe                 |
| Runtime | Static hosting only                                           |

---

## Documentation

Refer to the complete documentation in the `docs/` folder:

- [API.md](docs/API.md) — Internal API endpoints, authentication, and webhook events
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — Platform model, three development surfaces, and security architecture
- [DEVELOPMENT.md](docs/DEVELOPMENT.md) — Environment setup, development workflows, and REST API reference
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) — Deployment options and production checklist

---

## Critical Rules

### 1. This Repo Is Admin-Only

- **No server-side rendering** — Ecwid renders its own storefront via a JS widget
- **No database access** — All data via REST API only
- **No runtime backend in this repo** — do not add Express, Redis, queues, or webhook handlers unless the user explicitly asks for a paid infrastructure path
- **No visitor-facing storefront code in this app** — this project is for merchants using the Ecwid dashboard, not online shoppers
- **No WordPress/Shopify/Magento patterns** — this is NOT WooCommerce, NOT Shopify, NOT Magento

### 2. One Primary Runtime Surface

| Surface | How to Customize |
|---------|-----------------|
| Admin Dashboard | Static HTML/JS iframe with EcwidApp SDK |
| Browser Storage | localStorage keyed by store ID |
| Ecwid REST Reads | direct browser fetch calls using the iframe payload access token |

### 3. Security Rules

- Never hardcode access tokens or secrets
- Use the token provided by `EcwidApp.getPayload()` only for direct Ecwid REST reads inside the iframe
- Persist only lightweight owner settings in browser localStorage
- Do not collect or store shopper PII, card details, addresses, or live checkout form values

### 4. Design System & UI
- **Ecwid / Lightspeed Native Look:** Building an Ecwid native look and feel is the number one priority.
- Follow the [Lightspeed Design System (Logo and Brand)](https://brand.lightspeedhq.com/document/170#/brand-system/logo-1).
- Ensure high contrast (WCAG AA pass), proper logo scaling (minimum 80px width), and adhere to the monochrome charcoal / white logo palette or the standard Lightspeed flame.
- Maintain a full flame width clearspace around the logo and do not distort or alter the logo design.
- Utilize the design principles outlined in the brand system's internal links for fonts, spacing, and styling to create an integrated dashboard experience.

---

## File Map

| File | Purpose |
|------|---------|
| `public/index.html` | Merchant dashboard HTML (iframe page) |
| `public/app.css` | Merchant dashboard styling |
| `public/dashboard-core.js` | Pure audit logic and local settings helpers |
| `public/app.js` | Admin dashboard runtime and Ecwid API reads |
| `scripts/smoke-test.js` | Static asset smoke test |
| `tests/dashboard-core.test.js` | Unit tests for audit logic |

---

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Files | kebab-case | `ecwid-api.js` |
| Variables | camelCase | `storeId` |
| Env vars | SCREAMING_SNAKE_CASE | `ECWID_STORE_ID` |
| Storage keys | lowercase + colons | `live-checkout-friction-monitor:ecwid:12345` |
| CSS classes (custom) | BEM-style, prefixed | `.demo-plugin-badge` |
| JS API globals | PascalCase | `EcwidApp` |

---

## Common Mistakes to Avoid

```javascript
// ❌ No server routes, proxies, or webhook handlers in this repo runtime
app.use('/api/settings', settingsRoutes); // WRONG

// ❌ No remote persistence assumptions
await fetch('/api/settings'); // WRONG

// ❌ No shopper session tracking in this Ecwid build
collectCheckoutFieldValues(); // WRONG

// ✅ Correct: fetch Ecwid data directly from the admin iframe
await fetch('https://app.ecwid.com/api/v3/' + storeId + '/profile?token=' + token);

// ✅ Correct: store merchant preferences locally
localStorage.setItem(storageKey, JSON.stringify(settings));
```

---

## Testing Requirements

**Every feature or bug fix MUST include unit tests.** No pull request will be accepted without accompanying tests that cover the new or changed behavior.

- Write unit tests for all new features before marking them complete
- Write unit tests for every bug fix that reproduce the bug and verify the fix
- Aim for meaningful coverage — test business logic, edge cases, and error paths
- Use the project's established testing framework and conventions
- Tests must pass in CI before a PR can be merged

---

## PR/Review Checklist

- [ ] No backend runtime reintroduced accidentally
- [ ] Access token is read from the Ecwid iframe payload, never hardcoded
- [ ] Merchant settings are local-only and clearly labeled as browser-local
- [ ] No shopper-facing code or storefront instrumentation added unintentionally
- [ ] Admin dashboard tested both in standalone preview and inside the Ecwid admin iframe
- [ ] Unit tests included for all new features and bug fixes

## Quality Gates

- After any new feature, bug fix, or refactor, always lint, run build, and run test
- Do not consider the task complete until these checks pass, unless the user explicitly asks not to run them or the environment prevents it
- Every new feature must include automated tests that cover the new behavior, including both happy paths and unhappy paths where practical
- Bug fixes should include a regression test when practical
- Refactors must keep existing tests passing and should add tests if behavior changes or previously untested behavior becomes important