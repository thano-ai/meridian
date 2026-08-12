const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../../database/db');
const { authRequired, optionalAuth } = require('../../middleware/auth');
const { recordDiscovery, attachFlagHeader } = require('../../middleware/vuln');
const { buildFailedTag } = require('../../vulnerabilities/flags/generator');
const { wrapResponseWithVuln } = require('../../vulnerabilities/tags/display');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

// INTENTIONAL: no file type validation (UPLOAD-001)
const upload = multer({ dest: uploadDir });

/**
 * SQLI-001: Employee search — string concatenation SQLi
 */
router.get('/employees/search', optionalAuth, (req, res) => {
  const q = req.query.q || req.query.search || '';
  const db = getDb();

  // Vulnerable query
  const sql = `SELECT id, employee_code, full_name, email, department, title, salary, performance_rating, phone, ssn_last4, hire_date, status
               FROM employees WHERE full_name LIKE '%${q}%' OR department LIKE '%${q}%' OR employee_code LIKE '%${q}%' LIMIT 100`;

  try {
    const users = db.prepare(sql).all();
    const looksInjected = /('|--|;|\bor\b|\bunion\b)/i.test(q);

    if (looksInjected && users.length > 0) {
      const tag = recordDiscovery(req.user?.id, 'SQLI-001');
      attachFlagHeader(res, tag);
      return res.json(wrapResponseWithVuln({ users, query: q }, tag));
    }

    if (looksInjected && users.length === 0) {
      const failed = buildFailedTag('SQLI-001');
      return res.json({
        data: { users: [], query: q },
        notification: failed.notification,
        hint: failed.hint,
        vulnerability: failed.vulnerability,
      });
    }

    res.json({ data: { users, query: q } });
  } catch (err) {
    const failed = buildFailedTag('SQLI-001', err.message);
    res.status(400).json({
      error: 'Search failed',
      notification: failed.notification,
      hint: failed.hint,
      detail: err.message,
    });
  }
});

/**
 * IDOR-001: No ownership check on employee records
 */
router.get('/employees/:id', optionalAuth, (req, res) => {
  const db = getDb();
  const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);

  if (!emp) return res.status(404).json({ error: 'Employee not found' });

  // Always returns full PII — IDOR when accessing others
  const accessingOther = !req.user || String(req.user.id) !== String(emp.id);
  let tag = null;
  if (accessingOther && Number(req.params.id) > 0) {
    tag = recordDiscovery(req.user?.id, 'IDOR-001');
    attachFlagHeader(res, tag);
  }

  res.json(wrapResponseWithVuln({ employee: emp }, tag));
});

router.get('/employees', authRequired, (req, res) => {
  const db = getDb();
  const page = Number(req.query.page || 1);
  const limit = Math.min(Number(req.query.limit || 20), 100);
  const offset = (page - 1) * limit;
  const employees = db.prepare('SELECT id, employee_code, full_name, department, title, status FROM employees LIMIT ? OFFSET ?').all(limit, offset);
  const total = db.prepare('SELECT COUNT(*) as c FROM employees').get().c;
  res.json({ data: { employees, page, limit, total } });
});

router.get('/leave', authRequired, (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM leave_requests ORDER BY id DESC LIMIT 50').all();
  res.json({ data: { leaveRequests: rows } });
});

router.post('/leave', authRequired, (req, res) => {
  const { employeeId, leaveType, startDate, endDate, reason } = req.body || {};
  const db = getDb();
  const info = db.prepare(
    `INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, status, reason) VALUES (?, ?, ?, ?, 'pending', ?)`
  ).run(employeeId || req.user.id, leaveType || 'annual', startDate, endDate, reason || '');
  res.status(201).json({ data: { id: info.lastInsertRowid, status: 'pending' } });
});

/**
 * UPLOAD-001: Insecure file upload — any file type accepted
 */
router.post('/onboarding/upload', authRequired, upload.single('resume'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const dangerous = !/\.(pdf|doc|docx|png|jpg|jpeg)$/i.test(req.file.originalname);
  let tag = null;
  if (dangerous || req.file.mimetype === 'application/x-msdownload' || req.file.originalname.endsWith('.exe') || req.file.originalname.endsWith('.php') || req.file.originalname.endsWith('.js')) {
    tag = recordDiscovery(req.user.id, 'UPLOAD-001');
  } else if (req.file) {
    // Even normal uploads lack validation — flag if extension spoofed
    const hasDoubleExt = /\.(php|exe|jsp|aspx)\./i.test(req.file.originalname);
    if (hasDoubleExt) tag = recordDiscovery(req.user.id, 'UPLOAD-001');
  }

  // Mark discovery for any upload without content-type whitelist (demo: always tag if not image/pdf)
  if (!tag && !['image/png', 'image/jpeg', 'application/pdf'].includes(req.file.mimetype)) {
    tag = recordDiscovery(req.user.id, 'UPLOAD-001');
  }

  res.json(wrapResponseWithVuln({
    filename: req.file.originalname,
    storedAs: req.file.filename,
    path: `/uploads/${req.file.filename}`,
    mimetype: req.file.mimetype,
    size: req.file.size,
  }, tag));
});

router.get('/payroll/:employeeId', authRequired, (req, res) => {
  const db = getDb();
  const emp = db.prepare('SELECT id, employee_code, full_name, salary, department FROM employees WHERE id = ?').get(req.params.employeeId);
  if (!emp) return res.status(404).json({ error: 'Not found' });
  // IDOR also here
  const tag = recordDiscovery(req.user.id, 'IDOR-001');
  attachFlagHeader(res, tag);
  res.json(wrapResponseWithVuln({ payroll: { ...emp, monthly: Math.round(emp.salary / 12), ytd: emp.salary * 0.75 } }, tag));
});

module.exports = router;
