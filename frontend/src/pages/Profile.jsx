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
  const minSolved = progress?.minSolved || 10;
  const targetScore = progress?.targetScore || 100;
  const complete = !!progress?.complete;
  const remaining = progress?.remaining || { points: targetScore, findings: minSolved };

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
              <dt className="text-neutral-500">Student ID</dt>
              <dd className="mt-0.5 font-medium">{personal.academicId}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Group</dt>
              <dd className="mt-0.5 font-medium">{personal.group || '—'}</dd>
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
            Score: <strong>{progress?.score ?? 0}/{targetScore}</strong>
            {' · '}
            Findings: <strong>{submittedCount}/{minSolved}</strong> required
            {progress?.ranking ? ` · ${progress.ranking}` : ''}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Points follow finding difficulty. Session is complete at {targetScore} points and at least {minSolved} accepted findings.
          </p>

          <div className="mt-3 h-2 rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-neutral-900"
              style={{ width: `${Math.min(100, progress?.score || 0)}%` }}
            />
          </div>

          {complete ? (
            <p className="mt-3 border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-800">
              Session complete.
            </p>
          ) : (
            <p className="mt-3 text-sm text-neutral-600">
              Remaining: {remaining.points} points
              {remaining.findings > 0 ? ` and ${remaining.findings} more finding${remaining.findings === 1 ? '' : 's'}` : ''}.
            </p>
          )}

          {submittedCount === 0 ? (
            <p className="mt-3 text-sm text-neutral-600 border border-neutral-200 bg-neutral-50 p-3">
              No findings submitted yet.
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
