const express = require('express');
const rateLimit = require('express-rate-limit');
const { authRequired, optionalAuth, verifyToken, signToken } = require('../../middleware/auth');
const { recordDiscovery, attachFlagHeader } = require('../../middleware/vuln');
const { wrapResponseWithVuln } = require('../../vulnerabilities/tags/display');
const { VULNERABILITIES } = require('../../vulnerabilities/catalog');
const { getDb } = require('../../database/db');

const router = express.Router();

/**
 * RATE-001: Rate limit keyed only on IP — bypass via X-Forwarded-For
 */
const partnerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.ip,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      hint: 'RATE-001: Try rotating X-Forwarded-For',
    });
  },
});

router.get('/partner/data', partnerLimiter, optionalAuth, (req, res) => {
  const forwarded = req.headers['x-forwarded-for'];
  let tag = null;

  // If they hit successfully after rotating (we can't easily detect bypass here),
  // mark when custom X-Forwarded-For is present beyond first request pattern
  if (forwarded && String(forwarded) !== req.ip) {
    tag = recordDiscovery(req.user?.id, 'RATE-001');
    attachFlagHeader(res, tag);
  }

  res.json(wrapResponseWithVuln({
    partnerFeed: { products: 520, customers: 1050, updated: new Date().toISOString() },
    clientIp: req.ip,
    forwardedFor: forwarded || null,
  }, tag));
});

/**
 * AUTH-001: Demonstrate JWT none acceptance
 */
router.post('/auth/forge-test', (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'token required' });

  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid token' });

  let tag = null;
  if (payload.__vuln_none_alg) {
    tag = recordDiscovery(payload.id || req.body.userId || 2, 'AUTH-001');
    attachFlagHeader(res, tag);
  }

  res.json(wrapResponseWithVuln({
    accepted: true,
    payload,
    noneAlgorithm: !!payload.__vuln_none_alg,
  }, tag));
});

router.get('/health', (req, res) => {
  // FINGER-001 / HEADER-001 opportunities via response headers (set globally)
  const tag = req.query.probe === '1' ? recordDiscovery(Number(req.query.userId) || null, 'FINGER-001') : null;
  res.json(wrapResponseWithVuln({
    status: 'ok',
    service: 'Meridian Gateway',
    version: '1.0.0',
    stack: ['Node.js', 'Express', 'SQLite', 'React'],
  }, tag));
});

router.get('/vulnerabilities', authRequired, (req, res) => {
  // Catalog without flags — for reference after discovery
  const list = VULNERABILITIES.map(({ id, name, level, points, category, module, hidden, hint }) => ({
    id, name, level, points, category, module, hidden, hint: hidden ? 'Hidden — discover first' : hint,
  }));
  res.json({ data: { vulnerabilities: list, count: list.length } });
});

router.post('/integrations/webhook', optionalAuth, (req, res) => {
  res.json({ data: { received: true, body: req.body } });
});

module.exports = router;
