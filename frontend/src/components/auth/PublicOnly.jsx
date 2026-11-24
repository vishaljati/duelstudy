import { Navigate, Outlet } from "react-router";
import { useAuth } from "../../context/AuthContext";

export default function PublicOnly() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Checking authentication...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}