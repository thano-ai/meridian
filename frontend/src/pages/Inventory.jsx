import { useEffect, useState } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [bulkIds, setBulkIds] = useState('');
  const [stock, setStock] = useState('50');
  const [filterJson, setFilterJson] = useState('{"tier":"gold"}');
  const [suppliers, setSuppliers] = useState([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    api.get('/api/inventory/products').then((r) => setProducts(r.data.data.products)).catch(() => {});
  }, []);

  async function bulkUpdate(e) {
    e.preventDefault();
    const { data } = await api.post('/api/inventory/products/bulk-update', {
      ids: bulkIds,
      stock: Number(stock),
    });
    setStatus(`Updated ${data.data?.updated ?? 0} items`);
  }

  async function supplierSearch(e) {
    e.preventDefault();
    let filter = {};
    try {
      filter = JSON.parse(filterJson);
    } catch {
      setStatus('Invalid filter JSON');
      return;
    }
    const { data } = await api.post('/api/inventory/suppliers/search', { filter });
    setSuppliers(data.data?.suppliers || []);
  }

  return (
    <Layout>
      <h1 className="font-display text-2xl font-semibold">Inventory</h1>
      <p className="mt-1 text-sm text-neutral-500">Products, stock, and supplier contracts</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="panel p-4">
          <h2 className="text-sm font-medium text-neutral-500">Product catalog</h2>
          <div className="mt-3 max-h-72 overflow-auto">
            <table className="table">
              <thead>
                <tr><th>SKU</th><th>Name</th><th>Price</th><th>Stock</th></tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="font-mono text-xs">{p.sku}</td>
                    <td>{p.name}</td>
                    <td>${p.price}</td>
                    <td>{p.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form onSubmit={bulkUpdate} className="mt-4 space-y-2 border-t border-neutral-100 pt-4">
            <h3 className="text-sm font-medium">Bulk stock update</h3>
            <input className="input" placeholder="Product IDs (comma-separated)" value={bulkIds} onChange={(e) => setBulkIds(e.target.value)} required />
            <input className="input" type="number" placeholder="New stock level" value={stock} onChange={(e) => setStock(e.target.value)} />
            <button className="btn" type="submit">Update stock</button>
          </form>
        </div>

        <div className="panel p-4">
          <h2 className="text-sm font-medium text-neutral-500">Supplier search</h2>
          <form onSubmit={supplierSearch} className="mt-3 space-y-2">
            <textarea
              className="input min-h-[100px] font-mono text-xs"
              value={filterJson}
              onChange={(e) => setFilterJson(e.target.value)}
            />
            <button type="submit" className="btn-secondary">Search suppliers</button>
          </form>
          <ul className="mt-4 max-h-64 space-y-2 overflow-auto text-sm">
            {suppliers.map((s) => (
              <li key={s._id} className="border-b border-neutral-100 pb-2">
                <span className="font-medium">{s.name}</span>
                <span className="text-neutral-500"> · rating {s.rating} · ${s.contract_value?.toLocaleString?.() || s.contract_value}</span>
              </li>
            ))}
          </ul>
          {status && <p className="mt-3 text-sm text-neutral-600">{status}</p>}
        </div>
      </div>
    </Layout>
  );
}
