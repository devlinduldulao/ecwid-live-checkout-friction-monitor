# API Reference

This repo does not expose its own HTTP API. The dashboard reads Ecwid data directly from the browser while running inside the Ecwid admin iframe.

## Ecwid endpoints used by the dashboard

The app calls these Ecwid REST endpoints with the `store_id` and `access_token` returned by `EcwidApp.getPayload()`.

### Store profile

```text
GET https://app.ecwid.com/api/v3/{storeId}/profile?token={accessToken}
```

Used for:

- store open or closed status
- merchant contact details
- country and currency context
- store name fallback values

### Products

```text
GET https://app.ecwid.com/api/v3/{storeId}/products?limit=100&token={accessToken}
```

Used for:

- enabled product count
- low-stock count
- missing-image count
- thin-description count

### Categories

```text
GET https://app.ecwid.com/api/v3/{storeId}/categories?limit=100&token={accessToken}
```

Used for:

- category count
- basic discovery-structure checks

### Discount coupons

```text
GET https://app.ecwid.com/api/v3/{storeId}/discount_coupons?limit=100&token={accessToken}
```

Used for:

- promotion availability checks

## Browser-local storage

The dashboard stores settings in localStorage instead of a database.

### Storage key

```text
live-checkout-friction-monitor:ecwid:{storeId}
```

### Stored fields

```json
{
  "previewMode": false,
  "hideHealthyChecks": false,
  "lowStockThreshold": 3,
  "ownerNotes": "Review image coverage on seasonal products.",
  "lastSavedAt": "2026-03-19T10:00:00.000Z"
}
```

## Failure behavior

- If live Ecwid calls fail, the dashboard falls back to preview mode.
- If one source fails but others succeed, the dashboard still renders and marks the failed source with a warning.
- If the page is opened outside Ecwid admin, the dashboard starts in standalone preview mode.

## What is intentionally absent

- No `/api/settings`
- No `/api/products`
- No `/health`
- No webhook endpoint
- No OAuth callback route
