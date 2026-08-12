const express = require('express');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../../database/db');
const { authRequired, optionalAuth } = require('../../middleware/auth');
const { recordDiscovery, attachFlagHeader } = require('../../middleware/vuln');
const { wrapResponseWithVuln } = require('../../vulnerabilities/tags/display');
const { exec } = require('child_process');

const router = express.Router();

const docsRoot = path.join(__dirname, '..', '..', 'uploads', 'docs');
fs.mkdirSync(docsRoot, { recursive: true });

// Seed a sample doc
const sampleDoc = path.join(docsRoot, 'welcome.txt');
if (!fs.existsSync(sampleDoc)) {
  fs.writeFileSync(sampleDoc, 'Welcome to Meridian document management.\n');
}

router.get('/', authRequired, (req, res) => {
  const db = getDb();
  const documents = db.prepare('SELECT * FROM documents ORDER BY id DESC LIMIT 50').all();
  res.json({ data: { documents } });
});

router.post('/upload', authRequired, (req, res) => {
  const { title, filename, content } = req.body || {};
  const safeName = (filename || `doc-${Date.now()}.txt`).replace(/[<>]/g, '');
  const filePath = path.join(docsRoot, path.basename(safeName));
  fs.writeFileSync(filePath, content || '');

  const db = getDb();
  const info = db.prepare(
    `INSERT INTO documents (title, filename, path, version, uploaded_by) VALUES (?, ?, ?, 1, ?)`
  ).run(title || safeName, safeName, filePath, req.user.id);

  res.status(201).json({ data: { id: info.lastInsertRowid, filename: safeName } });
});

/**
 * TRAV-001: Directory traversal in file download
 */
router.get('/download', optionalAuth, (req, res) => {
  const file = req.query.file || req.query.path || '';
  // Vulnerable: no path normalization / jail
  const target = path.join(docsRoot, file);

  const traversal = file.includes('..') || file.includes('%2e');
  let tag = null;

  if (fs.existsSync(target) && fs.statSync(target).isFile()) {
    if (traversal) {
      tag = recordDiscovery(req.user?.id, 'TRAV-001');
      attachFlagHeader(res, tag);
    }
    const content = fs.readFileSync(target, 'utf8');
    return res.json(wrapResponseWithVuln({ file, content, path: target }, tag));
  }

  // Also try resolving from project root for backup discovery
  const alt = path.resolve(path.join(__dirname, '..', '..', '..', file));
  if (traversal && fs.existsSync(alt) && fs.statSync(alt).isFile()) {
    tag = recordDiscovery(req.user?.id, 'TRAV-001');
    attachFlagHeader(res, tag);
    const content = fs.readFileSync(alt, 'utf8');
    return res.json(wrapResponseWithVuln({ file, content: content.slice(0, 5000), path: alt }, tag));
  }

  if (traversal) {
    tag = recordDiscovery(req.user?.id, 'TRAV-001');
    return res.status(404).json(wrapResponseWithVuln({ error: 'File not found but traversal detected', file }, tag));
  }

  res.status(404).json({ error: 'File not found' });
});

/**
 * CMDI-001 (hidden): Command injection in "convert" utility
 */
router.post('/convert', authRequired, (req, res) => {
  const { filename } = req.body || {};
  if (!filename) return res.status(400).json({ error: 'filename required' });

  // INTENTIONAL command injection
  const cmd = process.platform === 'win32'
    ? `echo Converting ${filename}`
    : `echo Converting ${filename}`;

  const injected = /[;&|`$]/.test(filename);
  exec(cmd, { timeout: 3000 }, (err, stdout, stderr) => {
    let tag = null;
    if (injected) {
      tag = recordDiscovery(req.user.id, 'CMDI-001');
      attachFlagHeader(res, tag);
    }
    res.json(wrapResponseWithVuln({
      command: cmd,
      output: stdout || stderr || (err && err.message),
      converted: !err,
    }, tag));
  });
});

router.post('/:id/approve', authRequired, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE documents SET approved = 1 WHERE id = ?').run(req.params.id);
  res.json({ data: { approved: true, id: Number(req.params.id) } });
});

module.exports = router;
