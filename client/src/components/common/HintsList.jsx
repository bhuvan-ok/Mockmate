import { useState } from 'react';
import { FiZap, FiChevronDown, FiChevronUp } from 'react-icons/fi';

// Handwritten, LeetCode-style hints — revealed progressively, one at a time,
// entirely client-side. No AI call, no server round-trip, no gating: the
// hints already came down with the candidate-safe question payload.
export const HintsList = ({ hints }) => {
  const [revealedCount, setRevealedCount] = useState(0);

  if (!hints || hints.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 p-4 text-sm text-slate-400 dark:border-slate-800">
        No hints for this question — give it your best shot.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
        <FiZap size={16} /> Hints
      </h3>

      <div className="mt-2 flex flex-col gap-2">
        {hints.slice(0, revealedCount).map((hint, i) => (
          <p key={i} className="text-sm text-amber-900 dark:text-amber-200">
            <span className="font-medium">Hint {i + 1}:</span> {hint}
          </p>
        ))}
      </div>

      {revealedCount < hints.length && (
        <button
          onClick={() => setRevealedCount((c) => c + 1)}
          className="mt-3 flex items-center gap-1.5 rounded-md border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/40"
        >
          <FiChevronDown size={14} />
          {revealedCount === 0 ? 'Show hint 1' : `Show hint ${revealedCount + 1}`}
        </button>
      )}
      {revealedCount > 0 && revealedCount === hints.length && (
        <button
          onClick={() => setRevealedCount(0)}
          className="mt-3 flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:underline dark:text-amber-400"
        >
          <FiChevronUp size={14} /> Hide hints
        </button>
      )}
    </div>
  );
};
