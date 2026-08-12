import { useEffect, useState } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';

export default function Finance() {
  const [invoices, setInvoices] = useState([]);
  const [detail, setDetail] = useState(null);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('travel');
  const [report, setReport] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api.get('/api/finance/invoices').then((r) => setInvoices(r.data.data.invoices)).catch(() => {});
  }, []);

  return (
    <Layout>
      <h1 className="font-display text-2xl font-semibold">Finance</h1>
      <p className="mt-1 text-sm text-neutral-500">Invoices, expenses, and budgets</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="panel p-4">
          <h2 className="text-sm font-medium text-neutral-500">Invoices</h2>
          <div className="mt-3 max-h-72 overflow-auto">
            <table className="table">
              <thead>
                <tr><th>Number</th><th>Amount</th><th>Status</th></tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <button
                        type="button"
                        className="hover:underline"
                        onClick={async () => {
                          const { data } = await api.get(`/api/finance/invoices/${inv.id}`);
                          setDetail(data.data?.invoice);
                        }}
                      >
                        {inv.invoice_number}
                      </button>
                    </td>
                    <td>${inv.amount}</td>
                    <td className="capitalize text-neutral-500">{inv.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {detail && (
            <div className="mt-4 border-t border-neutral-100 pt-3 text-sm">
              <p><span className="text-neutral-500">Amount:</span> ${detail.amount}</p>
              <p><span className="text-neutral-500">Tax:</span> ${detail.tax}</p>
              <p><span className="text-neutral-500">Account:</span> {detail.bank_account}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <form
            className="panel space-y-2 p-4"
            onSubmit={async (e) => {
              e.preventDefault();
              await api.post('/api/finance/expenses', {
                category,
                amount: Number(amount),
                description: 'Expense claim',
              });
              setNotice('Expense submitted for review');
              setAmount('');
            }}
          >
            <h2 className="text-sm font-medium text-neutral-500">Submit expense</h2>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="travel">Travel</option>
              <option value="meals">Meals</option>
              <option value="software">Software</option>
              <option value="equipment">Equipment</option>
            </select>
            <input className="input" type="number" step="0.01" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            <button type="submit" className="btn">Submit</button>
            {notice && <p className="text-sm text-neutral-600">{notice}</p>}
          </form>

          <div className="panel p-4">
            <h2 className="text-sm font-medium text-neutral-500">Reports</h2>
            <button
              type="button"
              className="btn-secondary mt-3"
              onClick={async () => {
                const { data } = await api.get('/api/finance/reports/full');
                setReport(data.data?.report);
              }}
            >
              Open financial summary
            </button>
            {report && (
              <div className="mt-3 space-y-1 text-sm">
                <p>Total invoiced: ${Number(report.totalInvoiced || 0).toLocaleString()}</p>
                <p>Total expenses: ${Number(report.totalExpenses || 0).toLocaleString()}</p>
                <p>Payroll total: ${Number(report.payrollTotal || 0).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
