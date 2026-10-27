# Curriculum and delivery manifest

## Current status

**Stage 1 — curriculum definition:** complete for the current specification.

- 10 independent projects
- 100 project-specific business modules
- 100 project-specific cross-cutting engineering tasks
- 3,460 mandatory micro-steps (346 per project)
- 1,740 code-bearing steps and 1,700 command-bearing steps
- 10 phases per project: requirements, environment/Git, architecture, authentication, authorization, modules, UX, QA, production, release
- Requirement-to-task coverage matrix and per-project advanced-feature traceability
- Included scopes, exclusions with reasons, future enhancements, security reviews, deployment/release tasks

**Stage 2 — learning platform:** complete for the current specification.

- Eight real static pages: dashboard, projects, project detail, roadmap, task, progress, settings, 404
- Responsive Bootstrap 5 and vanilla JavaScript interface with dark mode, search, filters, task finder, project selector, copy buttons and accessible dialogs/toasts
- Dependency-aware Continue Learning and next-task recommendation
- Explicit task lifecycle: start, complete with acceptance confirmation, mark incomplete, block, unblock, notes, bookmarks
- Versioned LocalStorage, immediate saves, last-saved indicator, validated import preview, merge/replace, previous-copy recovery and explicit resets
- Corrupt-data protection and cross-tab conflict protection
- Manual project metadata, test evidence, deployment status, Git checkpoints and learner-approved project completion gate
- Separate implementation, testing, security, documentation, GitHub and deployment readiness signals

**Stage 3 — roadmap population:** complete for the generated curriculum.

Every displayed task has a stable ID, project, phase, module, objective, rationale, prerequisites, action, files, commands where applicable, code where applicable, expected result, verification, positive/negative cases, security note, error guidance, acceptance criteria, Git checkpoint, effort and related tasks. Empty decorative task cards are not used.

**Stage 4 — QA:** tracker smoke suite passes. See validation section.

**Stage 5 — delivery:** static bundle, README and this manifest. No Laravel project is deployed.

## File inventory

- `index.html`, `projects.html`, `project.html`, `roadmap.html`, `task.html`, `progress.html`, `settings.html`, `handbook.html`, `404.html`
- `assets/css/app.css`
- `assets/js/data/projects-01-05.js` and `projects-06-10.js` — project-specific module, schema, route, permission, test and security specifications
- `assets/js/data/advanced.js` — 100 project-specific advanced requirements
- `assets/js/curriculum.js` — phases, recipes, micro-step generation, dependencies and coverage
- `assets/js/store.js` — versioned LocalStorage, completion gates, import/merge/recovery
- `assets/js/ui.js` — shell, components, dialogs, toasts, copy and storage warnings
- `assets/js/pages.js` — dashboard, project, roadmap, task, progress and settings renderers
- `assets/js/app.js` — boot, events, project record, export/import and task actions
- `assets/js/handbook.js` — in-app engineering handbook
- `assets/js/export.js` — full project-plan and task Markdown exports
- `vendor/` — local Bootstrap and Bootstrap Icons
- `README.md` — setup, workflow, Laravel 12 references, limitations
- `MANIFEST.md` — this file
- `../../tests/tracker-smoke.cjs` — DOM/state test suite

## Validation evidence

Run from the repository root:

```bash
node tests/tracker-smoke.cjs
```

Recorded passing checks:

- 8 pages render without fatal/“undefined” output
- 10 projects, 3,460 unique tasks, 346 per project, 10 modules and 10 advanced tasks per project
- All task dependencies resolve
- Sidebar/shell, metrics, coverage, roadmap grouping, task detail and acceptance render
- Start/completion persistence; completion denied without all acceptance criteria
- Prerequisite task denied while the prior task is incomplete
- Notes, bookmarks, blockers and unblocking persist
- Git hash validation and manual checkpoint recording
- Unsafe repository URL rejected; project completion gate remains open while tasks are incomplete
- Backup export excludes credentials, unsupported schemas rejected, unknown-only backup rejected, merge restores completion/project metadata
- Corrupted JSON blocks writes and is not overwritten; cross-project progress preserved
- No non-English curriculum content

The tests are for the static tracker, not for any Laravel application. No learner test result, Git push or deployment is claimed.

## Known gaps and next actions

1. **Reference code is scaffold-level.** Continue with a dedicated pass per project that replaces generic controller/view snippets with the project’s full route-specific files and tests. Start with Project 01’s module routes (`organizations` through `reports_audit`) and its advanced features.
2. **Some deep work packages exceed the usual micro-step size.** Split the 39 tasks estimated at 46–60 minutes and the 599 at 31–45 minutes further where the learner needs more frequent checkpoints, beginning with concurrency/isolation/security matrices.
3. **Foundation recipes are shared across projects.** They are parameterized by project context but identical Laravel authentication/authorization sequences. Add a per-project authentication note for product-specific account rules and omitted auth features with reasons.
4. **Harden reference snippets.** Add full Update Form Requests, factory FK setup examples, inverse-relation code and complete route imports per module. Verify Laravel 12/Fortify/Socialite package versions before publication.
5. **Provider integrations remain boundaries.** No real Google, Facebook, payment, email or social-publishing credentials are present. Add integration tests with documented fake providers, not fabricated passing results.
6. **Accessibility manual audit incomplete.** Code includes labels, focus styles, semantic landmarks and dialogs, but no real screen-reader/browser audit has been recorded. Add one before calling the UI accessible in all environments.
7. **No runnable Laravel repositories.** The ten apps are curricula, not delivered implementations. Each project must still be built step by step and deployed by the learner.

## Migration strategy

- Keep project IDs (`p01`…`p10`) and task IDs stable. Module recipes use stable `project-module-step` IDs; advanced tasks use `project-advanced-key`. If a module is renamed, update the display name but do not silently renumber IDs.
- New tracker fields must be additive with safe defaults in `sanitizeState`/`sanitizeMeta`. Unknown stored fields may be discarded only during an explicitly confirmed import; current local data is never overwritten after a read failure.
- A future schema change must increment `VERSION` and implement explicit `v1 → v2` conversion while preserving valid task records and activity. Unsupported versions must be rejected safely.
- Importing a backup must never invent completion, test evidence or Git state.

## Design and delivery notes

- Premium dark navigation rail, warm canvas, hero dashboards, project art cards, traceable module-contract explorer, task phase stepper and readiness signals.
- Nine real HTML pages share a single bundled CSS/JS shell with no frontend framework.
- Accessible labels, skip link, focus-visible styles, dialog focus trap/restore and reduced-motion support. Manual screen-reader testing is still outstanding.

## Next exact action

Begin the code-completeness pass for **Project 01, Module 1 (organizations)**: replace generic reference snippets with the full route-specific controller actions, Update Form Request, Blade create/edit views, factory foreign-key setup and feature/IDOR tests. Record the real test command and output in the project report, then proceed module by module before starting Project 02.
