import { useState } from 'react';
import { FiCheck, FiX } from 'react-icons/fi';
import { DifficultyBadge } from '../../../components/common/DifficultyBadge.jsx';
import { HintsList } from '../../../components/common/HintsList.jsx';

// `review` (when present) renders this question read-only: the candidate
// already answered it and the round has moved on, so this is a look-back,
// not a re-answer. `review.correctOptionIndex` is only ever populated for
// questions the candidate has already locked in — see attempt.service.js.
export const McqQuestion = ({ question, onSubmit, submitting, review }) => {
  const [selected, setSelected] = useState(null);
  const isReview = Boolean(review);

  return (
    <div>
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{question.title}</h2>
        <DifficultyBadge difficulty={question.difficulty} />
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
        {question.description}
      </p>

      <div className="mt-5 flex flex-col gap-2">
        {question.options.map((option, index) => {
          if (!isReview) {
            return (
              <label
                key={index}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
                  selected === index
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <input
                  type="radio"
                  name="mcq-option"
                  checked={selected === index}
                  onChange={() => setSelected(index)}
                  className="accent-indigo-600"
                />
                <span className="text-slate-800 dark:text-slate-200">{option.text}</span>
              </label>
            );
          }

          const isCorrectOption = index === review.correctOptionIndex;
          const isSelectedOption = index === review.selectedOptionIndex;
          const style = isCorrectOption
            ? 'border-green-400 bg-green-50 dark:border-green-800 dark:bg-green-950/30'
            : isSelectedOption
              ? 'border-red-400 bg-red-50 dark:border-red-800 dark:bg-red-950/30'
              : 'border-slate-200 dark:border-slate-800';

          return (
            <div key={index} className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${style}`}>
              {isCorrectOption ? (
                <FiCheck className="shrink-0 text-green-600 dark:text-green-400" size={16} />
              ) : isSelectedOption ? (
                <FiX className="shrink-0 text-red-500" size={16} />
              ) : (
                <span className="w-4 shrink-0" />
              )}
              <span className="text-slate-800 dark:text-slate-200">{option.text}</span>
              {isSelectedOption && (
                <span className="ml-auto text-xs text-slate-400">Your answer</span>
              )}
            </div>
          );
        })}
      </div>

      {isReview ? (
        <p
          className={`mt-4 text-sm font-medium ${
            review.selectedOptionIndex === review.correctOptionIndex
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-500'
          }`}
        >
          {review.selectedOptionIndex === review.correctOptionIndex
            ? 'You answered this correctly.'
            : 'You answered this incorrectly.'}
        </p>
      ) : (
        <>
          <button
            onClick={() => onSubmit(selected)}
            disabled={selected === null || submitting}
            className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'Submit answer'}
          </button>
          <div className="mt-5">
            <HintsList hints={question.hints} />
          </div>
        </>
      )}
    </div>
  );
};
