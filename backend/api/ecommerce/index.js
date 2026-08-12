const express = require('express');
const { getDb } = require('../../database/db');
const { authRequired } = require('../../middleware/auth');
const { recordDiscovery, attachFlagHeader } = require('../../middleware/vuln');
const { wrapResponseWithVuln } = require('../../vulnerabilities/tags/display');

const router = express.Router();

router.get('/catalog', (req, res) => {
  const db = getDb();
  const products = db.prepare('SELECT id, sku, name, description, category, price, stock FROM products WHERE stock > 0 LIMIT 40').all();
  res.json({ data: { products } });
});

router.get('/cart', authRequired, (req, res) => {
  const db = getDb();
  const items = db.prepare(
    `SELECT c.*, p.name, p.sku FROM cart_items c JOIN products p ON p.id = c.product_id WHERE c.user_id = ?`
  ).all(req.user.id);
  const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  res.json({ data: { items, total } });
});

/**
 * LOGIC-001: Client-controlled unit_price accepted
 */
router.post('/cart', authRequired, (req, res) => {
  const { productId, quantity, unitPrice } = req.body || {};
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const price = unitPrice !== undefined ? Number(unitPrice) : product.price;
  let tag = null;
  if (unitPrice !== undefined && Number(unitPrice) !== product.price) {
    tag = recordDiscovery(req.user.id, 'LOGIC-001');
    attachFlagHeader(res, tag);
  }

  db.prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?').run(req.user.id, productId);
  db.prepare(
    `INSERT INTO cart_items (user_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)`
  ).run(req.user.id, productId, quantity || 1, price);

  res.status(201).json(wrapResponseWithVuln({
    productId,
    quantity: quantity || 1,
    unitPrice: price,
    catalogPrice: product.price,
    manipulated: price !== product.price,
  }, tag));
});

/**
 * LOGIC-002: Coupon abuse — no single-use enforcement per user, stacking allowed
 */
router.post('/checkout', authRequired, (req, res) => {
  const { couponCode, coupons } = req.body || {};
  const db = getDb();
  const items = db.prepare('SELECT * FROM cart_items WHERE user_id = ?').all(req.user.id);
  if (!items.length) return res.status(400).json({ error: 'Cart is empty' });

  let total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const catalogTotal = items.reduce((s, i) => {
    const p = db.prepare('SELECT price FROM products WHERE id = ?').get(i.product_id);
    return s + (p?.price || i.unit_price) * i.quantity;
  }, 0);

  let tag = null;
  if (total < catalogTotal) {
    tag = recordDiscovery(req.user.id, 'LOGIC-001');
  }

  const codes = coupons || (couponCode ? [couponCode] : []);
  let discountPct = 0;
  for (const code of codes) {
    const coupon = db.prepare('SELECT * FROM coupons WHERE code = ?').get(code);
    // Abuse: allow inactive/expired and stack multiple
    if (coupon) {
      discountPct += coupon.discount_pct;
      db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE code = ?').run(code);
      if (!coupon.active || codes.length > 1 || coupon.used_count >= coupon.max_uses) {
        tag = recordDiscovery(req.user.id, 'LOGIC-002');
      }
    }
  }

  if (codes.length > 1) {
    tag = recordDiscovery(req.user.id, 'LOGIC-002');
  }

  const finalTotal = Math.max(0, total * (1 - discountPct / 100));
  const info = db.prepare(
    `INSERT INTO orders (user_id, total, coupon_code, status) VALUES (?, ?, ?, 'paid')`
  ).run(req.user.id, finalTotal, codes.join(',') || null);

  db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);

  if (tag) attachFlagHeader(res, tag);

  res.status(201).json(wrapResponseWithVuln({
    orderId: info.lastInsertRowid,
    subtotal: total,
    catalogTotal,
    discountPct,
    total: finalTotal,
    couponsApplied: codes,
  }, tag));
});

router.get('/orders', authRequired, (req, res) => {
  const db = getDb();
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC').all(req.user.id);
  res.json({ data: { orders } });
});

module.exports = router;
