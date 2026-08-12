const express = require('express');
const { getDb } = require('../../database/db');
const { optionalAuth } = require('../../middleware/auth');
const { validateFlag } = require('../../vulnerabilities/flags/generator');
const { getVulnerability, VULNERABILITIES } = require('../../vulnerabilities/catalog');
const { calculateScore } = require('../../vulnerabilities/scoring/calculator');
const { recordDiscovery } = require('../../middleware/vuln');

const router = express.Router();

/**
 * Hidden flag submission — marks count only after accepted submit.
 */
function handleFlagSubmit(req, res) {
  const { vulnerabilityId, flag, timestamp, evidence } = req.body || {};

  if (!vulnerabilityId || !flag) {
    return res.status(400).json({
      error: 'vulnerabilityId and flag required',
      hint: 'Send JSON with header Content-Type: application/json and Authorization: Bearer <token>',
      receivedBody: req.body && Object.keys(req.body).length ? req.body : null,
      contentType: req.headers['content-type'] || null,
    });
  }

  const vuln = getVulnerability(vulnerabilityId);
  if (!vuln) {
    return res.status(404).json({ error: 'Unknown vulnerability ID', status: 'rejected' });
  }

  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Login required to submit flags' });
  }

  const db = getDb();

  const already = db
    .prepare(
      `SELECT id FROM flag_submissions
       WHERE user_id = ? AND vulnerability_id = ? AND status = 'accepted'`
    )
    .get(userId, vulnerabilityId);

  if (already) {
    const accepted = db
      .prepare(`SELECT vulnerability_id, hardness as level, points, flag FROM flag_submissions WHERE user_id = ? AND status = 'accepted'`)
      .all(userId);
    const scoreData = calculateScore({
      found: accepted.map((f) => ({ level: f.level, points: f.points, name: f.vulnerability_id })),
      hiddenFound: 0,
      chainCount: 0,
      falsePositives: 0,
    });
    return res.status(200).json({
      status: 'already_accepted',
      message: 'Flag for this vulnerability was already submitted',
      points: 0,
      hardness: vuln.level,
      totalProgress: scoreData.score,
      ranking: scoreData.ranking,
    });
  }

  const issuedAt = timestamp
    ? Number(timestamp) * (String(timestamp).length <= 10 ? 1000 : 1)
    : Date.now();
  const result = validateFlag(userId, vulnerabilityId, flag, issuedAt);

  if (!result.valid) {
    db.prepare(
      `INSERT INTO flag_submissions (user_id, vulnerability_id, flag, evidence, status, points, hardness)
       VALUES (?, ?, ?, ?, 'rejected', 0, ?)`
    ).run(userId, vulnerabilityId, flag, evidence || '', vuln.level);

    return res.status(400).json({
      status: 'rejected',
      message: 'Invalid or expired flag (flags rotate every minute)',
      hint: vuln.hint,
    });
  }

  // Optional discovery bookkeeping — does NOT award points
  recordDiscovery(userId, vulnerabilityId);
  if (vulnerabilityId !== 'HIDDEN-001') {
    recordDiscovery(userId, 'HIDDEN-001');
  }

  db.prepare(
    `INSERT INTO flag_submissions (user_id, vulnerability_id, flag, evidence, status, points, hardness)
     VALUES (?, ?, ?, ?, 'accepted', ?, ?)`
  ).run(userId, vulnerabilityId, flag, evidence || '', vuln.points, vuln.level);

  const accepted = db
    .prepare(
      `SELECT vulnerability_id, hardness as level, points FROM flag_submissions
       WHERE user_id = ? AND status = 'accepted'`
    )
    .all(userId);

  const hiddenFound = accepted.filter((f) =>
    VULNERABILITIES.find((v) => v.id === f.vulnerability_id)?.hidden
  ).length;

  const falsePositives = db
    .prepare(`SELECT COUNT(*) as c FROM flag_submissions WHERE user_id = ? AND status = 'rejected'`)
    .get(userId).c;

  const scoreData = calculateScore({
    found: accepted.map((f) => {
      const meta = getVulnerability(f.vulnerability_id);
      return { level: f.level, points: f.points, name: meta?.name || f.vulnerability_id };
    }),
    hiddenFound,
    chainCount: 0,
    falsePositives,
  });

  res.json({
    status: 'accepted',
    points: vuln.points,
    hardness: vuln.level,
    totalProgress: scoreData.score,
    ranking: scoreData.ranking,
    submittedCount: accepted.length,
    vulnerability: { id: vuln.id, name: vuln.name },
  });
}

router.post('/flag-submit', optionalAuth, handleFlagSubmit);
router.post('/verify', optionalAuth, handleFlagSubmit);

module.exports = router;
