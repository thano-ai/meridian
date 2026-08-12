require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { Server } = require('socket.io');
const swaggerUi = require('swagger-ui-express');

const { initSchema, getDb } = require('./database/db');
const { vulnHeaders } = require('./middleware/vuln');

const authRoutes = require('./api/auth');
const hrRoutes = require('./api/hr');
const inventoryRoutes = require('./api/inventory');
const crmRoutes = require('./api/crm');
const financeRoutes = require('./api/finance');
const projectsRoutes = require('./api/projects');
const documentsRoutes = require('./api/documents');
const commsRoutes = require('./api/comms');
const ecommerceRoutes = require('./api/ecommerce');
const analyticsRoutes = require('./api/analytics');
const gatewayRoutes = require('./api/gateway');
const hiddenRoutes = require('./api/hidden');
const internalRoutes = require('./api/internal');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const root = path.join(__dirname, '..');
const frontendDist = path.join(root, 'frontend', 'dist');
const spaIndex = path.join(frontendDist, 'index.html');

initSchema();

app.use(cors({
  origin: true,
  credentials: true,
  exposedHeaders: [
    'X-Vuln-Flag',
    'X-Vuln-Id',
    'X-Flag-Endpoint',
    'X-Vulnerability-Count',
    'X-Score-Submission',
  ],
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(vulnHeaders);

// Static discovery surfaces
app.use('/backup', express.static(path.join(root, 'backup')));
app.use('/config', express.static(path.join(root, 'config')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/data', express.static(path.join(root, 'data')));

// TODO: Remove debug endpoint before production
// FLAG: DEBUG-98765-ABCDE
// Temporary admin credentials: admin:TempPass123

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Meridian API',
    version: '1.0.0',
    description: 'Internal API documentation for Meridian Business Suite.',
  },
  paths: {
    '/api/hr/employees/search': {
      get: {
        summary: 'Search employees',
        parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }],
      },
    },
    '/hidden/flag-submit': {
      get: {
        summary: 'Hidden verification UI (open in browser while logged in)',
      },
      post: {
        summary: 'Submit vulnerability flags (HIDDEN)',
        description: 'UI at GET /hidden/flag-submit. Body: vulnerabilityId, flag, evidence',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  vulnerabilityId: { type: 'string', example: 'SQLI-001' },
                  flag: { type: 'string', example: 'FLAG-A1B2C3D4E5F6G7H8' },
                  evidence: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    '/internal/debug': { get: { summary: 'Debug info (remove before production)' } },
    '/internal/score': { get: { summary: 'Score endpoint' } },
    '/administration/audit-log': { get: { summary: 'Audit log viewer' } },
  },
};

app.use('/dev/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Core API modules
app.use('/api/auth', authRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/comms', commsRoutes);
app.use('/api/ecommerce', ecommerceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/gateway', gatewayRoutes);

// Hidden / internal API (POST flag submit, debug, score, …)
app.use('/hidden', hiddenRoutes);
app.use('/internal', internalRoutes);
app.use('/internal/audit', hiddenRoutes);
app.use('/administration', internalRoutes);

app.get('/testing/security-checks', (req, res) => {
  res.json({
    checks: [
      'SQL injection probes',
      'XSS payload tests',
      'IDOR enumeration',
      'Auth bypass (JWT none)',
    ],
    flagEndpoint: '/hidden/flag-submit',
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Meridian',
    frontend: fs.existsSync(spaIndex),
    ts: new Date().toISOString(),
  });
});

function sendSpa(res) {
  if (!fs.existsSync(spaIndex)) {
    return res.status(503).type('html').send(`<!doctype html>
<html><body style="font-family:sans-serif;max-width:32rem;margin:3rem auto;padding:0 1rem">
  <h1>Meridian</h1>
  <p>Frontend is not built yet.</p>
  <p>From the project root run:</p>
  <pre>npm run setup</pre>
  <p>Then start again with <code>npm start</code>.</p>
</body></html>`);
  }
  return res.sendFile(spaIndex);
}

// Built React UI (same origin as API — Burp-friendly)
app.use(express.static(frontendDist));

// SPA routes (including hidden verification pages)
app.get('*', (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  // Let Express static / earlier mounts handle real files; leftover GETs → React Router
  return sendSpa(res);
});

io.on('connection', (socket) => {
  socket.emit('welcome', { message: 'Connected' });
});

app.set('io', io);

const PORT = process.env.PORT || 4721;
server.listen(PORT, () => {
  const db = getDb();
  const empCount = db.prepare('SELECT COUNT(*) as c FROM employees').get().c;
  const uiReady = fs.existsSync(spaIndex);
  console.log(`Meridian running at http://localhost:${PORT}`);
  console.log(`UI+API same origin · employees: ${empCount} · frontend: ${uiReady ? 'ready' : 'NOT BUILT (npm run build)'}`);
});

module.exports = { app, server, io };
