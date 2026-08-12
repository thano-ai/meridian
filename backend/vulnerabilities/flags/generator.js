const crypto = require('crypto');
const { getVulnerability, LEVEL_LABELS } = require('../catalog');

const SECRET_SALT = process.env.SECRET_SALT || 'vuln-biz-app-salt-2024';

/**
 * Flag unique per student + vulnerability + calendar minute.
 * Components: userId | vulnId | vulnName | date (YYYY-MM-DD) | time (HH:MM)
 */
function getFlagComponents(userId, vulnerabilityId, timestamp = Date.now()) {
  const vuln = getVulnerability(vulnerabilityId);
  const name = vuln?.name || String(vulnerabilityId);
  const d = new Date(timestamp);
  const date = d.toISOString().slice(0, 10);
  const time = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  const minuteBucket = Math.floor(timestamp / 60000);

  return {
    userId: String(userId),
    vulnId: String(vulnerabilityId),
    name,
    date,
    time,
    minuteBucket,
  };
}

function generateFlag(userId, vulnerabilityId, timestamp = Date.now()) {
  const c = getFlagComponents(userId, vulnerabilityId, timestamp);
  const material = `${c.userId}|${c.vulnId}|${c.name}|${c.date}|${c.time}|${SECRET_SALT}`;
  const flag = crypto.createHash('sha256').update(material).digest('hex').substring(0, 16);
  return `FLAG-${flag.toUpperCase()}`;
}

/**
 * Accept current minute or previous minute (clock skew / submit latency).
 */
function validateFlag(userId, vulnerabilityId, submittedFlag, issuedAt = Date.now()) {
  const now = Date.now();
  const candidates = [
    generateFlag(userId, vulnerabilityId, now),
    generateFlag(userId, vulnerabilityId, now - 60 * 1000),
  ];

  if (issuedAt) {
    candidates.push(generateFlag(userId, vulnerabilityId, issuedAt));
    candidates.push(generateFlag(userId, vulnerabilityId, Number(issuedAt) - 60 * 1000));
  }

  const valid = candidates.includes(submittedFlag);
  const currentExpected = generateFlag(userId, vulnerabilityId, now);

  return {
    valid,
    expired: !valid && submittedFlag !== currentExpected,
    expectedMinute: getFlagComponents(userId, vulnerabilityId, now).time,
  };
}

function buildSuccessTag(userId, vulnerabilityId, extra = {}) {
  const vuln = getVulnerability(vulnerabilityId);
  if (!vuln) return null;

  const timestamp = Date.now();
  const components = getFlagComponents(userId, vulnerabilityId, timestamp);
  const flag = generateFlag(userId, vulnerabilityId, timestamp);

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
  SECRET_SALT,
};
