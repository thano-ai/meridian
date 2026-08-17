const express = require('express');
const { getDb } = require('../../database/db');
const { authRequired, optionalAuth } = require('../../middleware/auth');
const { calculateScore } = require('../../vulnerabilities/scoring/calculator');
const { recordDiscovery, attachFlagHeader } = require('../../middleware/vuln');
const { wrapResponseWithVuln } = require('../../vulnerabilities/tags/display');
const { generateFlag } = require('../../vulnerabilities/flags/generator');

const router = express.Router();

/**
 * DEBUG-001: Debug endpoint — hinted in source comments
 * // TODO: Remove debug endpoint before production
 * // FLAG: DEBUG-98765-ABCDE
 * // Temporary admin credentials: admin:TempPass123
 */
router.get('/debug', optionalAuth, (req, res) => {
  const tag = recordDiscovery(req.user?.id, 'DEBUG-001');
  attachFlagHeader(res, tag);
  res.json(wrapResponseWithVuln({
    debug: true,
    // FLAG: DEBUG-98765-ABCDE
    env: {
      NODE_ENV: process.env.NODE_ENV,
      JWT_SECRET: process.env.JWT_SECRET,
      SECRET_SALT: process.env.SECRET_SALT,
    },
    hint: 'Temporary admin credentials: admin:TempPass123',
    memoryUsage: process.memoryUsage(),
  }, tag));
});

router.get('/score', authRequired, (req, res) => {
  const db = getDb();
  const accepted = db
    .prepare(
      `SELECT vulnerability_id, hardness as level, points FROM flag_submissions
       WHERE user_id = ? AND status = 'accepted'`
    )
    .all(req.user.id);
  const result = calculateScore({
    found: accepted.map((f) => ({
      id: f.vulnerability_id,
      level: f.level,
      points: f.points,
      name: f.vulnerability_id,
    })),
  });

  res.json({ data: result, submitted: result.solvedCount });
});

router.post('/score', authRequired, (req, res) => {
  const db = getDb();
  const accepted = db
    .prepare(
      `SELECT vulnerability_id, hardness as level, points FROM flag_submissions
       WHERE user_id = ? AND status = 'accepted'`
    )
    .all(req.user.id);
  const result = calculateScore({
    found: accepted.map((f) => ({
      id: f.vulnerability_id,
      level: f.level,
      points: f.points,
      name: f.vulnerability_id,
    })),
  });
  res.json({ data: result });
});

router.get('/audit-log', authRequired, (req, res) => {
  const db = getDb();
  const submissions = db.prepare('SELECT * FROM flag_submissions ORDER BY id DESC LIMIT 100').all();
  const discoveries = db.prepare('SELECT * FROM discovered_vulns ORDER BY id DESC LIMIT 100').all();
  res.json({ data: { submissions, discoveries } });
});

router.get('/flag-preview/:vulnId', authRequired, (req, res) => {
  const flag = generateFlag(req.user, req.params.vulnId);
  res.json({
    data: {
      vulnerabilityId: req.params.vulnId,
      hint: 'Flags appear in X-Vuln-Flag header or response.vulnerability.flag on successful exploit',
      format: 'FLAG-XXXXXXXXXXXXXXXX',
      sampleLength: flag.length,
    },
  });
});

module.exports = router;
