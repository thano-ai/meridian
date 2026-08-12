import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Layout from '../components/Layout';
import { useAuthStore } from '../store';

const modules = [
  { to: '/hr', title: 'People', desc: 'Directory, leave, payroll, and onboarding' },
  { to: '/inventory', title: 'Inventory', desc: 'Products, stock levels, and suppliers' },
  { to: '/crm', title: 'Customers', desc: 'Accounts, support tickets, and loyalty' },
  { to: '/finance', title: 'Finance', desc: 'Invoices, expenses, and budgets' },
  { to: '/projects', title: 'Projects', desc: 'Tasks, milestones, and assignments' },
  { to: '/documents', title: 'Files', desc: 'Shared documents and approvals' },
  { to: '/comms', title: 'Messages', desc: 'Inbox and company announcements' },
  { to: '/store', title: 'Shop', desc: 'Internal catalog and orders' },
  { to: '/analytics', title: 'Reports', desc: 'KPIs and operational dashboards' },
];

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const [kpis, setKpis] = useState(null);

  useEffect(() => {
    api.get('/api/analytics/kpis').then((r) => setKpis(r.data.data)).catch(() => {});
  }, []);

  return (
    <Layout>
      <section className="mb-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Good day{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">Overview of your workspace</p>
      </section>

      {kpis && (
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            ['Employees', kpis.employees],
            ['Products', kpis.products],
            ['Customers', kpis.customers],
            ['Open tickets', kpis.openTickets],
            ['Revenue (paid)', `$${(kpis.revenue || 0).toLocaleString()}`],
          ].map(([label, val]) => (
            <div key={label} className="panel p-4">
              <p className="text-xs text-neutral-500">{label}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{val}</p>
            </div>
          ))}
        </div>
      )}

      <h2 className="mb-3 text-sm font-medium text-neutral-500">Modules</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <Link key={m.to} to={m.to} className="panel block p-4 hover:bg-neutral-50">
            <h3 className="font-medium">{m.title}</h3>
            <p className="mt-1 text-sm text-neutral-500">{m.desc}</p>
          </Link>
        ))}
      </div>
    </Layout>
  );
}
