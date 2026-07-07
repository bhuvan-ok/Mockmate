import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { FiLogOut, FiBarChart2, FiHelpCircle, FiLayers, FiList } from 'react-icons/fi';
import { ThemeToggle } from '../common/ThemeToggle.jsx';
import { logout } from '../../features/auth/authSlice.js';

const navItems = [
  { to: '/admin', label: 'Analytics', icon: FiBarChart2, end: true },
  { to: '/admin/questions', label: 'Question Bank', icon: FiHelpCircle },
  { to: '/admin/interview-sets', label: 'Interview Sets', icon: FiLayers },
  { to: '/admin/attempts', label: 'Attempts', icon: FiList },
];

const linkClasses = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
    isActive
      ? 'bg-indigo-600 text-white'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
  }`;

export const AdminLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <aside className="flex w-60 flex-col border-r border-slate-200 p-4 dark:border-slate-800">
        <div className="mb-6 px-2 text-lg font-semibold text-slate-900 dark:text-white">
          MockMate Admin
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClasses}>
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center justify-between px-2 pt-4">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            aria-label="Log out"
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <FiLogOut size={18} />
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
};
