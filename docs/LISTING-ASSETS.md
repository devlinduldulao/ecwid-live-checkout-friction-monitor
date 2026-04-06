# Listing Assets Checklist

This repo now keeps marketplace assets in `assets/marketplace/`.

Current canonical files in that folder include:

- editable SVG source files for icon and banner
- PNG exports for icon and banner
- PNG screenshots captured from the running app UI

## Assets to create

- app icon
- banner or hero image
- at least 3 screenshots of the admin dashboard

## Screenshot plan

Capture these states:

1. Merchant dashboard with live-data layout visible.
2. Owner Preview Mode enabled with fake-data simulation visible.
3. Local settings and merchant profile cards visible.

## Visual content guidance

- use the actual app typography and warm paper color system
- show merchant-facing labels clearly
- avoid storefront or shopper-facing screens because this app is admin-only
- crop cleanly and keep copy readable at small sizes

## Asset review checklist

- brand name matches the repo and listing copy
- screenshots show the current UI, not outdated boilerplate
- no fake URLs that look production-ready unless clearly marked as preview
- no sensitive merchant data in screenshots
- images are exported in web-friendly formats

## Repo status

Current state: the marketplace folder includes current source assets and captured screenshots from the running app, but you may still want destination-specific size variants for the final marketplace submission.

Current source files:

- `assets/marketplace/icon.svg`
- `assets/marketplace/banner.svg`
- `assets/marketplace/screenshot-dashboard.svg`
- `assets/marketplace/screenshot-preview.svg`
- `assets/marketplace/screenshot-settings.svg`

Current exported files:

- `assets/marketplace/icon.png`
- `assets/marketplace/banner.png`
- `assets/marketplace/screenshot-dashboard.png`
- `assets/marketplace/screenshot-preview.png`
- `assets/marketplace/screenshot-settings.png`