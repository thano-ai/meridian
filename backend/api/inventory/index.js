const express = require('express');
const { getDb } = require('../../database/db');
const { authRequired, optionalAuth } = require('../../middleware/auth');
const { recordDiscovery, attachFlagHeader } = require('../../middleware/vuln');
const { buildFailedTag } = require('../../vulnerabilities/flags/generator');
const { wrapResponseWithVuln } = require('../../vulnerabilities/tags/display');

const router = express.Router();

// In-memory NoSQL-like store for NOSQL-001
const supplierDocs = [];

function ensureSupplierDocs() {
  if (supplierDocs.length) return;
  const db = getDb();
  const rows = db.prepare('SELECT * FROM suppliers').all();
  for (const r of rows) {
    supplierDocs.push({
      _id: r.id,
      name: r.name,
      contact_email: r.contact_email,
      contract_value: r.contract_value,
      rating: Number(r.rating),
      ...JSON.parse(r.metadata || '{}'),
    });
  }
}

router.get('/products', optionalAuth, (req, res) => {
  const db = getDb();
  const page = Number(req.query.page || 1);
  const limit = Math.min(Number(req.query.limit || 20), 100);
  const offset = (page - 1) * limit;
  const products = db.prepare('SELECT id, sku, name, category, price, stock FROM products LIMIT ? OFFSET ?').all(limit, offset);
  const total = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
  res.json({ data: { products, page, total } });
});

router.get('/products/:id', optionalAuth, (req, res) => {
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Not found' });
  res.json({ data: { product } });
});

/**
 * SQLI-002: Bulk update with concatenated IDs
 */
router.post('/products/bulk-update', authRequired, (req, res) => {
  const { ids, stock } = req.body || {};
  if (!ids) return res.status(400).json({ error: 'ids required' });

  const idList = Array.isArray(ids) ? ids.join(',') : String(ids);
  const db = getDb();
  const sql = `UPDATE products SET stock = ${Number(stock) || 0} WHERE id IN (${idList})`;

  try {
    const result = db.prepare(sql).run();
    const looksInjected = /(--|;|\bor\b|drop|union)/i.test(idList);

    if (looksInjected) {
      const tag = recordDiscovery(req.user.id, 'SQLI-002');
      attachFlagHeader(res, tag);
      const products = db.prepare('SELECT id, sku, name, stock FROM products LIMIT 50').all();
      return res.json(wrapResponseWithVuln({ updated: result.changes, products }, tag));
    }

    res.json({ data: { updated: result.changes } });
  } catch (err) {
    const failed = buildFailedTag('SQLI-002', err.message);
    res.status(400).json({ error: 'Bulk update failed', notification: failed.notification, hint: failed.hint });
  }
});

/**
 * Price manipulation opportunity — client-supplied price accepted on PO
 */
router.post('/purchase-orders', authRequired, (req, res) => {
  const { supplierId, productId, quantity, unitPrice } = req.body || {};
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const price = unitPrice !== undefined ? Number(unitPrice) : product.price;
  let tag = null;
  if (unitPrice !== undefined && Number(unitPrice) < product.cost) {
    // Related business logic — reuse ecommerce price tag context via inventory
    tag = recordDiscovery(req.user.id, 'LOGIC-001');
  }

  const info = db.prepare(
    `INSERT INTO purchase_orders (supplier_id, product_id, quantity, unit_price, status) VALUES (?, ?, ?, ?, 'pending')`
  ).run(supplierId || product.supplier_id, productId, quantity || 1, price);

  res.status(201).json(wrapResponseWithVuln({
    orderId: info.lastInsertRowid,
    unitPrice: price,
    catalogPrice: product.price,
  }, tag));
});

/**
 * NOSQL-001: NoSQL operator injection in supplier search
 */
router.post('/suppliers/search', optionalAuth, (req, res) => {
  ensureSupplierDocs();
  const filter = req.body?.filter || req.body || {};

  const hasOperator = Object.values(filter).some(
    (v) => v && typeof v === 'object' && Object.keys(v).some((k) => k.startsWith('$'))
  );

  let results = supplierDocs;
  try {
    if (typeof filter === 'object') {
      results = supplierDocs.filter((doc) => {
        return Object.entries(filter).every(([key, val]) => {
          if (val && typeof val === 'object') {
            if ('$gt' in val) return doc[key] > val.$gt;
            if ('$gte' in val) return doc[key] >= val.$gte;
            if ('$ne' in val) return doc[key] !== val.$ne;
            if ('$lt' in val) return doc[key] < val.$lt;
            if ('$regex' in val) return new RegExp(val.$regex, 'i').test(String(doc[key] || ''));
          }
          return doc[key] === val;
        });
      });
    }

    let tag = null;
    if (hasOperator && results.length > 0) {
      tag = recordDiscovery(req.user?.id, 'NOSQL-001');
      attachFlagHeader(res, tag);
    } else if (hasOperator) {
      const failed = buildFailedTag('NOSQL-001');
      return res.json({ data: { suppliers: [] }, notification: failed.notification, hint: failed.hint });
    }

    res.json(wrapResponseWithVuln({ suppliers: results.slice(0, 100) }, tag));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/suppliers', authRequired, (req, res) => {
  const db = getDb();
  const suppliers = db.prepare('SELECT id, name, contact_email, contract_value, rating FROM suppliers').all();
  res.json({ data: { suppliers } });
});

router.get('/stock', authRequired, (req, res) => {
  const db = getDb();
  const low = db.prepare('SELECT id, sku, name, stock FROM products WHERE stock < 10 LIMIT 50').all();
  res.json({ data: { lowStock: low } });
});

module.exports = router;
