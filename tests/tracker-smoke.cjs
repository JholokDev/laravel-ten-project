const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.join(process.cwd(), 'public', 'tracker');
const pageFiles = ['index.html', 'projects.html', 'project.html', 'roadmap.html', 'task.html', 'progress.html', 'settings.html', 'handbook.html', '404.html'];
const scripts = [
  'assets/js/data/projects-01-05.js', 'assets/js/data/projects-06-10.js', 'assets/js/data/advanced.js', 'assets/js/curriculum.js',
  'assets/js/store.js', 'assets/js/ui.js', 'assets/js/handbook.js', 'assets/js/pages.js', 'assets/js/export.js', 'assets/js/app.js'
];
const KEY = 'laravel_mastery_progress_v1';

function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms || 35)); }
async function boot(pageFile, url, saved) {
  const dom = new JSDOM(fs.readFileSync(path.join(root, pageFile), 'utf8'), {
    url: 'https://tracker.test/' + url,
    runScripts: 'outside-only',
    pretendToBeVisual: true
  });
  const window = dom.window;
  window.scrollTo = () => {};
  window.HTMLElement.prototype.scrollIntoView = () => {};
  if (saved !== undefined) window.localStorage.setItem(KEY, saved);
  scripts.forEach(file => window.eval(fs.readFileSync(path.join(root, file), 'utf8')));
  await wait();
  return dom;
}
function main(dom) { return dom.window.document.getElementById('main'); }
function submit(form) { form.dispatchEvent(new form.ownerDocument.defaultView.Event('submit', { bubbles: true, cancelable: true })); }
async function click(dom, selector) {
  const element = dom.window.document.querySelector(selector);
  assert.ok(element, 'Missing clickable element: ' + selector);
  element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  await wait(15);
  return element;
}
function saved(dom) { return JSON.parse(dom.window.localStorage.getItem(KEY)); }

