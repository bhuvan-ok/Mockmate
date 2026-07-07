import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { Loader } from '../../../components/common/Loader.jsx';
import { LoadError } from '../../../components/common/LoadError.jsx';
import { DifficultyBadge } from '../../../components/common/DifficultyBadge.jsx';
import { listQuestions, createQuestion, deleteQuestion } from '../adminApi.js';

// Hint/test-case rows carry a client-only `id` (never sent to the server —
// stripped in handleSubmit) so React has a stable key to reconcile against.
// Index-as-key breaks here specifically because both lists support deleting
// from the middle, which used to shift every row below it to a new index/key
// and desync focus from the row the admin was actually typing in.
const newHint = () => ({ id: crypto.randomUUID(), value: '' });
const newTestCase = () => ({ id: crypto.randomUUID(), input: '', expectedOutput: '', isHidden: false });

const emptyMcqForm = {
  type: 'mcq',
  title: '',
  description: '',
  difficulty: 1000,
  tags: '',
  hints: [newHint()],
  options: ['', ''],
  correctOptionIndex: 0,
  negativeMarking: false,
};

const emptyCodingForm = {
  type: 'coding',
  title: '',
  description: '',
  difficulty: 1300,
  tags: '',
  hints: [newHint()],
  starterCodeJs: '',
  starterCodeCpp: '',
  driverCodeJs: '',
  driverCodeCpp: '',
  testCases: [newTestCase()],
  timeLimitMs: 6000,
  memoryLimitMb: 128,
  outputComparator: 'exact',
};

