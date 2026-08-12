import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store';
import Logo from '../components/Logo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
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
        <p className="mt-4 text-sm text-neutral-500">Sign in to your workspace</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm text-neutral-700">
            Email
            <input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="block text-sm text-neutral-700">
            Password
            <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn w-full">Sign in</button>
        </form>
        <p className="mt-5 text-center text-sm text-neutral-500">
          Need an account? <Link className="text-neutral-900 underline" to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}
