import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './components/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Guests from './pages/Guests'
import Rooms from './pages/Rooms'
import DeleteRooms from './pages/DeleteRooms'
import Reservations from './pages/Reservations'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/guests" element={
            <ProtectedRoute requiredPermission="guests:view">
              <Layout>
                <Guests />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/rooms" element={
            <ProtectedRoute requiredPermission="rooms:view">
              <Layout>
                <Rooms />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/delete-rooms" element={
            <ProtectedRoute requiredPermission="rooms:delete">
              <Layout>
                <DeleteRooms />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/reservations" element={
            <ProtectedRoute requiredPermission="reservations:view">
              <Layout>
                <Reservations />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute requiredPermission="reports:view">
              <Layout>
                <Reports />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute requiredPermission="settings:view">
              <Layout>
                <Settings />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App 