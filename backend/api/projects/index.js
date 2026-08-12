const express = require('express');
const { getDb } = require('../../database/db');
const { authRequired } = require('../../middleware/auth');
const { recordDiscovery, attachFlagHeader } = require('../../middleware/vuln');
const { wrapResponseWithVuln } = require('../../vulnerabilities/tags/display');

const router = express.Router();

router.get('/', authRequired, (req, res) => {
  const db = getDb();
  const projects = db.prepare('SELECT * FROM projects').all();
  res.json({ data: { projects } });
});

router.get('/:id', authRequired, (req, res) => {
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  const tasks = db.prepare('SELECT * FROM project_tasks WHERE project_id = ?').all(req.params.id);
  res.json({ data: { project, tasks } });
});

router.get('/:id/tasks', authRequired, (req, res) => {
  const db = getDb();
  const tasks = db.prepare('SELECT * FROM project_tasks WHERE project_id = ?').all(req.params.id);
  res.json({ data: { tasks } });
});

/**
 * ACCESS-001: Parameter tampering — role_override accepted without authz
 */
router.post('/:id/assign', authRequired, (req, res) => {
  const { title, assigneeId, roleOverride, status } = req.body || {};
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  let tag = null;
  if (roleOverride && ['admin', 'owner', 'manager'].includes(String(roleOverride).toLowerCase())) {
    tag = recordDiscovery(req.user.id, 'ACCESS-001');
    attachFlagHeader(res, tag);
  }

  const info = db.prepare(
    `INSERT INTO project_tasks (project_id, title, assignee_id, status, role_override) VALUES (?, ?, ?, ?, ?)`
  ).run(req.params.id, title || 'Untitled', assigneeId || req.user.id, status || 'todo', roleOverride || null);

  res.status(201).json(wrapResponseWithVuln({
    taskId: info.lastInsertRowid,
    roleOverride: roleOverride || null,
    elevated: !!roleOverride,
  }, tag));
});

router.patch('/tasks/:taskId', authRequired, (req, res) => {
  const { status, roleOverride } = req.body || {};
  const db = getDb();
  const task = db.prepare('SELECT * FROM project_tasks WHERE id = ?').get(req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Not found' });

  let tag = null;
  if (roleOverride) {
    tag = recordDiscovery(req.user.id, 'ACCESS-001');
    attachFlagHeader(res, tag);
  }

  db.prepare('UPDATE project_tasks SET status = COALESCE(?, status), role_override = COALESCE(?, role_override) WHERE id = ?')
    .run(status || null, roleOverride || null, req.params.taskId);

  const updated = db.prepare('SELECT * FROM project_tasks WHERE id = ?').get(req.params.taskId);
  res.json(wrapResponseWithVuln({ task: updated }, tag));
});

module.exports = router;
