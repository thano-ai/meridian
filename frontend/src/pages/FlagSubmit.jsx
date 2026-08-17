import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store';
import Logo from '../components/Logo';

export default function FlagSubmit() {
  const token = useAuthStore((s) => s.token);
  const [vulnerabilityId, setVulnerabilityId] = useState('');
  const [flag, setFlag] = useState('');
  const [evidence, setEvidence] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  if (!token) {
    return <Navigate to="/register" replace state={{ from: '/hidden/flag-submit' }} />;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const { data } = await api.post('/hidden/flag-submit', {
        vulnerabilityId: vulnerabilityId.trim(),
        flag: flag.trim(),
        evidence: evidence.trim() || undefined,
      });
      setResult({ ok: true, data });
    } catch (err) {
      setResult({
        ok: false,
        data: err.response?.data || { error: err.message },
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Logo />
          <Link to="/" className="text-sm text-neutral-500 hover:text-neutral-800">
            Back to workspace
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-10">
        <h1 className="font-display text-xl font-semibold">Verification</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Submit a finding reference for review. Values expire quickly — paste soon after capture.
        </p>

        <form onSubmit={onSubmit} className="panel mt-6 space-y-3 p-5">
          <label className="block text-sm text-neutral-700">
            Finding ID
            <input
              className="input"
              placeholder="e.g. SQLI-001"
              value={vulnerabilityId}
              onChange={(e) => setVulnerabilityId(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm text-neutral-700">
            Token
            <input
              className="input font-mono text-xs"
              placeholder="FLAG-…"
              value={flag}
              onChange={(e) => setFlag(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm text-neutral-700">
            Notes (optional)
            <textarea
              className="input min-h-[72px]"
              placeholder="Where you found it"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
            />
          </label>
          <button type="submit" className="btn w-full" disabled={busy}>
            {busy ? 'Submitting…' : 'Submit'}
          </button>
        </form>

        {result && (
          <div
            className={`mt-4 border p-4 text-sm ${
              result.ok ? 'border-neutral-200 bg-white text-neutral-800' : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {result.ok ? (
              <>
                <p className="font-medium capitalize">{result.data.status}</p>
                {result.data.points != null && <p>Points: +{result.data.points}</p>}
                {result.data.totalProgress != null && (
                  <p>
                    Score: {result.data.totalProgress}/100
                    {result.data.submittedCount != null ? ` · Findings: ${result.data.submittedCount}/10` : ''}
                    {result.data.ranking ? ` · ${result.data.ranking}` : ''}
                  </p>
                )}
                {result.data.complete && <p className="mt-1 font-medium">Session complete.</p>}
                {!result.data.complete && result.data.remaining && (
                  <p className="mt-1 text-neutral-600">
                    Remaining: {result.data.remaining.points} points
                    {result.data.remaining.findings > 0
                      ? ` and ${result.data.remaining.findings} more finding${result.data.remaining.findings === 1 ? '' : 's'}`
                      : ''}
                    .
                  </p>
                )}
                <Link to="/profile" className="mt-2 inline-block underline">
                  View session progress
                </Link>
              </>
            ) : (
              <>
                <p className="font-medium">{result.data.status || 'rejected'}</p>
                <p>{result.data.message || result.data.error}</p>
                {result.data.hint && <p className="mt-1 text-neutral-600">{result.data.hint}</p>}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
