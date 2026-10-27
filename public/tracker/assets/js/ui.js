/* Shared UI components and shell for the static tracker. */
(function () {
  'use strict';
  const LM = window.LM;
  const Store = window.LMStore;
  const PAGE_NAMES = { dashboard: 'Dashboard', projects: 'Projects', project: 'Project', roadmap: 'Roadmap', task: 'Task', progress: 'Progress', settings: 'Settings', notFound: 'Not found' };
  const esc = value => String(value === null || value === undefined ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const icon = name => '<i class="bi bi-' + esc(name) + '" aria-hidden="true"></i>';
  function formatDate(value, options) {
    if (!value) return 'Not recorded';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleString('en-US', Object.assign({ year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }, options || {}));
  }
  function formatDay(value) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  function effortLabel(minutes) {
    const value = Number(minutes) || 0;
    if (value < 60) return value + ' min';
    const hours = Math.floor(value / 60);
    const rest = value % 60;
    return hours + ' hr' + (hours === 1 ? '' : 's') + (rest ? ' ' + rest + ' min' : '');
  }
  function statusLabel(status) {
    return ({ not_started: 'Not started', in_progress: 'In progress', blocked: 'Blocked', completed: 'Completed' })[status] || status;
  }
  function statusBadge(status) {
    return '<span class="status-pill status-' + esc(status) + '"><span class="status-dot"></span>' + esc(statusLabel(status)) + '</span>';
  }
  function projectStatusBadge(projectId) {
    const meta = Store.get().projects[projectId] || {};
    if (meta.completedAt) return '<span class="badge-soft badge-green">Completed</span>';
    const p = Store.progress(projectId);
    if (p.total && p.completed === p.total) return '<span class="badge-soft badge-blue">Ready for review</span>';
    if (p.blocked) return '<span class="badge-soft badge-red">Blocked items</span>';
    if (meta.reopenedAt) return '<span class="badge-soft badge-amber">Reopened</span>';
    if (p.completed > 0 || p.inProgress > 0 || meta.startedAt) return '<span class="badge-soft badge-amber">In progress</span>';
    return '<span class="badge-soft">Not started</span>';
  }
  function progressBar(percent, label) {
    return '<div class="progress-track" role="progressbar" aria-valuenow="' + Math.min(100, Math.max(0, percent)) + '" aria-valuemin="0" aria-valuemax="100" aria-label="' + esc(label || 'Progress') + '"><span style="width:' + Math.min(100, Math.max(0, percent)) + '%"></span></div>';
  }
  function codeBlock(code, label) {
    if (!code) return '';
    const id = 'code-' + Math.random().toString(36).slice(2, 9);
    return '<div class="code-wrap"><div class="code-toolbar"><span>' + esc(label || 'Reference code') + '</span><button type="button" class="btn-copy" data-copy-target="' + id + '">' + icon('copy') + ' Copy</button></div><pre id="' + id + '" tabindex="0"><code>' + esc(code) + '</code></pre></div>';
  }
  function commandBlock(command) { return command ? codeBlock(command, 'Terminal commands') : ''; }
  function emptyState(title, message, actionHtml) {
    return '<div class="empty-state"><div class="empty-icon">' + icon('inboxes') + '</div><h3>' + esc(title) + '</h3><p>' + esc(message) + '</p>' + (actionHtml || '') + '</div>';
  }
  function projectLabel(projectId) {
    const project = LM.projects.find(item => item.id === projectId);
    return project ? 'Project ' + String(project.number).padStart(2, '0') : 'Project';
  }
  function taskUrl(taskId) { const task = LM.taskIndex[taskId]; return 'task.html?task=' + encodeURIComponent(taskId) + '&project=' + encodeURIComponent(task ? task.projectId : 'p01'); }
  function projectUrl(projectId) { return 'project.html?project=' + encodeURIComponent(projectId); }
  function roadmapUrl(projectId, extra) { return 'roadmap.html?project=' + encodeURIComponent(projectId) + (extra ? '&' + extra : ''); }
  function topbar(page) {
    const snapshot = Store.snapshot();
    const state = Store.get();
    const project = LM.projects.find(item => item.id === state.activeProjectId) || LM.projects[0];
    return '<button class="icon-btn menu-toggle" type="button" data-action="toggle-menu" aria-label="Open navigation" aria-controls="sidebar" aria-expanded="false">' + icon('list') + '</button>' +
      '<form class="global-search" role="search" action="projects.html" method="get"><label class="visually-hidden" for="global-search">Search projects and tasks</label>' + icon('search') +
      '<input id="global-search" name="q" type="search" autocomplete="off" placeholder="Search projects, modules or tasks…" value="' + esc(page.query || '') + '"><kbd>/</kbd></form>' +
      '<div class="topbar-right"><a class="topbar-context" href="' + roadmapUrl(project.id) + '">' + icon('folder2-open') + '<span>' + esc('P' + String(project.number).padStart(2, '0')) + '</span></a>' +
      '<span class="save-indicator" id="save-indicator" title="Progress is stored only in this browser">' + icon('cloud-check') + '<span>' + (snapshot.savedAt ? 'Saved ' + formatDate(snapshot.savedAt, { hour: '2-digit', minute: '2-digit' }) : 'Not saved yet') + '</span></span>' +
      '<button class="icon-btn" type="button" data-action="toggle-theme" aria-label="Toggle dark mode" title="Toggle dark mode">' + icon(state.preferences.theme === 'dark' ? 'sun' : 'moon-stars') + '</button>' +
      '<a class="icon-btn" href="settings.html" aria-label="Settings and backup" title="Settings and backup">' + icon('gear') + '</a></div>';
  }
  function sidebar(page) {
    const state = Store.get();
    const global = Store.globalProgress();
    const activeProject = LM.projects.find(item => item.id === state.activeProjectId) || LM.projects[0];
    const activeProgress = Store.progress(activeProject.id);
    const nav = [
      ['index.html', 'dashboard', 'grid-1x2', 'Dashboard'],
      ['projects.html', 'projects', 'collection', 'Projects'],
      ['roadmap.html?project=' + activeProject.id, 'roadmap', 'map', 'Active roadmap'],
      ['progress.html', 'progress', 'bar-chart-line', 'Progress & activity'],
      ['handbook.html', 'handbook', 'journal-richtext', 'Engineering handbook'],
      ['settings.html', 'settings', 'gear', 'Settings & backup']
    ];
    return '<a class="brand" href="index.html" aria-label="Laravel Mastery dashboard"><span class="brand-mark">' + icon('box-seam') + '</span><span class="brand-copy"><strong>Laravel <span>Mastery</span></strong><small>10 REAL-WORLD PROJECTS</small></span></a>' +
      '<div class="sidebar-scroll"><p class="nav-label">Workspace</p><nav class="nav-list" aria-label="Workspace">' +
      nav.map(([href, key, ico, text]) => '<a class="nav-link' + (page.page === key ? ' active' : '') + '" href="' + href + '"' + (page.page === key ? ' aria-current="page"' : '') + '>' + icon(ico) + '<span>' + text + '</span>' + (key === 'projects' ? '<span class="nav-count">' + LM.projects.length + '</span>' : '') + '</a>').join('') +
      '</nav><div class="active-project-card"><div class="apc-top"><span class="nav-label">Active project</span>' + projectStatusBadge(activeProject.id) + '</div><a class="apc-title" href="' + projectUrl(activeProject.id) + '">P' + String(activeProject.number).padStart(2, '0') + ' · ' + esc(activeProject.title) + '</a>' + progressBar(activeProgress.percent, 'Active project progress') +
      '<div class="apc-meta"><span>' + activeProgress.completed + '/' + activeProgress.total + ' steps</span><strong>' + activeProgress.percent + '%</strong></div>' +
      '<a class="btn btn-accent btn-sm w-100" href="index.html#continue">' + icon('play-fill') + ' Continue learning</a></div>' +
      '<p class="nav-label nav-label-spaced">All projects</p><nav class="project-nav" aria-label="All projects">' + LM.projects.map(project => {
        const p = Store.progress(project.id); const meta = state.projects[project.id];
        return '<a class="project-nav-link' + (project.id === activeProject.id ? ' current' : '') + '" href="' + roadmapUrl(project.id) + '"><span class="pn-number">' + String(project.number).padStart(2, '0') + '</span><span class="pn-text"><span>' + esc(project.title) + '</span><small>' + p.completed + '/' + p.total + ' · ' + (meta.completedAt ? 'complete' : p.blocked ? p.blocked + ' blocked' : p.completed ? 'in progress' : 'not started') + '</small></span></a>';
      }).join('') + '</nav>' +
      '<div class="sidebar-note">' + icon('shield-lock') + '<div><strong>Local-only progress</strong><p>Saved in this browser. Export backups from Settings.</p></div></div></div>' +
      '<div class="sidebar-footer"><a href="https://laravel.com/docs/12.x" target="_blank" rel="noopener noreferrer">' + icon('book') + '<span>Laravel 12 docs</span>' + icon('box-arrow-up-right') + '</a><span class="version-chip">Curriculum 2026.2</span></div>';
  }
  function mountShell(page) {
    document.documentElement.lang = 'en';
    document.documentElement.dataset.theme = Store.get().preferences.theme;
    const sidebarEl = document.querySelector('[data-shell="sidebar"]');
    const topbarEl = document.querySelector('[data-shell="topbar"]');
    if (sidebarEl) sidebarEl.innerHTML = sidebar(page);
    if (topbarEl) topbarEl.innerHTML = topbar(page);
    const crumb = document.querySelector('[data-shell="breadcrumb"]');
    if (crumb) crumb.innerHTML = '<a href="index.html">Workspace</a>' + icon('chevron-right') + '<span>' + esc(page.title || PAGE_NAMES[page.page] || 'Workspace') + '</span>';
    const footer = document.querySelector('[data-shell="footer"]');
    if (footer) footer.innerHTML = '<span>Laravel Engineering Mastery · Curriculum revision 2026.2</span><span class="footer-links"><a href="' + 'README.md' + '" target="_blank" rel="noopener">README</a><a href="MANIFEST.md" target="_blank" rel="noopener">Manifest</a><a href="settings.html">Backup</a></span>';
    renderStorageBanner();
    updateThemeButtons();
  }
  function updateShell() {
    const page = window.LM_PAGE || { page: 'dashboard' };
    mountShell(page);
  }
  function updateSaveIndicator() {
    const indicator = document.getElementById('save-indicator');
    if (!indicator) return;
    const snapshot = Store.snapshot();
    indicator.innerHTML = icon(snapshot.blocked ? 'exclamation-triangle' : 'cloud-check') + '<span>' + (snapshot.blocked ? 'Saving paused' : snapshot.savedAt ? 'Saved ' + formatDate(snapshot.savedAt, { hour: '2-digit', minute: '2-digit' }) : 'Not saved yet') + '</span>';
    indicator.classList.toggle('save-warning', !!snapshot.blocked);
  }
  function renderStorageBanner() {
    const existing = document.getElementById('storage-banner');
    const snapshot = Store.snapshot();
    if (!snapshot.blocked && !snapshot.conflict) { if (existing) existing.remove(); return; }
    if (existing) { existing.innerHTML = storageBannerHTML(snapshot); return; }
    const banner = document.createElement('div');
    banner.id = 'storage-banner';
    banner.className = 'storage-banner';
    banner.innerHTML = storageBannerHTML(snapshot);
    const main = document.querySelector('.app-main');
    if (main) main.insertBefore(banner, main.querySelector('.page'));
  }
  function storageBannerHTML(snapshot) {
    return icon('exclamation-triangle') + '<div><strong>Storage protection is active.</strong><p>' + esc(snapshot.readError || (snapshot.conflict ? 'Another tab changed the saved data. Saving is paused to prevent overwriting it.' : 'Saving is paused because browser storage is unavailable or full.')) + '</p></div><a class="btn btn-outline btn-sm" href="settings.html">Recovery options</a>';
  }
  function toast(message, type) {
    const region = document.getElementById('toast-region');
    if (!region) return;
    const el = document.createElement('div');
    el.className = 'toast-message toast-' + (type || 'info');
    el.setAttribute('role', 'status');
    el.innerHTML = icon(type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle') + '<span>' + esc(message) + '</span>';
    region.appendChild(el);
    setTimeout(() => { el.classList.add('leaving'); setTimeout(() => el.remove(), 250); }, 4200);
  }
  let dialogSubmit = null;
  let lastFocused = null;
  function openDialog(options) {
    const layer = document.getElementById('app-dialog');
    lastFocused = document.activeElement;
    if (!layer) return;
    dialogSubmit = options.onSubmit || null;
    layer.innerHTML = '<div class="dialog-backdrop" data-close-dialog></div><div class="dialog-card" role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabindex="-1"><div class="dialog-head"><div><p class="eyebrow">' + esc(options.eyebrow || 'Confirm') + '</p><h2 id="dialog-title">' + esc(options.title) + '</h2>' + (options.description ? '<p class="dialog-description">' + esc(options.description) + '</p>' : '') + '</div><button class="icon-btn" type="button" data-close-dialog aria-label="Close dialog">' + icon('x-lg') + '</button></div><form class="dialog-body" data-dialog-form novalidate>' + (options.body || '') + '<div class="dialog-error" data-dialog-error role="alert" hidden></div><div class="dialog-actions">' + (options.cancelLabel === null ? '' : '<button type="button" class="btn btn-outline" data-close-dialog>' + esc(options.cancelLabel || 'Cancel') + '</button>') + '<button type="submit" class="btn ' + (options.danger ? 'btn-danger' : 'btn-accent') + '">' + icon(options.icon || (options.danger ? 'exclamation-triangle' : 'check2')) + ' ' + esc(options.submitLabel || 'Confirm') + '</button></div></form></div>';
    layer.hidden = false;
    document.body.classList.add('dialog-open');
    const card = layer.querySelector('.dialog-card');
    setTimeout(() => card && card.focus(), 10);
    const firstInput = layer.querySelector('input, textarea, select');
    if (firstInput) setTimeout(() => firstInput.focus(), 40);
  }
  function closeDialog() {
    const layer = document.getElementById('app-dialog');
    if (!layer) return;
    layer.hidden = true;
    layer.innerHTML = '';
    document.body.classList.remove('dialog-open');
    dialogSubmit = null;
    if (lastFocused && typeof lastFocused.focus === 'function') { try { lastFocused.focus(); } catch (_error) { /* element may no longer exist */ } }
    lastFocused = null;
  }
  function confirmDialog(options) {
    openDialog({ eyebrow: 'Please confirm', title: options.title, description: options.description, body: options.body || '', submitLabel: options.submitLabel || 'Confirm', danger: options.danger, icon: options.icon, onSubmit: values => { const result = options.onConfirm ? options.onConfirm(values) : null; return result === false ? { error: 'The action could not be completed.' } : { close: true }; } });
  }
  function initGlobal() {
    document.addEventListener('click', event => {
      const close = event.target.closest('[data-close-dialog]');
      if (close) { event.preventDefault(); closeDialog(); return; }
      const themeButton = event.target.closest('[data-action="toggle-theme"]');
      if (themeButton) {
        const next = Store.get().preferences.theme === 'dark' ? 'light' : 'dark';
        Store.setTheme(next);
        document.documentElement.dataset.theme = next;
        updateShell();
        updateThemeButtons();
        return;
      }
      const menu = event.target.closest('[data-action="toggle-menu"]');
      if (menu) {
        const open = document.body.classList.toggle('nav-open');
        menu.setAttribute('aria-expanded', open ? 'true' : 'false');
        return;
      }
      if (event.target.closest('.sidebar-backdrop')) { document.body.classList.remove('nav-open'); return; }
      const copy = event.target.closest('[data-copy-target]');
      if (copy) {
        const target = document.getElementById(copy.getAttribute('data-copy-target'));
        if (target) {
          const text = target.innerText || target.textContent || '';
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => { copy.innerHTML = icon('check2') + ' Copied'; toast('Copied to clipboard.', 'success'); }).catch(() => fallbackCopy(text, copy));
          else fallbackCopy(text, copy);
        }
      }
    });
    document.addEventListener('submit', event => {
      const form = event.target.closest('[data-dialog-form]');
      if (!form) return;
      event.preventDefault();
      if (!dialogSubmit) return;
      const values = {};
      new FormData(form).forEach((value, key) => { values[key] = value; });
      let result;
      try { result = dialogSubmit(values, form); }
      catch (error) { result = { error: error.message || 'The action failed.' }; }
      if (result && result.error) {
        const error = form.querySelector('[data-dialog-error]');
        if (error) { error.hidden = false; error.textContent = result.error; }
        return;
      }
      closeDialog();
      if (result && result.after) result.after();
      if (window.LM_ROUTER && window.LM_ROUTER.refresh) window.LM_ROUTER.refresh();
    });
    document.addEventListener('keydown', event => {
      const dialogLayer = document.getElementById('app-dialog');
      if (event.key === 'Tab' && dialogLayer && !dialogLayer.hidden) {
        const focusable = [...dialogLayer.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]')].filter(element => element.offsetParent !== null);
        if (focusable.length) {
          const first = focusable[0], last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      }
      if (event.key === 'Escape') {
        closeDialog();
        document.body.classList.remove('nav-open');
      }
      if (event.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
        const search = document.getElementById('global-search');
        if (search) { event.preventDefault(); search.focus(); }
      }
    });
    window.addEventListener('storage', event => {
      if (event.key === Store.KEY) {
        Store.setConflict(true);
        renderStorageBanner();
        updateSaveIndicator();
        toast('Another tab changed the stored progress. Saving is paused; reload the saved copy from Settings.', 'error');
      }
    });
    Store.subscribe(() => {
      updateSaveIndicator();
      updateShell();
    });
  }
  function fallbackCopy(text, button) {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand('copy');
      button.innerHTML = icon('check2') + ' Copied';
      toast('Copied to clipboard.', 'success');
    } catch (_error) {
      toast('Copy failed. Select the text and copy it manually.', 'error');
    }
    area.remove();
  }
  function updateThemeButtons() {
    const dark = Store.get().preferences.theme === 'dark';
    document.querySelectorAll('[data-action="toggle-theme"]').forEach(button => {
      const label = button.querySelector('[data-theme-label]');
      const glyph = button.querySelector('i');
      if (label && glyph) {
        glyph.className = 'bi bi-' + (dark ? 'sun' : 'moon-stars');
        label.textContent = dark ? 'Light theme' : 'Dark theme';
        button.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
        return;
      }
      button.innerHTML = icon(dark ? 'sun' : 'moon-stars');
      button.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    });
  }
  function renderErrorPage(title, message) {
    const main = document.getElementById('main');
    if (!main) return;
    main.innerHTML = '<div class="error-page"><div class="error-code">404</div><p class="eyebrow" style="justify-content:center"><span class="dot"></span> Route not found</p><h1>' + esc(title) + '</h1><p>' + esc(message) + '</p><div class="hero-actions"><a class="btn btn-accent" href="index.html">' + icon('house') + ' Dashboard</a><a class="btn btn-outline" href="projects.html">Browse projects</a><a class="btn btn-outline" href="handbook.html">' + icon('journal-richtext') + ' Handbook</a></div><div class="error-links"><a href="roadmap.html">Open the active roadmap</a><a href="progress.html">Review progress</a><a href="settings.html">Restore a backup</a></div></div>';
    document.title = 'Page not found · Laravel Mastery';
  }

  window.LMUI = {
    esc, icon, formatDate, formatDay, effortLabel, statusLabel, statusBadge, projectStatusBadge, progressBar,
    codeBlock, commandBlock, emptyState, taskUrl, projectUrl, roadmapUrl, projectLabel,
    mountShell, updateShell, updateSaveIndicator, renderStorageBanner, toast, openDialog, closeDialog, confirmDialog,
    initGlobal, renderErrorPage, updateThemeButtons
  };
})();
