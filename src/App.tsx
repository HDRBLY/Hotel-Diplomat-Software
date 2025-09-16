import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './components/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Guests from './pages/Guests'
import Rooms from './pages/Rooms'
// import DeleteRooms from './pages/DeleteRooms'
import Reservations from './pages/Reservations'
import Banquets from './pages/Banquets'
import Reports from './pages/Reports'
// import Settings from './pages/Settings'
import { Component, ReactNode } from 'react'

// Error Boundary Component
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-red-500 mb-4">
              <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function App() {
  return (
    <ErrorBoundary>
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
            {/* <Route path="/delete-rooms" element={
              <ProtectedRoute requiredPermission="rooms:delete">
                <Layout>
                  <DeleteRooms />
                </Layout>
              </ProtectedRoute>
            } /> */}
            <Route path="/reservations" element={
              <ProtectedRoute requiredPermission="reservations:view">
                <Layout>
                  <Reservations />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/banquets" element={
              <ProtectedRoute requiredPermission="banquets:view">
                <Layout>
                  <Banquets />
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
            {/* <Route path="/settings" element={
              <ProtectedRoute requiredPermission="settings:view">
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            } /> */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App 