import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';

export const NotFound = () => (
  <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center">
    <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">404</p>
    <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
      Page not found
    </h1>
    <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
      The page you're looking for doesn't exist or may have moved.
    </p>
    <Link
      to="/"
      className="mt-8 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
    >
      <FiArrowLeft size={14} /> Back to home
    </Link>
  </div>
);
