import { useEffect, Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { initializeAuth, sessionExpired } from './features/auth/authSlice.js';
import { registerSessionExpiredHandler } from './api/tokenManager.js';
import { ProtectedRoute } from './features/auth/components/ProtectedRoute.jsx';
import { Loader } from './components/common/Loader.jsx';

import { PublicLayout } from './components/layout/PublicLayout.jsx';
import { AuthLayout } from './components/layout/AuthLayout.jsx';
import { DashboardLayout } from './components/layout/DashboardLayout.jsx';
import { AdminLayout } from './components/layout/AdminLayout.jsx';

// Pages are lazy-loaded so each route lands in its own chunk — the coding
// round alone pulls in Monaco, which shouldn't be in everyone's initial bundle.
const Landing = lazy(() => import('./pages/Landing.jsx').then((m) => ({ default: m.Landing })));
const NotFound = lazy(() => import('./pages/NotFound.jsx').then((m) => ({ default: m.NotFound })));
const Login = lazy(() => import('./features/auth/pages/Login.jsx').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('./features/auth/pages/Register.jsx').then((m) => ({ default: m.Register })));
const InterviewSetList = lazy(() =>
  import('./features/interview/pages/InterviewSetList.jsx').then((m) => ({ default: m.InterviewSetList }))
);
const AttemptRunner = lazy(() =>
  import('./features/interview/pages/AttemptRunner.jsx').then((m) => ({ default: m.AttemptRunner }))
);
const ResultsPage = lazy(() =>
  import('./features/results/pages/ResultsPage.jsx').then((m) => ({ default: m.ResultsPage }))
);
const AnalyticsDashboard = lazy(() =>
  import('./features/admin/pages/AnalyticsDashboard.jsx').then((m) => ({ default: m.AnalyticsDashboard }))
);
const QuestionBank = lazy(() =>
  import('./features/admin/pages/QuestionBank.jsx').then((m) => ({ default: m.QuestionBank }))
);
const InterviewSetBuilder = lazy(() =>
  import('./features/admin/pages/InterviewSetBuilder.jsx').then((m) => ({ default: m.InterviewSetBuilder }))
);
const AttemptsList = lazy(() =>
  import('./features/admin/pages/AttemptsList.jsx').then((m) => ({ default: m.AttemptsList }))
);

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  // ProtectedRoute reacts to `user` going null on its own (redirects to
  // /login), so this just needs to clear state and let the candidate know
  // why — no explicit navigation required.
  useEffect(() => {
    registerSessionExpiredHandler(() => {
      dispatch(sessionExpired());
      toast.error('Your session has expired — please log in again.');
    });
  }, [dispatch]);

  return (
    <Suspense fallback={<Loader label="Loading..." />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
        </Route>

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        <Route element={<ProtectedRoute role="candidate" />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<InterviewSetList />} />
            <Route path="/dashboard/attempt/:attemptId" element={<AttemptRunner />} />
            <Route path="/dashboard/results/:attemptId" element={<ResultsPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute role="admin" />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AnalyticsDashboard />} />
            <Route path="/admin/questions" element={<QuestionBank />} />
            <Route path="/admin/interview-sets" element={<InterviewSetBuilder />} />
            <Route path="/admin/attempts" element={<AttemptsList />} />
          </Route>
        </Route>

        <Route element={<PublicLayout />}>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