(async () => {
  /* Static page render coverage */
  for (const file of pageFiles) {
    assert.ok(fs.readFileSync(path.join(root, file), 'utf8').includes('data-page='), file + ' has a page identifier');
  }
  const dashboard = await boot('index.html', 'index.html');
  assert.equal(dashboard.window.document.querySelectorAll('.project-card').length, 10, 'dashboard lists exactly ten projects');
  assert.equal(dashboard.window.document.querySelectorAll('.metric-card').length, 4, 'dashboard has metric cards');
  assert.ok(dashboard.window.document.querySelector('.finder-bar'), 'dashboard has a task finder form');
  assert.equal(dashboard.window.document.querySelectorAll('.project-card').length, 10, 'dashboard project library is complete');
  assert.ok(main(dashboard).textContent.includes('Build ten'), 'dashboard headline renders');
  assert.ok(dashboard.window.document.querySelector('[data-project-picker]'), 'dashboard has a project selector');
  assert.ok(dashboard.window.document.querySelector('[data-project-filter]'), 'dashboard project filter renders');
  assert.ok(main(dashboard).innerHTML.indexOf('undefined') === -1, 'dashboard has no undefined text');
  dashboard.window.close();

  const projectsPage = await boot('projects.html', 'projects.html');
  assert.equal(projectsPage.window.document.querySelectorAll('.project-card').length, 10, 'projects library lists all ten');
  assert.ok(projectsPage.window.document.querySelector('.filter-bar'), 'projects page has search and filters');
  projectsPage.window.close();

  const searchPage = await boot('projects.html', 'projects.html?q=migration');
  assert.ok(main(searchPage).querySelector('.task-matches'), 'task search results appear for a query');
  assert.ok(main(searchPage).querySelectorAll('.task-match').length > 0, 'search returns real task records');
  searchPage.window.close();

  const projectPage = await boot('project.html', 'project.html?project=p01');
  assert.equal(projectPage.window.document.querySelectorAll('.coverage-table tbody tr').length, 10, 'coverage table lists ten modules');
  assert.equal(projectPage.window.document.querySelectorAll('.gate-list > li').length, 6, 'project completion gate has six checks');
  assert.equal(projectPage.window.document.querySelectorAll('.readiness-card').length, 6, 'project shows six separate readiness signals');
  assert.equal(projectPage.window.document.querySelectorAll('.advanced-card').length, 10, 'project shows ten advanced feature tasks');
  assert.ok(projectPage.window.document.querySelector('[data-project-meta-form]'), 'project repository form renders');
  assert.ok(main(projectPage).textContent.includes('Scope exclusions'), 'scope exclusions are displayed');
  projectPage.window.close();

  const roadmapPage = await boot('roadmap.html', 'roadmap.html?project=p01');
  assert.equal(roadmapPage.window.document.querySelectorAll('.phase-section').length, 10, 'roadmap renders all ten phases');
  assert.equal(roadmapPage.window.document.querySelectorAll('.task-row').length, 346, 'roadmap renders every project micro-step');
  assert.ok(roadmapPage.window.document.querySelectorAll('.module-group').length >= 20, 'foundation, module and advanced groups are separate');
  assert.ok(main(roadmapPage).innerHTML.indexOf('undefined') === -1, 'roadmap has no undefined module keys');
  roadmapPage.window.close();

  const taskPage = await boot('task.html', 'task.html?task=p01-plan-purpose&project=p01');
  assert.ok(taskPage.window.document.title.includes('Write the business problem'), 'task title is specific');
  assert.ok(taskPage.window.document.querySelectorAll('.task-section').length === 7, 'task page has all required sections');
  assert.ok(taskPage.window.document.querySelectorAll('.acceptance-list input').length >= 1, 'task page has acceptance criteria');
  assert.ok(taskPage.window.document.querySelector('#git-checkpoint'), 'task page has Git instructions');
  assert.ok(taskPage.window.document.querySelector('#task-notes-input'), 'task page has personal notes');
  assert.ok(main(taskPage).textContent.includes('p01-plan-purpose'), 'task ID is visible');
  assert.ok(main(taskPage).innerHTML.indexOf('undefined') === -1, 'task page has no undefined text');
  taskPage.window.close();

  const progressPage = await boot('progress.html', 'progress.html');
  assert.equal(progressPage.window.document.querySelectorAll('.progress-project-row').length, 10, 'progress page has ten project rows');
  assert.equal(progressPage.window.document.querySelectorAll('.metric-card').length, 5, 'progress page has five summary metrics');
  progressPage.window.close();

  const settingsPage = await boot('settings.html', 'settings.html');
  assert.ok(settingsPage.window.document.querySelector('[data-import-input]'), 'settings has validated import control');
  assert.ok(settingsPage.window.document.querySelector('[data-action="export-progress"]'), 'settings has export control');
  assert.ok(settingsPage.window.document.querySelector('[data-action="reset-all"]'), 'settings has reset control');
  settingsPage.window.close();

  const handbook = await boot('handbook.html', 'handbook.html');
  assert.ok(main(handbook).querySelectorAll('.handbook-section').length >= 12, 'handbook renders all lifecycle sections');
  assert.ok(main(handbook).textContent.includes('Deployment and rollback'), 'handbook includes deployment runbook');
  handbook.window.close();

  const notFound = await boot('404.html', '404.html');
  assert.ok(notFound.window.document.querySelector('.error-page'), '404 page renders a safe error state');
  notFound.window.close();

  /* Curriculum integrity and English-only content */
  const check = await boot('index.html', 'index.html');
  const LM = check.window.LM;
  assert.equal(LM.projects.length, 10, 'exactly ten projects');
  assert.equal(LM.totalTasks, 3460, 'curriculum generates 3460 micro-steps');
  assert.equal(new Set(Object.keys(LM.taskIndex)).size, LM.totalTasks, 'task IDs are unique');
  for (const project of LM.projects) {
    const curriculum = LM.curricula[project.id];
    assert.equal(curriculum.tasks.length, 346, project.id + ' has 346 tasks');
    assert.equal(project.modules.length, 10, project.id + ' has ten modules');
    assert.ok(curriculum.tasks.every(task => task.id && task.acceptance.length && task.security && task.verify && task.phase), project.id + ' tasks have complete descriptors');
    assert.equal(curriculum.tasks.filter(task => task.phase === 6).length, 210, project.id + ' has 210 module and advanced micro-steps');
  }
  assert.ok(Object.values(LM.taskIndex).every(task => task.dependencies.every(id => LM.taskIndex[id])), 'all dependencies resolve');
  assert.ok(Object.values(LM.taskIndex).filter(task => task.code).length > 1000, 'more than 1000 tasks provide reference code');
  assert.ok(LM.taskIndex['p01-advanced-lead-conversion'], 'project-specific advanced tasks have stable IDs');
  const serializedEnglish = JSON.stringify(LM.taskIndex) + JSON.stringify(LM.projects);
  assert.ok(!/[\u0980-\u09FF]/.test(serializedEnglish), 'no Bengali instructional content remains');

  /* Task lifecycle */
  const first = await boot('task.html', 'task.html?task=p01-plan-purpose&project=p01');
  const store = first.window.LMStore;
  const firstTask = LM.taskIndex['p01-plan-purpose'];
  await click(first, '[data-action="start-task"]');
  assert.equal(store.statusOf(firstTask.id), 'in_progress', 'start task records in-progress state');
  await click(first, '[data-action="complete-task"]');
  let dialog = first.window.document.getElementById('app-dialog');
  assert.ok(dialog && !dialog.hidden, 'completion dialog opens');
  let form = dialog.querySelector('[data-dialog-form]');
  submit(form);
  assert.ok(dialog.querySelector('[data-dialog-error]').textContent.toLowerCase().includes('acceptance'), 'completion without criteria is rejected');
  assert.notEqual(store.statusOf(firstTask.id), 'completed', 'invalid completion does not count');
  [...dialog.querySelectorAll('[data-acceptance]')].forEach(input => { input.checked = true; });
  submit(form);
  await wait(20);
  assert.equal(store.statusOf(firstTask.id), 'completed', 'confirmed acceptance completes the task');
  assert.ok(store.get().tasks[firstTask.id].completedAt, 'completion timestamp is stored');
  assert.equal(store.get().tasks[firstTask.id].accepted.length, firstTask.acceptance.length, 'accepted criteria are stored');
  const savedAfterCompletion = first.window.localStorage.getItem(KEY);
  assert.ok(savedAfterCompletion.includes('p01-plan-purpose'), 'progress persists to LocalStorage');
  first.window.close();

  /* Prerequisite enforcement and persistence */
  const second = await boot('task.html', 'task.html?task=p01-plan-functional&project=p01', savedAfterCompletion);
  assert.equal(second.window.LMStore.statusOf('p01-plan-purpose'), 'completed', 'completion survives reload');
  assert.equal(second.window.LMStore.startTask('p01-plan-functional'), false, 'a task with an incomplete prerequisite cannot start');
  const rejectedCompletion = second.window.LMStore.completeTask('p01-plan-functional', [0,1,2,3], 'test');
  assert.equal(rejectedCompletion.ok, false, 'a task with an incomplete prerequisite cannot complete');
  assert.match(rejectedCompletion.error, /Prerequisite/i, 'prerequisite rejection is explained');

  /* Notes, bookmark and blocker lifecycle */
  const secondState = second.window.localStorage.getItem(KEY);
  const roles = await boot('task.html', 'task.html?task=p01-plan-roles&project=p01', secondState);
  const notes = roles.window.document.getElementById('task-notes-input');
  notes.value = 'I clarified the manager and employee roles before schema work.';
  await click(roles, '[data-action="save-notes"]');
  assert.ok(roles.window.LMStore.get().tasks['p01-plan-roles'].notes.includes('manager'), 'notes persist');
  await click(roles, '[data-action="bookmark-task"]');
  assert.ok(roles.window.LMStore.get().bookmarks.includes('p01-plan-roles'), 'bookmark persists');
  await click(roles, '[data-action="block-task"]');
  dialog = roles.window.document.querySelector('#app-dialog');
  form = dialog.querySelector('[data-dialog-form]');
  form.querySelector('[name="reason"]').value = 'Waiting for the organization role decision.';
  submit(form);
  await wait(15);
  assert.equal(roles.window.LMStore.statusOf('p01-plan-roles'), 'blocked', 'blocker state is stored');
  await click(roles, '[data-action="unblock-task"]');
  dialog = roles.window.document.querySelector('#app-dialog');
  submit(dialog.querySelector('[data-dialog-form]'));
  await wait(15);
  assert.notEqual(roles.window.LMStore.statusOf('p01-plan-roles'), 'blocked', 'blocker can be resolved');
  const rolesState = roles.window.localStorage.getItem(KEY);
  roles.window.close();

  /* Git checkpoint and project metadata */
  const gitPage = await boot('task.html', 'task.html?task=p01-plan-roles&project=p01', rolesState);
  await click(gitPage, '[data-action="record-git"]');
  dialog = gitPage.window.document.querySelector('#app-dialog');
  form = dialog.querySelector('[data-dialog-form]');
  form.querySelector('[name="hash"]').value = 'invalid';
  form.querySelector('[name="message"]').value = 'docs: requirements';
  submit(form);
  assert.ok(dialog.querySelector('[data-dialog-error]').textContent.includes('hash'), 'invalid commit hash is rejected');
  form.querySelector('[name="hash"]').value = 'abc1234';
  submit(form);
  await wait(20);
  assert.equal(gitPage.window.LMStore.get().projects.p01.gitCheckpoints.length, 1, 'Git checkpoint is recorded manually');
  const gitState = gitPage.window.localStorage.getItem(KEY);
  gitPage.window.close();

  const metadataPage = await boot('project.html', 'project.html?project=p01', gitState);
  form = metadataPage.window.document.querySelector('[data-project-meta-form]');
  form.querySelector('[name="repoUrl"]').value = 'javascript:alert(1)';
  submit(form);
  assert.equal(metadataPage.window.LMStore.get().projects.p01.repoUrl, '', 'unsafe repository URL is rejected');
  form.querySelector('[name="repoUrl"]').value = 'https://github.com/example/enterprise';
  form.querySelector('[name="branch"]').value = 'main';
  form.querySelector('[name="testEvidence"]').value = 'Ran php artisan test on the development database; 24 tests passed on 2026-01-01.';
  form.querySelector('[name="finalReport"]').value = 'Implemented all ten enterprise modules. Known limitation: payment processing is intentionally manual only.';
  submit(form);
  await wait(15);
  assert.equal(metadataPage.window.LMStore.get().projects.p01.repoUrl, 'https://github.com/example/enterprise', 'repository metadata persists');
  assert.equal(metadataPage.window.LMStore.projectGate('p01').allComplete, false, 'project gate remains open while tasks are incomplete');
  const metadataState = metadataPage.window.localStorage.getItem(KEY);
  metadataPage.window.close();

  /* Export, validation and merge */
  const exportPage = await boot('settings.html', 'settings.html', metadataState);
  const exportStore = exportPage.window.LMStore;
  const backup = exportStore.exportObject();
  assert.equal(backup.schemaVersion, 1, 'backup has schema version');
  assert.ok(backup.tasks['p01-plan-purpose'].completedAt, 'backup includes completed task');
  assert.ok(!JSON.stringify({ tasks: backup.tasks, projects: backup.projects }).match(/password|access_token|client_secret/i), 'backup excludes credential fields');
  const preview = exportStore.previewImport(backup);
  assert.ok(preview.taskCount >= 2, 'backup preview counts known tasks');
  assert.throws(() => exportStore.previewImport({ schemaVersion: 99, tasks: {} }), /schema/i, 'unsupported schema is rejected');
  assert.throws(() => exportStore.previewImport({ schemaVersion: 1, tasks: { 'unknown-task': { completedAt: new Date().toISOString() } } }), /no task ids recognized|none of the imported/i, 'unknown-only task backup is rejected');
  exportStore.resetAll();
  assert.equal(Object.keys(exportStore.get().tasks).length, 0, 'reset clears task records');
  const mergeResult = exportStore.importState(backup, 'merge');
  assert.ok(mergeResult.ok, 'merge import succeeds');
  assert.ok(exportStore.get().tasks['p01-plan-purpose'].completedAt, 'merge restores completed progress');
  assert.equal(exportStore.get().projects.p01.repoUrl, 'https://github.com/example/enterprise', 'merge preserves project metadata');
  exportPage.window.close();

  /* Corrupted local data must not be silently overwritten */
  const corrupt = await boot('index.html', 'index.html', '{invalid json');
  assert.equal(corrupt.window.LMStore.snapshot().blocked, true, 'corrupted saved data blocks writes');
  assert.ok(corrupt.window.document.getElementById('storage-banner'), 'storage warning is visible');
  await click(corrupt, '[data-action="toggle-theme"]');
  assert.equal(corrupt.window.localStorage.getItem(KEY), '{invalid json', 'corrupted saved data is preserved');
  corrupt.window.close();

  /* Project switching keeps progress separate */
  const switchPage = await boot('projects.html', 'projects.html', metadataState);
  switchPage.window.LMStore.startProject('p02');
  assert.equal(switchPage.window.LMStore.get().activeProjectId, 'p02', 'another project becomes active');
  assert.equal(switchPage.window.LMStore.statusOf('p01-plan-purpose'), 'completed', 'switching project preserves Project 01 progress');
  switchPage.window.close();

  /* Cross-tab conflict must pause writes */
  const conflictPage = await boot('index.html', 'index.html');
  conflictPage.window.LMStore.setConflict(true);
  const beforeConflict = conflictPage.window.localStorage.getItem(KEY);
  conflictPage.window.LMStore.addActivity('note', 'This must not be persisted while another tab conflicts.');
  assert.equal(conflictPage.window.localStorage.getItem(KEY), beforeConflict, 'conflict mode pauses storage writes');
  assert.equal(conflictPage.window.LMStore.snapshot().blocked, true, 'conflict mode reports saving blocked');
  conflictPage.window.close();

  console.log('Tracker smoke checks passed.');
  console.log('Verified: 9 pages, 10 projects, 3,460 tasks, 1,000+ code-bearing steps, lifecycle, prerequisites, notes, blockers, Git records, backup validation/merge, corruption protection, English-only content.');
})().catch(error => { console.error(error); process.exitCode = 1; });
