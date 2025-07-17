import * as React from 'react'
import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react'
import { User, UserRole } from '@/types'
import { useNotificationHelpers } from './Notification'

interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  isAuthenticated: boolean
  hasPermission: (permission: string) => boolean
  isLoading: boolean
  refreshUser: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Enhanced user database with better security practices
interface UserData {
  id: string
  username: string
  password: string // In production, this should be hashed
  name: string
  role: UserRole
  email: string
  avatar?: string
  isActive: boolean
  lastLogin?: string
  permissions: string[]
}

// Mock user database - In production, this should come from a secure API
const users: UserData[] = [
  {
    id: '1',
    username: 'admin',
    password: 'admin123', // In production, use bcrypt or similar
    name: 'System Administrator',
    role: 'admin',
    email: 'admin@hoteldiplomat.com',
    isActive: true,
    permissions: [
      'dashboard:view',
      'guests:view', 'guests:create', 'guests:edit', 'guests:delete',
      'rooms:view', 'rooms:create', 'rooms:edit', 'rooms:delete',
      'reservations:view', 'reservations:create', 'reservations:edit', 'reservations:delete',
      'reports:view', 'reports:export',
      'settings:view', 'settings:edit'
    ]
  },
  {
    id: '2',
    username: 'manager',
    password: 'manager123',
    name: 'Hotel Manager',
    role: 'manager',
    email: 'manager@hoteldiplomat.com',
    isActive: true,
    permissions: [
      'dashboard:view',
      'guests:view', 'guests:create', 'guests:edit', 'guests:delete',
      'rooms:view', 'rooms:create', 'rooms:edit', 'rooms:delete',
      'reservations:view', 'reservations:create', 'reservations:edit', 'reservations:delete',
      'reports:view', 'reports:export'
    ]
  },
  {
    id: '3',
    username: 'staff',
    password: 'staff123',
    name: 'Front Desk Staff',
    role: 'staff',
    email: 'staff@hoteldiplomat.com',
    isActive: true,
    permissions: [
      'dashboard:view',
      'guests:view', 'guests:create', 'guests:edit',
      'rooms:view',
      'reservations:view', 'reservations:create', 'reservations:edit'
    ]
  },
  {
    id: '4',
    username: 'accounts',
    password: 'accounts123',
    name: 'Accounts User',
    role: 'accounts',
    email: 'accounts@hoteldiplomat.com',
    isActive: true,
    permissions: [
      'dashboard:view',
      'reports:view', 'reports:export'
    ]
  }
]

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { success, error } = useNotificationHelpers()

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUserFromStorage = () => {
      try {
        const savedUser = localStorage.getItem('hdr_user')
        const savedToken = localStorage.getItem('hdr_auth_token')
        
        if (savedUser && savedToken) {
          const userData = JSON.parse(savedUser) as User
          const tokenData = JSON.parse(savedToken)
          
          // Check if token is still valid (simple expiration check)
          if (tokenData.expiresAt && new Date(tokenData.expiresAt) > new Date()) {
            setUser(userData)
            setIsAuthenticated(true)
          } else {
            // Token expired, clear storage
            localStorage.removeItem('hdr_user')
            localStorage.removeItem('hdr_auth_token')
          }
        }
      } catch (err) {
        console.error('Error loading user from storage:', err)
        // Clear corrupted data
        localStorage.removeItem('hdr_user')
        localStorage.removeItem('hdr_auth_token')
      } finally {
        setIsLoading(false)
      }
    }

    loadUserFromStorage()
  }, [])

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const foundUser = users.find(u => 
        u.username === username && 
        u.password === password && 
        u.isActive
      )
      
      if (foundUser) {
        const userData: User = {
          id: foundUser.id,
          username: foundUser.username,
          name: foundUser.name,
          role: foundUser.role,
          email: foundUser.email,
          ...(foundUser.avatar && { avatar: foundUser.avatar }),
          permissions: foundUser.permissions,
          lastLogin: new Date().toISOString(),
          isActive: foundUser.isActive,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        // Create mock token with expiration
        const tokenData = {
          token: `mock_token_${foundUser.id}_${Date.now()}`,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        }
        
        setUser(userData)
        setIsAuthenticated(true)
        
        // Save to localStorage
        localStorage.setItem('hdr_user', JSON.stringify(userData))
        localStorage.setItem('hdr_auth_token', JSON.stringify(tokenData))
        
        success(`Welcome back, ${userData.name}!`)
        return true
      }
      
      error('Invalid username or password')
      return false
    } catch (err) {
      console.error('Login error:', err)
      error('An error occurred during login. Please try again.')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [success, error])

  const logout = useCallback(() => {
    setUser(null)
    setIsAuthenticated(false)
    
    // Clear localStorage
    localStorage.removeItem('hdr_user')
    localStorage.removeItem('hdr_auth_token')
    
    success('You have been logged out successfully')
  }, [success])

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false
    return user.permissions.includes(permission)
  }, [user])

  const refreshUser = useCallback(() => {
    // In a real app, this would refresh the user data from the server
    const savedUser = localStorage.getItem('hdr_user')
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser) as User
        setUser(userData)
      } catch (err) {
        console.error('Error refreshing user:', err)
        logout()
      }
    }
  }, [logout])

  const contextValue = useMemo(() => ({
    user,
    login,
    logout,
    isAuthenticated,
    hasPermission,
    isLoading,
    refreshUser
  }), [user, login, logout, isAuthenticated, hasPermission, isLoading, refreshUser])

  return (
    <AuthContext.Provider value={contextValue}>
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