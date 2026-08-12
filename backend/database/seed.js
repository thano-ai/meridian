const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { initSchema, getDb, closeDb, DB_PATH } = require('./db');

const FIRST = ['James','Mary','John','Patricia','Robert','Jennifer','Michael','Linda','William','Elizabeth','David','Barbara','Richard','Susan','Joseph','Jessica','Thomas','Sarah','Charles','Karen','Ahmed','Fatima','Omar','Layla','Hassan','Noor','Youssef','Aisha','Khalid','Mariam'];
const LAST = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','AlHashimi','AlMaktoum','Hassan','Ali','Khan','Patel','Chen','Nguyen','Kim','Singh'];
const DEPTS = ['Engineering','HR','Finance','Sales','Marketing','Operations','IT','Legal','Customer Success','R&D'];
const TITLES = ['Analyst','Manager','Senior Specialist','Coordinator','Director','Associate','Lead','Consultant'];
const PRODUCT_CATS = ['Electronics','Office','Software','Furniture','Safety','Networking','Cloud','Hardware'];
const COMPANIES = ['Acme Corp','Globex','Initech','Umbrella','Stark Industries','Wayne Enterprises','Cyberdyne','Hooli','Pied Piper','Massive Dynamic'];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pad(n, w = 4) { return String(n).padStart(w, '0'); }

