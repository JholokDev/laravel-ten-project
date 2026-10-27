/* Versioned LocalStorage progress store. Curriculum content stays immutable and separate. */
(function () {
  'use strict';
  const KEY = 'laravel_mastery_progress_v1';
  const PREVIOUS_KEY = 'laravel_mastery_progress_v1_previous';
  const VERSION = 1;
  const LM = window.LM;

  let state = null;
  let readError = '';
  let writeBlocked = false;
  let conflict = false;
  let lastSavedAt = null;
  const listeners = new Set();

  function now() { return new Date().toISOString(); }
  function cleanText(value, max) { return typeof value === 'string' ? value.slice(0, max || 10000) : ''; }
  function newId(prefix) { return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }
  function projectMeta() {
    return {
      startedAt: null, completedAt: null, reopenedAt: null, completionHistory: [], repoUrl: '', branch: 'main',
      lastCommit: '', lastPushStatus: 'Not pushed', deploymentStatus: 'not_deployed',
      deploymentUrl: '', testEvidence: '', finalReport: '', gitCheckpoints: []
    };
  }
  function defaultState() {
    const projects = {};
    LM.projects.forEach(project => { projects[project.id] = projectMeta(); });
    return {
      schemaVersion: VERSION,
      curriculumRevision: '2026.2',
      createdAt: now(), updatedAt: now(),
      activeProjectId: 'p01', activeTaskId: null,
      projects,
      tasks: {},
      bookmarks: [],
      activity: [],
      preferences: { theme: 'light', taskPageSize: 'all' },
      dataNotice: 'Progress is stored only in this browser. Export a backup regularly; LocalStorage is not a secure database and does not sync.'
    };
  }
  function taskStatus(record) {
    if (!record) return 'not_started';
    if (record.completedAt) return 'completed';
    if (record.blockedReason) return 'blocked';
    if (record.startedAt) return 'in_progress';
    return 'not_started';
  }
  function sanitizeTaskRecord(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const record = {};
    ['startedAt', 'completedAt', 'blockedAt', 'updatedAt'].forEach(key => {
      if (typeof raw[key] === 'string' && !Number.isNaN(Date.parse(raw[key]))) record[key] = new Date(raw[key]).toISOString();
    });
    if (raw.blockedReason) record.blockedReason = cleanText(raw.blockedReason, 2000);
    if (typeof raw.notes === 'string') record.notes = cleanText(raw.notes, 20000);
    if (Array.isArray(raw.accepted)) record.accepted = raw.accepted.filter(index => Number.isInteger(index));
    if (Array.isArray(raw.checklist)) record.checklist = raw.checklist.filter(value => typeof value === 'string').slice(0, 100);
    return Object.keys(record).length ? record : null;
  }
  function sanitizeMeta(raw) {
    const meta = projectMeta();
    if (!raw || typeof raw !== 'object') return meta;
    if (raw.startedAt && !Number.isNaN(Date.parse(raw.startedAt))) meta.startedAt = new Date(raw.startedAt).toISOString();
    if (raw.completedAt && !Number.isNaN(Date.parse(raw.completedAt))) meta.completedAt = new Date(raw.completedAt).toISOString();
    if (raw.reopenedAt && !Number.isNaN(Date.parse(raw.reopenedAt))) meta.reopenedAt = new Date(raw.reopenedAt).toISOString();
    meta.completionHistory = Array.isArray(raw.completionHistory) ? raw.completionHistory.filter(item => item && item.completedAt && !Number.isNaN(Date.parse(item.completedAt))).slice(0, 20).map(item => ({ completedAt: new Date(item.completedAt).toISOString(), reopenedAt: item.reopenedAt && !Number.isNaN(Date.parse(item.reopenedAt)) ? new Date(item.reopenedAt).toISOString() : null })) : [];
    const safeUrl = value => /^https?:\/\/.+/i.test(String(value || '').trim()) ? String(value).trim().slice(0, 500) : '';
    meta.repoUrl = safeUrl(raw.repoUrl);
    meta.branch = cleanText(raw.branch, 200) || 'main';
    meta.lastCommit = cleanText(raw.lastCommit, 100);
    meta.lastPushStatus = ['Not pushed', 'Pushed', 'Push failed', 'Unknown'].includes(raw.lastPushStatus) ? raw.lastPushStatus : 'Not pushed';
    meta.deploymentStatus = ['not_deployed', 'staging', 'production', 'deployment_failed'].includes(raw.deploymentStatus) ? raw.deploymentStatus : 'not_deployed';
    meta.deploymentUrl = safeUrl(raw.deploymentUrl);
    meta.testEvidence = cleanText(raw.testEvidence, 10000);
    meta.finalReport = cleanText(raw.finalReport, 20000);
    meta.gitCheckpoints = Array.isArray(raw.gitCheckpoints) ? raw.gitCheckpoints.filter(item => item && typeof item === 'object').slice(0, 200).map(item => ({
      at: item.at && !Number.isNaN(Date.parse(item.at)) ? new Date(item.at).toISOString() : now(),
      taskId: typeof item.taskId === 'string' ? item.taskId : '',
      hash: cleanText(item.hash, 60), message: cleanText(item.message, 500), branch: cleanText(item.branch, 200),
      pushed: typeof item.pushed === 'boolean' ? item.pushed : false, note: cleanText(item.note, 1000)
    })) : [];
    return meta;
  }
  function sanitizeActivity(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.filter(item => item && typeof item === 'object').slice(0, 2000).map(item => ({
      id: typeof item.id === 'string' ? item.id.slice(0, 120) : newId('act'),
      at: item.at && !Number.isNaN(Date.parse(item.at)) ? new Date(item.at).toISOString() : now(),
      type: cleanText(item.type, 50) || 'note',
      projectId: LM.curricula[item.projectId] ? item.projectId : 'p01',
      taskId: typeof item.taskId === 'string' ? item.taskId.slice(0, 200) : '',
      message: cleanText(item.message, 2000)
    }));
  }
  function sanitizeState(raw, { strict } = { strict: true }) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('The file is not a progress object.');
    if (Number(raw.schemaVersion) !== VERSION) throw new Error('Unsupported progress schema version. Expected version ' + VERSION + '.');
    if (!raw.tasks || typeof raw.tasks !== 'object' || Array.isArray(raw.tasks)) throw new Error('The progress file has no task records.');
    const next = defaultState();
    if (raw.createdAt && !Number.isNaN(Date.parse(raw.createdAt))) next.createdAt = new Date(raw.createdAt).toISOString();
    next.activeProjectId = LM.curricula[raw.activeProjectId] ? raw.activeProjectId : 'p01';
    next.activeTaskId = typeof raw.activeTaskId === 'string' && LM.taskIndex[raw.activeTaskId] ? raw.activeTaskId : null;
    next.preferences.theme = raw.preferences && raw.preferences.theme === 'dark' ? 'dark' : 'light';
    next.preferences.taskPageSize = ['all', '25', '50'].includes(raw.preferences && raw.preferences.taskPageSize) ? raw.preferences.taskPageSize : 'all';
    let known = 0; let unknown = 0;
    Object.entries(raw.tasks).forEach(([id, record]) => {
      if (!LM.taskIndex[id]) { unknown += 1; return; }
      const safe = sanitizeTaskRecord(record);
      if (safe) {
        const task = LM.taskIndex[id];
        if (safe.completedAt && (!Array.isArray(safe.accepted) || safe.accepted.length !== task.acceptance.length)) {
          delete safe.completedAt;
          delete safe.accepted;
          safe.startedAt = safe.startedAt || now();
        }
        next.tasks[id] = safe; known += 1;
      }
    });
    if (strict && known === 0 && Object.keys(raw.tasks).length > 0) throw new Error('The progress file contains no task IDs recognized by this curriculum.');
    if (strict && unknown > 0 && unknown === Object.keys(raw.tasks).length) throw new Error('None of the imported task IDs exist in this curriculum version.');
    LM.projects.forEach(project => {
      if (raw.projects && raw.projects[project.id]) next.projects[project.id] = sanitizeMeta(raw.projects[project.id]);
      const records = Object.keys(next.tasks).filter(id => LM.taskIndex[id] && LM.taskIndex[id].projectId === project.id);
      if (records.length && !next.projects[project.id].startedAt) next.projects[project.id].startedAt = (next.tasks[records[0]] && next.tasks[records[0]].startedAt) || now();
      const meta = next.projects[project.id];
      if (meta.completedAt) {
        const allComplete = LM.curricula[project.id].tasks.every(task => next.tasks[task.id] && next.tasks[task.id].completedAt);
        if (!allComplete) {
          meta.completionHistory = (meta.completionHistory || []).concat([{ completedAt: meta.completedAt, reopenedAt: now() }]).slice(-20);
          meta.completedAt = null;
          meta.reopenedAt = now();
        }
      }
    });
    next.bookmarks = Array.isArray(raw.bookmarks) ? [...new Set(raw.bookmarks.filter(id => LM.taskIndex[id]))] : [];
    next.activity = sanitizeActivity(raw.activity);
    next.updatedAt = now();
    return next;
  }
  function persist() {
    if (writeBlocked || conflict) return false;
    try {
      const serialized = JSON.stringify(state);
      const current = localStorage.getItem(KEY);
      if (current === serialized) return true;
      if (current) {
        try { localStorage.setItem(PREVIOUS_KEY, current); } catch (_error) { /* best effort only */ }
      }
      localStorage.setItem(KEY, serialized);
      lastSavedAt = now();
      return true;
    } catch (error) {
      writeBlocked = true;
      notify();
      return false;
    }
  }
  function commit() {
    state.updatedAt = now();
    const ok = persist();
    notify();
    return ok;
  }
  function notify() { listeners.forEach(listener => { try { listener(snapshot()); } catch (_error) { /* UI listeners must not break persistence */ } }); }
  function snapshot() {
    return { state, savedAt: lastSavedAt, blocked: writeBlocked || !!readError || conflict, readError, conflict };
  }
  function addActivity(type, message, projectId, taskId) {
    state.activity.unshift({ id: newId('act'), at: now(), type, message: cleanText(message, 2000), projectId: projectId || state.activeProjectId, taskId: taskId || '' });
    state.activity = state.activity.slice(0, 1000);
  }
  function init() {
    const base = defaultState();
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) { state = base; lastSavedAt = null; return snapshot(); }
      state = sanitizeState(JSON.parse(raw), { strict: false });
      lastSavedAt = state.updatedAt;
    } catch (error) {
      readError = 'Saved progress could not be read safely. Saving is paused so the stored copy is not overwritten. Import a valid backup or reset progress explicitly.';
      state = base;
      writeBlocked = true;
    }
    return snapshot();
  }
  function get() { return state; }
  function saveNow() { return commit(); }
  function ensureProject(projectId) {
    if (!LM.curricula[projectId]) throw new Error('Unknown project.');
    if (!state.projects[projectId]) state.projects[projectId] = projectMeta();
    if (!state.projects[projectId].startedAt) state.projects[projectId].startedAt = now();
    return state.projects[projectId];
  }
  function recordFor(id) { return state.tasks[id] || null; }
  function statusOf(id) { return taskStatus(state.tasks[id]); }
  function acceptancePassed(id) {
    const task = LM.taskIndex[id];
    const record = state.tasks[id];
    if (!task || !record) return false;
    return Array.isArray(record.accepted) && record.accepted.length === task.acceptance.length;
  }
  function dependenciesComplete(id) {
    const task = LM.taskIndex[id];
    if (!task) return false;
    return (task.dependencies || []).every(dep => state.tasks[dep] && !!state.tasks[dep].completedAt);
  }
  function startProject(projectId) {
    if (!LM.curricula[projectId]) return false;
    const changedProject = state.activeProjectId !== projectId;
    state.activeProjectId = projectId;
    ensureProject(projectId);
    if (!state.activeTaskId || LM.taskIndex[state.activeTaskId].projectId !== projectId) {
      const next = recommendation(projectId);
      state.activeTaskId = next ? next.id : null;
    }
    if (!changedProject) return true;
    addActivity('project', 'Opened project ' + projectId, projectId, state.activeTaskId);
    return commit();
  }
  function focus(projectId, taskId) {
    if (!LM.curricula[projectId]) return false;
    let changed = false;
    if (state.activeProjectId !== projectId) { state.activeProjectId = projectId; changed = true; }
    if (taskId && LM.taskIndex[taskId] && LM.taskIndex[taskId].projectId === projectId && state.activeTaskId !== taskId) {
      state.activeTaskId = taskId;
      changed = true;
    }
    return changed ? commit() : true;
  }
  function startTask(id) {
    const task = LM.taskIndex[id];
    if (!task) return false;
    if (!dependenciesComplete(id)) return false;
    const record = state.tasks[id] || {};
    if (!record.startedAt) record.startedAt = now();
    if (record.completedAt) return false;
    state.tasks[id] = record;
    state.activeProjectId = task.projectId;
    state.activeTaskId = id;
    ensureProject(task.projectId);
    addActivity('start', 'Started: ' + task.title, task.projectId, id);
    return commit();
  }
  function completeTask(id, accepted, note) {
    const task = LM.taskIndex[id];
    if (!task) return { ok: false, error: 'Unknown task.' };
    if (!dependenciesComplete(id)) return { ok: false, error: 'Prerequisite tasks are incomplete.' };
    if (state.tasks[id] && state.tasks[id].blockedReason) return { ok: false, error: 'Unblock this task before completing it.' };
    if (!Array.isArray(accepted) || accepted.length !== task.acceptance.length) return { ok: false, error: 'Confirm every acceptance criterion before completing the task.' };
    const record = state.tasks[id] || {};
    record.startedAt = record.startedAt || now();
    record.completedAt = now();
    record.accepted = [...new Set(accepted)].sort();
    record.notes = cleanText(note !== undefined && note !== null ? note : record.notes, 20000);
    record.blockedReason = '';
    delete record.blockedAt;
    state.tasks[id] = record;
    ensureProject(task.projectId);
    addActivity('complete', 'Completed: ' + task.title, task.projectId, id);
    const next = recommendation(task.projectId);
    state.activeProjectId = task.projectId;
    if (next) state.activeTaskId = next.id;
    return { ok: commit(), error: writeBlocked ? 'Storage is unavailable. Export your work before continuing.' : '' };
  }
  function incompleteTask(id) {
    const task = LM.taskIndex[id];
    if (!task || !state.tasks[id]) return false;
    delete state.tasks[id].completedAt;
    delete state.tasks[id].accepted;
    state.tasks[id].startedAt = state.tasks[id].startedAt || now();
    const project = ensureProject(task.projectId);
    if (project.completedAt) {
      project.completionHistory = (project.completionHistory || []).concat([{ completedAt: project.completedAt, reopenedAt: now() }]).slice(-20);
      project.completedAt = null;
      project.reopenedAt = now();
      addActivity('project-reopen', 'Project completion invalidated by reopening a mandatory task: ' + task.projectId, task.projectId, id);
    }
    addActivity('reopen', 'Reopened: ' + task.title, task.projectId, id);
    state.activeTaskId = id;
    return commit();
  }
  function blockTask(id, reason) {
    const task = LM.taskIndex[id];
    if (!task) return { ok: false, error: 'Unknown task.' };
    const cleaned = cleanText(reason, 2000).trim();
    if (cleaned.length < 4) return { ok: false, error: 'Describe the blocker in at least four characters.' };
    const record = state.tasks[id] || {};
    if (record.completedAt) return { ok: false, error: 'Mark the completed task incomplete before blocking it.' };
    record.blockedReason = cleaned;
    record.blockedAt = now();
    record.startedAt = record.startedAt || now();
    state.tasks[id] = record;
    ensureProject(task.projectId);
    addActivity('block', 'Blocked: ' + task.title + ' — ' + cleaned, task.projectId, id);
    return { ok: commit() };
  }
  function unblockTask(id) {
    const task = LM.taskIndex[id];
    if (!task || !state.tasks[id] || !state.tasks[id].blockedReason) return false;
    const reason = state.tasks[id].blockedReason;
    delete state.tasks[id].blockedReason;
    delete state.tasks[id].blockedAt;
    ensureProject(task.projectId);
    addActivity('unblock', 'Unblocked: ' + task.title + (reason ? ' (was: ' + reason + ')' : ''), task.projectId, id);
    return commit();
  }
  function setActiveTask(id) {
    const task = LM.taskIndex[id];
    if (!task) return false;
    state.activeProjectId = task.projectId;
    state.activeTaskId = id;
    ensureProject(task.projectId);
    return commit();
  }
  function setNotes(id, notes) {
    if (!LM.taskIndex[id]) return false;
    const record = state.tasks[id] || { startedAt: now() };
    record.notes = cleanText(notes, 20000);
    state.tasks[id] = record;
    return commit();
  }
  function toggleBookmark(id) {
    if (!LM.taskIndex[id]) return false;
    state.bookmarks = state.bookmarks.includes(id) ? state.bookmarks.filter(item => item !== id) : state.bookmarks.concat(id);
    commit();
    return state.bookmarks.includes(id);
  }
  function isBookmarked(id) { return state.bookmarks.includes(id); }
  function recommendation(projectId) {
    const curriculum = LM.curricula[projectId];
    if (!curriculum) return null;
    return curriculum.tasks.find(task => !state.tasks[task.id]?.completedAt && !state.tasks[task.id]?.blockedReason && dependenciesComplete(task.id)) || null;
  }
  function continueTarget() {
    const projectId = state.activeProjectId;
    if (!LM.curricula[projectId]) return { projectId: 'p01', task: null, reason: 'missing' };
    if (state.activeTaskId) {
      const current = LM.taskIndex[state.activeTaskId];
      if (current && current.projectId === projectId && !state.tasks[current.id]?.completedAt) {
        return { projectId, task: current, blocked: !!state.tasks[current.id]?.blockedReason, reason: 'active' };
      }
    }
    const project = state.projects[projectId];
    if (project && project.completedAt) return { projectId, task: null, reason: 'complete' };
    const next = recommendation(projectId);
    if (next) return { projectId, task: next, reason: 'next' };
    const anyIncomplete = LM.curricula[projectId].tasks.find(task => !state.tasks[task.id]?.completedAt);
    return { projectId, task: anyIncomplete || null, reason: anyIncomplete ? 'blocked-chain' : 'complete' };
  }
  function progress(projectId) {
    const curriculum = LM.curricula[projectId];
    if (!curriculum) return { total: 0, completed: 0, blocked: 0, inProgress: 0, notStarted: 0, percent: 0, phases: {} };
    let completed = 0, blocked = 0, inProgress = 0;
    const phases = {};
    curriculum.tasks.forEach(task => {
      const status = statusOf(task.id);
      phases[task.phase] = phases[task.phase] || { total: 0, completed: 0, blocked: 0 };
      phases[task.phase].total += 1;
      if (status === 'completed') { completed += 1; phases[task.phase].completed += 1; }
      else if (status === 'blocked') { blocked += 1; phases[task.phase].blocked += 1; }
      else if (status === 'in_progress') inProgress += 1;
    });
    return { total: curriculum.tasks.length, completed, blocked, inProgress, notStarted: curriculum.tasks.length - completed - blocked - inProgress, percent: Math.round(completed / curriculum.tasks.length * 100), phases };
  }
  function globalProgress() {
    let total = 0, completed = 0, blocked = 0, inProgress = 0;
    const projectStats = LM.projects.map(project => {
      const p = progress(project.id);
      total += p.total; completed += p.completed; blocked += p.blocked; inProgress += p.inProgress;
      const meta = state.projects[project.id];
      const started = !!meta.startedAt || p.completed > 0 || p.inProgress > 0 || p.blocked > 0;
      return { project, ...p, meta, started, complete: !!meta.completedAt };
    });
    return { total, completed, remaining: total - completed, blocked, inProgress, percent: total ? Math.round(completed / total * 100) : 0, projects: projectStats,
      completedProjects: projectStats.filter(item => item.complete).length, inProgressProjects: projectStats.filter(item => item.started && !item.complete).length,
      notStartedProjects: projectStats.filter(item => !item.started && !item.complete).length };
  }
  function phaseProgress(projectId) {
    const p = progress(projectId);
    return LM.phases.map(phase => ({ phase, ...(p.phases[phase.id] || { total: 0, completed: 0, blocked: 0 }) }));
  }
  function projectGate(projectId) {
    const p = progress(projectId);
    const meta = state.projects[projectId];
    const allComplete = p.completed === p.total;
    const repo = /^https?:\/\/.+/.test(meta.repoUrl || '');
    const evidence = (meta.testEvidence || '').trim().length >= 20;
    const deployment = ['not_deployed', 'staging', 'production', 'deployment_failed'].includes(meta.deploymentStatus);
    const finalReport = (meta.finalReport || '').trim().length >= 20;
    const gitCheckpoint = Array.isArray(meta.gitCheckpoints) && meta.gitCheckpoints.length > 0;
    return { allComplete, repo, evidence, deployment, finalReport, gitCheckpoint, complete: !!(meta.completedAt), checklist: [
      { key: 'tasks', label: 'All mandatory micro-steps completed', ok: allComplete, detail: p.completed + ' of ' + p.total },
      { key: 'repo', label: 'Real GitHub repository URL recorded', ok: repo, detail: meta.repoUrl || 'Not recorded' },
      { key: 'evidence', label: 'Test execution evidence recorded', ok: evidence, detail: evidence ? 'Recorded' : 'At least 20 characters required' },
      { key: 'deployment', label: 'Deployment status explicitly recorded', ok: deployment, detail: meta.deploymentStatus },
      { key: 'git', label: 'At least one Git checkpoint recorded', ok: gitCheckpoint, detail: gitCheckpoint ? meta.gitCheckpoints.length + ' checkpoint(s) recorded manually' : 'No checkpoint recorded' },
      { key: 'report', label: 'Final project report written', ok: finalReport, detail: finalReport ? 'Recorded' : 'At least 20 characters required' }
    ]};
  }
  function completeProject(projectId) {
    const gate = projectGate(projectId);
    if (!gate.allComplete || !gate.repo || !gate.evidence || !gate.deployment || !gate.finalReport || !gate.gitCheckpoint) return { ok: false, error: 'Every project gate must be satisfied before completion, including a recorded Git checkpoint.' };
    const meta = state.projects[projectId];
    if (meta.completedAt) return { ok: true };
    meta.completedAt = now();
    meta.completionHistory = [...(meta.completionHistory || []), { completedAt: meta.completedAt, reopenedAt: null }].slice(-20);
    addActivity('project-complete', 'Marked project complete: ' + projectId, projectId, '');
    return { ok: commit() };
  }
  function reopenProject(projectId) {
    const meta = state.projects[projectId];
    if (!meta || !meta.completedAt) return false;
    meta.reopenedAt = now();
    if (meta.completionHistory && meta.completionHistory.length) {
      const latest = meta.completionHistory[meta.completionHistory.length - 1];
      if (!latest.reopenedAt) latest.reopenedAt = meta.reopenedAt;
    }
    meta.completedAt = null;
    addActivity('project-reopen', 'Reopened project after completion: ' + projectId, projectId, '');
    return commit();
  }
  function updateProjectMeta(projectId, patch) {
    if (!LM.curricula[projectId]) return false;
    const meta = ensureProject(projectId);
    const next = sanitizeMeta({ ...meta, ...patch });
    state.projects[projectId] = next;
    addActivity('project-meta', 'Updated project metadata: ' + projectId, projectId, '');
    return commit();
  }
  function addGitCheckpoint(projectId, checkpoint) {
    if (!LM.curricula[projectId]) return { ok: false, error: 'Unknown project.' };
    const hash = cleanText(checkpoint.hash, 60).trim();
    if (!/^[0-9a-f]{7,40}$/i.test(hash)) return { ok: false, error: 'Enter a 7–40 character hexadecimal commit hash.' };
    if (!cleanText(checkpoint.message, 500).trim()) return { ok: false, error: 'Enter the commit message.' };
    const meta = ensureProject(projectId);
    meta.gitCheckpoints.unshift({ at: now(), taskId: checkpoint.taskId || '', hash, message: cleanText(checkpoint.message, 500), branch: cleanText(checkpoint.branch, 200) || meta.branch || 'main', pushed: !!checkpoint.pushed, note: cleanText(checkpoint.note, 1000) });
    meta.gitCheckpoints = meta.gitCheckpoints.slice(0, 200);
    meta.lastCommit = hash;
    meta.lastPushStatus = checkpoint.pushed ? 'Pushed' : 'Not pushed';
    addActivity('git', 'Recorded Git checkpoint ' + hash + ' (manual)', projectId, checkpoint.taskId || '');
    return { ok: commit() };
  }
  function setTheme(theme) {
    state.preferences.theme = theme === 'dark' ? 'dark' : 'light';
    return commit();
  }
  function setPreferences(patch) {
    if (patch && ['all', '25', '50'].includes(patch.taskPageSize)) state.preferences.taskPageSize = patch.taskPageSize;
    return commit();
  }
  function exportObject() {
    return {
      schemaVersion: VERSION,
      curriculumRevision: state.curriculumRevision,
      exportedAt: now(),
      notice: 'This backup contains learning progress only. It contains no passwords, provider tokens or application credentials.',
      activeProjectId: state.activeProjectId,
      activeTaskId: state.activeTaskId,
      projects: state.projects,
      tasks: state.tasks,
      bookmarks: state.bookmarks,
      activity: state.activity,
      preferences: state.preferences
    };
  }
  function previewImport(raw) {
    const imported = sanitizeState(raw, { strict: true });
    const validIds = Object.keys(imported.tasks).filter(id => LM.taskIndex[id]);
    return {
      state: imported,
      taskCount: validIds.length,
      completedCount: validIds.filter(id => imported.tasks[id].completedAt).length,
      blockedCount: validIds.filter(id => imported.tasks[id].blockedReason).length,
      projects: LM.projects.filter(project => validIds.some(id => LM.taskIndex[id].projectId === project.id)).map(project => project.id),
      activityCount: imported.activity.length,
      bookmarks: imported.bookmarks.length,
      unknownTaskIds: Object.keys(raw.tasks || {}).filter(id => !LM.taskIndex[id]).length,
      exportedAt: raw.exportedAt || null,
      schemaVersion: raw.schemaVersion
    };
  }
  function mergeStates(current, imported) {
    const merged = JSON.parse(JSON.stringify(current));
    Object.entries(imported.tasks).forEach(([id, record]) => {
      const existing = merged.tasks[id];
      if (!existing) { merged.tasks[id] = record; return; }
      const completed = existing.completedAt || record.completedAt;
      const combined = { ...existing, ...record };
      if (completed) {
        const dates = [existing.completedAt, record.completedAt].filter(Boolean).sort();
        combined.completedAt = dates[dates.length - 1];
        combined.accepted = (record.accepted && record.accepted.length) ? record.accepted : existing.accepted;
        delete combined.blockedReason;
      } else if (existing.blockedReason) {
        combined.blockedReason = existing.blockedReason;
      }
      const notes = [existing.notes, record.notes].filter(Boolean);
      if (notes.length) combined.notes = [...new Set(notes)].join('\n\n--- Imported note ---\n');
      merged.tasks[id] = combined;
    });
    merged.bookmarks = [...new Set([...(current.bookmarks || []), ...(imported.bookmarks || [])])].filter(id => LM.taskIndex[id]);
    const activityById = new Map();
    [...(imported.activity || []), ...(current.activity || [])].forEach(item => { if (!activityById.has(item.id)) activityById.set(item.id, item); });
    merged.activity = [...activityById.values()].sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 1000);
    LM.projects.forEach(project => {
      const existing = current.projects[project.id] || {};
      const incoming = imported.projects[project.id] || {};
      merged.projects[project.id] = sanitizeMeta({
        ...incoming, ...existing,
        testEvidence: incoming.testEvidence || existing.testEvidence,
        finalReport: incoming.finalReport || existing.finalReport,
        repoUrl: existing.repoUrl || incoming.repoUrl,
        gitCheckpoints: [...(incoming.gitCheckpoints || []), ...(existing.gitCheckpoints || [])].slice(0, 200)
      });
    });
    merged.activeProjectId = current.activeProjectId;
    merged.activeTaskId = current.activeTaskId;
    merged.preferences = current.preferences;
    merged.updatedAt = now();
    return sanitizeState(merged, { strict: false });
  }
  function importState(raw, mode) {
    const preview = previewImport(raw);
    if (mode === 'replace') {
      state = preview.state;
      state.activeProjectId = preview.state.activeProjectId;
      writeBlocked = false; readError = ''; conflict = false;
      addActivity('import', 'Imported ' + preview.taskCount + ' task records (replace)', state.activeProjectId, '');
      persist();
      notify();
      return { ok: true, preview };
    }
    if (mode === 'merge') {
      state = mergeStates(state, preview.state);
      writeBlocked = false; readError = ''; conflict = false;
      addActivity('import', 'Merged ' + preview.taskCount + ' imported task records', state.activeProjectId, '');
      persist(); notify();
      return { ok: true, preview };
    }
    throw new Error('Choose replace or merge.');
  }
  function resetTask(id) {
    if (!state.tasks[id]) return false;
    const task = LM.taskIndex[id];
    delete state.tasks[id];
    addActivity('reset-task', 'Reset task progress: ' + (task ? task.title : id), task ? task.projectId : state.activeProjectId, id);
    return commit();
  }
  function resetProject(projectId) {
    if (!LM.curricula[projectId]) return false;
    Object.keys(state.tasks).forEach(id => { if (LM.taskIndex[id].projectId === projectId) delete state.tasks[id]; });
    state.projects[projectId] = projectMeta();
    state.bookmarks = state.bookmarks.filter(id => LM.taskIndex[id].projectId !== projectId);
    addActivity('reset-project', 'Reset project progress: ' + projectId, projectId, '');
    return commit();
  }
  function resetAll() {
    state = defaultState();
    writeBlocked = false; readError = ''; conflict = false;
    persist(); notify();
    return true;
  }
  function recoverPrevious() {
    const raw = localStorage.getItem(PREVIOUS_KEY);
    if (!raw) throw new Error('No previous local copy is available.');
    const parsed = JSON.parse(raw);
    const recovered = sanitizeState(parsed, { strict: false });
    state = recovered; writeBlocked = false; readError = ''; conflict = false;
    persist(); notify();
    return true;
  }
  function clearReadBlock() { writeBlocked = false; readError = ''; }
  function setConflict(value) { conflict = !!value; notify(); }
  function subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
  function lastSaved() { return lastSavedAt; }

  window.LMStore = {
    KEY, VERSION, init, get, snapshot, subscribe, saveNow, lastSaved,
    startProject, focus, startTask, completeTask, incompleteTask, blockTask, unblockTask, setActiveTask,
    setNotes, toggleBookmark, isBookmarked, recommendation, continueTarget,
    progress, globalProgress, phaseProgress, projectGate, completeProject, reopenProject, updateProjectMeta,
    addGitCheckpoint, setTheme, setPreferences, exportObject, previewImport, importState,
    resetTask, resetProject, resetAll, recoverPrevious, clearReadBlock, setConflict,
    statusOf, dependenciesComplete, acceptancePassed, recordFor, ensureProject,
    addActivity: (type, message) => { addActivity(type, message, state.activeProjectId, state.activeTaskId); return commit(); }
  };
})();
