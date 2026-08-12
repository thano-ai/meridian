const { getDb } = require('../database/db');
const { getVulnerability } = require('../vulnerabilities/catalog');
const { buildSuccessTag } = require('../vulnerabilities/flags/generator');

/**
 * Attach discovery headers and record successful vuln triggers.
 */
function vulnHeaders(req, res, next) {
  res.setHeader('X-Flag-Endpoint', '/hidden/flag-submit');
  res.setHeader('X-Vulnerability-Count', '47');
  res.setHeader('X-Score-Submission', '/internal/score');
  res.setHeader('X-Powered-By', 'Express');
  // Intentionally weak/missing security headers for HEADER-001 / FINGER-001
  next();
}

function recordDiscovery(userId, vulnerabilityId) {
  if (!userId || !vulnerabilityId) return null;
  const vuln = getVulnerability(vulnerabilityId);
  if (!vuln) return null;

  const db = getDb();
  try {
    db.prepare(
      `INSERT OR IGNORE INTO discovered_vulns (user_id, vulnerability_id, name, level, points)
       VALUES (?, ?, ?, ?, ?)`
    ).run(userId, vuln.id, vuln.name, vuln.level, vuln.points);
  } catch {
    /* ignore */
  }

  return buildSuccessTag(userId, vulnerabilityId);
}

function attachFlagHeader(res, tag) {
  if (tag && tag.flag) {
    res.setHeader('X-Vuln-Flag', tag.flag);
    res.setHeader('X-Vuln-Id', tag.id);
  }
}

module.exports = { vulnHeaders, recordDiscovery, attachFlagHeader };
