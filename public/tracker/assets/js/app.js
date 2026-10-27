/* Application boot and interaction controller. */
(function () {
  'use strict';
  const LM = window.LM;
  const Store = window.LMStore;
  const UI = window.LMUI;
  const Pages = window.LM_PAGES;
  const pageKey = document.body.getAttribute('data-page') || 'dashboard';
  const query = Object.fromEntries(new URLSearchParams(window.location.search).entries());
  const pageMeta = {
    dashboard: { page: 'dashboard', title: 'Dashboard' },
    projects: { page: 'projects', title: 'Project library' },
    project: { page: 'project', title: 'Project workspace' },
    roadmap: { page: 'roadmap', title: 'Micro-step roadmap' },
    task: { page: 'task', title: 'Task workspace' },
    progress: { page: 'progress', title: 'Progress and activity' },
    settings: { page: 'settings', title: 'Settings and backup' },
    handbook: { page: 'handbook', title: 'Engineering handbook' },
    notFound: { page: 'notFound', title: 'Page not found' }
  };

  function currentPage() {
    const meta = Object.assign({}, pageMeta[pageKey] || pageMeta.dashboard, { query: query.q || '' });
    window.LM_PAGE = meta;
    return meta;
  }
  function safeNavigate(url) {
    try { window.location.assign(url); }
    catch (_error) { window.location.href = url; }
  }
  function renderPage() {
    const meta = currentPage();
    const main = document.getElementById('main');
    if (!main) return;
    UI.mountShell(meta);
    let html = '';
    try {
      if (meta.page === 'dashboard') { html = Pages.renderDashboard(query); document.title = 'Dashboard · Laravel Engineering Mastery'; }
      else if (meta.page === 'projects') { html = Pages.renderProjects(query); document.title = 'Ten project library · Laravel Engineering Mastery'; }
      else if (meta.page === 'project') { html = Pages.renderProject(query); if (!document.title || document.title.indexOf('Laravel Mastery') === -1) document.title = 'Project workspace · Laravel Engineering Mastery'; }
      else if (meta.page === 'roadmap') { html = Pages.renderRoadmap(query); if (!document.title || document.title.indexOf('Laravel Mastery') === -1) document.title = 'Roadmap · Laravel Engineering Mastery'; }
      else if (meta.page === 'task') { html = Pages.renderTaskPage(query); const currentTask = query.task ? LM.taskIndex[query.task] : null; document.title = currentTask ? currentTask.title + ' · Laravel Engineering Mastery' : 'Task workspace · Laravel Engineering Mastery'; }
      else if (meta.page === 'progress') { html = Pages.renderProgress(query); document.title = 'Progress and activity · Laravel Engineering Mastery'; }
      else if (meta.page === 'settings') { html = Pages.renderSettings(query); document.title = 'Settings and backup · Laravel Engineering Mastery'; }
      else if (meta.page === 'handbook') { html = Pages.renderHandbook(); document.title = 'Engineering handbook · Laravel Engineering Mastery'; }
      else { UI.renderErrorPage('This page does not exist', 'The address may be incorrect. Return to the dashboard or choose one of the ten projects.'); return; }
      if (!html) { UI.updateSaveIndicator(); return; }
      main.innerHTML = html;
      UI.updateSaveIndicator();
      UI.updateShell();
    } catch (error) {
      main.innerHTML = '<div class="fatal-state">' + UI.icon('exclamation-octagon') + '<h1>The workspace could not render this page</h1><p>' + UI.esc(error.message || 'An unexpected error occurred.') + '</p><p class="small-copy">Your saved progress has not been overwritten. Export a backup from Settings, then reload.</p><a class="btn btn-outline" href="index.html">Return to dashboard</a></div>';
      document.title = 'Workspace error · Laravel Engineering Mastery';
    }
  }

  function taskFrom(id) { return LM.taskIndex[id] || null; }
  function requireTask(id) {
    const task = taskFrom(id);
    if (!task) UI.toast('That task ID does not exist in this curriculum.', 'error');
    return task;
  }
  function showCompletionDialog(id) {
    const task = requireTask(id);
    if (!task) return;
    const status = Store.statusOf(id);
    if (status === 'completed') { UI.toast('This task is already complete. Use Mark incomplete to reopen it.', 'info'); return; }
    if (Store.recordFor(id) && Store.recordFor(id).blockedReason) { UI.toast('Resolve the blocker before completing this task.', 'error'); return; }
    if (!Store.dependenciesComplete(id)) { UI.toast('Complete the prerequisite tasks first. The task page lists them.', 'error'); return; }
    const record = Store.recordFor(id) || {};
    const body = '<div class="dialog-checklist"><p><strong>Acceptance criteria</strong></p><ol class="acceptance-list">' + task.acceptance.map((item, index) => '<li><label class="acceptance-row"><input type="checkbox" name="accept-' + index + '" data-acceptance value="' + index + '"><span>' + UI.esc(item) + '</span></label></li>').join('') + '</ol></div><label class="field"><span>Completion note (optional)</span><textarea name="note" rows="3" placeholder="What evidence proves this is complete? Do not include secrets.">' + UI.esc(record.notes || '') + '</textarea></label>';
    UI.openDialog({
      eyebrow: 'Manual completion',
      title: 'Confirm completion',
      description: 'Confirm only what you actually verified. This tracker does not run tests or inspect your repository. If any criterion fails, keep the task incomplete and fix it.',
      body,
      submitLabel: 'Complete task',
      onSubmit: (values, form) => {
        const checked = [...form.querySelectorAll('[data-acceptance]:checked')].map(input => Number(input.value));
        if (checked.length !== task.acceptance.length) return { error: 'Confirm every acceptance criterion before completing this task.' };
        const result = Store.completeTask(id, checked, values.note || '');
        if (!result.ok) return { error: result.error || 'The task could not be completed.' };
        UI.toast('Task completed. Your progress has been saved.', 'success');
        return { close: true };
      }
    });
  }
  function showBlockDialog(id) {
    const task = requireTask(id);
    if (!task) return;
    const record = Store.recordFor(id) || {};
    UI.openDialog({
      eyebrow: 'Pause safely',
      title: 'Record a blocker',
      description: 'Your current project position and completed tasks are preserved. Other projects remain available while this task is blocked.',
      body: '<label class="field"><span>What is blocking this task?</span><textarea name="reason" rows="4" required placeholder="Error, missing access, waiting for a decision, or the next debugging step…">' + UI.esc(record.blockedReason || '') + '</textarea></label>',
      submitLabel: 'Save blocker',
      danger: true,
      icon: 'pause-circle',
      onSubmit: values => {
        const result = Store.blockTask(id, values.reason || '');
        if (!result.ok) return { error: result.error };
        UI.toast('Blocker recorded. Resume when it is resolved.', 'success');
        return { close: true };
      }
    });
  }
  function showGitDialog(id, projectId) {
    const task = taskFrom(id);
    const pid = projectId || (task ? task.projectId : Store.get().activeProjectId);
    const meta = Store.get().projects[pid] || {};
    UI.openDialog({
      eyebrow: 'Manual checkpoint',
      title: 'Record a Git checkpoint',
      description: 'Run the Git commands yourself. The tracker records metadata only and cannot verify a commit or push.',
      body: '<div class="form-grid"><label class="field"><span>Commit hash</span><input name="hash" required pattern="[0-9a-fA-F]{7,40}" placeholder="e.g. a1b2c3d"></label><label class="field"><span>Branch</span><input name="branch" value="' + UI.esc(meta.branch || 'main') + '" required></label><label class="field field-wide"><span>Commit message</span><input name="message" required maxlength="500" placeholder="feat: describe the verified change"></label><label class="field field-wide"><span>Note (optional)</span><input name="note" maxlength="1000" placeholder="What was verified before committing?"></label><label class="checkbox-row"><input type="checkbox" name="pushed" value="yes"><span>I pushed this commit too (self-reported).</span></label></div>',
      submitLabel: 'Save checkpoint',
      onSubmit: values => {
        const result = Store.addGitCheckpoint(pid, { hash: values.hash, message: values.message, branch: values.branch, pushed: values.pushed === 'yes', note: values.note, taskId: task ? task.id : '' });
        if (!result.ok) return { error: result.error };
        UI.toast('Git checkpoint recorded manually.', 'success');
        return { close: true };
      }
    });
  }
  function showProjectCompleteDialog(projectId) {
    const project = LM.projects.find(item => item.id === projectId);
    const gate = Store.projectGate(projectId);
    if (!gate.allComplete || !gate.repo || !gate.evidence || !gate.deployment || !gate.finalReport || !gate.gitCheckpoint) {
      UI.toast('Complete the project gate first: tasks, repository, test evidence, deployment status and final report.', 'error');
      return;
    }
    UI.openDialog({
      eyebrow: 'Project completion',
      title: 'Approve the final project review',
      description: 'This is a learner sign-off, not an independent production certification. Confirm that your recorded reports are truthful.',
      body: '<ul class="gate-list compact">' + gate.checklist.map(item => '<li class="gate-ok">' + UI.icon('check2-circle') + '<span>' + UI.esc(item.label) + ' — ' + UI.esc(item.detail) + '</span></li>').join('') + '</ul><label class="checkbox-row"><input type="checkbox" name="confirm" value="yes" required><span>I reviewed the implementation, tests, security findings and known limitations, and the recorded results are truthful.</span></label>',
      submitLabel: 'Mark project complete',
      onSubmit: values => {
        if (values.confirm !== 'yes') return { error: 'Confirm the final review.' };
        const result = Store.completeProject(projectId);
        if (!result.ok) return { error: result.error };
        UI.toast('Project marked complete with a learner-approved report.', 'success');
        return { close: true };
      }
    });
  }
  function showResetDialog(projectId) {
    const project = LM.projects.find(item => item.id === projectId);
    if (!project) return;
    UI.openDialog({
      eyebrow: 'Destructive action',
      title: 'Reset ' + project.title + '?',
      description: 'This clears completion, acceptance confirmation, blockers, notes and bookmarks for this project only. Activity history remains. Export a backup first.',
      body: '<label class="field"><span>Type <code>RESET</code> to confirm</span><input name="phrase" required autocomplete="off" placeholder="RESET"></label>',
      submitLabel: 'Reset project',
      danger: true,
      onSubmit: values => {
        if ((values.phrase || '').trim() !== 'RESET') return { error: 'Type RESET exactly to confirm.' };
        Store.resetProject(projectId);
        UI.toast('Project progress reset. A backup export is still recommended.', 'success');
        return { close: true, after: renderPage };
      }
    });
  }
  function showResetAllDialog() {
    UI.openDialog({
      eyebrow: 'Destructive action',
      title: 'Reset all learning progress?',
      description: 'All task completion, notes, blockers, bookmarks, activity and project records in this browser will be cleared. Download a backup first.',
      body: '<label class="field"><span>Type <code>RESET ALL</code> to confirm</span><input name="phrase" required autocomplete="off" placeholder="RESET ALL"></label>',
      submitLabel: 'Reset everything',
      danger: true,
      onSubmit: values => {
        if ((values.phrase || '').trim() !== 'RESET ALL') return { error: 'Type RESET ALL exactly to confirm.' };
        Store.resetAll();
        UI.toast('All tracker progress was reset.', 'success');
        return { close: true, after: () => safeNavigate('index.html') };
      }
    });
  }
  function exportProgress() {
    const payload = Store.exportObject();
    Store.addActivity('export', 'Exported a progress backup (manual)');
    const text = JSON.stringify(payload, null, 2);
    const filename = 'laravel-mastery-progress-' + new Date().toISOString().slice(0, 10) + '.json';
    try {
      const blob = new Blob([text], { type: 'application/json' });
      if (!window.URL || !window.URL.createObjectURL) throw new Error('Blob URLs are unavailable.');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1500);
      UI.toast('Backup downloaded. Keep it outside your project repository.', 'success');
    } catch (_error) {
      UI.openDialog({
        eyebrow: 'Backup fallback',
        title: 'Copy your progress JSON',
        description: 'Automatic download is unavailable in this browser. Select the JSON below and save it as ' + filename + '.',
        body: '<label class="field"><span>Progress JSON</span><textarea name="json" rows="12" readonly>' + UI.esc(text) + '</textarea></label>',
        submitLabel: 'Done',
        cancelLabel: null,
        onSubmit: () => ({ close: true })
      });
    }
  }
  function showImportPreview(raw) {
    let preview;
    try { preview = Store.previewImport(raw); }
    catch (error) { UI.toast(error.message || 'The backup file is invalid.', 'error'); return; }
    const body = '<div class="import-preview"><div><span>Schema</span><strong>v' + UI.esc(preview.schemaVersion) + '</strong></div><div><span>Task records</span><strong>' + preview.taskCount + '</strong></div><div><span>Completed</span><strong>' + preview.completedCount + '</strong></div><div><span>Blocked</span><strong>' + preview.blockedCount + '</strong></div><div><span>Projects represented</span><strong>' + preview.projects.length + '</strong></div><div><span>Activity</span><strong>' + preview.activityCount + '</strong></div><div><span>Bookmarks</span><strong>' + preview.bookmarks + '</strong></div><div><span>Unknown task IDs</span><strong>' + (preview.unknownTaskIds || 0) + '</strong></div><div><span>Exported</span><strong>' + UI.esc(preview.exportedAt ? UI.formatDate(preview.exportedAt) : 'Unknown') + '</strong></div></div><fieldset class="import-mode"><legend>How should this backup be applied?</legend><label class="radio-card"><input type="radio" name="mode" value="merge" checked><span><strong>Merge</strong><small>Keep current progress, union completion records/notes, and preserve the active project.</small></span></label><label class="radio-card"><input type="radio" name="mode" value="replace"><span><strong>Replace</strong><small>Replace all current progress with this backup after validation.</small></span></label></fieldset><p class="small-copy">Unknown task IDs were rejected or reported; unreadable structures are not imported. No file is applied until you confirm.</p>';
    UI.openDialog({
      eyebrow: 'Validated preview',
      title: 'Import this progress backup?',
      description: 'Review what was found before touching existing progress.',
      body,
      submitLabel: 'Apply import',
      onSubmit: values => {
        const mode = values.mode === 'replace' ? 'replace' : 'merge';
        try {
          const result = Store.importState(raw, mode);
          if (!result.ok) return { error: 'The import could not be applied.' };
          UI.toast('Progress imported (' + mode + ').', 'success');
          return { close: true, after: renderPage };
        } catch (error) { return { error: error.message || 'Import failed. Existing progress was not changed.' }; }
      }
    });
  }
  function readFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) { reject(new Error('No file selected.')); return; }
      if (file.size > 5 * 1024 * 1024) { reject(new Error('Backup is larger than 5 MB.')); return; }
      if (typeof file.text === 'function') {
        file.text().then(resolve).catch(reject);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('The file could not be read.'));
      reader.readAsText(file);
    });
  }
  function applyProjectCardControls() {
    const filter = document.querySelector('[data-project-filter]');
    const sort = document.querySelector('[data-project-sort]');
    const grid = document.querySelector('.project-grid');
    if (!grid) return;
    const needle = filter ? filter.value.toLowerCase().trim() : '';
    const cards = [...grid.querySelectorAll('[data-project-card]')];
    cards.forEach(card => { card.hidden = !!needle && !card.getAttribute('data-project-name').includes(needle); });
    if (sort) {
      cards.sort((a, b) => {
        if (sort.value === 'name') return a.getAttribute('data-project-name').localeCompare(b.getAttribute('data-project-name'));
        if (sort.value === 'progress') return Number(b.getAttribute('data-project-progress')) - Number(a.getAttribute('data-project-progress'));
        return Number(a.getAttribute('data-project-number')) - Number(b.getAttribute('data-project-number'));
      });
      cards.forEach(card => grid.appendChild(card));
    }
  }

  function bindEvents() {
    document.addEventListener('click', event => {
      if (event.target.closest('[data-dialog-form]')) return;
      const el = event.target.closest('[data-action]');
      if (!el) return;
      const action = el.getAttribute('data-action');
      const taskId = el.getAttribute('data-task');
      const projectId = el.getAttribute('data-project');
      if (action === 'start-task') {
        const task = requireTask(taskId); if (!task) return;
        if (!Store.dependenciesComplete(task.id)) { UI.toast('Complete the prerequisite tasks first.', 'error'); return; }
        if (Store.startTask(task.id)) { UI.toast('Task started and position saved.', 'success'); renderPage(); }
        else UI.toast('The task could not be started. Complete prerequisites or reopen a completed task first.', 'error');
      } else if (action === 'complete-task') { showCompletionDialog(taskId); }
      else if (action === 'incomplete-task') {
        const task = requireTask(taskId); if (!task) return;
        UI.confirmDialog({ title: 'Reopen this task?', description: 'Completion, confirmed acceptance and the timestamp for this task will be cleared. Notes, blockers history and all other progress are preserved.', submitLabel: 'Mark incomplete', danger: true, icon: 'arrow-counterclockwise', onConfirm: () => { Store.incompleteTask(task.id); UI.toast('Task reopened. It is no longer counted as complete.', 'success'); return true; } });
      } else if (action === 'block-task') { showBlockDialog(taskId); }
      else if (action === 'unblock-task') {
        const task = requireTask(taskId); if (!task) return;
        UI.confirmDialog({ title: 'Resolve this blocker?', description: 'The task will leave the blocked state. Its previous blocker reason remains in activity history.', submitLabel: 'Unblock task', icon: 'play-circle', onConfirm: () => { Store.unblockTask(task.id); UI.toast('Task unblocked and ready to resume.', 'success'); return true; } });
      } else if (action === 'bookmark-task') {
        const task = requireTask(taskId); if (!task) return;
        const added = Store.toggleBookmark(task.id);
        UI.toast(added ? 'Task bookmarked.' : 'Bookmark removed.', 'success');
        renderPage();
      } else if (action === 'save-notes') {
        const area = document.getElementById('task-notes-input');
        if (area && Store.setNotes(taskId, area.value)) {
          UI.toast('Notes saved locally.', 'success');
          const status = document.querySelector('[data-notes-status]');
          if (status) status.textContent = 'Saved just now.';
        }
      } else if (action === 'toggle-notes') {
        document.getElementById('task-notes')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => document.getElementById('task-notes-input')?.focus(), 250);
      } else if (action === 'record-git') { showGitDialog(taskId, projectId); }
      else if (action === 'export-progress') { exportProgress(); }
      else if (action === 'export-project-plan') {
        const project = LM.projects.find(item => item.id === projectId);
        if (!project || !window.LM_EXPORT) return;
        const text = window.LM_EXPORT.projectMarkdown(projectId);
        const name = 'project-' + String(project.number).padStart(2, '0') + '-' + project.slug + '-plan.md';
        if (window.LM_EXPORT.download(name, text)) UI.toast('Full project implementation plan exported as Markdown.', 'success');
        else UI.toast('The download could not start in this browser.', 'error');
      }
      else if (action === 'copy-task-markdown') {
        if (!window.LM_EXPORT) return;
        const text = window.LM_EXPORT.taskMarkdown(taskId);
        if (!text) return;
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => UI.toast('Task copied as Markdown.', 'success')).catch(() => UI.toast('Copy failed; select the task text manually.', 'error'));
        else UI.toast('Clipboard is unavailable in this browser.', 'error');
      }
      else if (action === 'export-curriculum') {
        if (!window.LM_EXPORT) return;
        const all = LM.projects.map(project => '\n\n---\n\n' + window.LM_EXPORT.projectMarkdown(project.id)).join('');
        if (window.LM_EXPORT.download('laravel-mastery-full-curriculum.md', '# Laravel Engineering Mastery — complete curriculum\n' + all)) UI.toast('All ten project plans exported as one Markdown file.', 'success');
        else UI.toast('The download could not start in this browser.', 'error');
      }
      else if (action === 'recover-previous') {
        UI.confirmDialog({ title: 'Recover the previous local copy?', description: 'The tracker keeps a best-effort copy of the last stored state. Export your current in-memory progress before recovering if possible.', submitLabel: 'Recover copy', icon: 'arrow-counterclockwise', onConfirm: () => { try { Store.recoverPrevious(); UI.toast('Previous local copy recovered.', 'success'); setTimeout(renderPage, 50); return true; } catch (error) { UI.toast(error.message, 'error'); return false; } } });
      } else if (action === 'reset-project') {
        const select = document.getElementById('reset-project-select');
        if (select && select.value) showResetDialog(select.value);
      } else if (action === 'reset-all') { showResetAllDialog(); }
      else if (action === 'complete-project') { showProjectCompleteDialog(projectId); }
      else if (action === 'reopen-project') {
        const project = LM.projects.find(item => item.id === projectId); if (!project) return;
        UI.confirmDialog({ title: 'Reopen a completed project?', description: 'The completion date will be cleared while the original completion and activity records remain explainable. Mandatory task completion is not erased.', submitLabel: 'Reopen project', danger: true, icon: 'arrow-counterclockwise', onConfirm: () => { Store.reopenProject(projectId); UI.toast('Project reopened for enhancements.', 'success'); return true; } });
      }
    });
    document.addEventListener('change', event => {
      const picker = event.target.closest('[data-project-picker]');
      if (picker) {
        const target = picker.value;
        const page = document.body.getAttribute('data-page');
        if (page === 'roadmap') safeNavigate('roadmap.html?project=' + encodeURIComponent(target));
        else if (page === 'project') safeNavigate('project.html?project=' + encodeURIComponent(target));
        else safeNavigate('project.html?project=' + encodeURIComponent(target));
        return;
      }
      if (event.target.matches('[data-project-sort]')) { applyProjectCardControls(); return; }
      if (event.target.matches('[data-import-input]')) {
        const file = event.target.files && event.target.files[0];
        readFile(file).then(text => {
          let parsed;
          try { parsed = JSON.parse(text); } catch (_error) { UI.toast('That file is not valid JSON. Existing progress was not changed.', 'error'); return; }
          showImportPreview(parsed);
        }).catch(error => UI.toast(error.message || 'The backup could not be read.', 'error'));
        event.target.value = '';
      }
    });
    document.addEventListener('input', event => {
      if (event.target.matches('[data-project-filter]')) applyProjectCardControls();
      if (event.target.id === 'task-notes-input') {
        const status = document.querySelector('[data-notes-status]');
        if (status) status.textContent = 'Unsaved changes.';
      }
    });
    document.addEventListener('focusout', event => {
      if (event.target.id === 'task-notes-input') {
        const status = document.querySelector('[data-notes-status]');
        const id = new URLSearchParams(window.location.search).get('task');
        if (id && LM.taskIndex[id] && Store.setNotes(id, event.target.value)) {
          if (status) status.textContent = 'Saved automatically.';
        }
      }
    });
    document.addEventListener('submit', event => {
      if (event.target.closest('[data-dialog-form]')) return;
      const form = event.target.closest('[data-project-meta-form]');
      if (!form) return;
      event.preventDefault();
      const projectId = form.getAttribute('data-project');
      const values = Object.fromEntries(new FormData(form).entries());
      if (values.repoUrl && !/^https?:\/\/.+/i.test(values.repoUrl.trim())) { UI.toast('Repository URL must start with http:// or https://.', 'error'); return; }
      if (values.deploymentUrl && !/^https?:\/\/.+/i.test(values.deploymentUrl.trim())) { UI.toast('Deployment URL must start with http:// or https://.', 'error'); return; }
      if (values.testEvidence && values.testEvidence.trim().length < 20) { UI.toast('Test evidence must describe the actual execution in at least 20 characters.', 'error'); return; }
      if (values.finalReport && values.finalReport.trim().length < 20) { UI.toast('The final report must be at least 20 characters.', 'error'); return; }
      const result = Store.updateProjectMeta(projectId, values);
      if (result) { UI.toast('Project record saved locally.', 'success'); renderPage(); }
      else UI.toast('Project record could not be saved because storage is unavailable.', 'error');
    });
  }

  function boot() {
    Store.init();
    UI.initGlobal();
    bindEvents();
    window.LM_ROUTER = { refresh: renderPage };
    renderPage();
    if (Store.snapshot().blocked) {
      setTimeout(() => UI.renderStorageBanner(), 0);
    }
    document.body.classList.add('is-ready');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
