import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store';
import Logo from '../components/Logo';

export default function Register() {
  const token = useAuthStore((s) => s.token);
  const [fullName, setFullName] = useState('');
  const [academicId, setAcademicId] = useState('');
  const [group, setGroup] = useState('1');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  if (token) return <Navigate to="/" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/api/auth/register', { fullName, academicId, group });
      navigate('/login', { state: { registeredId: academicId } });
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to register');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="panel w-full max-w-md p-8">
        <Logo />
        <h1 className="mt-4 font-display text-lg font-semibold">Student registration</h1>
        <p className="mt-1 text-sm text-neutral-500">Create your session before signing in</p>
        <form onSubmit={onSubmit} className="mt-6 grid gap-3">
          <label className="block text-sm text-neutral-700">
            Name
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </label>
          <label className="block text-sm text-neutral-700">
            Student ID
            <input className="input" value={academicId} onChange={(e) => setAcademicId(e.target.value)} required />
          </label>
          <label className="block text-sm text-neutral-700">
            Group
            <select className="input" value={group} onChange={(e) => setGroup(e.target.value)} required>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn mt-1" disabled={busy}>
            {busy ? 'Registering…' : 'Register'}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-neutral-500">
          Already registered? <Link className="text-neutral-900 underline" to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
