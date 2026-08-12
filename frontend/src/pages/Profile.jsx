import { useEffect, useState } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';

export default function Profile() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    api.get('/api/auth/profile').then((r) => setProfile(r.data)).catch(() => {});
  }, []);

  if (!profile) {
    return (
      <Layout>
        <p className="text-sm text-neutral-500">Loading…</p>
      </Layout>
    );
  }

  const { personal, progress, accepted, submissions } = profile;
  const submittedCount = progress?.submittedCount || accepted?.length || 0;

  return (
    <Layout>
      <h1 className="font-display text-2xl font-semibold">Account</h1>
      <p className="mt-1 text-sm text-neutral-500">Your profile and session progress</p>

      <div className="mt-6 grid max-w-2xl gap-4">
        <div className="panel p-5">
          <h2 className="text-sm font-medium text-neutral-500">Personal information</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-neutral-500">Name</dt>
              <dd className="mt-0.5 font-medium">{personal.fullName}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Employee ID</dt>
              <dd className="mt-0.5 font-medium">{personal.academicId}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Email</dt>
              <dd className="mt-0.5 font-medium">{personal.email}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Phone</dt>
              <dd className="mt-0.5 font-medium">{personal.phoneNumber}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Department</dt>
              <dd className="mt-0.5 font-medium">{personal.department}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Role</dt>
              <dd className="mt-0.5 font-medium capitalize">{String(personal.role || '').replace(/_/g, ' ')}</dd>
            </div>
          </dl>
        </div>

        <div className="panel p-5">
          <h2 className="text-sm font-medium text-neutral-500">Session progress</h2>
          <p className="mt-2 text-sm text-neutral-700">
            Flags submitted: <strong>{submittedCount}</strong>
            {progress ? ` / ${progress.totalPossible}` : ''}
            {progress ? ` · Score ${progress.score}/100` : ''}
            {progress?.ranking ? ` · ${progress.ranking}` : ''}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Points are awarded only after a valid flag is submitted. Flags change every minute.
          </p>

          {submittedCount === 0 ? (
            <p className="mt-3 text-sm text-neutral-600 border border-neutral-200 bg-neutral-50 p-3">
              No flags submitted yet. Capture <code className="text-xs">X-Vuln-Flag</code>, find the
              verification page (check response headers / config), and submit before the minute rotates.
            </p>
          ) : (
            <ul className="mt-3 max-h-56 space-y-1 overflow-auto text-sm text-neutral-600">
              {(accepted || []).map((s) => (
                <li key={s.id}>
                  {s.vulnerability_id} · {s.points} pts · {s.hardness}
                </li>
              ))}
            </ul>
          )}

          {!!submissions?.length && (
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer text-neutral-500">Submission history</summary>
              <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-neutral-600">
                {submissions.map((s) => (
                  <li key={s.id}>
                    <span className={s.status === 'accepted' ? 'text-neutral-900' : 'text-red-700'}>
                      {s.status}
                    </span>
                    {' · '}{s.vulnerability_id}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>
    </Layout>
  );
}
