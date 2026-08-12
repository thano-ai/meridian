const express = require('express');
const { getDb } = require('../../database/db');
const { authRequired, optionalAuth } = require('../../middleware/auth');
const { recordDiscovery, attachFlagHeader } = require('../../middleware/vuln');
const { wrapResponseWithVuln } = require('../../vulnerabilities/tags/display');

const router = express.Router();

router.get('/messages', authRequired, (req, res) => {
  const db = getDb();
  const messages = db.prepare(
    `SELECT * FROM messages WHERE to_user = ? OR to_user IS NULL OR from_user = ? OR is_announcement = 1
     ORDER BY id DESC LIMIT 50`
  ).all(req.user.id, req.user.id);
  res.json({ data: { messages } });
});

/**
 * XSS-002: Stored XSS in messages
 */
router.post('/messages', authRequired, (req, res) => {
  const { toUser, subject, body } = req.body || {};
  const db = getDb();

  const info = db.prepare(
    `INSERT INTO messages (from_user, to_user, subject, body, is_announcement) VALUES (?, ?, ?, ?, 0)`
  ).run(req.user.id, toUser || null, subject || '', body || '');

  let tag = null;
  if (/<script|onerror=|onload=|javascript:/i.test(body || '') || /<script/i.test(subject || '')) {
    tag = recordDiscovery(req.user.id, 'XSS-002');
    attachFlagHeader(res, tag);
  }

  const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(wrapResponseWithVuln({ message }, tag));
});

/**
 * CSRF-001: No CSRF token — state-changing announcement creation
 * Also intentionally no Origin/Referer checks
 */
router.post('/announcements', optionalAuth, (req, res) => {
  const { subject, body } = req.body || {};
  const db = getDb();
  const fromUser = req.user?.id || 1;

  const info = db.prepare(
    `INSERT INTO messages (from_user, to_user, subject, body, is_announcement) VALUES (?, NULL, ?, ?, 1)`
  ).run(fromUser, subject || 'Announcement', body || '');

  const tag = recordDiscovery(req.user?.id, 'CSRF-001');
  attachFlagHeader(res, tag);

  res.status(201).json(wrapResponseWithVuln({
    announcementId: info.lastInsertRowid,
    note: 'Created without CSRF protection',
  }, tag));
});

router.get('/announcements', optionalAuth, (req, res) => {
  const db = getDb();
  const announcements = db.prepare('SELECT * FROM messages WHERE is_announcement = 1 ORDER BY id DESC').all();
  res.json({ data: { announcements } });
});

module.exports = router;
