import { Outlet, Link } from 'react-router-dom';
import { ThemeToggle } from '../common/ThemeToggle.jsx';
import { Footer } from './Footer.jsx';

export const PublicLayout = () => (
  <div className="flex min-h-screen flex-col bg-white dark:bg-slate-950">
    <header className="flex items-center justify-between px-6 py-4">
      <Link to="/" className="text-lg font-semibold text-slate-900 dark:text-white">
        MockMate
      </Link>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Link
          to="/login"
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Log in
        </Link>
        <Link
          to="/register"
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Get started
        </Link>
      </div>
    </header>
    <main className="flex-1">
      <Outlet />
    </main>
    <Footer />
  </div>
);
