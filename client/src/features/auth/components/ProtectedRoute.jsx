import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Loader } from '../../../components/common/Loader.jsx';

export const ProtectedRoute = ({ role }) => {
  const { user, initialized } = useSelector((state) => state.auth);

  if (!initialized) return <Loader label="Restoring session..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;

  return <Outlet />;
};
