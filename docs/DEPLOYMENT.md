# Deployment Guide

This repo is deployed as static files only.

## What you deploy

Deploy the built static output from `build/` to any static host.

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
2. Build the deployable output.

```bash
npm run build
```

3. Upload or publish the `build/` directory.

4. Make sure the app is publicly reachable over HTTPS.

5. Register that page URL in Ecwid.

## GitHub Pages via GitHub Actions

This repo includes a ready-to-use workflow at `.github/workflows/deploy-pages.yml` for free deployment on GitHub Pages.

What it does:

- runs on every push to `main`
- installs the Node.js toolchain on GitHub-hosted runners
- runs `npm run check`
- builds the static artifact with `npm run build`
- deploys the `build/` directory to GitHub Pages

One-time GitHub setup:

1. Push the workflow to the repository.
2. Open GitHub repository settings.
3. Go to `Settings` -> `Pages`.
4. Set `Source` to `GitHub Actions`.

For this repository, GitHub Pages will publish at:

```text
https://devlinduldulao.github.io/ecwid-live-checkout-friction-monitor/
```

Use that HTTPS URL as the Ecwid app page URL after the first successful deployment.

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

If your static host lets you choose a publish directory, use `build/` so the deployed artifact matches the tested output from the local build pipeline.

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
