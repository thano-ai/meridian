import { useEffect, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import api from '../services/api';
import Layout from '../components/Layout';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function Analytics() {
  const [kpis, setKpis] = useState(null);
  const [sales, setSales] = useState([]);
  const [dept, setDept] = useState('Engineering');
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get('/api/analytics/kpis').then((r) => setKpis(r.data.data)).catch(() => {});
    api.get('/api/analytics/sales').then((r) => setSales(r.data.data.byMonth || [])).catch(() => {});
  }, []);

  async function runReport(e) {
    e.preventDefault();
    const { data } = await api.get('/api/analytics/reports', { params: { department: dept } });
    setRows(data.data?.rows || []);
  }

  const chartData = {
    labels: sales.map((s) => s.month),
    datasets: [{
      label: 'Revenue',
      data: sales.map((s) => s.total),
      backgroundColor: '#171717',
    }],
  };

  return (
    <Layout>
      <h1 className="font-display text-2xl font-semibold">Reports</h1>
      <p className="mt-1 text-sm text-neutral-500">Operational metrics and department reports</p>

      {kpis && (
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          {Object.entries(kpis).map(([k, v]) => (
            <div key={k} className="panel p-3">
              <p className="text-xs capitalize text-neutral-500">{k.replace(/([A-Z])/g, ' $1')}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {typeof v === 'number' ? v.toLocaleString() : v}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="panel p-4">
          <h2 className="text-sm font-medium text-neutral-500">Sales by month</h2>
          <div className="mt-4">
            <Bar
              data={chartData}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                  x: { grid: { display: false } },
                  y: { grid: { color: '#f5f5f5' } },
                },
              }}
            />
          </div>
        </div>

        <div className="panel p-4">
          <h2 className="text-sm font-medium text-neutral-500">Headcount by department</h2>
          <form onSubmit={runReport} className="mt-3 flex gap-2">
            <input className="input flex-1" value={dept} onChange={(e) => setDept(e.target.value)} />
            <button type="submit" className="btn">Run</button>
          </form>
          <div className="mt-4 max-h-72 overflow-auto">
            <table className="table">
              <thead>
                <tr><th>Department</th><th>Headcount</th><th>Avg salary</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.department}>
                    <td>{r.department}</td>
                    <td>{r.headcount}</td>
                    <td>${Number(r.avg_salary || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td colSpan={3} className="py-6 text-neutral-400">Run a report to view data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
