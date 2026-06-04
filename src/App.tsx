import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './AppContext'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import StudentApp from './pages/StudentApp'
import ParentApp from './pages/ParentApp'
import type { ReactNode } from 'react'

function ProtectedRoute({ children, role }: { children: ReactNode; role: 'parent' | 'student' }) {
  const { user } = useApp()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to={user.role === 'parent' ? '/parent' : '/student'} replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/student" element={
        <ProtectedRoute role="student"><StudentApp /></ProtectedRoute>
      } />
      <Route path="/parent" element={
        <ProtectedRoute role="parent"><ParentApp /></ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  )
}
