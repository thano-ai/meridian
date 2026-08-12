import { useState } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';

export default function HR() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [employee, setEmployee] = useState(null);
  const [uploadMsg, setUploadMsg] = useState('');
  const [leaveMsg, setLeaveMsg] = useState('');

  async function search(e) {
    e.preventDefault();
    const { data } = await api.get('/api/hr/employees/search', { params: { q } });
    setResults(data.data?.users || []);
  }

  async function viewEmployee(id) {
    const { data } = await api.get(`/api/hr/employees/${id}`);
    setEmployee(data.data?.employee || data.employee);
  }

  async function upload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('resume', file);
    const { data } = await api.post('/api/hr/onboarding/upload', fd);
    setUploadMsg(data.data?.filename ? `Uploaded ${data.data.filename}` : 'Upload complete');
  }

  async function requestLeave(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    await api.post('/api/hr/leave', {
      leaveType: fd.get('leaveType'),
      startDate: fd.get('startDate'),
      endDate: fd.get('endDate'),
      reason: fd.get('reason'),
    });
    setLeaveMsg('Leave request submitted');
    e.target.reset();
  }

  return (
    <Layout>
      <h1 className="font-display text-2xl font-semibold">People</h1>
      <p className="mt-1 text-sm text-neutral-500">Employee directory, leave, and onboarding</p>

      <form onSubmit={search} className="panel mt-6 flex flex-wrap gap-2 p-4">
        <input
          className="input m-0 min-w-[220px] flex-1"
          placeholder="Search by name, department, or code"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit" className="btn">Search</button>
      </form>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="panel p-4">
          <h2 className="text-sm font-medium text-neutral-500">Directory</h2>
          <div className="mt-3 max-h-80 overflow-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Department</th>
                </tr>
              </thead>
              <tbody>
                {results.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <button type="button" className="text-left hover:underline" onClick={() => viewEmployee(u.id)}>
                        {u.employee_code}
                      </button>
                    </td>
                    <td>{u.full_name}</td>
                    <td className="text-neutral-500">{u.department}</td>
                  </tr>
                ))}
                {!results.length && (
                  <tr><td colSpan={3} className="py-6 text-neutral-400">Search to view employees</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel p-4">
            <h2 className="text-sm font-medium text-neutral-500">Employee record</h2>
            {employee ? (
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                {Object.entries(employee).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-neutral-450 text-neutral-400">{k}</dt>
                    <dd>{String(v ?? '—')}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-3 text-sm text-neutral-400">Select an employee</p>
            )}
          </div>

          <div className="panel p-4">
            <h2 className="text-sm font-medium text-neutral-500">Onboarding documents</h2>
            <input type="file" className="mt-3 block w-full text-sm" onChange={upload} />
            {uploadMsg && <p className="mt-2 text-sm text-neutral-600">{uploadMsg}</p>}
          </div>

          <form onSubmit={requestLeave} className="panel space-y-2 p-4">
            <h2 className="text-sm font-medium text-neutral-500">Request leave</h2>
            <select name="leaveType" className="input" defaultValue="annual">
              <option value="annual">Annual</option>
              <option value="sick">Sick</option>
              <option value="unpaid">Unpaid</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input name="startDate" type="date" className="input" required />
              <input name="endDate" type="date" className="input" required />
            </div>
            <input name="reason" className="input" placeholder="Reason" />
            <button type="submit" className="btn">Submit request</button>
            {leaveMsg && <p className="text-sm text-neutral-600">{leaveMsg}</p>}
          </form>
        </div>
      </div>
    </Layout>
  );
}
