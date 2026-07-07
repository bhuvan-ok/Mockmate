import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { Loader } from '../../../components/common/Loader.jsx';
import { LoadError } from '../../../components/common/LoadError.jsx';
import { listInterviewSetsAdmin, createInterviewSet, deleteInterviewSet } from '../adminApi.js';

const emptyForm = {
  title: '',
  description: '',
  rounds: [{ type: 'mcq', durationSec: 300, questionCount: 4, tags: '' }],
};

export const InterviewSetBuilder = () => {
  const [sets, setSets] = useState(null);
  const [failed, setFailed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setFailed(false);
    listInterviewSetsAdmin()
      .then(setSets)
      .catch(() => {
        toast.error('Failed to load interview sets');
        setFailed(true);
      });
  };

  useEffect(load, []);

  const updateRound = (index, patch) => {
    const rounds = [...form.rounds];
    rounds[index] = { ...rounds[index], ...patch };
    setForm({ ...form, rounds });
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this interview set?')) return;
    try {
      await deleteInterviewSet(id);
      toast.success('Interview set deleted');
      load();
    } catch {
      toast.error('Failed to delete interview set');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        rounds: form.rounds.map((r) => ({
          type: r.type,
          durationSec: Number(r.durationSec),
          questionCount: Number(r.questionCount),
          tags: r.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        })),
      };
      await createInterviewSet(payload);
      toast.success('Interview set created');
      setShowForm(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create interview set');
    } finally {
      setSaving(false);
    }
  };

  if (failed) return <LoadError label="Could not load interview sets." onRetry={load} />;
  if (!sets) return <Loader label="Loading interview sets..." />;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Interview Sets</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
        >
          <FiPlus size={16} /> {showForm ? 'Cancel' : 'New set'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-6 flex flex-col gap-4 rounded-xl border border-slate-200 p-5 dark:border-slate-800"
        >
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
            rows={2}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />

          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Rounds</p>
          {form.rounds.map((round, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2">
              <select
                value={round.type}
                onChange={(e) => updateRound(i, { type: e.target.value })}
                className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="mcq">MCQ</option>
                <option value="coding">Coding</option>
              </select>
              <input
                type="number"
                placeholder="Duration (sec)"
                value={round.durationSec}
                onChange={(e) => updateRound(i, { durationSec: e.target.value })}
                className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <input
                type="number"
                placeholder="Question count"
                value={round.questionCount}
                onChange={(e) => updateRound(i, { questionCount: e.target.value })}
                className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <input
                placeholder="Tags (optional)"
                value={round.tags}
                onChange={(e) => updateRound(i, { tags: e.target.value })}
                className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <button
                type="button"
                onClick={() =>
                  setForm({ ...form, rounds: form.rounds.filter((_, idx) => idx !== i) })
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
                rounds: [
                  ...form.rounds,
                  { type: 'mcq', durationSec: 300, questionCount: 4, tags: '' },
                ],
              })
            }
            className="w-fit text-xs font-medium text-indigo-600 dark:text-indigo-400"
          >
            + Add round
          </button>

          <button
            type="submit"
            disabled={saving}
            className="mt-2 w-fit rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Create interview set'}
          </button>
        </form>
      )}

      <div className="mt-6 flex flex-col gap-2">
        {sets.map((set) => (
          <div
            key={set._id}
            className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm dark:border-slate-800"
          >
            <div>
              <span className="font-medium text-slate-800 dark:text-slate-200">{set.title}</span>
              <span className="ml-2 text-xs text-slate-400">{set.rounds.length} round(s)</span>
            </div>
            <button onClick={() => handleDelete(set._id)} className="text-red-500">
              <FiTrash2 size={16} />
            </button>
          </div>
        ))}
        {sets.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">No interview sets yet.</p>
        )}
      </div>
    </div>
  );
};
