import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { FiTrendingUp, FiTrendingDown, FiFlag } from 'react-icons/fi';
import { Loader } from '../../../components/common/Loader.jsx';
import { LoadError } from '../../../components/common/LoadError.jsx';
import { getAttemptReport } from '../../interview/interviewApi.js';
import { getFeedback } from '../../ai-hints/aiApi.js';

export const ResultsPage = () => {
  const { attemptId } = useParams();
  const [report, setReport] = useState(null);
  const [failed, setFailed] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  const load = () => {
    setFailed(false);
    getAttemptReport(attemptId)
      .then(setReport)
      .catch(() => {
        toast.error('Failed to load results');
        setFailed(true);
      });
  };

  useEffect(load, [attemptId]);

  const handleGetFeedback = async () => {
    setLoadingFeedback(true);
    try {
      const { feedback: text } = await getFeedback(attemptId);
      setFeedback(text);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate feedback');
    } finally {
      setLoadingFeedback(false);
    }
  };

  if (failed) return <LoadError label="Could not load results." onRetry={load} />;
  if (!report) return <Loader label="Loading results..." />;

  const ratingDelta = report.ratingAfter - report.ratingBefore;
  const ROUND_COLORS = { mcq: '#6366f1', coding: '#22c55e' };
  const chartData = report.rounds.map((r) => ({
    round: r.type.toUpperCase(),
    score: r.roundScore,
    color: ROUND_COLORS[r.type] || '#6366f1',
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
        {report.interviewSet?.title} — Results
      </h1>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 p-4 text-center dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Overall Score</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {report.overallScore}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4 text-center dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Rating Change</p>
          <p
            className={`mt-1 flex items-center justify-center gap-1 text-2xl font-bold ${
              ratingDelta >= 0 ? 'text-green-600' : 'text-red-500'
            }`}
          >
            {ratingDelta >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
            {report.ratingBefore} → {report.ratingAfter}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4 text-center dark:border-slate-800">
          <p className="flex items-center justify-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <FiFlag size={12} /> Integrity Flags
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {report.integrityFlags.tabSwitchCount + report.integrityFlags.pasteCount}
          </p>
        </div>
      </div>

      <div className="mt-8 h-64 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barSize={64}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
            <XAxis dataKey="round" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Bar dataKey="score" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {report.rounds.map((r, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm dark:border-slate-800"
          >
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {r.type.toUpperCase()} round
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              {r.questionsAnswered}/{r.targetQuestionCount} answered
            </span>
            <span className="font-semibold text-slate-900 dark:text-white">{r.roundScore}/100</span>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-900 dark:bg-indigo-950/30">
        <h3 className="font-semibold text-indigo-800 dark:text-indigo-300">AI Feedback</h3>
        {feedback ? (
          <p className="mt-2 whitespace-pre-wrap text-sm text-indigo-900 dark:text-indigo-200">
            {feedback}
          </p>
        ) : (
          <button
            onClick={handleGetFeedback}
            disabled={loadingFeedback}
            className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {loadingFeedback ? 'Generating...' : 'Get AI feedback'}
          </button>
        )}
      </div>
    </div>
  );
};
