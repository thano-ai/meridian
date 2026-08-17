const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'business.db');

let db;

function getDb() {
  if (db) return db;
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

function initSchema() {
  const database = getDb();
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      academic_id TEXT UNIQUE NOT NULL,
      phone_number TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      department TEXT,
      role TEXT DEFAULT 'security_auditor',
      password_hash TEXT NOT NULL,
      whatsapp_opt_in INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_code TEXT UNIQUE,
      full_name TEXT NOT NULL,
      email TEXT,
      department TEXT,
      title TEXT,
      salary REAL,
      performance_rating REAL,
      phone TEXT,
      ssn_last4 TEXT,
      manager_id INTEGER,
      hire_date TEXT,
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS leave_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER,
      leave_type TEXT,
      start_date TEXT,
      end_date TEXT,
      status TEXT DEFAULT 'pending',
      reason TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      price REAL,
      cost REAL,
      stock INTEGER DEFAULT 0,
      supplier_id INTEGER,
      specs TEXT
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact_email TEXT,
      contract_value REAL,
      rating REAL,
      metadata TEXT
    );

    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER,
      product_id INTEGER,
      quantity INTEGER,
      unit_price REAL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_code TEXT UNIQUE,
      full_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      loyalty_points INTEGER DEFAULT 0,
      tier TEXT DEFAULT 'bronze',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      subject TEXT,
      body TEXT,
      status TEXT DEFAULT 'open',
      priority TEXT DEFAULT 'medium',
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE,
      customer_id INTEGER,
      amount REAL,
      tax REAL,
      status TEXT DEFAULT 'draft',
      bank_account TEXT,
      issued_at TEXT
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER,
      category TEXT,
      amount REAL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      submitted_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      department TEXT,
      fiscal_year INTEGER,
      allocated REAL,
      spent REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'active',
      owner_id INTEGER,
      milestone TEXT
    );

    CREATE TABLE IF NOT EXISTS project_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      title TEXT,
      assignee_id INTEGER,
      status TEXT DEFAULT 'todo',
      role_override TEXT
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      filename TEXT,
      path TEXT,
      version INTEGER DEFAULT 1,
      uploaded_by INTEGER,
      approved INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user INTEGER,
      to_user INTEGER,
      subject TEXT,
      body TEXT,
      is_announcement INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      product_id INTEGER,
      quantity INTEGER,
      unit_price REAL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      total REAL,
      coupon_code TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS coupons (
      code TEXT PRIMARY KEY,
      discount_pct REAL,
      max_uses INTEGER,
      used_count INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS flag_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      vulnerability_id TEXT,
      flag TEXT,
      evidence TEXT,
      status TEXT,
      points INTEGER DEFAULT 0,
      hardness TEXT,
      submitted_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS discovered_vulns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      vulnerability_id TEXT,
      name TEXT,
      level TEXT,
      points INTEGER,
      discovered_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, vulnerability_id)
    );

    CREATE TABLE IF NOT EXISTS whatsapp_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      payload TEXT,
      status TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER,
      data TEXT,
      expires_at TEXT
    );
  `);

  ensureColumn(database, 'users', 'student_group', "TEXT");
  ensureColumn(database, 'users', 'flag_tag', "TEXT");

  return database;
}

function ensureColumn(database, table, column, typeSql) {
  const cols = database.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${typeSql}`);
  }
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, initSchema, closeDb, DB_PATH };
