const { LEVEL_LABELS } = require('../catalog');

/**
 * Real-time vulnerability tag display helpers.
 */
const NOTIFICATION_LEVEL = {
  high: '🔴 CRITICAL',
  medium: '🟡 MEDIUM',
  low: '🟢 LOW',
  info: 'ℹ️ INFO',
  critical: '🔴 CRITICAL',
};

function formatInlineTag(vulnId, vulnName) {
  return `[${vulnId}: ${vulnName}]`;
}

function formatSeverity(level) {
  return `[${LEVEL_LABELS[level] || level}]`;
}

function formatCategory(category) {
  return `[${category}]`;
}

function wrapResponseWithVuln(data, vulnerabilityMeta, options = {}) {
  const payload = {
    data: {
      ...data,
      vulnerability: vulnerabilityMeta || null,
    },
  };

  if (options.failed) {
    payload.notification = options.notification;
    payload.hint = options.hint;
  }

  return payload;
}

module.exports = {
  NOTIFICATION_LEVEL,
  formatInlineTag,
  formatSeverity,
  formatCategory,
  wrapResponseWithVuln,
};
