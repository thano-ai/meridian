import { useEffect, useState } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';

export default function CRM() {
  const [customers, setCustomers] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [tickets, setTickets] = useState([]);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api.get('/api/crm/customers').then((r) => setCustomers(r.data.data.customers)).catch(() => {});
    api.get('/api/crm/tickets').then((r) => setTickets(r.data.data.tickets)).catch(() => {});
  }, []);

  async function openCustomer(id) {
    const { data } = await api.get(`/api/crm/customers/${id}`);
    setCustomer(data.data?.customer);
  }

  async function createTicket(e) {
    e.preventDefault();
    await api.post('/api/crm/tickets', {
      customerId: customers[0]?.id || 1,
      subject,
      body,
    });
    setSubject('');
    setBody('');
    setNotice('Ticket created');
    const { data } = await api.get('/api/crm/tickets');
    setTickets(data.data.tickets);
  }

  return (
    <Layout>
      <h1 className="font-display text-2xl font-semibold">Customers</h1>
      <p className="mt-1 text-sm text-neutral-500">Accounts, support, and loyalty</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="panel p-4">
          <h2 className="text-sm font-medium text-neutral-500">Customer list</h2>
          <div className="mt-3 max-h-80 overflow-auto">
            <table className="table">
              <thead>
                <tr><th>Code</th><th>Name</th><th>Tier</th></tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <button type="button" className="hover:underline" onClick={() => openCustomer(c.id)}>
                        {c.customer_code}
                      </button>
                    </td>
                    <td>{c.full_name}</td>
                    <td className="capitalize text-neutral-500">{c.tier}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {customer && (
            <div className="mt-4 border-t border-neutral-100 pt-3 text-sm">
              <p className="font-medium">{customer.full_name}</p>
              <p className="text-neutral-500">{customer.email} · {customer.company}</p>
              <p className="mt-1">{customer.loyalty_points} loyalty points</p>
            </div>
          )}
        </div>

        <div className="panel p-4">
          <h2 className="text-sm font-medium text-neutral-500">Support tickets</h2>
          <form onSubmit={createTicket} className="mt-3 space-y-2">
            <input className="input" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
            <textarea className="input min-h-[90px]" placeholder="Describe the issue" value={body} onChange={(e) => setBody(e.target.value)} required />
            <button type="submit" className="btn">Create ticket</button>
            {notice && <p className="text-sm text-neutral-600">{notice}</p>}
          </form>
          <ul className="mt-4 max-h-64 space-y-3 overflow-auto text-sm">
            {tickets.map((t) => (
              <li key={t.id} className="border-b border-neutral-100 pb-2">
                <div className="flex items-center justify-between gap-2">
                  <strong className="font-medium">{t.subject}</strong>
                  <span className="text-xs capitalize text-neutral-400">{t.status}</span>
                </div>
                <div className="mt-1 text-neutral-600" dangerouslySetInnerHTML={{ __html: t.body }} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Layout>
  );
}