export const QuestionBank = () => {
  const [questions, setQuestions] = useState(null);
  const [failed, setFailed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyMcqForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setFailed(false);
    listQuestions({ limit: 100 })
      .then((res) => setQuestions(res.questions))
      .catch(() => {
        toast.error('Failed to load questions');
        setFailed(true);
      });
  };

  useEffect(load, []);

  const switchType = (type) => setForm(type === 'mcq' ? emptyMcqForm : emptyCodingForm);

  const handleDelete = async (id) => {
    if (!confirm('Delete this question?')) return;
    try {
      await deleteQuestion(id);
      toast.success('Question deleted');
      load();
    } catch {
      toast.error('Failed to delete question');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const tags = form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const hints = form.hints.map((h) => h.value.trim()).filter(Boolean);

      const payload =
        form.type === 'mcq'
          ? {
              type: 'mcq',
              title: form.title,
              description: form.description,
              difficulty: Number(form.difficulty),
              tags,
              hints,
              options: form.options.filter((o) => o.trim()).map((text) => ({ text })),
              correctOptionIndex: Number(form.correctOptionIndex),
              negativeMarking: form.negativeMarking,
            }
          : {
              type: 'coding',
              title: form.title,
              description: form.description,
              difficulty: Number(form.difficulty),
              tags,
              hints,
              starterCode: { javascript: form.starterCodeJs, cpp: form.starterCodeCpp },
              driverCode: { javascript: form.driverCodeJs, cpp: form.driverCodeCpp },
              testCases: form.testCases
                .filter((tc) => tc.expectedOutput.trim())
                .map(({ id: _id, ...tc }) => tc),
              timeLimitMs: Number(form.timeLimitMs),
              memoryLimitMb: Number(form.memoryLimitMb),
              outputComparator: form.outputComparator,
            };

      await createQuestion(payload);
      toast.success('Question created');
      setShowForm(false);
      switchType('mcq');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create question');
    } finally {
      setSaving(false);
    }
  };

  if (failed) return <LoadError label="Could not load questions." onRetry={load} />;
  if (!questions) return <Loader label="Loading questions..." />;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Question Bank</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
        >
          <FiPlus size={16} /> {showForm ? 'Cancel' : 'New question'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-6 flex flex-col gap-4 rounded-xl border border-slate-200 p-5 dark:border-slate-800"
        >
          <div className="flex gap-2">
            {['mcq', 'coding'].map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => switchType(t)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  form.type === t
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          <input
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <textarea
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
            rows={3}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              placeholder="Difficulty (800-2400)"
              value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
              min={800}
              max={2400}
              required
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <input
              placeholder="Tags (comma-separated)"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Hints (handwritten, LeetCode-style — shown to candidates on request, no AI involved)
            </p>
            {form.hints.map((hint, i) => (
              <div key={hint.id} className="flex items-center gap-2">
                <input
                  placeholder={`Hint ${i + 1}`}
                  value={hint.value}
                  onChange={(e) => {
                    const hints = [...form.hints];
                    hints[i] = { ...hints[i], value: e.target.value };
                    setForm({ ...form, hints });
                  }}
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, hints: form.hints.filter((_, idx) => idx !== i) })}
                  className="text-red-500"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setForm({ ...form, hints: [...form.hints, newHint()] })}
              className="w-fit text-xs font-medium text-indigo-600 dark:text-indigo-400"
            >
              + Add hint
            </button>
          </div>

          {form.type === 'mcq' ? (
            <>
              {form.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={Number(form.correctOptionIndex) === i}
                    onChange={() => setForm({ ...form, correctOptionIndex: i })}
                  />
                  <input
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const options = [...form.options];
                      options[i] = e.target.value;
                      setForm({ ...form, options });
                    }}
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setForm({ ...form, options: [...form.options, ''] })}
                className="w-fit text-xs font-medium text-indigo-600 dark:text-indigo-400"
              >
                + Add option
              </button>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={form.negativeMarking}
                  onChange={(e) => setForm({ ...form, negativeMarking: e.target.checked })}
                />
                Negative marking
              </label>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Starter code is ONLY the function stub candidates see and edit — no imports/includes,
                for either language. Driver code is a hidden harness (never shown to candidates) that
                reads stdin in the format your test cases use, calls the candidate's function, and
                prints the result.
              </p>

              <textarea
                placeholder="Starter code — JavaScript (function stub only)"
                value={form.starterCodeJs}
                onChange={(e) => setForm({ ...form, starterCodeJs: e.target.value })}
                rows={4}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <textarea
                placeholder="Driver code — JavaScript (hidden harness, appended after the candidate's code)"
                value={form.driverCodeJs}
                onChange={(e) => setForm({ ...form, driverCodeJs: e.target.value })}
                rows={4}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <textarea
                placeholder="Starter code — C++ (function stub only, no #include/using lines)"
                value={form.starterCodeCpp}
                onChange={(e) => setForm({ ...form, starterCodeCpp: e.target.value })}
                rows={4}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <div className="flex flex-col gap-1">
                <textarea
                  placeholder={
                    'Driver code — C++: all #include/using lines, then /*__CANDIDATE_CODE__*/, then int main() { ... }'
                  }
                  value={form.driverCodeCpp}
                  onChange={(e) => setForm({ ...form, driverCodeCpp: e.target.value })}
                  rows={5}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  C++ driver code must contain the literal marker{' '}
                  <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">
                    /*__CANDIDATE_CODE__*/
                  </code>{' '}
                  — the worker splices the candidate's function in at that exact spot, after your
                  #includes and before main(), so the candidate's editor never needs any imports.
                </p>
              </div>

              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Test cases</p>
              {form.testCases.map((tc, i) => (
                <div key={tc.id} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2">
                  <input
                    placeholder="Input"
                    value={tc.input}
                    onChange={(e) => {
                      const testCases = [...form.testCases];
                      testCases[i] = { ...testCases[i], input: e.target.value };
                      setForm({ ...form, testCases });
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <input
                    placeholder="Expected output"
                    value={tc.expectedOutput}
                    onChange={(e) => {
                      const testCases = [...form.testCases];
                      testCases[i] = { ...testCases[i], expectedOutput: e.target.value };
                      setForm({ ...form, testCases });
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <label className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={tc.isHidden}
                      onChange={(e) => {
                        const testCases = [...form.testCases];
                        testCases[i] = { ...testCases[i], isHidden: e.target.checked };
                        setForm({ ...form, testCases });
                      }}
                    />
                    Hidden
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({ ...form, testCases: form.testCases.filter((_, idx) => idx !== i) })
                    }
                    className="text-red-500"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    testCases: [...form.testCases, newTestCase()],
                  })
                }
                className="w-fit text-xs font-medium text-indigo-600 dark:text-indigo-400"
              >
                + Add test case
              </button>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Time limit (ms)"
                  value={form.timeLimitMs}
                  onChange={(e) => setForm({ ...form, timeLimitMs: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <input
                  type="number"
                  placeholder="Memory limit (MB)"
                  value={form.memoryLimitMb}
                  onChange={(e) => setForm({ ...form, memoryLimitMb: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Output comparison
                </label>
                <select
                  value={form.outputComparator}
                  onChange={(e) => setForm({ ...form, outputComparator: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="exact">Exact match (default)</option>
                  <option value="float">Numeric tolerance (e.g. "3" == "3.00")</option>
                </select>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={saving}
            className="mt-2 w-fit rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Create question'}
          </button>
        </form>
      )}

      <div className="mt-6 flex flex-col gap-2">
        {questions.map((q) => (
          <div
            key={q._id}
            className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm dark:border-slate-800"
          >
            <div>
              <span className="mr-2 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {q.type.toUpperCase()}
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{q.title}</span>
              <span className="ml-2 inline-block align-middle">
                <DifficultyBadge difficulty={q.difficulty} />
              </span>
            </div>
            <button onClick={() => handleDelete(q._id)} className="text-red-500">
              <FiTrash2 size={16} />
            </button>
          </div>
        ))}
        {questions.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">No questions yet.</p>
        )}
      </div>
    </div>
  );
};
