const { POINTS } = require('../catalog');

const TARGET_SCORE = 100;
const MIN_SOLVED = 10;

function uniqueFindings(found) {
  const seen = new Set();
  const items = [];
  for (const v of found || []) {
    const key = v.id || v.vulnerability_id || v.name;
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    items.push(v);
  }
  return items;
}

function pointsFor(finding) {
  const level = finding.level || finding.difficulty || finding.hardness;
  if (POINTS[level] != null) return POINTS[level];
  return Number(finding.points) || 0;
}

function getRanking(score, complete) {
  if (complete) return 'Complete';
  if (score >= 90) return 'Almost complete';
  if (score >= 60) return 'On track';
  if (score >= 30) return 'In progress';
  return 'Started';
}

/**
 * Score is the sum of difficulty points from unique accepted flags, capped at 100.
 * Session is complete only when score is 100 and at least 10 vulnerabilities are solved.
 */
function calculateScore(userData) {
  const found = uniqueFindings(userData.found);
  const rawScore = found.reduce((acc, v) => acc + pointsFor(v), 0);
  const score = Math.min(TARGET_SCORE, Math.max(0, rawScore));
  const solvedCount = found.length;
  const complete = score >= TARGET_SCORE && solvedCount >= MIN_SOLVED;

  return {
    score,
    solvedCount,
    minSolved: MIN_SOLVED,
    targetScore: TARGET_SCORE,
    complete,
    ranking: getRanking(score, complete),
    remaining: {
      points: Math.max(0, TARGET_SCORE - score),
      findings: Math.max(0, MIN_SOLVED - solvedCount),
    },
    breakdown: {
      base: rawScore,
      capped: score,
      byLevel: countByLevel(found),
    },
  };
}

function countByLevel(found) {
  const byLevel = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const v of found || []) {
    const level = v.level || v.difficulty || v.hardness;
    if (byLevel[level] !== undefined) byLevel[level] += 1;
  }
  return byLevel;
}

module.exports = {
  calculateScore,
  getRanking,
  countByLevel,
  POINTS,
  TARGET_SCORE,
  MIN_SOLVED,
};
