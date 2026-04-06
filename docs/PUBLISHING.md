# Publishing Guide

This document prepares the Ecwid app for marketplace-style publishing and partner review.

## Current publishing status

Ready now:

- static HTTPS-friendly app build
- GitHub Actions CI
- GitHub Pages deployment workflow
- admin-only product positioning
- owner preview mode for demos
- build, lint, and tests

Still needed before submission:

- final marketplace icon
- banner or hero graphic
- screenshots
- production support URL
- production privacy policy URL
- final app listing copy

## Core app metadata to finalize

Prepare these values before submission:

The canonical draft values for this repo now live in `config/publishing-profile.json` so listing copy, legal URLs, and marketplace asset references stay in one place.

- app name: Live Checkout Friction Monitor
- short summary: merchant-facing checkout readiness audit for Ecwid
- full description: what the app audits, what it does not collect, and why it is privacy-first
- support email
- support URL
- privacy policy URL
- terms URL if you publish one
- public app page URL

## Ecwid-side publishing checklist

- app page URL is public and served over HTTPS
- app opens correctly inside the Ecwid admin iframe
- required read scopes are requested and justified
- missing-scope behavior is graceful
- no secrets are embedded in client code
- app description matches actual behavior
- support contact is valid
- privacy policy matches actual data handling

## Recommended scope set

Request only the scopes that match the current runtime behavior:

- `read_store_profile` for the store profile audit
- `read_catalog` for products and categories
- `read_discount_coupons` for coupon visibility

Do not request these unless the product actually grows into them later:

- `update_catalog`
- `create_catalog`
- `read_orders`
- `update_orders`
- `public_storefront`

Submission-safe explanation:

"The app is an admin-only static dashboard that reads store profile, catalog, category, and coupon configuration data inside the Ecwid admin iframe. It does not modify catalog data, place orders, manage orders, or run on the storefront, so it requests only the minimum read scopes needed for its audit."

## Credentials handling

Use Ecwid app credentials only in the Ecwid developer portal where required for app registration.

- `client id`: app registration identifier
- `client secret`: keep private and do not place in frontend code or normal CI
- public or secret tokens: not required by this repo's static build or GitHub Actions workflows

If any private credential has been pasted into chat, logs, or screenshots, rotate it before submitting the app for review.

## Review positioning for this app

Describe the app as:

- admin-only
- merchant-facing
- static-hosted
- no custom backend required
- no shopper PII capture
- browser-local notes and thresholds only

Avoid claiming:

- live customer session capture
- remote event retention
- webhook automation
- cross-device syncing

## Release checklist

1. Run `npm run check`.
2. Run `npm run build`.
3. Confirm the deployed app page is reachable via HTTPS.
4. Test inside Ecwid admin with real scopes.
5. Capture screenshots from realistic merchant scenarios.
6. Confirm listing copy and privacy policy are accurate.
7. Publish or submit through the Ecwid partner flow.

## Support readiness

Ecwid documentation emphasizes having human support paths available during app development and review. Before publishing, make sure you have:

- a support inbox or form
- a public support URL
- a basic escalation workflow for merchants

Reference starting points from Ecwid docs:

- contact API support
- learn app settings
- FAQ about public applications