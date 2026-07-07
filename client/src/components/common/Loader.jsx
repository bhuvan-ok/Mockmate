export const Loader = ({ label = 'Loading...' }) => (
  <div className="flex h-full min-h-[200px] w-full flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
    <p className="text-sm">{label}</p>
  </div>
);
