const { calculateScore, countByLevel, getRanking } = require('../vulnerabilities/scoring/calculator');

/**
 * Generate WhatsApp-formatted security assessment report.
 */
function generateWhatsAppReport(userData) {
  const found = userData.found || [];
  const byLevel = countByLevel(found);
  const { score } = calculateScore(userData);

  const header = `📋 SECURITY ASSESSMENT REPORT\n${userData.fullName}\n${userData.academicId}`;
  const summary = `\n🎯 Total Vulnerabilities Found: ${found.length}`;
  const breakdown = `
🔴 Critical: ${byLevel.critical} (${byLevel.critical * 25}pts)
🟠 High: ${byLevel.high} (${byLevel.high * 20}pts)
🟡 Medium: ${byLevel.medium} (${byLevel.medium * 15}pts)
🟢 Low: ${byLevel.low} (${byLevel.low * 10}pts)
🔵 Info: ${byLevel.info} (${byLevel.info * 5}pts)`;
  const scoreLine = `\n📊 TOTAL SCORE: ${score}/100`;
  const ranking = `🏅 ${getRanking(score)}`;
  const details = `\n📌 Discovered Vulnerabilities:\n${
    found.length
      ? found.map((v) => `• ${v.name} - ${v.points}pts (${v.level || v.difficulty})`).join('\n')
      : '• None yet'
  }`;
  const footer = `\n🔒 Thank you for helping secure our systems!\nReport generated: ${new Date().toISOString()}`;

  const fullText = [header, summary, breakdown, scoreLine, ranking, details, footer].join('\n');

  return {
    header,
    summary,
    breakdown,
    score: scoreLine,
    ranking,
    details,
    footer,
    fullText,
    numericScore: score,
  };
}

module.exports = { generateWhatsAppReport };
