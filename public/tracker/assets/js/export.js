/* Markdown exports for project plans and individual tasks. */
(function () {
  'use strict';
  const LM = window.LM;

  function projectMarkdown(projectId) {
    const project = LM.projects.find(item => item.id === projectId);
    if (!project) return '';
    const Store = window.LMStore;
    const state = Store.get();
    const progress = Store.progress(projectId);
    const tasks = LM.curricula[projectId].tasks;
    const lines = [];
    const fence = '```';
    lines.push('# ' + project.title, '');
    lines.push('> Generated from the Laravel Engineering Mastery curriculum on ' + new Date().toISOString().slice(0, 10) + '. This is an implementation plan, not a completed application.', '');
    lines.push('**Project:** ' + project.number + '  ', '**Category:** ' + project.category + '  ', '**Difficulty:** ' + project.difficulty + '  ', '**Estimated effort:** ' + project.effort + '  ', '**Progress at export:** ' + progress.completed + '/' + progress.total + ' mandatory steps (' + progress.percent + '%)', '');
    lines.push('## Purpose', '', project.purpose, '');
    lines.push('## Target users', '', project.users.map(user => '- ' + user).join('\n'), '');
    lines.push('## Architecture', '', project.architecture, '');
    lines.push('## Entity model', '', project.entityNote, '');
    lines.push('## Module contracts', '');
    project.modules.forEach(module => {
      lines.push('### ' + module.name, '');
      lines.push('Table: `' + module.table + '` · Model: `App\\Models\\' + module.entity + '`', '');
      lines.push('Purpose: ' + module.purpose, '');
      lines.push('Fields:', module.columns.map(column => '- `' + column + '`').join('\n'), '');
      lines.push('Relationships: ' + module.relations.join('; '), '');
      lines.push('Permissions: `' + module.permissions + '`', '');
      lines.push('Routes:', module.routes.map(route => '- ' + route).join('\n'), '');
      lines.push('Required tests:', module.tests.map(test => '- ' + test).join('\n'), '');
      lines.push('Security: ' + module.security, '');
    });
    lines.push('## Required advanced features', '');
    LM.curricula[projectId].tasks.filter(task => task.moduleId === 'advanced').forEach(task => lines.push('- **' + task.title + '** — ' + task.objective));
    lines.push('', '## Excluded scope', '');
    project.excluded.forEach(item => lines.push('- **' + item.item + '** — ' + item.reason));
    lines.push('', '## Future enhancements (not required for completion)', '');
    project.future.forEach(item => lines.push('- ' + item));
    lines.push('', '## Completion requirements', '');
    project.completion.forEach(item => lines.push('- ' + item));
    lines.push('', '## Micro-step plan (' + tasks.length + ' tasks)', '');
    let lastPhase = 0;
    tasks.forEach((task, index) => {
      if (task.phase !== lastPhase) {
        lastPhase = task.phase;
        lines.push('### Phase ' + task.phase + ' — ' + task.phaseName, '');
      }
      const record = state.tasks[task.id] || {};
      lines.push('#### ' + (index + 1) + '. ' + task.title, '');
      lines.push('- **ID:** `' + task.id + '` · **Module:** ' + task.module + ' · **Effort:** ' + task.effort + ' min');
      lines.push('- **Status:** ' + Store.statusOf(task.id));
      if (record.completedAt) lines.push('- **Completed:** ' + record.completedAt);
      if (record.blockedReason) lines.push('- **Blocker:** ' + record.blockedReason);
      lines.push('- **Objective:** ' + task.objective);
      lines.push('- **Why:** ' + task.why);
      lines.push('- **Prerequisites:** ' + (task.dependencies.length ? task.dependencies.map(id => '`' + id + '`').join(', ') : 'None'));
      lines.push('- **Action:** ' + task.action);
      if (task.files) lines.push('- **Files:** `' + task.files + '`');
      if (task.command) lines.push('- **Commands:**', '', fence + 'bash', task.command, fence);
      if (task.code) lines.push('- **Reference code:**', '', fence, task.code, fence);
      lines.push('- **Verify:** ' + task.verify);
      lines.push('- **Acceptance:** ' + task.acceptance.map(item => '☐ ' + item).join(' '));
      lines.push('- **Security:** ' + task.security, '');
    });
    lines.push('## Git and release', '', '- Run `git remote -v` before configuring a remote.', '- Never commit `.env`, credentials, private keys or real customer data.', '- Record the real repository URL and deployment status; "Not deployed" is a valid, honest status.', '');
    return lines.join('\n');
  }

  function taskMarkdown(id) {
    const task = LM.taskIndex[id];
    if (!task) return '';
    const fence = '```';
    return [
      '# ' + task.title, '',
      '**Task ID:** `' + task.id + '`  ',
      '**Project:** ' + task.projectTitle + '  ',
      '**Phase:** ' + task.phase + ' — ' + task.phaseName + '  ',
      '**Module:** ' + task.module, '',
      '## Objective', task.objective, '',
      '## Why', task.why, '',
      '## Action', task.action, '',
      '## Files', '`' + task.files + '`', '',
      task.command ? '## Commands\n\n' + fence + 'bash\n' + task.command + '\n' + fence : '',
      task.code ? '## Reference code\n\n' + fence + '\n' + task.code + '\n' + fence : '',
      '## Verification', task.verify, '',
      '## Acceptance criteria', task.acceptance.map(item => '- [ ] ' + item).join('\n'), '',
      '## Security', task.security, '',
      '## Common errors', task.errors
    ].filter(Boolean).join('\n');
  }

  function download(filename, text, type) {
    try {
      const blob = new Blob([text], { type: type || 'text/markdown;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1500);
      return true;
    } catch (_error) {
      return false;
    }
  }

  window.LM_EXPORT = { projectMarkdown, taskMarkdown, download };
})();
