# Deployment Guide

This repo is deployed as static files only.

## What you deploy

Deploy the contents of `public/` to any static host.

Examples:

- GitHub Pages
- Netlify
- Cloudflare Pages
- Amazon S3 static website hosting
- any cheap shared hosting that can serve plain HTML, CSS, and JavaScript

## What you do not deploy

- No Node.js process
- No Docker container
- No Redis instance
- No database
- No webhook receiver
- No OAuth callback endpoint

## Recommended deployment flow

1. Run the checks locally.

```bash
npm run check
```

2. Upload or publish the `public/` directory.

3. Make sure the app is publicly reachable over HTTPS.

4. Register that page URL in Ecwid.

## Ecwid app registration

Point the Ecwid app page to your deployed `index.html`.

Typical setup:

| Setting | Value |
|---------|-------|
| App page URL | `https://your-static-host.example/index.html` |

This repo does not require an OAuth redirect URL or a webhook URL because it does not run a custom backend.

## Scopes to request

If you want the dashboard to read all of its current data sources, request the read scopes that match the endpoints the app uses.

Typical minimum set:

- `read_store_profile`
- `read_catalog`
- `read_discount_coupons`

If some scope is missing, the dashboard will still load but the related source card may show a warning instead of live data.

Scopes that are not needed by the current app build:

- `update_catalog`
- `create_catalog`
- `read_orders`
- `update_orders`
- `public_storefront`

Those broader scopes are unnecessary for this admin-only static audit and may create avoidable review questions.

## Credentials and CI

This repo does not need Ecwid app secrets to build, test, or deploy.

- Packaging uses only the checked-in static files.
- GitHub Actions CI only runs install, build, lint, test, and Pages deployment.
- The live app reads `store_id` and `access_token` from the Ecwid admin iframe payload at runtime.

Keep `client secret`, secret tokens, and other private credentials out of GitHub Actions unless you later add a backend or OAuth callback flow.

## Hosting note

If your static host lets you choose a publish directory, use `public/` directly so the app can live at a clean root URL.

## Marketplace assets status

This repo includes publish-ready marketplace assets in `assets/marketplace/`.

Current asset set:

- icon
- banner
- screenshots

Refresh screenshots from the running app whenever the UI changes so the listing stays aligned with the product.

## Security checklist

- Use HTTPS for the hosted app page.
- Do not hardcode Ecwid tokens anywhere in the repo.
- Do not add secret environment variables for this static build.
- Keep merchant notes limited to low-risk operational text because they stay in browser localStorage.
