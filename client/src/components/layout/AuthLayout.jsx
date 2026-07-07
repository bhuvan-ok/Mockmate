import { Outlet, Link } from 'react-router-dom';
import { ThemeToggle } from '../common/ThemeToggle.jsx';

export const AuthLayout = () => (
  <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
    <header className="flex items-center justify-between px-6 py-4">
      <Link to="/" className="text-lg font-semibold text-slate-900 dark:text-white">
        MockMate
      </Link>
      <ThemeToggle />
    </header>
    <main className="flex flex-1 items-center justify-center px-4 pb-16">
      <Outlet />
    </main>
  </div>
);
