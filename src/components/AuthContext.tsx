import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface User {
  id: string
  username: string
  name: string
  role: 'admin' | 'manager' | 'staff' | 'accounts'
  email: string
  avatar?: string
}

interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  isAuthenticated: boolean
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

// Mock user database - REMOVED: Using backend authentication instead
// const users: Array<{
//   id: string
//   username: string
//   password: string
//   name: string
//   role: 'admin' | 'manager' | 'staff' | 'accounts'
//   email: string
// }> = [
//   {
//     id: '1',
//     username: 'admin',
//     password: 'admin123',
//     name: 'System Administrator',
//     role: 'admin' as const,
//     email: 'admin@hoteldiplomat.com'
//   },
//   {
//     id: '2',
//     username: 'manager',
//     password: 'manager123',
//     name: 'Hotel Manager',
//     role: 'manager' as const,
//     email: 'manager@hoteldiplomat.com'
//   },
//   {
//     id: '3',
//     username: 'staff',
//     password: 'staff123',
//     name: 'Front Desk Staff',
//     role: 'staff' as const,
//     email: 'staff@hoteldiplomat.com'
//   },
//   {
//     id: '4',
//     username: 'accounts',
//     password: 'accounts123',
//     name: 'Accounts User',
//     role: 'accounts' as const,
//     email: 'accounts@hoteldiplomat.com'
//   }
// ]

// Permission definitions
const permissions = {
  admin: [
    'dashboard:view',
    'guests:view',
    'guests:create',
    'guests:edit',
    'guests:delete',
    'rooms:view',
    'rooms:create',
    'rooms:edit',
    'rooms:delete',
    'room-service:view',
    'room-service:create',
    'room-service:edit',
    'room-service:delete',
    'reservations:view',
    'reservations:create',
    'reservations:edit',
    'reservations:delete',
    'banquets:view',
    'banquets:create',
    'banquets:edit',
    'banquets:delete',
    'reports:view',
    'reports:export',
    'settings:view',
    'settings:edit'
  ],
  manager: [
    'dashboard:view',
    'guests:view',
    'guests:create',
    'guests:edit',
    'guests:delete',
    'rooms:view',
    'rooms:create',
    'rooms:edit',
    'rooms:delete',
    'room-service:view',
    'room-service:create',
    'room-service:edit',
    'room-service:delete',
    'reservations:view',
    'reservations:create',
    'reservations:edit',
    'reservations:delete',
    'banquets:view',
    'banquets:create',
    'banquets:edit',
    'banquets:delete',
    'reports:view',
    'reports:export'
    // No settings permissions
  ],
  staff: [
    'dashboard:view',
    'rooms:view',
    'room-service:view',
    'room-service:create',
    'room-service:edit'
    // Room service staff can view rooms and manage orders
  ],
  accounts: [
    'dashboard:view',
    'reports:view'
    // Only reports viewing permission
  ],
  banquet: [
    'dashboard:view',
    'banquets:view',
    'banquets:create',
    'banquets:edit',
    'banquets:delete'
    // Only banquet management permissions
  ],
  'room-service': [
    'dashboard:view',
    'room-service:view',
    'room-service:create',
    'room-service:edit',
    'room-service:delete'
    // Only room service management permissions
  ]
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Clear any stale authentication data on app start
  useEffect(() => {
    // Clear any old authentication data that might be corrupted
    const clearStaleAuthData = () => {
      try {
        const savedUser = localStorage.getItem('hdr_user')
        if (savedUser) {
          const userData = JSON.parse(savedUser)
          // If user data is missing required fields, clear it
          if (!userData || !userData.id || !userData.username || !userData.role) {
            localStorage.removeItem('hdr_user')
            localStorage.removeItem('hdr_auth_token')
          }
        }
      } catch (error) {
        // If there's any error parsing the data, clear it
        localStorage.removeItem('hdr_user')
        localStorage.removeItem('hdr_auth_token')
      }
    }
    
    clearStaleAuthData()
  }, [])

  useEffect(() => {
    // Check if user is logged in from localStorage
    const savedUser = localStorage.getItem('hdr_user')
    const authToken = localStorage.getItem('hdr_auth_token')
    
    if (savedUser && authToken) {
      try {
        const userData = JSON.parse(savedUser)
        // Basic validation of user data
        if (userData && userData.id && userData.username && userData.role) {
          // Validate token with backend
          validateToken(authToken).then(isValid => {
            if (isValid) {
              setUser(userData)
              setIsAuthenticated(true)
            } else {
              // Token is invalid, clear authentication data
              localStorage.removeItem('hdr_user')
              localStorage.removeItem('hdr_auth_token')
            }
          }).catch(() => {
            // Network error or validation failed, clear authentication data
            localStorage.removeItem('hdr_user')
            localStorage.removeItem('hdr_auth_token')
          })
        } else {
          // Invalid user data, clear it
          localStorage.removeItem('hdr_user')
          localStorage.removeItem('hdr_auth_token')
        }
      } catch (error) {
        console.error('Error parsing saved user data:', error)
        // Clear invalid data
        localStorage.removeItem('hdr_user')
        localStorage.removeItem('hdr_auth_token')
      }
    }
  }, [])

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()
    
      if (response.ok && data.success && data.data) {
        const userData: User = data.data.user
        const token = data.data.token
      
        setUser(userData)
        setIsAuthenticated(true)
        localStorage.setItem('hdr_user', JSON.stringify(userData))
        localStorage.setItem('hdr_auth_token', token)
        return true
      } else {
        console.error('Login failed:', data.message || 'Unknown error')
        return false
      }
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const logout = () => {
    setUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem('hdr_user')
    localStorage.removeItem('hdr_auth_token')
    localStorage.removeItem('hdr_remember_me')
    localStorage.removeItem('hdr_lockout')
  }

  const validateToken = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      return response.ok
    } catch (error) {
      console.error('Token validation error:', error)
      return false
    }
  }

  const hasPermission = (permission: string): boolean => {
    if (!user) return false
    return permissions[user.role].includes(permission)
  }

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated,
      hasPermission
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 