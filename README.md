# Laravel Engineering Mastery Tracker

A browser-only, English-only learning workspace for building ten independent Laravel 12 applications. The tracker itself is a static website in [`public/tracker`](public/tracker), built with HTML5, CSS3, Bootstrap 5, Bootstrap Icons, vanilla JavaScript and versioned LocalStorage.

## Open the tracker

- Directly: open `public/tracker/index.html` with its bundled `vendor` and `assets` directories.
- As a local static server: `cd public/tracker && python3 -m http.server 8080`, then open `http://localhost:8080/`.
- Through the included Next.js hosting shell: `npm install && npm run dev`. The root redirects to `/tracker/index.html`; the shell does not store progress.
- Downloadable static bundle: `public/tracker-download.zip` (also linked in the tracker footer).

## Current coverage

- 10 independent projects with 10 project-specific modules and 10 cross-cutting advanced tasks each
- 3,460 mandatory micro-steps, 1,740 with reference code and 1,700 with terminal commands
- Nine pages: dashboard, project library, project workspace with traceable module contracts, roadmap, task workspace, progress, settings, engineering handbook and 404
- Dependency-aware Continue Learning, task search, filters, notes, bookmarks, blockers, Git checkpoint records and project completion gates
- Validated JSON backup import with merge/replace preview, export, previous-copy recovery and corruption protection
- Markdown export of any full project implementation plan, any individual task, or all ten plans at once
- English-only UI and curriculum content

## Documentation and tests

- Setup, privacy, backup, Laravel references and honest limitations: [`public/tracker/README.md`](public/tracker/README.md)
- Delivery status, coverage, known gaps and next implementation action: [`public/tracker/MANIFEST.md`](public/tracker/MANIFEST.md)
- Tracker smoke tests: `node tests/tracker-smoke.cjs`
- Production validation: `npx next typegen`, `npm exec tsc -- --noEmit`, `npm run build`

## Scope truth

This is a substantial curriculum and working progress tracker, not ten finished Laravel repositories. Reference code is a task-specific scaffold; some advanced work packages exceed the usual micro-step duration. No learner test, Git push, provider integration or production deployment is fabricated or verified by the static site.
# laravel-ten-project
