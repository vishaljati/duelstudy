import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AppShell } from './components/layout/AppShell'
import RequireAuth from './components/auth/RequireAuth.jsx'
import PublicOnly from './components/auth/PublicOnly.jsx'
import { ScrollToTop } from './components/layout/ScrollToTop'
import { AuthProvider } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import Competition from './pages/Competition'
import Dashboard from './pages/Dashboard'
import Friends from './pages/Friends'
import Landing from './pages/Landing'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Planner from './pages/Planner'
import Profile from './pages/Profile'
import Questions from './pages/Questions'
import Rewards from './pages/Rewards'
import Signup from './pages/Signup'
import Timetable from './pages/Timetable'

function AuthenticatedApp() {
  return (
    <DataProvider>
      <AppShell />
    </DataProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route element={<PublicOnly />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Route>
          <Route element={<RequireAuth />}>
            <Route element={<AuthenticatedApp />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/planner" element={<Planner />} />
              <Route path="/questions" element={<Questions />} />
              <Route path="/timetable" element={<Timetable />} />
              <Route path="/friends" element={<Friends />} />
              <Route path="/competition" element={<Competition />} />
              <Route path="/rewards" element={<Rewards />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/home" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
