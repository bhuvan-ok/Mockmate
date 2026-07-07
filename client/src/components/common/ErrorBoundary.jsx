import { Component } from 'react';

// Must be a class component — React only supports error boundaries via
// getDerivedStateFromError/componentDidCatch, no hook equivalent exists.
export class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-4 text-center dark:bg-slate-950">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          Something went wrong
        </h1>
        <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
          An unexpected error occurred. Reloading usually fixes it — your progress is saved on the
          server, not lost.
        </p>
        <button
          onClick={() => window.location.assign('/')}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Back to home
        </button>
      </div>
    );
  }
}
