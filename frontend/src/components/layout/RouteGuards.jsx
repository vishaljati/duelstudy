import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../../context/AuthContext'
import { DataProvider } from '../../context/DataContext'

export function RequireAuth() {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return (
    <DataProvider key={user.id}>
      <Outlet />
    </DataProvider>
  )
}

export function PublicOnly() {
  const { user } = useAuth()
  if (user) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
