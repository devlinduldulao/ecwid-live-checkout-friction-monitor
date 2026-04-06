# Development Guide

This repo no longer has a custom backend. Development is focused on a static Ecwid admin page plus a small amount of test tooling.

## Local setup

1. Install the package metadata and toolchain.

```bash
npm install
```

2. Run the checks.

```bash
npm run check
```

3. Build the deployable output.

```bash
npm run build
```

4. Preview the source app locally.

```bash
npm run dev
```

5. Preview the built output locally.

```bash
npm run start
```

6. Preview the `public/` directory with any static file server.

Example:

```bash
python3 -m http.server 4173 --directory public
```

Then open `http://localhost:4173`.

## Standalone preview vs Ecwid iframe

The app supports two modes.

### Standalone preview

Open `public/index.html` outside Ecwid and the app will automatically fall back to preview mode.

Use this when:

- Working on layout or styling
- Testing the dashboard without an Ecwid app install
- Demonstrating the merchant experience with safe sample data

### Ecwid admin mode

Open the page inside the Ecwid admin iframe and the app will:

- Call `EcwidApp.getPayload()`
- Read `store_id` and `access_token`
- Fetch live Ecwid data directly from the browser
- Render the merchant audit from real store data

## Files that matter most

- `public/index.html` for dashboard structure
- `public/app.css` for visual design
- `public/app.js` for iframe bootstrapping and Ecwid reads
- `public/dashboard-core.js` for scoring logic and browser-local settings
- `tests/dashboard-core.test.js` for unit tests
- `scripts/smoke-test.js` for static asset verification

## Testing

### Unit tests

```bash
node --test tests/dashboard-core.test.js
```

These cover:

- local settings persistence
- score and priority generation
- preview-data behavior

### Smoke tests

```bash
node scripts/smoke-test.js
```

These verify:

- `index.html` loads
- runtime assets load
- stale backend URLs are not present in the app shell

### Full check

```bash
npm run check
```

## Adding features safely

### Add a new audit signal

1. Extend `public/dashboard-core.js`
2. Add or update unit tests in `tests/dashboard-core.test.js`
3. Wire the new data into `public/app.js` if it needs an additional Ecwid endpoint

### Add a new merchant control

1. Add the field in `public/index.html`
2. Style it in `public/app.css`
3. Persist it through `public/dashboard-core.js`
4. Update tests if the setting changes logic

## Debugging notes

- Open browser DevTools for standalone preview work.
- Open DevTools for the Ecwid iframe when testing in admin.
- If a live request fails, the app should fall back to preview mode instead of breaking the whole dashboard.
- If a new change adds a backend dependency, it is probably going in the wrong direction for this repo.
