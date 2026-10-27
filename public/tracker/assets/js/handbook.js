/* Engineering handbook content, kept out of the page renderer. */
(function () {
  'use strict';
  const esc = window.LMUI.esc;
  const icon = window.LMUI.icon;
  const code = window.LMUI.codeBlock;

  function section(id, iconName, title, body) {
    return '<section class="panel handbook-section" id="' + id + '"><div class="panel-head"><h2>' + icon(iconName) + ' ' + esc(title) + '</h2></div>' + body + '</section>';
  }
  function checks(items) {
    return '<ul class="check-list">' + items.map(item => '<li>' + esc(item) + '</li>').join('') + '</ul>';
  }
  function grid(items) {
    return '<div class="handbook-grid">' + items.map(item => '<div class="handbook-card"><strong>' + esc(item[0]) + '</strong><p>' + esc(item[1]) + '</p></div>').join('') + '</div>';
  }
  function render() {
    const nav = [
      ['how', 'How it works'], ['setup', 'Laravel 12 setup'], ['architecture', 'Architecture'], ['auth', 'Authentication'],
      ['authorization', 'Authorization'], ['database', 'Database rules'], ['testing', 'Testing matrix'], ['security', 'Security baseline'],
      ['git', 'Git workflow'], ['deployment', 'Deployment'], ['integrations', 'Integrations'], ['troubleshooting', 'Troubleshooting'], ['limits', 'Limitations']
    ];
    let html = '<section class="page-heading handbook-heading"><div><p class="eyebrow"><span class="dot"></span> Engineering handbook</p><h1>The lifecycle behind every micro-step</h1><p>Use this reference while building any of the ten applications. It captures the conventions, security baseline, testing matrix, Git recovery and deployment runbook the curriculum assumes.</p></div><div class="heading-actions"><button class="btn btn-outline" data-action="export-progress">' + icon('download') + ' Backup progress</button><a class="btn btn-accent" href="index.html">' + icon('grid-1x2') + ' Dashboard</a></div></section>';
    html += '<nav class="handbook-nav" aria-label="Handbook sections">' + nav.map(item => '<a href="#' + item[0] + '">' + esc(item[1]) + '</a>').join('') + '</nav>';
    html += '<div class="handbook-layout">';

    html += section('how', 'signpost-split', 'How the curriculum works',
      '<p>Each project is divided into ten phases and 346 mandatory micro-steps. A step is complete only when you confirm every acceptance criterion. Prerequisites are enforced: a task cannot be started or completed while its direct prerequisite is incomplete. Blocking a task does not delete progress and never blocks another project.</p>' +
      grid([
        ['One primary objective', 'Each step has a single outcome, exact files and a verification method.'],
        ['Dependency-aware', 'Recommendations only include tasks whose prerequisites are complete and which are not blocked.'],
        ['Evidence, not theatre', 'Record only tests you actually ran. The tracker cannot run PHPUnit or inspect GitHub.'],
        ['Separate completeness signals', 'Functional, testing, security, documentation, GitHub and deployment readiness are reported separately.']
      ]) +
      '<div class="callout">' + icon('info-circle') + '<div><strong>Estimated effort</strong><p>Most steps are 5–30 minutes. Concurrency, isolation, security matrices and integration tasks can take 45–60 minutes or several sessions. Split a step further rather than marking it complete prematurely.</p></div></div>');

    html += section('setup', 'terminal', 'Laravel 12 project setup',
      '<p>Pin Laravel 12 and verify every runtime requirement. These commands are the baseline used by Phase 2.</p>' +
      code('php -v\ncomposer --version\nmysql --version\nnode --version\nnpm --version') +
      code('composer create-project laravel/laravel:^12.0 enterprise-business\ncd enterprise-business\nphp artisan --version\nnpm install && npm run build') +
      '<h3>Database and environment</h3>' +
      code('cp .env.example .env\nphp artisan key:generate\n\n# .env — never commit this file\nDB_CONNECTION=mysql\nDB_DATABASE=enterprise_business\nDB_USERNAME=app_user\nDB_PASSWORD=use-a-unique-local-password\n\nphp artisan config:clear\nphp artisan db:show\nphp artisan migrate') +
      '<h3>Blade, Vite and Bootstrap</h3><p>Install Bootstrap and Bootstrap Icons through npm, import them once in <code>resources/css/app.css</code>, and load the compiled assets with <code>@vite</code>. Do not depend on an unverified runtime CDN in production.</p>' +
      code('npm install bootstrap bootstrap-icons\nnpm run build') +
      '<h3>Git baseline</h3>' +
      code('git init\ngit status --short --ignored\ngit add .\ngit commit -m "chore: initialize Laravel 12 workspace"\ngit remote -v\n# Add origin only if it is absent:\ngit remote add origin <your-repository-url>\ngit push -u origin HEAD'));

    html += section('architecture', 'diagram-3', 'Architecture conventions',
      grid([
        ['Thin controllers', 'Controllers validate through Form Requests, authorize through policies and delegate business work to actions or services.'],
        ['Form Requests', 'Validation lives in dedicated request classes, including unique-ignore rules for updates.'],
        ['Policies', 'Every owned record has a policy. Nested routes authorize both the parent and the child.'],
        ['Actions and services', 'Multi-table operations run inside database transactions with explicit ownership derived server-side.'],
        ['Queues', 'Slow and retryable work belongs in queued jobs with idempotency keys and retry limits.'],
        ['Notifications', 'Dispatch after commit and deduplicate by event and recipient.'],
        ['Money', 'Store integer minor units and calculate totals on the server. Never trust posted totals.'],
        ['Time', 'Store UTC instants and keep the display timezone explicit. Test daylight-saving boundaries.']
      ]) +
      code('app/\n├── Actions/            single-purpose transactional operations\n├── Http/Controllers/   HTTP orchestration only\n├── Http/Requests/      validation and normalization\n├── Http/Middleware/    coarse gatekeeping\n├── Jobs/               queued, retryable work\n├── Models/             relationships, casts, scopes\n├── Notifications/      user communication\n├── Policies/           record-level authorization\n└── Services/           reusable domain calculations'));

    html += section('auth', 'shield-lock', 'Authentication with Fortify',
      '<p>Laravel 12 starter kits already use Fortify. If you are building manually, install the headless backend and create the Blade views yourself. Verify the installed package supports Laravel 12 before continuing.</p>' +
      code('composer require laravel/fortify\nphp artisan fortify:install\nphp artisan migrate\nphp artisan route:list | grep -E "login|register|password|verify"') +
      checks([
        'Enable only the features you need in config/fortify.php.',
        'Register Blade views for login, registration, password reset and verification in FortifyServiceProvider.',
        'Use the verified middleware on routes requiring a trusted email address.',
        'Configure login and password-reset throttling.',
        'Confirm session regeneration after login and session invalidation after logout.',
        'Test duplicate email, wrong password, expired reset token and unverified access.'
      ]));

    html += section('authorization', 'key', 'Authorization model',
      '<p>The curriculum uses native Laravel policies plus role and permission tables. UI hiding is never treated as authorization.</p>' +
      code('php artisan make:migration create_roles_and_permissions_tables\nphp artisan make:policy CustomerPolicy --model=Customer\nphp artisan make:test Security/AuthorizationMatrixTest') +
      checks([
        'Create roles, permissions, role_user and permission_role with unique pairs.',
        'Seed idempotent baseline roles and permissions; never seed shared privileged passwords.',
        'Assign the least-privileged role at registration; ignore role input from public forms.',
        'Implement hasPermission, roles and permissions helpers on User.',
        'Authorize viewAny, view, create, update and delete through policies.',
        'Test guest, missing permission, foreign owner/tenant and allowed role separately.',
        'Test direct URLs, guessed IDs, nested routes, exports and downloads.'
      ]));

    html += section('database', 'database', 'Database rules',
      grid([
        ['Migrations', 'Every schema change is a migration. Never hand-edit production schema.'],
        ['Foreign keys', 'Use constrained foreign keys with deliberate cascade, restrict or null behavior.'],
        ['Uniqueness', 'Enforce business identifiers with database constraints, not only validation.'],
        ['Indexes', 'Match real filters and sorts; measure before adding speculative indexes.'],
        ['Soft deletes', 'Use only where retention and restoration requirements support them.'],
        ['Transactions', 'Group multi-table writes and re-check invariants under lock.'],
        ['Seeders', 'Separate required lookup data from development fixtures; never seed real personal data.'],
        ['Rollback', 'Test migrations on a clean database and document irreversible data steps.']
      ]) +
      code('php artisan make:migration create_customers_table\nphp artisan migrate\nphp artisan db:show --counts\n# Fresh-database verification (never against production)\nphp artisan migrate:fresh --seed'));

    html += section('testing', 'clipboard-check', 'Testing matrix',
      grid([
        ['Unit', 'Money, progress, SLA, inventory and state calculations with boundary cases.'],
        ['Feature', 'Every primary create, read, update and list operation, plus redirects.'],
        ['Validation', 'Missing, malformed, duplicate and foreign values with no partial write.'],
        ['Authentication', 'Registration, login, logout, reset, verification and throttling.'],
        ['Authorization', 'Guest, missing permission, foreign owner and allowed role per module.'],
        ['Concurrency', 'Last stock unit, payment balance, slot booking and optimistic updates.'],
        ['Integrations', 'Signed webhook fixtures, duplicate events, provider failure and retries.'],
        ['Queues', 'Dispatch after commit, idempotent retry and failure visibility.'],
        ['Performance', 'Query counts and pagination on realistic seeded data.']
      ]) +
      code('php artisan test\nphp artisan test --filter=Authorization\nphp artisan test --testsuite=Feature\nphp artisan schedule:list\nphp artisan queue:failed') +
      '<div class="callout warn">' + icon('info-circle') + '<div><strong>Do not fabricate results</strong><p>Record the command, environment, date and real outcome in the task completion dialog. A failed or unrun test must remain incomplete.</p></div></div>');

    html += section('security', 'shield-check', 'Security baseline',
      checks([
        'CSRF protection on every state-changing form.',
        'Server-side validation and output escaping; sanitize rich text when enabled.',
        'Parameterized Eloquent queries; never concatenate request input into SQL.',
        'Explicit fillable fields; guard ownership, role and status attributes.',
        'Policies and ownership checks for every read, write, download and export.',
        'Private file storage with MIME/content validation and authorized streaming.',
        'Rate limits on login, password reset, public forms and expensive endpoints.',
        'Secrets only in environment or secret stores; never in Git, logs or LocalStorage.',
        'Signed webhook verification against the raw body plus idempotent event IDs.',
        'Sensitive audit fields redacted; append-only audit behavior tested.',
        'APP_DEBUG=false and safe error pages in production.',
        'Dependency audits reviewed with a documented remediation plan.'
      ]));

    html += section('git', 'git', 'Git workflow and recovery',
      code('git status --short\ngit diff --check\ngit switch -c feature/<name>\ngit add <reviewed-files>\ngit commit -m "feat(<scope>): <verified change>"\ngit remote -v\ngit push -u origin HEAD') +
      '<h3>Rejected push</h3>' +
      code('git fetch origin\ngit log --oneline --graph --all -15\ngit merge origin/main\n# resolve, add reviewed files, commit, rerun tests, then push\ngit push') +
      '<h3>Merge conflict</h3><p>Open every conflicted file, preserve both intended behaviors, remove all conflict markers, rerun the affected tests, then commit. Never force-push a shared branch unless the team explicitly agrees and the impact is understood.</p>' +
      '<h3>Release tag</h3>' +
      code('git diff main...HEAD --stat\ngit tag -a v1.0.0 -m "Release v1.0.0"\ngit show v1.0.0 --stat\ngit push origin v1.0.0') +
      '<p>Never commit <code>.env</code>, credentials, private keys or real customer data.</p>');

    html += section('deployment', 'cloud-upload', 'Deployment and rollback',
      code('composer install --no-dev --optimize-autoloader\nnpm ci && npm run build\nphp artisan migrate --force\nphp artisan optimize\nphp artisan queue:restart') +
      grid([
        ['Environment', 'APP_ENV=production, APP_DEBUG=false, correct APP_URL, secure session cookies.'],
        ['Web server', 'Serve only the public directory over HTTPS with a least-privilege PHP-FPM user.'],
        ['Queue', 'Supervised worker with documented retries and failed-job monitoring.'],
        ['Scheduler', 'One cron entry running schedule:run every minute.'],
        ['Storage', 'Private persistent storage with authorized downloads.'],
        ['Backups', 'Scheduled encrypted database and file backups with a rehearsed restore.'],
        ['Monitoring', 'Structured logs, redaction and an alert owner for failed jobs and errors.'],
        ['Rollback', 'Code rollback rehearsed; irreversible migrations and backup restore documented.']
      ]) +
      '<p>Record deployment status honestly in the project workspace. “Not deployed” is a valid outcome and never blocks an honest final report.</p>');

    html += section('integrations', 'plug', 'Integration boundaries',
      '<p>Payment, OAuth, email, calendar and social publishing are external systems. Each has its own permissions, retry semantics and terms.</p>' +
      checks([
        'Never store raw card data; use the provider hosted checkout and verified callbacks.',
        'Verify webhook signatures against the raw request body and deduplicate provider event IDs.',
        'OAuth requires exact redirect URIs and state validation; login does not grant page-management or publishing permissions.',
        'Store provider tokens encrypted, never log them and handle expiry and revocation.',
        'Do not claim an integration works until a sandbox call or recorded fake-provider test proves it.',
        'Document required scopes, app review and provider-specific limitations.'
      ]) +
      '<p><a class="text-link" href="https://laravel.com/docs/12.x/socialite" target="_blank" rel="noopener">Laravel Socialite documentation ' + icon('box-arrow-up-right') + '</a></p>');

    html += section('troubleshooting', 'wrench-adjustable', 'Troubleshooting',
      grid([
        ['Class not found', 'Run composer dump-autoload and verify namespace and file-path casing.'],
        ['Route not found', 'Run php artisan route:list; check middleware groups and path ordering.'],
        ['403 for a valid user', 'Confirm policy discovery, permission seeding and role assignment.'],
        ['419 page expired', 'Missing @csrf or stale session; verify session driver and cookie domain.'],
        ['Database connection', 'php artisan config:clear; inspect DB_* values and MySQL privileges.'],
        ['Assets missing', 'Run npm run build; confirm @vite and the build manifest exist.'],
        ['Queue not running', 'Start a supervised worker; inspect failed_jobs and restart after deployment.'],
        ['Mail not delivered', 'Check MAIL_* configuration and logs; use a local mail sink while developing.'],
        ['Webhook rejected', 'Verify raw-body signature, secret and provider event ID uniqueness.'],
        ['Slow page', 'Measure query count; fix N+1 and unbounded queries before adding caches.']
      ]));

    html += section('limits', 'exclamation-triangle', 'Honest limitations',
      '<p>This tracker is a curriculum and evidence workspace, not ten finished Laravel repositories. It cannot run PHPUnit, inspect a repository or verify a deployment. Reference code is scaffold-level and must be adapted to the routes and namespaces you actually implement; some complex steps may require more than one session.</p>' +
      '<p>LocalStorage is browser-specific, unencrypted and can be cleared. Export backups regularly, and never store credentials, provider tokens or customer data in notes.</p>' +
      '<div class="callout warn">' + icon('shield-exclamation') + '<div><strong>Not a legal or compliance certification</strong><p>Document approvals are internal review evidence, not qualified electronic signatures. PCI, medical or accreditation claims require specialist providers and review.</p></div></div>');

    html += '</div>';
    return html;
  }
  window.LM_HANDBOOK = { render };
})();
