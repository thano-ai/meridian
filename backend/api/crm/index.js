const express = require('express');
const { getDb } = require('../../database/db');
const { authRequired, optionalAuth } = require('../../middleware/auth');
const { recordDiscovery, attachFlagHeader } = require('../../middleware/vuln');
const { wrapResponseWithVuln } = require('../../vulnerabilities/tags/display');

const router = express.Router();

router.get('/customers', authRequired, (req, res) => {
  const db = getDb();
  const page = Number(req.query.page || 1);
  const limit = Math.min(Number(req.query.limit || 20), 100);
  const offset = (page - 1) * limit;
  const customers = db.prepare(
    'SELECT id, customer_code, full_name, email, company, loyalty_points, tier FROM customers LIMIT ? OFFSET ?'
  ).all(limit, offset);
  const total = db.prepare('SELECT COUNT(*) as c FROM customers').get().c;
  res.json({ data: { customers, page, total } });
});

/**
 * IDOR-002: Any authenticated user can read any customer
 */
router.get('/customers/:id', optionalAuth, (req, res) => {
  const db = getDb();
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Not found' });

  const tag = recordDiscovery(req.user?.id, 'IDOR-002');
  attachFlagHeader(res, tag);
  res.json(wrapResponseWithVuln({ customer }, tag));
});

router.get('/tickets', authRequired, (req, res) => {
  const db = getDb();
  const tickets = db.prepare('SELECT * FROM support_tickets ORDER BY id DESC LIMIT 50').all();
  res.json({ data: { tickets } });
});

/**
 * XSS-001: Stored XSS — body stored and returned unsanitized
 */
router.post('/tickets', authRequired, (req, res) => {
  const { customerId, subject, body, priority } = req.body || {};
  const db = getDb();

  const info = db.prepare(
    `INSERT INTO support_tickets (customer_id, subject, body, status, priority, created_by)
     VALUES (?, ?, ?, 'open', ?, ?)`
  ).run(customerId || 1, subject || 'No subject', body || '', priority || 'medium', req.user.id);

  const xssPattern = /<script|onerror=|onload=|javascript:/i;
  let tag = null;
  if (xssPattern.test(body || '') || xssPattern.test(subject || '')) {
    tag = recordDiscovery(req.user.id, 'XSS-001');
    attachFlagHeader(res, tag);
  }

  const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(wrapResponseWithVuln({ ticket }, tag));
});

router.get('/tickets/:id', authRequired, (req, res) => {
  const db = getDb();
  const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Not found' });

  let tag = null;
  if (/<script|onerror=|onload=/i.test(ticket.body || '')) {
    tag = recordDiscovery(req.user.id, 'XSS-001');
  }

  // Intentionally return raw HTML body for XSS rendering on frontend
  res.json(wrapResponseWithVuln({ ticket }, tag));
});

router.get('/loyalty/:customerId', authRequired, (req, res) => {
  const db = getDb();
  const customer = db.prepare('SELECT id, full_name, loyalty_points, tier FROM customers WHERE id = ?').get(req.params.customerId);
  if (!customer) return res.status(404).json({ error: 'Not found' });
  res.json({ data: { loyalty: customer } });
});

router.post('/feedback', authRequired, (req, res) => {
  const { customerId, rating, comment } = req.body || {};
  res.status(201).json({ data: { accepted: true, customerId, rating, comment } });
});

module.exports = router;
