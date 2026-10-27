# Laravel Engineering Mastery — English-only learning workspace

A static, browser-based curriculum and progress tracker for building **ten independent Laravel 12 applications**. It is built with HTML5, CSS3, Bootstrap 5, Bootstrap Icons, vanilla JavaScript and LocalStorage. It has no learning-platform backend, no account, no React/Vue/Angular and no Tailwind dependency. Bootstrap assets are bundled locally under `vendor/`.

The tracker is not a set of ten runnable Laravel repositories. It is the detailed curriculum, task workspace, evidence record and release process between your first terminal command and each project’s final handover.

## Verified curriculum coverage

| Measure | Current value |
| --- | --- |
| Projects | 10 |
| Mandatory micro-steps | 3,460 |
| Micro-steps per project | 346 |
| Domain modules | 100 (10 per project) |
| Project-specific advanced tasks | 100 (10 per project) |
| Tasks with reference code | 1,740 |
| Tasks with exact terminal commands | 1,700 |
| Supported progress schema | `laravel_mastery_progress_v1`, version 1 |

The ten workstreams are:

1. Enterprise Business Management System
2. E-Commerce and Order Management System
3. Multi-Tenant SaaS Subscription Platform
4. Learning Management System
5. CRM / Sales Platform
6. Project Management and Team Collaboration
7. Appointment Booking and Service Marketplace
8. Customer Support and Helpdesk
9. Document Management and Approval Workflow
10. Social Media and Business Automation SaaS

Every project has its own requirements, users, exclusions, architecture notes, database entities, routes, permissions, security notes, test plan, Git checkpoints, deployment tasks and completion gate. No project is a module of another project, and no shared database or shared Laravel codebase is assumed.

## Pages and controls

The site uses nine real HTML entry points at the tracker root:

| File | Purpose |
| --- | --- |
| `index.html` | Dashboard: overall metrics, active project, next task, phase progress, project search/sort, task finder, blockers, bookmarks and activity |
| `projects.html` | Searchable/filterable ten-project library plus matching task results |
| `project.html` | Project overview, user roles, exclusions, architecture, modules, advanced features, coverage matrix, readiness signals, completion gate and Git record |
| `roadmap.html` | Phase navigation, task search, project/module/status filters and all project micro-steps grouped by module |
| `task.html` | The complete task workspace with all required task fields, prerequisites, code, verification, security, Git steps, notes, bookmark, start/complete/block actions and previous/next navigation |
| `progress.html` | Real progress calculations, per-project and per-phase completion, blocked tasks, bookmarks and activity history |
| `settings.html` | Storage status, preferences, validated backup import preview with merge/replace, export, previous-copy recovery and resets |
| `handbook.html` | Engineering handbook: setup, architecture, authentication, authorization, database, testing, security, Git recovery, deployment, integrations, troubleshooting and limitations |
| `404.html` | Safe not-found page |

All navigation uses real URLs and query parameters. There is no language switch and no Bengali or other instructional language in the platform.

## Running the tracker

### Option A — open the static site directly

Open `public/tracker/index.html` in a current browser. Everything except optional clipboard fallback works from the local filesystem. For reliable asset and copy behavior, serving over HTTP is preferable.

### Option B — serve the static folder

From the repository root:

```bash
cd public/tracker
python3 -m http.server 8080
```

Open `http://localhost:8080/`. Do not open the repository root as a static server; the tracker is under `public/tracker`.

### Option C — the Next.js hosting shell

This project includes a minimal Next.js shell that redirects `/` to `/tracker/index.html` and exposes `/api/health`. It does not store learning progress.

```bash
npm install
npm run dev
```

Production validation:

```bash
npx next typegen
npm exec tsc -- --noEmit
npm run build
```

## Learning workflow

