import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import Logo from './Logo';

const links = [
  { to: '/', label: 'Home' },
  { to: '/hr', label: 'People' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/crm', label: 'Customers' },
  { to: '/finance', label: 'Finance' },
  { to: '/projects', label: 'Projects' },
  { to: '/documents', label: 'Files' },
  { to: '/comms', label: 'Messages' },
  { to: '/store', label: 'Shop' },
  { to: '/analytics', label: 'Reports' },
  { to: '/profile', label: 'Account' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Logo />
          <div className="flex items-center gap-3 text-sm text-neutral-600">
            <span className="hidden sm:inline">{user?.fullName || user?.email}</span>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              Sign out
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `whitespace-nowrap px-2.5 py-1.5 text-sm ${
                  isActive
                    ? 'border-b-2 border-neutral-900 font-medium text-neutral-900'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
