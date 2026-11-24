

import { Navigate, Outlet } from "react-router";
import { useAuth } from "../../context/AuthContext";

export function RequireAuth() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted">
          Restoring your session...
        </p>
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

export function PublicOnly() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted">
          Loading...
        </p>
      </div>
    );
  }

  return user ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
