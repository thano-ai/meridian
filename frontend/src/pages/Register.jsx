import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store';
import Logo from '../components/Logo';

const initial = {
  fullName: '',
  academicId: '',
  phoneNumber: '',
  email: '',
  department: 'Operations',
  role: 'employee',
  password: '',
  whatsappOptIn: false,
};

export default function Register() {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/api/auth/register', form);
      setAuth(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to create account');
    }
  }

  const fields = [
    ['fullName', 'Full name', 'text'],
    ['academicId', 'Employee ID', 'text'],
    ['phoneNumber', 'Phone number', 'tel'],
    ['email', 'Work email', 'email'],
    ['department', 'Department', 'text'],
    ['password', 'Password', 'password'],
  ];

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="panel w-full max-w-md p-8">
        <Logo />
        <h1 className="mt-4 font-display text-lg font-semibold">Create account</h1>
        <p className="mt-1 text-sm text-neutral-500">Join your organization workspace</p>
        <form onSubmit={onSubmit} className="mt-6 grid gap-3">
          {fields.map(([k, label, type]) => (
            <label key={k} className="block text-sm text-neutral-700">
              {label}
              <input
                type={type}
                className="input"
                value={form[k]}
                onChange={(e) => set(k, e.target.value)}
                required
              />
            </label>
          ))}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn mt-1">Create account</button>
        </form>
        <p className="mt-5 text-center text-sm text-neutral-500">
          <Link className="text-neutral-900 underline" to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
