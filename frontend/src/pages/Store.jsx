import { useEffect, useState } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';

export default function Store() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState(null);
  const [qty, setQty] = useState(1);
  const [customPrice, setCustomPrice] = useState('');
  const [coupon, setCoupon] = useState('');
  const [order, setOrder] = useState(null);

  async function refresh() {
    const [p, c] = await Promise.all([
      api.get('/api/ecommerce/catalog'),
      api.get('/api/ecommerce/cart'),
    ]);
    setProducts(p.data.data.products);
    setCart(c.data.data);
  }

  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  return (
    <Layout>
      <h1 className="font-display text-2xl font-semibold">Shop</h1>
      <p className="mt-1 text-sm text-neutral-500">Internal catalog and checkout</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="panel p-4">
          <h2 className="text-sm font-medium text-neutral-500">Catalog</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <label className="flex items-center gap-2">
              Qty
              <input className="input w-20" type="number" min="1" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
            </label>
            <label className="flex items-center gap-2">
              Unit price override
              <input className="input w-28" type="number" step="0.01" placeholder="Optional" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} />
            </label>
          </div>
          <ul className="mt-4 max-h-80 space-y-2 overflow-auto text-sm">
            {products.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 border-b border-neutral-100 pb-2">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-neutral-500">${p.price} · {p.category}</p>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={async () => {
                    const body = { productId: p.id, quantity: qty };
                    if (customPrice !== '') body.unitPrice = Number(customPrice);
                    await api.post('/api/ecommerce/cart', body);
                    refresh();
                  }}
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel p-4">
          <h2 className="text-sm font-medium text-neutral-500">
            Cart · ${(cart?.total || 0).toFixed(2)}
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(cart?.items || []).map((i) => (
              <li key={i.id} className="flex justify-between">
                <span>{i.name} × {i.quantity}</span>
                <span>${(i.unit_price * i.quantity).toFixed(2)}</span>
              </li>
            ))}
            {!cart?.items?.length && <li className="text-neutral-400">Cart is empty</li>}
          </ul>
          <label className="mt-4 block text-sm">
            Coupon codes
            <input className="input" placeholder="e.g. SAVE10" value={coupon} onChange={(e) => setCoupon(e.target.value)} />
          </label>
          <button
            type="button"
            className="btn mt-3"
            onClick={async () => {
              const coupons = coupon.split(',').map((c) => c.trim()).filter(Boolean);
              const { data } = await api.post('/api/ecommerce/checkout', { coupons });
              setOrder(data.data || data);
              refresh();
            }}
          >
            Checkout
          </button>
          {order && (
            <div className="mt-4 border-t border-neutral-100 pt-3 text-sm">
              <p>Order #{order.orderId}</p>
              <p>Total paid: ${Number(order.total).toFixed(2)}</p>
              {order.discountPct > 0 && <p>Discount: {order.discountPct}%</p>}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
