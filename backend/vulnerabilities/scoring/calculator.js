const { POINTS } = require('../catalog');

function getRanking(score) {
  if (score >= 90) return 'Elite Security Auditor';
  if (score >= 75) return 'Senior Penetration Tester';
  if (score >= 60) return 'Security Analyst';
  if (score >= 40) return 'Junior Auditor';
  if (score >= 20) return 'Apprentice Tester';
  return 'Novice Explorer';
}

/**
 * Final score calculation with bonuses and penalties.
 */
function calculateScore(userData) {
  const weights = POINTS;

  const hiddenBonus = (userData.hiddenFound || 0) * 5;
  const chainBonus = (userData.chainCount || 0) * 3;
  const penalty = (userData.falsePositives || 0) * 2;

  const rawScore = (userData.found || []).reduce((acc, v) => {
    const level = v.level || v.difficulty;
    return acc + (weights[level] || v.points || 0);
  }, 0);

  const totalScore = Math.min(100, Math.max(0, rawScore + hiddenBonus + chainBonus - penalty));

  return {
    score: totalScore,
    ranking: getRanking(totalScore),
    breakdown: {
      base: rawScore,
      hiddenBonus,
      chainBonus,
      penalty,
      final: totalScore,
    },
  };
}

function countByLevel(found) {
  const byLevel = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const v of found || []) {
    const level = v.level || v.difficulty;
    if (byLevel[level] !== undefined) byLevel[level] += 1;
  }
  return byLevel;
}

module.exports = {
  calculateScore,
  getRanking,
  countByLevel,
  POINTS,
};
