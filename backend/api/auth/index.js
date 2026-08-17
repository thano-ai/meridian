const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../../database/db');
const { signToken, authRequired } = require('../../middleware/auth');
const { calculateScore, countByLevel } = require('../../vulnerabilities/scoring/calculator');
const { VULNERABILITIES } = require('../../vulnerabilities/catalog');
const { generateStudentTags } = require('../../vulnerabilities/flags/generator');

const router = express.Router();
const GROUPS = ['1', '2', '3'];

router.post('/register', (req, res) => {
  const { fullName, academicId, studentId, group, studentGroup } = req.body || {};
  const name = String(fullName || '').trim();
  const id = String(academicId || studentId || '').trim();
  const grp = String(group || studentGroup || '').trim();

  if (!name || !id || !grp) {
    return res.status(400).json({
      error: 'Name, student ID, and group are required',
      required: ['fullName', 'academicId', 'group'],
    });
  }

  if (!GROUPS.includes(grp)) {
    return res.status(400).json({ error: 'Group must be 1, 2, or 3' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE academic_id = ?').get(id);
  if (existing) return res.status(409).json({ error: 'This student ID is already registered' });

  const email = `${id.toLowerCase().replace(/[^a-z0-9._-]/gi, '')}@students.meridian.local`;
  const emailTaken = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (emailTaken) return res.status(409).json({ error: 'This student ID is already registered' });

  const flagTag = generateStudentTags();
  const hash = bcrypt.hashSync(cryptoRandomPassword(), 8);

  const info = db.prepare(
    `INSERT INTO users (full_name, academic_id, phone_number, email, department, role, password_hash, whatsapp_opt_in, student_group, flag_tag)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    name,
    id,
    '+00000000000',
    email,
    `Group ${grp}`,
    'student',
    hash,
    0,
    grp,
    flagTag
  );

  const user = db.prepare(
    `SELECT id, full_name, academic_id, email, department, role, student_group, created_at
     FROM users WHERE id = ?`
  ).get(info.lastInsertRowid);

  res.status(201).json({
    message: 'Registration successful. Sign in with your student ID.',
    user: {
      id: user.id,
      fullName: user.full_name,
      academicId: user.academic_id,
      group: user.student_group,
      role: user.role,
    },
  });
});

function cryptoRandomPassword() {
  return require('crypto').randomBytes(16).toString('hex');
}

router.post('/login', (req, res) => {
  const { academicId, studentId, email, password } = req.body || {};
  const db = getDb();
  let user = null;

  if (email && password) {
    user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
  } else {
    const id = String(academicId || studentId || '').trim();
    if (!id) return res.status(400).json({ error: 'Student ID is required' });
    user = db.prepare('SELECT * FROM users WHERE academic_id = ?').get(id);
    if (!user) return res.status(401).json({ error: 'Student ID not found. Register first.' });
  }

  if (!user.flag_tag) {
    const tag = generateStudentTags();
    db.prepare('UPDATE users SET flag_tag = ? WHERE id = ?').run(tag, user.id);
    user.flag_tag = tag;
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
      group: user.student_group || null,
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

  const scoreData = calculateScore({
    found: uniqueAccepted.map((f) => ({
      id: f.vulnerability_id,
      level: f.hardness,
      points: f.points,
      name: getVulnName(f.vulnerability_id),
    })),
  });

  const byLevel = countByLevel(uniqueAccepted.map((f) => ({ level: f.hardness })));

  res.json({
    personal: {
      id: req.user.id,
      fullName: req.user.full_name,
      academicId: req.user.academic_id,
      group: req.user.student_group || null,
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
      minSolved: scoreData.minSolved,
      targetScore: scoreData.targetScore,
      byLevel,
      score: scoreData.score,
      ranking: scoreData.ranking,
      complete: scoreData.complete,
      remaining: scoreData.remaining,
      breakdown: scoreData.breakdown,
    },
    metrics: {
      acceptanceRate: submissions.length
        ? Math.round((uniqueAccepted.length / Math.max(1, new Set(submissions.map((s) => s.vulnerability_id)).size)) * 100)
        : 0,
      falsePositives,
    },
  });
});

function getVulnName(id) {
  const v = VULNERABILITIES.find((c) => c.id === id);
  return v?.name || id;
}

module.exports = router;
