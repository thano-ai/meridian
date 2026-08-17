const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SEAL_PATH = path.join(__dirname, 'integrity.seal.json');
const HMAC_KEY = Buffer.from(['meridian', 'lab', 'seal', 'v1'].join('::'), 'utf8');

const PROTECTED_FILES = [
  'package.json',
  'backend/integrity.js',
  'backend/server.js',
  'backend/api/auth/index.js',
  'backend/api/hidden/index.js',
  'backend/middleware/auth.js',
  'backend/middleware/vuln.js',
  'backend/vulnerabilities/catalog.js',
  'backend/vulnerabilities/flags/generator.js',
  'backend/vulnerabilities/scoring/calculator.js',
];

function hashFile(rel) {
  const abs = path.join(ROOT, rel);
  const data = fs.readFileSync(abs);
  return crypto.createHash('sha256').update(data).digest('hex');
}

function fileMap() {
  const hashes = {};
  for (const rel of PROTECTED_FILES) {
    hashes[rel] = hashFile(rel);
  }
  return hashes;
}

function signatureFor(hashes) {
  const canonical = JSON.stringify(hashes, Object.keys(hashes).sort());
  return crypto.createHmac('sha256', HMAC_KEY).update(canonical).digest('hex');
}

function buildSeal() {
  const hashes = fileMap();
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    hashes,
    signature: signatureFor(hashes),
  };
}

function verifyIntegrity() {
  if (!fs.existsSync(SEAL_PATH)) {
    return { ok: false, errors: ['Missing integrity seal. The application cannot start.'] };
  }

  let seal;
  try {
    seal = JSON.parse(fs.readFileSync(SEAL_PATH, 'utf8'));
  } catch {
    return { ok: false, errors: ['Integrity seal is unreadable.'] };
  }

  const errors = [];
  const expectedSig = signatureFor(seal.hashes || {});
  if (!seal.signature || seal.signature !== expectedSig) {
    errors.push('Integrity seal signature mismatch.');
  }

  for (const rel of PROTECTED_FILES) {
    if (!fs.existsSync(path.join(ROOT, rel))) {
      errors.push(`Missing protected file: ${rel}`);
      continue;
    }
    const actual = hashFile(rel);
    if (!seal.hashes || seal.hashes[rel] !== actual) {
      errors.push(`Modified or untrusted file: ${rel}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

function verifyOrExit() {
  const result = verifyIntegrity();
  if (result.ok) return;
  console.error('Meridian failed an integrity check. Source files must not be changed.');
  for (const err of result.errors) console.error(` - ${err}`);
  process.exit(1);
}

if (process.env.MERIDIAN_SEAL !== '1') {
  verifyOrExit();
}

module.exports = {
  PROTECTED_FILES,
  buildSeal,
  verifyIntegrity,
  verifyOrExit,
  SEAL_PATH,
};
