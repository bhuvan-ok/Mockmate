const VERDICT_LABELS = {
  AC: 'Accepted',
  WA: 'Wrong Answer',
  TLE: 'Time Limit Exceeded',
  RE: 'Runtime Error',
  MLE: 'Memory Limit Exceeded',
  CE: 'Compilation Error',
  OLE: 'Output Limit Exceeded',
};

const VERDICT_STYLES = {
  AC: 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400',
  WA: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  TLE: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  RE: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  MLE: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  CE: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  OLE: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
};

export const VerdictBadge = ({ verdictType }) => {
  if (!verdictType) return null;
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
        VERDICT_STYLES[verdictType] || VERDICT_STYLES.WA
      }`}
    >
      {VERDICT_LABELS[verdictType] || verdictType}
    </span>
  );
};
