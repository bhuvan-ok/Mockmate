import { Link } from 'react-router-dom';
import { FiCode, FiClock, FiTrendingUp } from 'react-icons/fi';

const features = [
  {
    icon: FiClock,
    title: 'Timed rounds',
    description: 'MCQ and coding rounds run on a server-enforced clock — no pausing, no resets.',
  },
  {
    icon: FiCode,
    title: 'Real code execution',
    description:
      'Submissions run in isolated, resource-limited Docker containers — not a mock grader.',
  },
  {
    icon: FiTrendingUp,
    title: 'Adaptive difficulty',
    description:
      'Each next question is chosen with an Elo-style rating match, like GRE/GMAT-style adaptive testing.',
  },
];

export const Landing = () => (
  <div className="mx-auto max-w-4xl px-6 py-20 text-center">
    <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
      Practice interviews that adapt to you
    </h1>
    <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
      MockMate runs timed MCQ and coding rounds, grades your code in a real sandbox, and adjusts
      difficulty question-by-question based on your performance.
    </p>
    <Link
      to="/register"
      className="mt-8 inline-block rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-500"
    >
      Start practicing
    </Link>

    <div className="mt-20 grid gap-8 text-left sm:grid-cols-3">
      {features.map(({ icon: Icon, title, description }) => (
        <div key={title} className="rounded-xl border border-slate-200 p-5 dark:border-slate-800">
          <Icon className="text-indigo-600 dark:text-indigo-400" size={22} />
          <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">{title}</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>
        </div>
      ))}
    </div>
  </div>
);
