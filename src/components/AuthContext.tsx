import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

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

// Mock user database
const users = [
  {
    id: '1',
    username: 'admin',
    password: 'admin123',
    name: 'System Administrator',
    role: 'admin' as const,
    email: 'admin@hoteldiplomat.com'
  },
  {
    id: '2',
    username: 'manager',
    password: 'manager123',
    name: 'Hotel Manager',
    role: 'manager' as const,
    email: 'manager@hoteldiplomat.com'
  },
  {
    id: '3',
    username: 'staff',
    password: 'staff123',
    name: 'Front Desk Staff',
    role: 'staff' as const,
    email: 'staff@hoteldiplomat.com'
  },
  {
    id: '4',
    username: 'accounts',
    password: 'accounts123',
    name: 'Accounts User',
    role: 'accounts' as const,
    email: 'accounts@hoteldiplomat.com'
  }
]

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
    'reservations:view',
    'reservations:create',
    'reservations:edit',
    'reservations:delete',
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
    'reservations:view',
    'reservations:create',
    'reservations:edit',
    'reservations:delete',
    'reports:view',
    'reports:export'
    // No settings permissions
  ],
  staff: [
    'rooms:view'
    // Only room viewing permission
  ],
  accounts: [
    'reports:view'
    // Only reports viewing permission
  ]
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // Check if user is logged in from localStorage
    const savedUser = localStorage.getItem('hdr_user')
    if (savedUser) {
      const userData = JSON.parse(savedUser)
      setUser(userData)
      setIsAuthenticated(true)
    }
  }, [])

  const login = async (username: string, password: string): Promise<boolean> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const foundUser = users.find(u => u.username === username && u.password === password)
    
    if (foundUser) {
      const userData: User = {
        id: foundUser.id,
        username: foundUser.username,
        name: foundUser.name,
        role: foundUser.role,
        email: foundUser.email
      }
      
      setUser(userData)
      setIsAuthenticated(true)
      localStorage.setItem('hdr_user', JSON.stringify(userData))
      return true
    }
    
    return false
  }

  const logout = () => {
    setUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem('hdr_user')
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