function seed() {
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }
  initSchema();
  const db = getDb();

  console.log('Seeding users...');
  const adminHash = bcrypt.hashSync('TempPass123', 8);
  const auditorHash = bcrypt.hashSync('auditor123', 8);

  db.prepare(`INSERT INTO users (full_name, academic_id, phone_number, email, department, role, password_hash, whatsapp_opt_in)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run('System Admin', 'ADMIN-0001', '+971500000001', 'admin@meridian.local', 'IT', 'admin', adminHash, 0);

  db.prepare(`INSERT INTO users (full_name, academic_id, phone_number, email, department, role, password_hash, whatsapp_opt_in)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run('Alex Morgan', 'EMP-10001', '+971501234567', 'alex.morgan@meridian.local', 'Operations', 'employee', auditorHash, 1);

  console.log('Seeding 200+ employees...');
  const empStmt = db.prepare(`INSERT INTO employees (employee_code, full_name, email, department, title, salary, performance_rating, phone, ssn_last4, manager_id, hire_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const insertEmps = db.transaction(() => {
    for (let i = 1; i <= 220; i++) {
      const fn = rand(FIRST);
      const ln = rand(LAST);
      const dept = rand(DEPTS);
      empStmt.run(
        `EMP-${pad(i, 5)}`,
        `${fn} ${ln}`,
        `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@corp.local`,
        dept,
        rand(TITLES),
        randInt(45000, 180000),
        (Math.random() * 2 + 3).toFixed(1),
        `+9715${randInt(10000000, 99999999)}`,
        pad(randInt(0, 9999)),
        i > 10 ? randInt(1, 10) : null,
        `20${randInt(15, 24)}-${pad(randInt(1, 12), 2)}-${pad(randInt(1, 28), 2)}`,
        Math.random() > 0.05 ? 'active' : 'inactive'
      );
    }
  });
  insertEmps();

  const leaveStmt = db.prepare(`INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, status, reason) VALUES (?, ?, ?, ?, ?, ?)`);
  for (let i = 0; i < 80; i++) {
    leaveStmt.run(randInt(1, 220), rand(['annual', 'sick', 'unpaid', 'maternity']), '2026-01-10', '2026-01-15', rand(['pending', 'approved', 'rejected']), 'Personal leave');
  }

  console.log('Seeding suppliers & 500+ products...');
  const supStmt = db.prepare(`INSERT INTO suppliers (name, contact_email, contract_value, rating, metadata) VALUES (?, ?, ?, ?, ?)`);
  for (let i = 1; i <= 40; i++) {
    supStmt.run(
      `Supplier ${i} Ltd`,
      `contact${i}@supplier.local`,
      randInt(50000, 2000000),
      (Math.random() * 2 + 3).toFixed(1),
      JSON.stringify({ region: rand(['UAE', 'EU', 'US', 'APAC']), tier: rand(['gold', 'silver', 'bronze']) })
    );
  }

  const prodStmt = db.prepare(`INSERT INTO products (sku, name, description, category, price, cost, stock, supplier_id, specs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertProds = db.transaction(() => {
    for (let i = 1; i <= 520; i++) {
      const cat = rand(PRODUCT_CATS);
      const price = randInt(10, 5000);
      prodStmt.run(
        `SKU-${pad(i, 6)}`,
        `${cat} Product ${i}`,
        `High-quality ${cat.toLowerCase()} item #${i} for enterprise use`,
        cat,
        price,
        Math.round(price * 0.6),
        randInt(0, 500),
        randInt(1, 40),
        JSON.stringify({ weight_kg: randInt(1, 50), warranty_months: rand([12, 24, 36]), color: rand(['black', 'silver', 'white']) })
      );
    }
  });
  insertProds();

  const poStmt = db.prepare(`INSERT INTO purchase_orders (supplier_id, product_id, quantity, unit_price, status) VALUES (?, ?, ?, ?, ?)`);
  for (let i = 0; i < 100; i++) {
    poStmt.run(randInt(1, 40), randInt(1, 520), randInt(1, 100), randInt(10, 1000), rand(['pending', 'approved', 'received']));
  }

  console.log('Seeding 1000+ customers...');
  const custStmt = db.prepare(`INSERT INTO customers (customer_code, full_name, email, phone, company, loyalty_points, tier, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertCust = db.transaction(() => {
    for (let i = 1; i <= 1050; i++) {
      const fn = rand(FIRST);
      const ln = rand(LAST);
      custStmt.run(
        `CUS-${pad(i, 6)}`,
        `${fn} ${ln}`,
        `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@client.local`,
        `+9715${randInt(10000000, 99999999)}`,
        rand(COMPANIES),
        randInt(0, 50000),
        rand(['bronze', 'silver', 'gold', 'platinum']),
        i % 50 === 0 ? 'VIP account — handle with care' : null
      );
    }
  });
  insertCust();

  const ticketStmt = db.prepare(`INSERT INTO support_tickets (customer_id, subject, body, status, priority, created_by) VALUES (?, ?, ?, ?, ?, ?)`);
  for (let i = 0; i < 150; i++) {
    ticketStmt.run(randInt(1, 1050), `Issue #${i + 1}: ${rand(['Login', 'Billing', 'Shipping', 'Refund'])}`, `Customer reports problem with order. Details for ticket ${i + 1}.`, rand(['open', 'in_progress', 'closed']), rand(['low', 'medium', 'high']), 2);
  }

  console.log('Seeding financial data...');
  const invStmt = db.prepare(`INSERT INTO invoices (invoice_number, customer_id, amount, tax, status, bank_account, issued_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  for (let i = 1; i <= 200; i++) {
    const amount = randInt(100, 50000);
    invStmt.run(
      `INV-2026-${pad(i, 5)}`,
      randInt(1, 1050),
      amount,
      Math.round(amount * 0.05),
      rand(['draft', 'sent', 'paid', 'overdue']),
      `AE${randInt(100000000000000, 999999999999999)}`,
      `2026-${pad(randInt(1, 8), 2)}-${pad(randInt(1, 28), 2)}`
    );
  }

  const expStmt = db.prepare(`INSERT INTO expenses (employee_id, category, amount, description, status) VALUES (?, ?, ?, ?, ?)`);
  for (let i = 0; i < 120; i++) {
    expStmt.run(randInt(1, 220), rand(['travel', 'meals', 'software', 'equipment', 'training']), randInt(20, 3000), 'Business expense claim', rand(['pending', 'approved', 'rejected']));
  }

  const budStmt = db.prepare(`INSERT INTO budgets (department, fiscal_year, allocated, spent) VALUES (?, ?, ?, ?)`);
  for (const d of DEPTS) {
    const allocated = randInt(200000, 2000000);
    budStmt.run(d, 2026, allocated, randInt(0, allocated));
  }

  console.log('Seeding projects...');
  const projStmt = db.prepare(`INSERT INTO projects (name, description, status, owner_id, milestone) VALUES (?, ?, ?, ?, ?)`);
  const projects = ['ERP Migration', 'Mobile App Launch', 'Q3 Operations Review', 'Warehouse Automation', 'CRM Revamp', 'Cloud Lift', 'ISO Certification', 'Partner Portal'];
  for (let i = 0; i < projects.length; i++) {
    projStmt.run(projects[i], `Project description for ${projects[i]}`, rand(['active', 'on_hold', 'completed']), randInt(1, 20), rand(['Planning', 'Execution', 'Review', 'Delivery']));
  }

  const taskStmt = db.prepare(`INSERT INTO project_tasks (project_id, title, assignee_id, status, role_override) VALUES (?, ?, ?, ?, ?)`);
  for (let i = 0; i < 60; i++) {
    taskStmt.run(randInt(1, projects.length), `Task ${i + 1}`, randInt(1, 50), rand(['todo', 'in_progress', 'done']), null);
  }

  console.log('Seeding messages & coupons...');
  const msgStmt = db.prepare(`INSERT INTO messages (from_user, to_user, subject, body, is_announcement) VALUES (?, ?, ?, ?, ?)`);
  msgStmt.run(1, null, 'Welcome to Meridian', 'Welcome aboard. Use this workspace for day-to-day operations across people, customers, and finance.', 1);
  for (let i = 0; i < 30; i++) {
    msgStmt.run(randInt(1, 2), randInt(1, 2), `Message ${i}`, `Internal message body ${i}`, 0);
  }

  db.prepare(`INSERT INTO coupons (code, discount_pct, max_uses, used_count, active) VALUES (?, ?, ?, ?, ?)`).run('SAVE10', 10, 1000, 0, 1);
  db.prepare(`INSERT INTO coupons (code, discount_pct, max_uses, used_count, active) VALUES (?, ?, ?, ?, ?)`).run('VIP50', 50, 10, 0, 1);
  db.prepare(`INSERT INTO coupons (code, discount_pct, max_uses, used_count, active) VALUES (?, ?, ?, ?, ?)`).run('EXPIRED', 20, 1, 1, 0);

  // Export JSON snapshots for discovery
  const dataDir = path.join(__dirname, '..', '..', 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, 'employees.json'), JSON.stringify(db.prepare('SELECT id, employee_code, full_name, department, title FROM employees LIMIT 50').all(), null, 2));
  fs.writeFileSync(path.join(dataDir, 'products.json'), JSON.stringify(db.prepare('SELECT id, sku, name, category, price, stock FROM products LIMIT 50').all(), null, 2));
  fs.writeFileSync(path.join(dataDir, 'customers.json'), JSON.stringify(db.prepare('SELECT id, customer_code, full_name, company, tier FROM customers LIMIT 50').all(), null, 2));

  // Hidden backup & config for discovery
  const backupDir = path.join(__dirname, '..', '..', 'backup');
  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(path.join(backupDir, 'database.sql'), `-- BACKUP DUMP (intentional exposure)\n-- FLAG hint: submit via /hidden/flag-submit\n-- Sample: SELECT * FROM users;\nINSERT INTO users VALUES (1,'System Admin',...);\n`);

  const configDir = path.join(__dirname, '..', '..', 'config');
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(path.join(configDir, 'app-settings.json'), JSON.stringify({
    app: 'VulnBiz Enterprise',
    debug: true,
    jwt_secret_hint: 'Check env JWT_SECRET',
    // Temporary admin credentials: admin:TempPass123
    flag_endpoint: '/hidden/flag-submit',
    vulnerability_count: 47,
  }, null, 2));

  console.log('Seed complete.');
  console.log('Demo: alex.morgan@meridian.local / auditor123');
  console.log('Admin: admin@meridian.local / TempPass123');
  closeDb();
}

seed();
