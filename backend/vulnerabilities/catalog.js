/**
 * Master vulnerability catalog — each entry maps to an intentional flaw.
 */
const VULNERABILITIES = [
  // Critical
  { id: 'SQLI-001', name: 'SQL Injection in Employee Search', level: 'critical', points: 25, category: 'Injection', module: 'hr', hidden: false, hint: "Try: Use ' OR 1=1-- in search parameter", flagLocation: 'response.headers.X-Vuln-Flag' },
  { id: 'SQLI-002', name: 'SQL Injection in Inventory Bulk Update', level: 'critical', points: 25, category: 'Injection', module: 'inventory', hidden: false, hint: 'Inject into product IDs in bulk update', flagLocation: 'response.body.vulnerability' },
  { id: 'SQLI-003', name: 'SQL Injection in Analytics Filters', level: 'critical', points: 25, category: 'Injection', module: 'analytics', hidden: false, hint: 'Manipulate date/filter query params', flagLocation: 'response.body.vulnerability' },
  { id: 'AUTH-001', name: 'Authentication Bypass via JWT none algorithm', level: 'critical', points: 25, category: 'Authentication', module: 'gateway', hidden: false, hint: 'Set alg to none in JWT header', flagLocation: 'response.headers.X-Vuln-Flag' },
  { id: 'CMDI-001', name: 'OS Command Injection in Document Processing', level: 'critical', points: 25, category: 'Injection', module: 'documents', hidden: true, hint: 'Pipe characters in filename conversion', flagLocation: 'response.body.output' },

  // High
  { id: 'XSS-001', name: 'Stored XSS in Support Tickets', level: 'high', points: 20, category: 'XSS', module: 'crm', hidden: false, hint: 'Inject script tags into ticket body', flagLocation: 'response.body.vulnerability' },
  { id: 'XSS-002', name: 'Stored XSS in Internal Messages', level: 'high', points: 20, category: 'XSS', module: 'comms', hidden: false, hint: 'HTML payloads in message content', flagLocation: 'response.body.vulnerability' },
  { id: 'IDOR-001', name: 'IDOR in Employee Records', level: 'high', points: 20, category: 'Access Control', module: 'hr', hidden: false, hint: 'Change employee ID in URL path', flagLocation: 'response.headers.X-Vuln-Flag' },
  { id: 'IDOR-002', name: 'IDOR in Customer Profiles', level: 'high', points: 20, category: 'Access Control', module: 'crm', hidden: false, hint: 'Enumerate customer IDs', flagLocation: 'response.body.vulnerability' },
  { id: 'UPLOAD-001', name: 'Insecure File Upload in HR Onboarding', level: 'high', points: 20, category: 'Upload', module: 'hr', hidden: false, hint: 'Upload non-image files without validation', flagLocation: 'response.body.vulnerability' },
  { id: 'EXPOSE-001', name: 'Sensitive Data Exposure in Finance Reports', level: 'high', points: 20, category: 'Exposure', module: 'finance', hidden: false, hint: 'Full SSN/account numbers in API response', flagLocation: 'response.body.vulnerability' },

  // Medium
  { id: 'LOGIC-001', name: 'Price Manipulation in Checkout', level: 'medium', points: 15, category: 'Business Logic', module: 'ecommerce', hidden: false, hint: 'Send custom price in cart/checkout payload', flagLocation: 'response.body.vulnerability' },
  { id: 'LOGIC-002', name: 'Coupon Abuse / Double Discount', level: 'medium', points: 15, category: 'Business Logic', module: 'ecommerce', hidden: false, hint: 'Reuse or stack coupon codes', flagLocation: 'response.body.vulnerability' },
  { id: 'LOGIC-003', name: 'Negative Expense Claim Amount', level: 'medium', points: 15, category: 'Business Logic', module: 'finance', hidden: false, hint: 'Submit negative expense amounts', flagLocation: 'response.body.vulnerability' },
  { id: 'CSRF-001', name: 'CSRF on Announcement Creation', level: 'medium', points: 15, category: 'CSRF', module: 'comms', hidden: false, hint: 'No CSRF token on state-changing POST', flagLocation: 'response.body.vulnerability' },
  { id: 'ACCESS-001', name: 'Parameter Tampering in Project Assignments', level: 'medium', points: 15, category: 'Access Control', module: 'projects', hidden: false, hint: 'Escalate role via assignment payload', flagLocation: 'response.body.vulnerability' },
  { id: 'NOSQL-001', name: 'NoSQL Injection in Supplier Search', level: 'medium', points: 15, category: 'Injection', module: 'inventory', hidden: false, hint: 'Use $gt/$ne operators in JSON body', flagLocation: 'response.body.vulnerability' },
  { id: 'TRAV-001', name: 'Directory Traversal in Document Download', level: 'medium', points: 15, category: 'Path Traversal', module: 'documents', hidden: false, hint: 'Use ../ in file path parameter', flagLocation: 'response.body.vulnerability' },

  // Low
  { id: 'INFO-001', name: 'Directory Listing / Backup Exposure', level: 'low', points: 10, category: 'Misconfiguration', module: 'documents', hidden: false, hint: 'Browse /backup/ paths', flagLocation: 'static file' },
  { id: 'INFO-002', name: 'Exposed .git / Config Files', level: 'low', points: 10, category: 'Misconfiguration', module: 'gateway', hidden: false, hint: 'Request /config/app-settings.json', flagLocation: 'static file' },
  { id: 'HEADER-001', name: 'Missing Security Headers', level: 'low', points: 10, category: 'Misconfiguration', module: 'gateway', hidden: false, hint: 'Inspect response security headers', flagLocation: 'response.headers' },
  { id: 'RATE-001', name: 'Rate Limiting Bypass via X-Forwarded-For', level: 'low', points: 10, category: 'Access Control', module: 'gateway', hidden: false, hint: 'Rotate X-Forwarded-For header', flagLocation: 'response.body.vulnerability' },

  // Info
  { id: 'FINGER-001', name: 'Technology Stack Fingerprinting', level: 'info', points: 5, category: 'Fingerprinting', module: 'gateway', hidden: false, hint: 'Check X-Powered-By and Server headers', flagLocation: 'response.headers' },
  { id: 'DEBUG-001', name: 'Debug Endpoint Exposure', level: 'info', points: 5, category: 'Misconfiguration', module: 'internal', hidden: true, hint: 'Find TODO comments in JS source', flagLocation: 'source comment' },
  { id: 'HIDDEN-001', name: 'Hidden Flag Submission Endpoint', level: 'info', points: 5, category: 'Discovery', module: 'hidden', hidden: true, hint: 'Check X-Flag-Endpoint header', flagLocation: 'response.headers.X-Flag-Endpoint' },
  { id: 'SWAGGER-001', name: 'Unlisted API Docs Endpoint', level: 'info', points: 5, category: 'Discovery', module: 'gateway', hidden: true, hint: 'Explore /dev/api-docs', flagLocation: 'swagger' },
];

const LEVEL_LABELS = {
  critical: '🔴 CRITICAL',
  high: '🟠 HIGH',
  medium: '🟡 MEDIUM',
  low: '🟢 LOW',
  info: 'ℹ️ INFO',
};

const POINTS = { critical: 25, high: 20, medium: 15, low: 10, info: 5 };

for (const vuln of VULNERABILITIES) {
  vuln.points = POINTS[vuln.level] ?? vuln.points;
}

function getVulnerability(id) {
  return VULNERABILITIES.find((v) => v.id === id);
}

function getByModule(module) {
  return VULNERABILITIES.filter((v) => v.module === module);
}

module.exports = {
  VULNERABILITIES,
  LEVEL_LABELS,
  POINTS,
  getVulnerability,
  getByModule,
};
