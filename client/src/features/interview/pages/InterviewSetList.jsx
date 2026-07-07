import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FiClock,
  FiHash,
  FiArrowRight,
  FiChevronDown,
  FiZap,
  FiTrendingUp,
  FiShield,
  FiCode,
} from 'react-icons/fi';
import { Loader } from '../../../components/common/Loader.jsx';
import { LoadError } from '../../../components/common/LoadError.jsx';
import { listInterviewSets, startAttempt, listMyAttempts } from '../interviewApi.js';

const HOW_IT_WORKS = [
  {
    icon: FiHash,
    title: '1. MCQ round',
    body: '10 adaptive CS-fundamentals and JavaScript questions, 15 minutes on the clock. Each next question is picked based on how you did on the last one.',
  },
  {
    icon: FiCode,
    title: '2. Coding round',
    body: '2 adaptive, medium-difficulty LeetCode-style problems in JavaScript or C++, 40 minutes total. You only write the function — no stdin parsing, no imports.',
  },
  {
    icon: FiTrendingUp,
    title: '3. Results & feedback',
    body: 'A score breakdown per round, your rating movement, and an AI-generated plain-language summary of strengths and one thing to improve.',
  },
];

const FAQS = [
  {
    q: 'Can I go back to a question I already answered?',
    a: 'Yes — use the arrows above the question to review anything you\'ve already answered in the current round. Reviews are read-only: once you submit an answer, the adaptive engine has already used it to pick your next question, so it can\'t be changed.',
  },
  {
    q: 'How does adaptive difficulty work?',
    a: 'Every candidate and question has an Elo-style rating. After each question, your rating adjusts based on whether you got it right relative to its difficulty — then the next question is chosen to be closely matched to your current rating, like GRE/GMAT-style computer-adaptive testing.',
  },
  {
    q: 'What do the hints cost me?',
    a: 'Nothing — hints are handwritten per question, not AI-generated, and there\'s no penalty or limit tied to your score for viewing them. Reveal them one at a time from the Hints tab next to the problem.',
  },
  {
    q: 'Is my code execution really sandboxed?',
    a: 'Yes — every run/submit executes inside a resource-limited, network-isolated Docker container on the server. It\'s not a mock grader: real compilation (C++) and real execution (JS/C++) happen against the actual test cases.',
  },
  {
    q: 'What happens if I switch tabs or paste code?',
    a: 'Tab switches and paste events are logged and shown on your results report for your own awareness — they\'re never used to auto-disqualify or penalize you.',
  },
];

const FaqItem = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-200 py-3 last:border-b-0 dark:border-slate-800">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left text-sm font-medium text-slate-800 dark:text-slate-200"
      >
        {q}
        <FiChevronDown
          size={16}
          className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{a}</p>}
    </div>
  );
};

export const InterviewSetList = () => {
  const [sets, setSets] = useState(null);
  const [failed, setFailed] = useState(false);
  const [recentAttempts, setRecentAttempts] = useState(null);
  const [startingId, setStartingId] = useState(null);
  const navigate = useNavigate();

  const load = () => {
    setFailed(false);
    listInterviewSets()
      .then(setSets)
      .catch(() => {
        toast.error('Failed to load interview sets');
        setFailed(true);
      });
    listMyAttempts()
      .then((res) => setRecentAttempts(res.attempts))
      .catch(() => setRecentAttempts([]));
  };

  useEffect(load, []);

  const handleStart = async (interviewSetId) => {
    if (!confirm('Start this timed interview? Once started, the clock cannot be paused.')) return;

    setStartingId(interviewSetId);
    try {
      const state = await startAttempt(interviewSetId);
      navigate(`/dashboard/attempt/${state.attemptId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start attempt');
    } finally {
      setStartingId(null);
    }
  };

  if (failed) return <LoadError label="Could not load interview sets." onRetry={load} />;
  if (!sets) return <Loader label="Loading interview sets..." />;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Interview Sets</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Pick a set to start a timed, adaptive mock interview.
      </p>

      {recentAttempts?.length > 0 && (
        <div className="mt-6 flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Recent attempts
          </h2>
          {recentAttempts.map((a) => (
            <button
              key={a.attemptId}
              onClick={() =>
                navigate(
                  a.status === 'completed'
                    ? `/dashboard/results/${a.attemptId}`
                    : `/dashboard/attempt/${a.attemptId}`
                )
              }
              className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2.5 text-left text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
            >
              <span className="text-slate-700 dark:text-slate-300">
                {a.interviewSet?.title || 'Interview set'}
                <span className="ml-2 text-xs text-slate-400">
                  {a.status === 'completed' ? `Score: ${a.overallScore}` : 'In progress — resume'}
                </span>
              </span>
              <FiArrowRight className="text-slate-400" size={14} />
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-4">
        {sets.map((set) => (
          <div
            key={set._id}
            className="rounded-xl border border-slate-200 p-5 dark:border-slate-800"
          >
            <h2 className="font-semibold text-slate-900 dark:text-white">{set.title}</h2>
            {set.description && (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{set.description}</p>
            )}

            <div className="mt-3 flex flex-wrap gap-3">
              {set.rounds.map((round, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  <FiHash size={12} />
                  {round.type.toUpperCase()} · {round.questionCount}q
                  <FiClock size={12} className="ml-1" />
                  {Math.round(round.durationSec / 60)}m
                </span>
              ))}
            </div>

            <button
              onClick={() => handleStart(set._id)}
              disabled={startingId === set._id}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {startingId === set._id ? 'Starting...' : 'Start attempt'}
            </button>
          </div>
        ))}

        {sets.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No interview sets are available yet — check back soon.
          </p>
        )}
      </div>

      {/* Documentation / tutorial section — the interview-set list above is
          usually just one card, so this fills out the home screen with
          orientation content for first-time candidates. */}
      <div className="mt-12 flex flex-col gap-8 border-t border-slate-200 pt-8 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">How it works</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {HOW_IT_WORKS.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
              >
                <Icon className="text-indigo-600 dark:text-indigo-400" size={20} />
                <h3 className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                  {title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <FiZap className="mt-0.5 shrink-0 text-amber-500" size={18} />
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              <span className="font-medium text-slate-800 dark:text-slate-200">Stuck?</span> Reveal
              handwritten hints one at a time — no AI, no penalty.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <FiTrendingUp className="mt-0.5 shrink-0 text-indigo-500" size={18} />
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              <span className="font-medium text-slate-800 dark:text-slate-200">Adaptive.</span>{' '}
              Questions get harder or easier in real time based on your live rating.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <FiShield className="mt-0.5 shrink-0 text-green-600" size={18} />
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              <span className="font-medium text-slate-800 dark:text-slate-200">Fair timing.</span>{' '}
              The clock is enforced server-side — imports/compile time are never charged against
              your code's execution.
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">FAQ</h2>
          <div className="mt-2 rounded-xl border border-slate-200 px-4 dark:border-slate-800">
            {FAQS.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
