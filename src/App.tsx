import * as React from 'react'
import { Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './components/AuthContext'
import { NotificationProvider } from './components/Notification'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Loading from './components/Loading'

// Lazy load pages for better performance
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Guests = lazy(() => import('./pages/Guests'))
const Rooms = lazy(() => import('./pages/Rooms'))
const DeleteRooms = lazy(() => import('./pages/DeleteRooms'))
const Reservations = lazy(() => import('./pages/Reservations'))
const Reports = lazy(() => import('./pages/Reports'))
const Settings = lazy(() => import('./pages/Settings'))

// Loading fallback component
const PageLoading: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <Loading variant="spinner" size="lg" text="Loading page..." />
  </div>
)

// Main app routes component
const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<PageLoading />}>
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
    </Suspense>
  )
}

// Main App component with providers and error boundary
function App() {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <AuthProvider>
          <Router>
            <AppRoutes />
          </Router>
        </AuthProvider>
      </NotificationProvider>
    </ErrorBoundary>
  )
}

export default App 