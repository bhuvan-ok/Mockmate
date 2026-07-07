import { Outlet, Link, useNavigate, useMatch } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiLogOut } from 'react-icons/fi';
import { ThemeToggle } from '../common/ThemeToggle.jsx';
import { logout } from '../../features/auth/authSlice.js';

// The attempt runner gets a maximized, LeetCode-style workspace — full
// viewport width and no page padding — instead of the padded/max-width
// container every other dashboard page uses.
export const DashboardLayout = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isAttemptRoute = useMatch('/dashboard/attempt/:attemptId');

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-2.5 dark:border-slate-800">
        <Link to="/dashboard" className="text-lg font-semibold text-slate-900 dark:text-white">
          MockMate
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {user?.name} · Rating {user?.rating}
          </span>
          <ThemeToggle />
          <button
            onClick={handleLogout}
            aria-label="Log out"
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <FiLogOut size={18} />
          </button>
        </div>
      </header>
      <main
        className={
          isAttemptRoute
            ? 'flex-1 overflow-hidden'
            : 'flex-1 overflow-y-auto px-6 py-8'
        }
      >
        <Outlet />
      </main>
    </div>
  );
};
