const express = require('express');
const { getDb } = require('../../database/db');
const { authRequired, optionalAuth } = require('../../middleware/auth');
const { recordDiscovery, attachFlagHeader } = require('../../middleware/vuln');
const { buildFailedTag } = require('../../vulnerabilities/flags/generator');
const { wrapResponseWithVuln } = require('../../vulnerabilities/tags/display');

const router = express.Router();

router.get('/kpis', authRequired, (req, res) => {
  const db = getDb();
  res.json({
    data: {
      employees: db.prepare('SELECT COUNT(*) as c FROM employees').get().c,
      products: db.prepare('SELECT COUNT(*) as c FROM products').get().c,
      customers: db.prepare('SELECT COUNT(*) as c FROM customers').get().c,
      openTickets: db.prepare(`SELECT COUNT(*) as c FROM support_tickets WHERE status != 'closed'`).get().c,
      revenue: db.prepare(`SELECT SUM(amount) as s FROM invoices WHERE status = 'paid'`).get().s || 0,
    },
  });
});

/**
 * SQLI-003: SQL injection in analytics filters
 */
router.get('/reports', optionalAuth, (req, res) => {
  const { department, status, from, to } = req.query;
  const db = getDb();

  let sql = 'SELECT department, COUNT(*) as headcount, AVG(salary) as avg_salary, AVG(performance_rating) as avg_rating FROM employees WHERE 1=1';
  if (department) sql += ` AND department = '${department}'`;
  if (status) sql += ` AND status = '${status}'`;
  if (from) sql += ` AND hire_date >= '${from}'`;
  if (to) sql += ` AND hire_date <= '${to}'`;
  sql += ' GROUP BY department';

  const injected = /('|--|;|\bor\b|\bunion\b)/i.test(`${department || ''}${status || ''}${from || ''}${to || ''}`);

  try {
    const rows = db.prepare(sql).all();
    let tag = null;
    if (injected) {
      tag = recordDiscovery(req.user?.id, 'SQLI-003');
      attachFlagHeader(res, tag);
      return res.json(wrapResponseWithVuln({ rows, sql }, tag));
    }
    res.json({ data: { rows } });
  } catch (err) {
    const failed = buildFailedTag('SQLI-003', err.message);
    res.status(400).json({ error: 'Report failed', notification: failed.notification, hint: failed.hint, detail: err.message });
  }
});

router.get('/sales', authRequired, (req, res) => {
  const db = getDb();
  const byMonth = db.prepare(
    `SELECT substr(issued_at, 1, 7) as month, SUM(amount) as total, COUNT(*) as invoices
     FROM invoices GROUP BY substr(issued_at, 1, 7) ORDER BY month`
  ).all();
  res.json({ data: { byMonth } });
});

module.exports = router;
