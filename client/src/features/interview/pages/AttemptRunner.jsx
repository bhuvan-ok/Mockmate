import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiChevronLeft, FiChevronRight, FiLogOut } from 'react-icons/fi';
import { Loader } from '../../../components/common/Loader.jsx';
import { LoadError } from '../../../components/common/LoadError.jsx';
import { getAttemptState, submitMcqAnswer, endAttempt, logIntegrityEvent } from '../interviewApi.js';
import { McqQuestion } from '../../mcq-round/components/McqQuestion.jsx';
import { CodingQuestion } from '../../coding-round/components/CodingQuestion.jsx';

const formatTime = (totalSec) => {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export const AttemptRunner = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState(null);
  const [initialLoadFailed, setInitialLoadFailed] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [submittingMcq, setSubmittingMcq] = useState(false);
  const [ending, setEnding] = useState(false);
  // Index into the round's question list: 0..history.length-1 are already
  // answered (read-only review), history.length is the live question.
  // Prev/Next only ever move within questions the server has already
  // revealed — the adaptive engine picks the next one from the candidate's
  // live rating, so there is nothing to "look ahead" to, and past answers
  // are locked (they already fed into the rating update).
  const [viewIndex, setViewIndex] = useState(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  const refreshState = useCallback(async () => {
    const fresh = await getAttemptState(attemptId);
    setState(fresh);
    setTimeRemaining(fresh.timeRemainingSec ?? 0);
    if (fresh.status === 'completed') {
      navigate(`/dashboard/results/${attemptId}`, { replace: true });
    } else {
      setViewIndex(fresh.history?.length ?? 0);
    }
    return fresh;
  }, [attemptId, navigate]);

  const loadInitialState = useCallback(() => {
    setInitialLoadFailed(false);
    refreshState().catch(() => {
      toast.error('Failed to load attempt');
      setInitialLoadFailed(true);
    });
  }, [refreshState]);

  useEffect(() => {
    loadInitialState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshState]);

  // Local 1s countdown between server syncs; re-syncs with the server the
  // moment it hits zero since the server (not the client) is the source of
  // truth for whether the round has actually ended.
  useEffect(() => {
    if (!state || state.status === 'completed') return undefined;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          refreshState().catch(() => {});
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state, refreshState]);

  // Anti-cheat: minimal, non-blocking signals only — logged for the report,
  // never used to auto-disqualify.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && stateRef.current?.status !== 'completed') {
        logIntegrityEvent(attemptId, 'tab-switch').catch(() => {});
      }
    };
    const handlePaste = () => {
      if (stateRef.current?.status !== 'completed') {
        logIntegrityEvent(attemptId, 'paste').catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('paste', handlePaste);
    };
  }, [attemptId]);

  const handleMcqSubmit = async (selectedOptionIndex) => {
    setSubmittingMcq(true);
    try {
      const fresh = await submitMcqAnswer(attemptId, selectedOptionIndex);
      setState(fresh);
      setTimeRemaining(fresh.timeRemainingSec ?? 0);
      if (fresh.status === 'completed') {
        navigate(`/dashboard/results/${attemptId}`, { replace: true });
      } else {
        setViewIndex(fresh.history?.length ?? 0);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit answer');
    } finally {
      setSubmittingMcq(false);
    }
  };

  const handleEndAttempt = async () => {
    if (
      !confirm(
        'End this interview now? Unanswered questions score 0 and you cannot resume — you\'ll be taken straight to your results.'
      )
    )
      return;
    setEnding(true);
    try {
      await endAttempt(attemptId);
      navigate(`/dashboard/results/${attemptId}`, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to end attempt');
      setEnding(false);
    }
  };

  if (initialLoadFailed) {
    return <LoadError label="Could not load your attempt — the timer keeps running server-side, so retry quickly." onRetry={loadInitialState} />;
  }
  if (!state) return <Loader label="Loading attempt..." />;
  if (state.status === 'completed') return <Loader label="Finalizing results..." />;

  const isCoding = state.roundType === 'coding';
  const history = state.history || [];
  const liveIndex = history.length;
  const isViewingLive = viewIndex >= liveIndex;
  const reviewEntry = isViewingLive ? null : history[viewIndex];

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
            {state.roundType.toUpperCase()} round · Question {viewIndex + 1}/{state.targetQuestionCount}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewIndex((i) => Math.max(0, i - 1))}
              disabled={viewIndex === 0}
              aria-label="Previous question"
              className="rounded-md border border-slate-200 p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <FiChevronLeft size={16} />
            </button>
            <button
              onClick={() => setViewIndex((i) => Math.min(liveIndex, i + 1))}
              disabled={isViewingLive}
              aria-label="Next question"
              className="rounded-md border border-slate-200 p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <FiChevronRight size={16} />
            </button>
          </div>
          {!isViewingLive && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              Reviewing a submitted answer — read only
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-mono font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {formatTime(timeRemaining)}
          </span>
          <button
            onClick={handleEndAttempt}
            disabled={ending}
            className="flex items-center gap-1.5 rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <FiLogOut size={13} /> {ending ? 'Ending...' : 'End interview'}
          </button>
        </div>
      </div>

      <p className="shrink-0 border-b border-slate-200 bg-slate-100 px-4 py-1.5 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        This session logs tab switches and paste events for integrity reporting — visible on your
        results, never used to auto-disqualify you.
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {isViewingLive ? (
          isCoding ? (
            <CodingQuestion
              key={state.question._id}
              question={state.question}
              attemptId={attemptId}
              onSubmitResolved={refreshState}
            />
          ) : (
            <div className="mx-auto max-w-5xl rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <McqQuestion
                key={state.question._id}
                question={state.question}
                onSubmit={handleMcqSubmit}
                submitting={submittingMcq}
              />
            </div>
          )
        ) : isCoding ? (
          <CodingQuestion
            key={reviewEntry.question._id}
            question={reviewEntry.question}
            attemptId={attemptId}
            review={{ submissionId: reviewEntry.submissionId, testCasesPassed: reviewEntry.testCasesPassed, testCasesTotal: reviewEntry.testCasesTotal }}
          />
        ) : (
          <div className="mx-auto max-w-5xl rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <McqQuestion
              key={reviewEntry.question._id}
              question={reviewEntry.question}
              review={{
                selectedOptionIndex: reviewEntry.selectedOptionIndex,
                correctOptionIndex: reviewEntry.correctOptionIndex,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
