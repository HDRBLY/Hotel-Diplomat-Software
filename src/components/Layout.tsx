import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Users, 
  Bed, 
  Calendar, 
  BarChart3, 
  Settings as SettingsIcon,
  Menu,
  X,
  Building2,
  LogOut,
  User,
  ChevronDown,
  Trash2,
  Clock
} from 'lucide-react'
import { useAuth } from './AuthContext'
import { useNotification } from './Notification'

interface LayoutProps {
  children: React.ReactNode
}

function SimpleStickyClock() {
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')
  useEffect(() => {
    const update = () => {
      const now = new Date()
      const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' } as const
      // Custom date format: 'Mon • 10 Jun 2024'
      const weekday = now.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'Asia/Kolkata' })
      const day = now.toLocaleDateString('en-IN', { day: '2-digit', timeZone: 'Asia/Kolkata' })
      const month = now.toLocaleDateString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' })
      const year = now.toLocaleDateString('en-IN', { year: 'numeric', timeZone: 'Asia/Kolkata' })
      setTime(now.toLocaleTimeString('en-IN', timeOptions))
      setDate(`${weekday} • ${day} ${month} ${year}`)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])
  return (
    <span className="ml-3 px-3 py-1 rounded bg-primary-50 text-primary-700 font-mono text-base border border-primary-200 shadow-sm align-middle select-none flex flex-col items-center min-w-[120px]">
      <span>{time.replace('AM', 'AM').replace('PM', 'PM')}</span>
      <span className="text-xs text-primary-400 mt-0.5">{date}</span>
    </span>
  )
}

const Layout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout, hasPermission } = useAuth()
  const { showNotification } = useNotification()

  const handleLogout = () => {
    logout()
    setUserMenuOpen(false)
    navigate('/login', { replace: true, state: { signedOut: true } })
  }

  const navigation = [
    { 
      name: 'Dashboard', 
      href: '/', 
      icon: LayoutDashboard,
      permission: 'dashboard:view'
    },
    { 
      name: 'Guests', 
      href: '/guests', 
      icon: Users,
      permission: 'guests:view'
    },
    { 
      name: 'Rooms', 
      href: '/rooms', 
      icon: Bed,
      permission: 'rooms:view'
    },
    { 
      name: 'Delete Rooms', 
      href: '/delete-rooms', 
      icon: Trash2,
      permission: 'rooms:delete'
    },
    { 
      name: 'Reservations', 
      href: '/reservations', 
      icon: Calendar,
      permission: 'reservations:view'
    },
    { 
      name: 'Reports', 
      href: '/reports', 
      icon: BarChart3,
      permission: 'reports:view'
    },
    { 
      name: 'Settings', 
      href: '/settings', 
      icon: SettingsIcon,
      permission: 'settings:view'
    },
  ].filter(item => hasPermission(item.permission))

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800'
      case 'manager':
        return 'bg-blue-100 text-blue-800'
      case 'staff':
        return 'bg-green-100 text-green-800'
      case 'accounts':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator'
      case 'manager':
        return 'Manager'
      case 'staff':
        return 'Staff'
      case 'accounts':
        return 'Accounts'
      default:
        return 'User'
    }
  }

  // Keyboard shortcut for logout (Ctrl+L)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'l') {
        event.preventDefault()
        handleLogout()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Hotel Diplomat Residency</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} title="Close sidebar">
              <X className="h-6 w-6 text-gray-400" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
          
          {/* Logout Section */}
          <div className="border-t border-gray-200 p-4">
            <button
              onClick={handleLogout}
              title="Sign out (Ctrl+L)"
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-4">
            <Building2 className="h-8 w-8 text-primary-600" />
            <span className="ml-2 text-xl font-bold text-gray-900">Hotel Diplomat Residency</span>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
          
          {/* Logout Section */}
          <div className="border-t border-gray-200 p-4">
            <button
              onClick={handleLogout}
              title="Sign out (Ctrl+L)"
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1"></div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <SimpleStickyClock />
              <div className="hidden lg:block text-xs text-gray-500">
                Press Ctrl+L to sign out
              </div>
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-x-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary-600" />
                  </div>
                  <div className="hidden lg:block text-left flex items-center gap-2">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{user?.name}</div>
                      <div className="text-xs text-gray-500">{user?.email}</div>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <div className="text-sm font-medium text-gray-900">{user?.name}</div>
                        <div className="text-xs text-gray-500">{user?.email}</div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${getRoleColor(user?.role || '')}`}>{getRoleLabel(user?.role || '')}</span>
                      </div>
                      {/* Removed sign out button from dropdown */}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* Click outside to close user menu */}
      {userMenuOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setUserMenuOpen(false)}
          style={{ pointerEvents: 'auto' }}
        />
      )}
    </div>
  )
}

export default Layout 