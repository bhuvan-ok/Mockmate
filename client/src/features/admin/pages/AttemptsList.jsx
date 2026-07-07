import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Loader } from '../../../components/common/Loader.jsx';
import { LoadError } from '../../../components/common/LoadError.jsx';
import { listAttemptsAdmin } from '../adminApi.js';

export const AttemptsList = () => {
  const [result, setResult] = useState(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    listAttemptsAdmin({ limit: 50 })
      .then(setResult)
      .catch(() => {
        toast.error('Failed to load attempts');
        setFailed(true);
      });
  }, []);

  useEffect(load, [load]);

  if (failed) return <LoadError label="Could not load attempts." onRetry={load} />;
  if (!result) return <Loader label="Loading attempts..." />;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Attempts</h1>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Candidate</th>
              <th className="px-4 py-3">Interview Set</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Tab Switches</th>
              <th className="px-4 py-3">Paste Events</th>
            </tr>
          </thead>
          <tbody>
            {result.attempts.map((a) => (
              <tr key={a._id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800 dark:text-slate-200">
                    {a.candidateId?.name}
                  </div>
                  <div className="text-xs text-slate-400">{a.candidateId?.email}</div>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {a.interviewSetId?.title}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      a.status === 'completed'
                        ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                    }`}
                  >
                    {a.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {a.overallScore ?? '—'}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {a.integrityFlags.tabSwitchCount}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {a.integrityFlags.pasteCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {result.attempts.length === 0 && (
          <p className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">No attempts yet.</p>
        )}
      </div>
    </div>
  );
};
