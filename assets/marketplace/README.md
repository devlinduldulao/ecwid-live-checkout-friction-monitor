# Marketplace Assets

This folder contains the canonical marketplace and publishing assets for the app.

## Included files

- `icon.svg` for the app icon master
- `banner.svg` for the hero or listing banner master
- `screenshot-dashboard.svg` as the editable artwork source for the dashboard promo image
- `screenshot-preview.svg` as the editable artwork source for the preview promo image
- `screenshot-settings.svg` as the editable artwork source for the settings promo image

Generated publish-ready files currently included:

- `icon.png`
- `banner.png`
- `screenshot-dashboard.png`
- `screenshot-preview.png`
- `screenshot-settings.png`

## Export guidance

Export PNG or WebP variants from the SVG masters based on the exact marketplace size requirements you choose.

Suggested exports:

- icon: square PNG at the sizes required by your destination
- banner: wide PNG for marketplace or landing-page headers
- screenshots: PNG files captured or exported at crisp desktop widths

On macOS, regenerate the icon and banner PNG exports with:

```bash
npm run assets:export
```

Recapture real UI screenshots from the running app with:

```bash
npm run assets:capture
```

## Notes

- The screenshot PNGs should reflect the current running UI, not stale mockups.
- Replace any placeholder copy if your listing language changes.
- Keep the app admin-only in all visuals. Do not show storefront or visitor-facing screens.