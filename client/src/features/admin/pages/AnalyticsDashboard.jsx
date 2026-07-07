import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Loader } from '../../../components/common/Loader.jsx';
import { LoadError } from '../../../components/common/LoadError.jsx';
import { getAnalytics } from '../adminApi.js';

const StatCard = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 p-5 dark:border-slate-800">
    <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
  </div>
);

export const AnalyticsDashboard = () => {
  const [stats, setStats] = useState(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    getAnalytics()
      .then(setStats)
      .catch(() => {
        toast.error('Failed to load analytics');
        setFailed(true);
      });
  }, []);

  useEffect(load, [load]);

  if (failed) return <LoadError label="Could not load analytics." onRetry={load} />;
  if (!stats) return <Loader label="Loading analytics..." />;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Analytics</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Candidates" value={stats.candidateCount} />
        <StatCard label="Questions" value={stats.questionCount} />
        <StatCard label="Interview Sets" value={stats.interviewSetCount} />
        <StatCard label="Total Attempts" value={stats.totalAttempts} />
        <StatCard label="Completed Attempts" value={stats.completedAttempts} />
        <StatCard label="Completion Rate" value={`${stats.completionRate}%`} />
        <StatCard label="Avg Score" value={stats.avgScore} />
        <StatCard label="Avg Tab Switches" value={stats.avgTabSwitches} />
      </div>
    </div>
  );
};
