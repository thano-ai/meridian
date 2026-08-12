import { useEffect, useState } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [title, setTitle] = useState('');
  const [roleOverride, setRoleOverride] = useState('member');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api.get('/api/projects').then((r) => setProjects(r.data.data.projects)).catch(() => {});
  }, []);

  async function open(id) {
    const { data } = await api.get(`/api/projects/${id}`);
    setSelected(data.data);
  }

  async function assign(e) {
    e.preventDefault();
    if (!selected?.project) return;
    await api.post(`/api/projects/${selected.project.id}/assign`, {
      title: title || 'New task',
      roleOverride,
    });
    setNotice('Task assigned');
    setTitle('');
    open(selected.project.id);
  }

  return (
    <Layout>
      <h1 className="font-display text-2xl font-semibold">Projects</h1>
      <p className="mt-1 text-sm text-neutral-500">Track work, milestones, and team assignments</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="panel p-4">
          <h2 className="text-sm font-medium text-neutral-500">Active projects</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {projects.map((p) => (
              <li key={p.id}>
                <button type="button" className="w-full text-left hover:underline" onClick={() => open(p.id)}>
                  <span className="font-medium">{p.name}</span>
                  <span className="text-neutral-500"> · {p.status} · {p.milestone}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel p-4">
          {selected ? (
            <>
              <h2 className="font-medium">{selected.project.name}</h2>
              <p className="mt-1 text-sm text-neutral-500">{selected.project.description}</p>
              <ul className="mt-4 space-y-2 text-sm">
                {selected.tasks.map((t) => (
                  <li key={t.id} className="flex justify-between border-b border-neutral-100 pb-2">
                    <span>{t.title}</span>
                    <span className="text-neutral-400">{t.status}{t.role_override ? ` · ${t.role_override}` : ''}</span>
                  </li>
                ))}
              </ul>
              <form onSubmit={assign} className="mt-4 space-y-2 border-t border-neutral-100 pt-4">
                <h3 className="text-sm font-medium">Assign task</h3>
                <input className="input" placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />
                <select className="input" value={roleOverride} onChange={(e) => setRoleOverride(e.target.value)}>
                  <option value="member">Member</option>
                  <option value="lead">Lead</option>
                  <option value="manager">Manager</option>
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                </select>
                <button type="submit" className="btn">Assign</button>
                {notice && <p className="text-sm text-neutral-600">{notice}</p>}
              </form>
            </>
          ) : (
            <p className="text-sm text-neutral-400">Select a project</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
