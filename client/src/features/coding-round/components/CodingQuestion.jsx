import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import toast from 'react-hot-toast';
import { FiPlay, FiCheck, FiRotateCcw, FiTerminal } from 'react-icons/fi';
import { DifficultyBadge } from '../../../components/common/DifficultyBadge.jsx';
import { HintsList } from '../../../components/common/HintsList.jsx';
import { createSubmission, getSubmission } from '../submissionApi.js';

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'cpp', label: 'C++' },
];

const POLL_INTERVAL_MS = 1200;
const MAX_POLL_ATTEMPTS = 30; // ~36s ceiling before giving up on a stuck job
const MIN_PANE_PCT = 28;
const MAX_PANE_PCT = 72;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// `review` (when present, shape { submissionId, testCasesPassed, testCasesTotal })
// renders this as a read-only look-back at an already-graded question — the
// candidate's own past submission is fetched and shown in a disabled editor,
// with no Run/Submit/reset controls (the round has already moved on).
export const CodingQuestion = ({ question, attemptId, onSubmitResolved, review }) => {
  const isReview = Boolean(review);
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(question.starterCode?.javascript || '');
  const [result, setResult] = useState(null);
  const [runningMode, setRunningMode] = useState(null); // 'run' | 'submit' | 'custom' | null
  const [leftTab, setLeftTab] = useState('description'); // 'description' | 'hints'
  const [useCustomInput, setUseCustomInput] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [leftPct, setLeftPct] = useState(42);
  const containerRef = useRef(null);
  const draggingRef = useRef(false);
  // Submit polling can run for up to ~36s. If the candidate navigates away
  // mid-poll (e.g. hits "End interview" or the round expires and the server
  // moves them on), this stops the poll and — critically — stops
  // onSubmitResolved (which re-fetches attempt state and can itself
  // navigate to the results page) from firing against a screen the
  // candidate already left.
  const mountedRef = useRef(true);
  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  useEffect(() => {
    if (isReview) return;
    setCode(question.starterCode?.[language] || '');
    setResult(null);
  }, [question._id, language, isReview]);

  // Review mode: pull the candidate's own past submission (code, language,
  // verdicts) instead of starter code — read-only, never re-run.
  useEffect(() => {
    if (!isReview || !review.submissionId) return;
    getSubmission(review.submissionId)
      .then((submission) => {
        setLanguage(submission.language);
        setCode(submission.code || '');
        setResult(submission);
      })
      .catch(() => toast.error('Could not load your past submission'));
  }, [isReview, review?.submissionId]);

  // Lightweight draggable divider between the problem/hints pane and the
  // editor pane — no extra dependency, just pointer math against the
  // container's bounding box.
  useEffect(() => {
    const handleMove = (e) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.min(MAX_PANE_PCT, Math.max(MIN_PANE_PCT, pct)));
    };
    const handleUp = () => {
      draggingRef.current = false;
      document.body.style.cursor = '';
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, []);

  const UNMOUNTED = '__unmounted__';

  const pollUntilDone = async (submissionId) => {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      await sleep(POLL_INTERVAL_MS);
      if (!mountedRef.current) throw new Error(UNMOUNTED);
      const submission = await getSubmission(submissionId);
      if (submission.status === 'completed' || submission.status === 'error') {
        return submission;
      }
    }
    throw new Error('Grading is taking longer than expected — please try again.');
  };

  const handleRunOrSubmit = async (mode) => {
    setRunningMode(mode);
    setResult(null);
    try {
      const { submissionId } = await createSubmission({
        attemptId,
        language,
        code,
        mode,
        customInput: mode === 'custom' ? customInput : undefined,
      });
      const submission = await pollUntilDone(submissionId);
      if (!mountedRef.current) return;
      setResult(submission);

      if (mode === 'submit') {
        if (submission.status === 'error') {
          toast.error(submission.errorMessage || 'Submission failed to grade');
        } else {
          toast.success(`${submission.testCasesPassed}/${submission.testCasesTotal} test cases passed`);
        }
        onSubmitResolved?.();
      }
    } catch (err) {
      if (mountedRef.current && err.message !== UNMOUNTED) {
        toast.error(err.response?.data?.message || err.message || 'Something went wrong');
      }
    } finally {
      if (mountedRef.current) setRunningMode(null);
    }
  };

  // Ctrl/Cmd+Enter to run — same shortcut most online judges use.
  useEffect(() => {
    if (isReview) return undefined;
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && runningMode === null) {
        e.preventDefault();
        handleRunOrSubmit(useCustomInput ? 'custom' : 'run');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReview, runningMode, useCustomInput, customInput, code, language]);

  const resetToStarter = () => {
    if (!confirm('Reset your code back to the starter template? This cannot be undone.')) return;
    setCode(question.starterCode?.[language] || '');
    setResult(null);
  };

  const isDark = document.documentElement.classList.contains('dark');

  return (
    <div ref={containerRef} className="flex h-full min-h-0 flex-col gap-0 lg:flex-row">
      {/* Left: problem + hints, tabbed, independently scrollable */}
      <div
        style={{ flexBasis: `${leftPct}%` }}
        className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex-none"
      >
        <div className="flex shrink-0 border-b border-slate-200 dark:border-slate-800">
          {[
            { key: 'description', label: 'Description' },
            { key: 'hints', label: `Hints${question.hints?.length ? ` (${question.hints.length})` : ''}` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setLeftTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium ${
                leftTab === tab.key
                  ? 'border-b-2 border-indigo-600 text-indigo-700 dark:text-indigo-400'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {leftTab === 'description' ? (
            <>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{question.title}</h2>
                <DifficultyBadge difficulty={question.difficulty} />
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {question.description}
              </p>
              {question.hiddenTestCaseCount > 0 && (
                <p className="mt-3 text-xs text-slate-400">
                  +{question.hiddenTestCaseCount} additional hidden test case(s) graded on submit
                </p>
              )}
              {isReview && (
                <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  You already submitted this question —{' '}
                  {review.testCasesPassed}/{review.testCasesTotal} test cases passed. Read only.
                </p>
              )}
            </>
          ) : (
            <HintsList hints={question.hints} />
          )}
        </div>
      </div>

      {/* Drag handle */}
      <div
        onMouseDown={() => {
          draggingRef.current = true;
          document.body.style.cursor = 'col-resize';
        }}
        className="mx-1.5 hidden w-1 shrink-0 cursor-col-resize rounded bg-slate-200 hover:bg-indigo-400 dark:bg-slate-800 dark:hover:bg-indigo-600 lg:block"
      />

      {/* Right: editor + toolbar + results */}
      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3 lg:mt-0">
        <div className="flex shrink-0 items-center justify-between">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {isReview ? `Submitted in ${LANGUAGES.find((l) => l.value === language)?.label || language}` : 'Implement the function below — no need to handle input parsing or imports.'}
          </span>
          <div className="flex items-center gap-2">
            {!isReview && (
              <button
                onClick={resetToStarter}
                title="Reset to starter code"
                className="flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <FiRotateCcw size={12} /> Reset
              </button>
            )}
            <select
              value={language}
              disabled={isReview}
              onChange={(e) => setLanguage(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700">
          <Editor
            height="100%"
            language={language}
            theme={isDark ? 'vs-dark' : 'light'}
            value={code}
            onChange={(value) => !isReview && setCode(value ?? '')}
            options={{ minimap: { enabled: false }, fontSize: 14, readOnly: isReview }}
          />
        </div>

        {!isReview && (
          <div className="flex shrink-0 flex-col gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <input
                type="checkbox"
                checked={useCustomInput}
                onChange={(e) => setUseCustomInput(e.target.checked)}
                className="accent-indigo-600"
              />
              <FiTerminal size={12} /> Run with custom input (like a scratch test case — not graded)
            </label>
            {useCustomInput && (
              <textarea
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="stdin for your function, in the same format as the sample test cases"
                rows={2}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            )}

            <div className="flex gap-3">
              <button
                onClick={() => handleRunOrSubmit(useCustomInput ? 'custom' : 'run')}
                disabled={runningMode !== null}
                title="Ctrl/Cmd+Enter"
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <FiPlay size={14} /> {runningMode === 'run' || runningMode === 'custom' ? 'Running...' : 'Run'}
              </button>
              <button
                onClick={() => handleRunOrSubmit('submit')}
                disabled={runningMode !== null}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                <FiCheck size={14} /> {runningMode === 'submit' ? 'Grading...' : 'Submit'}
              </button>
            </div>
          </div>
        )}

        <div className="max-h-64 shrink-0 overflow-y-auto">
          {result ? (
            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              {result.status === 'error' ? (
                <p className="text-sm text-red-500">{result.errorMessage}</p>
              ) : result.mode === 'custom' ? (
                <>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Output</p>
                  <pre className="mt-2 whitespace-pre-wrap rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:bg-slate-950 dark:text-slate-300">
                    {result.verdicts?.[0]?.actualOutput || '(no output)'}
                  </pre>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {result.testCasesPassed}/{result.testCasesTotal} test cases passed
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    {result.verdicts.map((v, i) => (
                      <div
                        key={i}
                        className={`rounded-md px-3 py-2 text-xs ${
                          v.passed
                            ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                            : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                        }`}
                      >
                        {v.isHidden ? (
                          <span>Hidden test case — {v.passed ? 'passed' : 'failed'}</span>
                        ) : (
                          <>
                            <div>Input: {v.input || '(none)'}</div>
                            <div>Expected: {v.expectedOutput}</div>
                            <div>Got: {v.actualOutput}</div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            !isReview && (
              <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400 dark:border-slate-700">
                Run or submit to see test case results here.
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
