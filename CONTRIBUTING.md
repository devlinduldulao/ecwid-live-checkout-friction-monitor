# Contributing

## Getting started

1. Clone the repo.
2. Run `npm install`.
3. Run `npm run check`.
4. Preview `public/index.html` with any static file server if you need UI work.

## Development workflow

1. Create a feature branch.
2. Make focused changes.
3. Add or update tests for any changed behavior.
4. Run `npm run check` before opening a PR.
5. Use conventional commit messages such as `feat: add merchant profile check` or `fix: clamp low stock threshold`.

## Repo rules

- Keep this project static unless the user explicitly asks for a backend tradeoff.
- Do not add database, Redis, webhook, or server runtime assumptions casually.
- Keep the app merchant-facing and admin-only.
- Store only low-risk owner preferences in browser localStorage.
- Do not introduce shopper PII capture or visitor-side tracking in this Ecwid build.

## Main extension points

- Update `public/dashboard-core.js` for new audit rules.
- Update `public/app.js` for new Ecwid data reads or dashboard behavior.
- Update `public/index.html` and `public/app.css` for interface changes.
- Update `tests/dashboard-core.test.js` and `scripts/smoke-test.js` when behavior changes.
