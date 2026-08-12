const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../../database/db');
const { signToken, authRequired } = require('../../middleware/auth');
const { calculateScore, countByLevel } = require('../../vulnerabilities/scoring/calculator');
const { VULNERABILITIES } = require('../../vulnerabilities/catalog');

const router = express.Router();

router.post('/register', (req, res) => {
  const { fullName, academicId, phoneNumber, email, department, role, password, whatsappOptIn } = req.body || {};

  if (!fullName || !academicId || !phoneNumber || !email || !password) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['fullName', 'academicId', 'phoneNumber', 'email', 'password'],
    });
  }

  if (!/^\+?\d{10,15}$/.test(String(phoneNumber).replace(/[\s-]/g, ''))) {
    return res.status(400).json({ error: 'phoneNumber must be WhatsApp-enabled (E.164)' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ? OR academic_id = ?').get(email, academicId);
  if (existing) return res.status(409).json({ error: 'Email or academic ID already registered' });

  const hash = bcrypt.hashSync(password, 8);
  const info = db.prepare(
    `INSERT INTO users (full_name, academic_id, phone_number, email, department, role, password_hash, whatsapp_opt_in)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    fullName,
    academicId,
    phoneNumber,
    email,
    department || 'Engineering',
    role || 'security_auditor',
    hash,
    whatsappOptIn ? 1 : 0
  );

  const user = db.prepare('SELECT id, full_name, academic_id, phone_number, email, department, role, whatsapp_opt_in, created_at FROM users WHERE id = ?').get(info.lastInsertRowid);
  const token = signToken(user);

  res.status(201).json({
    message: 'Registration successful',
    token,
    user: {
      id: user.id,
      fullName: user.full_name,
      academicId: user.academic_id,
      phoneNumber: user.phone_number,
      email: user.email,
      department: user.department,
      role: user.role,
      whatsappOptIn: !!user.whatsapp_opt_in,
    },
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signToken(user);
  res.json({
    token,
    user: {
      id: user.id,
      fullName: user.full_name,
      academicId: user.academic_id,
      email: user.email,
      role: user.role,
      department: user.department,
    },
  });
});

router.get('/profile', authRequired, (req, res) => {
  const db = getDb();
  const submissions = db
    .prepare('SELECT * FROM flag_submissions WHERE user_id = ? ORDER BY submitted_at DESC')
    .all(req.user.id);
  const accepted = submissions.filter((s) => s.status === 'accepted');
  // Unique accepted by vulnerability (latest kept in list order)
  const uniqueAccepted = [];
  const seen = new Set();
  for (const s of accepted) {
    if (seen.has(s.vulnerability_id)) continue;
    seen.add(s.vulnerability_id);
    uniqueAccepted.push(s);
  }

  const falsePositives = submissions.filter((s) => s.status === 'rejected').length;
  const hiddenFound = uniqueAccepted.filter((v) => {
    const cat = VULNERABILITIES.find((c) => c.id === v.vulnerability_id);
    return cat && cat.hidden;
  }).length;

  const scoreData = calculateScore({
    found: uniqueAccepted.map((f) => ({
      level: f.hardness,
      points: f.points,
      name: getVulnName(f.vulnerability_id),
    })),
    hiddenFound,
    chainCount: 0,
    falsePositives,
  });

  const byLevel = countByLevel(uniqueAccepted.map((f) => ({ level: f.hardness })));

  res.json({
    personal: {
      id: req.user.id,
      fullName: req.user.full_name,
      academicId: req.user.academic_id,
      phoneNumber: req.user.phone_number,
      email: req.user.email,
      department: req.user.department,
      role: req.user.role,
    },
    submissions,
    accepted: uniqueAccepted,
    progress: {
      totalPossible: VULNERABILITIES.length,
      submittedCount: uniqueAccepted.length,
      byLevel,
      score: scoreData.score,
      ranking: scoreData.ranking,
      breakdown: scoreData.breakdown,
    },
    metrics: {
      acceptanceRate: submissions.length
        ? Math.round((uniqueAccepted.length / Math.max(1, new Set(submissions.map((s) => s.vulnerability_id)).size)) * 100)
        : 0,
      falsePositives,
      hiddenFound,
    },
  });
});

function getVulnName(id) {
  const v = VULNERABILITIES.find((c) => c.id === id);
  return v?.name || id;
}

module.exports = router;