1. Open the project from the library. The roadmap starts with planning, environment, architecture, authentication and authorization, then project modules and advanced features, then UX, QA, production and release.
2. Open the recommended task. Its status starts as **Not started**. Opening a page never completes a task.
3. Read the objective, prerequisites, exact action, files, commands and reference code. Work in the corresponding Laravel project, not in this tracker.
4. Verify the expected result, positive cases, negative/edge cases, security requirements and acceptance criteria.
5. Use **Start task** when you begin. Use **Mark complete** only after checking every acceptance item in the confirmation dialog. Completion timestamps and confirmed criteria are stored.
6. Record personal notes and bookmarks. Record blockers when you pause so you can resume the same task later.
7. Record a Git checkpoint manually after creating a real commit. The tracker cannot inspect Git or GitHub.
8. Resume with **Continue learning**. It opens the active incomplete task if one exists; otherwise it selects the earliest incomplete task whose prerequisites are complete and which is not blocked.

### Task data model

Each task shown by the platform contains:

- Stable task ID, project, phase, module, title and objective
- Why the task is necessary and its prerequisites
- Exact action, terminal commands, file paths and where code belongs
- Complete reference code for code-intensive steps (adapt namespaces/route shapes to the routes you registered)
- Explanation of important code and expected result
- Positive and negative/edge verification
- Security considerations and common errors with fixes
- Explicit acceptance criteria
- Recommended Git checkpoint
- Dependencies/unlocks, related tasks and estimated effort
- Learner actions and completion status

Some tasks intentionally have no application code: planning documents, manual verification, security reviews, release decisions and Git records. The task page explains this rather than showing a fake code block.

## Laravel 12 and required stack

The curriculum pins **Laravel 12** and PHP **8.2+**. A new Laravel 12 application uses SQLite by default; the curriculum explicitly reconfigures MySQL. Make sure all required PHP extensions are installed before creating the application.

Official references:

- Installation: <https://laravel.com/docs/12.x/installation>
- Fortify: <https://laravel.com/docs/12.x/fortify>
- Queues: <https://laravel.com/docs/12.x/queues>
- Scheduling: <https://laravel.com/docs/12.x/scheduling>
- Deployment: <https://laravel.com/docs/12.x/deployment>
- Socialite: <https://laravel.com/docs/12.x/socialite>

Authentication tasks use **Laravel Fortify** as a headless backend and require you to build Blade views. Social login tasks use **Laravel Socialite** after verifying the installed version supports Laravel 12. Google and Facebook applications require real provider setup and exact redirect URIs. A successful Google/Facebook login does **not** grant page-management, publishing, messaging or analytics permissions; those require separate scopes and provider review.

Each application uses PHPUnit consistently (one testing approach per project). Packages not bundled by Laravel must be checked against the installed Laravel/PHP versions before installation.

## Progress rules

- Project progress = completed mandatory tasks ÷ total mandatory tasks × 100. All generated tasks are mandatory. Optional future enhancements are displayed separately and never lower completion.
- A task is complete only after the learner opens the confirmation dialog and confirms every acceptance criterion. This is learner evidence, not automated verification.
- **Not started**, **In progress**, **Blocked** and **Completed** are derived from persisted timestamps/reasons.
- A task with an incomplete prerequisite cannot be started or completed and is never recommended.
- Blocked tasks do not count as complete. You can work on another independent project.
- A project is complete only when every task is complete, a real repository URL and test evidence are recorded, a deployment status is explicitly selected (including **Not deployed**), the final report is filled in, and the learner explicitly approves the final review.
- A percentage alone never claims production readiness. Readiness signals separately show functional implementation, testing, security, documentation, GitHub state and deployment readiness.
- Reopening completed work is explicit and recorded. It removes completion from the affected task but preserves notes and activity history.
- All progress is local to the browser. No test result, push or deployment is fabricated or independently verified by the static site.

## LocalStorage data

Key: `laravel_mastery_progress_v1`  
Schema version: `1`  
Previous-copy key: `laravel_mastery_progress_v1_previous` (best effort)

Stored: active project/task, task status/timestamps, confirmed acceptance indexes, notes, blocker reasons, bookmarks, activity, project repository/deployment/test/final-report records, Git checkpoint metadata, preferences and completion history.

Never stored: passwords, OAuth client secrets, API keys, provider tokens, real customer data, payment details or private credentials. Do not place them in task notes or project records.

