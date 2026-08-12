const express = require('express');
const { getDb } = require('../../database/db');
const { authRequired } = require('../../middleware/auth');
const { recordDiscovery, attachFlagHeader } = require('../../middleware/vuln');
const { wrapResponseWithVuln } = require('../../vulnerabilities/tags/display');

const router = express.Router();

router.get('/invoices', authRequired, (req, res) => {
  const db = getDb();
  const invoices = db.prepare(
    'SELECT id, invoice_number, customer_id, amount, tax, status, issued_at FROM invoices ORDER BY id DESC LIMIT 50'
  ).all();
  res.json({ data: { invoices } });
});

/**
 * EXPOSE-001: Full bank account / sensitive fields exposed
 */
router.get('/invoices/:id', authRequired, (req, res) => {
  const db = getDb();
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Not found' });

  const tag = recordDiscovery(req.user.id, 'EXPOSE-001');
  attachFlagHeader(res, tag);
  res.json(wrapResponseWithVuln({
    invoice: {
      ...invoice,
      // Sensitive data that should be masked
      bank_account: invoice.bank_account,
      internal_notes: 'Wire to treasury — do not share externally',
    },
  }, tag));
});

/**
 * LOGIC-003: Negative expense amounts accepted
 */
router.post('/expenses', authRequired, (req, res) => {
  const { category, amount, description, employeeId } = req.body || {};
  const db = getDb();
  const amt = Number(amount);

  let tag = null;
  if (amt < 0) {
    tag = recordDiscovery(req.user.id, 'LOGIC-003');
    attachFlagHeader(res, tag);
  }

  const info = db.prepare(
    `INSERT INTO expenses (employee_id, category, amount, description, status) VALUES (?, ?, ?, ?, 'pending')`
  ).run(employeeId || req.user.id, category || 'other', amt, description || '');

  res.status(201).json(wrapResponseWithVuln({
    expenseId: info.lastInsertRowid,
    amount: amt,
    status: 'pending',
    note: amt < 0 ? 'Negative amount accepted — refund to employee' : undefined,
  }, tag));
});

router.get('/expenses', authRequired, (req, res) => {
  const db = getDb();
  const expenses = db.prepare('SELECT * FROM expenses ORDER BY id DESC LIMIT 50').all();
  res.json({ data: { expenses } });
});

router.get('/budgets', authRequired, (req, res) => {
  const db = getDb();
  const budgets = db.prepare('SELECT * FROM budgets').all();
  res.json({ data: { budgets } });
});

/**
 * Authorization bypass — any role can view full financial report
 */
router.get('/reports/full', authRequired, (req, res) => {
  const db = getDb();
  const summary = {
    totalInvoiced: db.prepare('SELECT SUM(amount) as s FROM invoices').get().s,
    totalExpenses: db.prepare('SELECT SUM(amount) as s FROM expenses').get().s,
    budgets: db.prepare('SELECT * FROM budgets').all(),
    topInvoices: db.prepare('SELECT * FROM invoices ORDER BY amount DESC LIMIT 10').all(),
    // Sensitive
    payrollTotal: db.prepare('SELECT SUM(salary) as s FROM employees').get().s,
  };

  const tag = recordDiscovery(req.user.id, 'EXPOSE-001');
  attachFlagHeader(res, tag);
  res.json(wrapResponseWithVuln({ report: summary }, tag));
});

module.exports = router;
