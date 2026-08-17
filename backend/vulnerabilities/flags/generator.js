const crypto = require('crypto');
const { getVulnerability, LEVEL_LABELS } = require('../catalog');
const { getDb } = require('../../database/db');

const SECRET_SALT = process.env.SECRET_SALT || 'vuln-biz-app-salt-2024';

function utcNowMs() {
  return Date.now();
}

function utcParts(timestamp = utcNowMs()) {
  const d = new Date(timestamp);
  return {
    date: d.toISOString().slice(0, 10),
    time: `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`,
    minuteBucket: Math.floor(timestamp / 60000),
  };
}

function generateStudentTags() {
  return Array.from({ length: 3 }, () => crypto.randomBytes(3).toString('hex')).join('-');
}

function ensureFlagTag(user) {
  if (!user) return '';
  if (user.flag_tag) return user.flag_tag;
  const tag = generateStudentTags();
  try {
    const db = getDb();
    if (user.id) {
      db.prepare('UPDATE users SET flag_tag = ? WHERE id = ? AND (flag_tag IS NULL OR flag_tag = \'\')').run(tag, user.id);
      user.flag_tag = tag;
    }
  } catch {
    user.flag_tag = tag;
  }
  return user.flag_tag || tag;
}

function loadUser(userId) {
  if (!userId) return null;
  try {
    return getDb().prepare('SELECT * FROM users WHERE id = ?').get(userId) || null;
  } catch {
    return null;
  }
}

/**
 * Flag unique per student ID + random tags + vulnerability + UTC minute.
 * Time is always server UTC (Unix epoch) so a student's local clock cannot change it.
 */
function getFlagComponents(user, vulnerabilityId, timestamp = utcNowMs()) {
  const vuln = getVulnerability(vulnerabilityId);
  const name = vuln?.name || String(vulnerabilityId);
  const utc = utcParts(timestamp);
  const studentId = user?.academic_id || user?.academicId || String(user?.id || '');
  const flagTag = user?.flag_tag || '';

  return {
    studentId: String(studentId),
    vulnId: String(vulnerabilityId),
    name,
    flagTag,
    date: utc.date,
    time: utc.time,
    minuteBucket: utc.minuteBucket,
  };
}

function generateFlag(userOrId, vulnerabilityId, timestamp = utcNowMs()) {
  const user = typeof userOrId === 'object' && userOrId
    ? userOrId
    : loadUser(userOrId) || { id: userOrId, academic_id: String(userOrId), flag_tag: '' };
  ensureFlagTag(user);
  const c = getFlagComponents(user, vulnerabilityId, timestamp);
  const material = `${c.studentId}|${c.vulnId}|${c.name}|${c.flagTag}|${c.date}|${c.time}|${SECRET_SALT}`;
  const flag = crypto.createHash('sha256').update(material).digest('hex').substring(0, 16);
  return `FLAG-${flag.toUpperCase()}`;
}

/**
 * Validate against server UTC current minute and previous minute only.
 * Client-supplied timestamps are ignored.
 */
function validateFlag(userOrId, vulnerabilityId, submittedFlag) {
  const now = utcNowMs();
  const candidates = [
    generateFlag(userOrId, vulnerabilityId, now),
    generateFlag(userOrId, vulnerabilityId, now - 60 * 1000),
  ];

  const valid = candidates.includes(submittedFlag);
  const currentExpected = candidates[0];

  return {
    valid,
    expired: !valid,
    expectedMinute: utcParts(now).time,
  };
}

function buildSuccessTag(userOrId, vulnerabilityId, extra = {}) {
  const vuln = getVulnerability(vulnerabilityId);
  if (!vuln) return null;

  const user = typeof userOrId === 'object' && userOrId
    ? userOrId
    : loadUser(userOrId) || { id: userOrId, academic_id: String(userOrId), flag_tag: '' };
  ensureFlagTag(user);

  const timestamp = utcNowMs();
  const components = getFlagComponents(user, vulnerabilityId, timestamp);
  const flag = generateFlag(user, vulnerabilityId, timestamp);

  return {
    id: vuln.id,
    name: vuln.name,
    tag: `${LEVEL_LABELS[vuln.level].split(' ')[0]} ${vuln.id}`,
    severity: LEVEL_LABELS[vuln.level],
    category: vuln.category,
    level: vuln.level,
    points: vuln.points,
    flag_available: true,
    flag,
    hint: vuln.hint,
    flagLocation: vuln.flagLocation,
    timestamp,
    valid_for_minute: `${components.date} ${components.time} UTC`,
    ...extra,
  };
}

function buildFailedTag(vulnerabilityId, customHint) {
  const vuln = getVulnerability(vulnerabilityId);
  if (!vuln) {
    return {
      notification: `ℹ️ INFO [UNKNOWN] - Injection attempt failed`,
      hint: customHint || 'Check vulnerability catalog',
    };
  }
  return {
    notification: `${LEVEL_LABELS[vuln.level]} [${vuln.id}] - Injection attempt failed`,
    hint: customHint || `Try: ${vuln.hint}`,
    vulnerability: {
      id: vuln.id,
      name: vuln.name,
      tag: `[${vuln.id}: ${vuln.name}]`,
      severity: LEVEL_LABELS[vuln.level],
      category: `[${vuln.category}]`,
    },
  };
}

module.exports = {
  generateFlag,
  validateFlag,
  getFlagComponents,
  buildSuccessTag,
  buildFailedTag,
  generateStudentTags,
  utcNowMs,
  SECRET_SALT,
};