Limitations: LocalStorage is browser/device specific, unencrypted, may be cleared, has a storage quota and does not synchronize across browsers or devices. It is not a secure database. Export backups regularly. If saved JSON is malformed, saving pauses so the stored copy is not overwritten. Recovery options: import a validated backup, try the previous local copy, or reset explicitly.

### Export and import

Settings provides JSON export (with a fallback text view when automatic download is unavailable), a validated import preview, and merge or replace modes:

- **Merge** keeps the active project, unions completion and notes, prefers the latest completion timestamp, and preserves project metadata already recorded.
- **Replace** applies only after preview confirmation.
- Unsupported schema versions are rejected. Unknown task IDs are reported and skipped. A backup containing only unknown IDs is rejected.
- Importing does not invent test evidence, task completion or Git status.

## Git safety

The curriculum includes explicit Git tasks and per-task checkpoint commands. Before setting a remote:

```bash
git remote -v
```

Add `origin` only if it is absent; otherwise verify the intended repository before changing its URL. Never commit `.env`, credentials, private keys, real customer data or tokens. Do not force-push shared branches. Pushing is always a manual learner action. Project/repository/push fields are manual claims, not verified GitHub integrations.

## Testing this tracker

From the repository root:

```bash
node tests/tracker-smoke.cjs
```

The jsdom suite verifies:

- All eight HTML entry points render
- Ten project cards and 3,460 unique tasks
- 10 modules and 10 advanced tasks per project
- Sidebar, dashboard metrics, project coverage, roadmap grouping, task acceptance and notes
- Start → confirm completion lifecycle and persistence
- Prerequisite denial, blockers and unblocking, notes, bookmarks
- Manual Git checkpoint validation
- Project metadata and completion-gate openness
- Backup export, schema rejection, merge/restore, unknown-task rejection and credential exclusion
- Corrupted LocalStorage protection and project switching
- No Bengali/non-English instructional content

These are tracker tests only. They do not claim any Laravel application test passed.

## Honest limitations and unfinished scope

This delivery is a complete tracker and a large, structured curriculum—not ten fully written Laravel codebases:

- The 3,460 tasks are generated from project-specific module specifications plus Laravel recipe templates (migration, model, relationships, factory, seeder, Form Request, routes, controller, policy, Blade index/form/show views, update/delete actions, positive and authorization tests). Reference code is a scaffold for the primary resource; adapt namespaces, route paths, middleware and factory setup to the exact route map you implement. Not every task includes a bespoke full file. This is a real limitation, not a claim of zero omissions.
- Effort estimates are intentionally realistic: 110 tasks are estimated at 5–10 minutes, 585 at 11–20 minutes, 2,127 at 21–30 minutes, 599 at 31–45 minutes and 39 at 46–60 minutes. The complex isolation, concurrency, payment and approval tasks may need more than one session. Split them further if needed; do not mark them complete without evidence.
- Provider integrations (payment, OAuth, social publishing, email, calendar) are implementation boundaries. No credentials, live provider tests, production deployments or successful pushes are included or verified. Follow current provider documentation and terms.
- The tracker cannot check code quality, run PHPUnit, inspect a GitHub commit or verify a deployment. Learner-completion records are manual evidence.
- No screenshots are bundled. Demo instructions: open all ten projects from `projects.html`, start the first task, confirm acceptance, create a blocker, export a backup from `settings.html`, and re-import it in a private browser profile.
- A legal e-signature, PCI compliance, medical-record compliance or accreditation cannot be established by this curriculum. The document project explicitly labels approvals as internal evidence, not a legally valid signature.
- The Next.js shell exists only to host static files and provide `/api/health`; it has no progress API.

## Definition of done for each project

Before marking a project complete, verify the tasks for requirements, architecture, authentication, authorization, schema, every module, advanced feature, UI, tests, security, deployment, documentation, release tagging and handover. Record the real repository URL, actual test evidence, deployment status (including **Not deployed**), final report, known limitations and the next project. Then approve the final review yourself.
