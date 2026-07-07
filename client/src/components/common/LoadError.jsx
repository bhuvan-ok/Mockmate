export const LoadError = ({ label = 'Something went wrong.', onRetry }) => (
  <div className="flex h-full min-h-[200px] w-full flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
    <p className="text-sm">{label}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
      >
        Retry
      </button>
    )}
  </div>
);
