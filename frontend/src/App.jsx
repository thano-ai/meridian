import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import HR from './pages/HR';
import Inventory from './pages/Inventory';
import CRM from './pages/CRM';
import Finance from './pages/Finance';
import Projects from './pages/Projects';
import Documents from './pages/Documents';
import Comms from './pages/Comms';
import Store from './pages/Store';
import Analytics from './pages/Analytics';
import FlagSubmit from './pages/FlagSubmit';

function Private({ children }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/register" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<Private><Dashboard /></Private>} />
      <Route path="/profile" element={<Private><Profile /></Private>} />
      <Route path="/hr" element={<Private><HR /></Private>} />
      <Route path="/inventory" element={<Private><Inventory /></Private>} />
      <Route path="/crm" element={<Private><CRM /></Private>} />
      <Route path="/finance" element={<Private><Finance /></Private>} />
      <Route path="/projects" element={<Private><Projects /></Private>} />
      <Route path="/documents" element={<Private><Documents /></Private>} />
      <Route path="/comms" element={<Private><Comms /></Private>} />
      <Route path="/store" element={<Private><Store /></Private>} />
      <Route path="/analytics" element={<Private><Analytics /></Private>} />
      <Route path="/hidden/flag-submit" element={<FlagSubmit />} />
      <Route path="/hidden/verify" element={<FlagSubmit />} />
      <Route path="/internal/flag-submission" element={<FlagSubmit />} />
      <Route path="/internal/audit/verify" element={<FlagSubmit />} />
    </Routes>
  );
}
