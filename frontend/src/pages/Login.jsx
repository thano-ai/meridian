import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store';
import Logo from '../components/Logo';

export default function Login() {
  const token = useAuthStore((s) => s.token);
  const location = useLocation();
  const [academicId, setAcademicId] = useState(location.state?.registeredId || '');
  const [error, setError] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  if (token) return <Navigate to="/" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/api/auth/login', { academicId });
      setAuth(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to sign in');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="panel w-full max-w-sm p-8">
        <Logo />
        <p className="mt-4 text-sm text-neutral-500">Sign in with your student ID</p>
        {location.state?.registeredId && (
          <p className="mt-2 text-sm text-neutral-700">Registration saved. Sign in to continue.</p>
        )}
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm text-neutral-700">
            Student ID
            <input
              className="input"
              autoComplete="username"
              value={academicId}
              onChange={(e) => setAcademicId(e.target.value)}
              required
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn w-full">Sign in</button>
        </form>
        <p className="mt-5 text-center text-sm text-neutral-500">
          New student? <Link className="text-neutral-900 underline" to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
