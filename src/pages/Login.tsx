import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Building2, User, Lock, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '../components/AuthContext'
import Notification, { useNotification } from '../components/Notification'

const Login = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [lockoutTime, setLockoutTime] = useState<Date | null>(null)
  const { login, isAuthenticated } = useAuth()
  const { notification, showNotification, hideNotification } = useNotification()
  const navigate = useNavigate()

  // Check for saved credentials on mount
  useEffect(() => {
    const savedCredentials = localStorage.getItem('hdr_remember_me')
    if (savedCredentials) {
      const { username: savedUsername, rememberMe: savedRememberMe } = JSON.parse(savedCredentials)
      if (savedRememberMe) {
        setUsername(savedUsername)
        setRememberMe(true)
      }
    }
  }, [])

  // Check for lockout status
  useEffect(() => {
    const lockoutInfo = localStorage.getItem('hdr_lockout')
    if (lockoutInfo) {
      const { attempts, lockoutTime: savedLockoutTime } = JSON.parse(lockoutInfo)
      setLoginAttempts(attempts)
      
      if (savedLockoutTime) {
        const lockoutDate = new Date(savedLockoutTime)
        const now = new Date()
        const timeDiff = now.getTime() - lockoutDate.getTime()
        const minutesDiff = Math.floor(timeDiff / (1000 * 60))
        
        if (minutesDiff < 15) { // 15 minute lockout
          setIsLocked(true)
          setLockoutTime(lockoutDate)
        } else {
          // Reset lockout after 15 minutes
          localStorage.removeItem('hdr_lockout')
          setLoginAttempts(0)
          setIsLocked(false)
          setLockoutTime(null)
        }
      }
    }
  }, [])

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  const validatePassword = (password: string) => {
    const minLength = password.length >= 6
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)
    
    return {
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar,
      isValid: minLength && hasUpperCase && hasLowerCase && hasNumbers
    }
  }

  const getPasswordStrength = (password: string) => {
    const validation = validatePassword(password)
    const validCount = Object.values(validation).filter(Boolean).length - 1 // -1 for isValid
    
    if (validCount <= 2) return { strength: 'weak', color: 'text-red-500', bgColor: 'bg-red-100' }
    if (validCount <= 3) return { strength: 'medium', color: 'text-yellow-500', bgColor: 'bg-yellow-100' }
    if (validCount <= 4) return { strength: 'strong', color: 'text-green-500', bgColor: 'bg-green-100' }
    return { strength: 'very-strong', color: 'text-green-600', bgColor: 'bg-green-200' }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isLocked) {
      showNotification('error', 'Account is temporarily locked. Please try again later.')
      return
    }
    
    if (!username || !password) {
      showNotification('error', 'Please enter both username and password')
      return
    }

    // Basic validation
    if (username.length < 3) {
      showNotification('error', 'Username must be at least 3 characters long')
      return
    }

    if (password.length < 6) {
      showNotification('error', 'Password must be at least 6 characters long')
      return
    }

    setIsLoading(true)
    
    try {
      const success = await login(username, password)
      
      if (success) {
        // Save remember me preference
        if (rememberMe) {
          localStorage.setItem('hdr_remember_me', JSON.stringify({ username, rememberMe: true }))
        } else {
          localStorage.removeItem('hdr_remember_me')
        }
        
        // Reset login attempts on successful login
        setLoginAttempts(0)
        localStorage.removeItem('hdr_lockout')
        
        showNotification('success', 'Login successful! Welcome to Hotel Diplomat Residency.')
        // Redirect to dashboard
        setTimeout(() => {
          navigate('/')
        }, 1000)
      } else {
        const newAttempts = loginAttempts + 1
        setLoginAttempts(newAttempts)
        
        if (newAttempts >= 5) {
          // Lock account for 15 minutes
          setIsLocked(true)
          const lockoutDate = new Date()
          setLockoutTime(lockoutDate)
          localStorage.setItem('hdr_lockout', JSON.stringify({ 
            attempts: newAttempts, 
            lockoutTime: lockoutDate.toISOString() 
          }))
          showNotification('error', 'Too many failed attempts. Account locked for 15 minutes.')
        } else {
          const remainingAttempts = 5 - newAttempts
          showNotification('error', `Invalid username or password. ${remainingAttempts} attempts remaining.`)
        }
      }
    } catch (error) {
      showNotification('error', 'Login failed. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const getRemainingLockoutTime = () => {
    if (!lockoutTime) return 0
    const now = new Date()
    const timeDiff = now.getTime() - lockoutTime.getTime()
    const minutesDiff = Math.floor(timeDiff / (1000 * 60))
    return Math.max(0, 15 - minutesDiff)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mb-6 shadow-lg animate-pulse">
            <Building2 className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Hotel Diplomat Residency
          </h2>
          <p className="text-gray-600 text-lg">
            Sign in to your account
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your username"
                  required
                  disabled={isLocked}
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your password"
                  required
                  disabled={isLocked}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={isLocked}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  )}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          getPasswordStrength(password).bgColor
                        }`}
                        style={{ 
                          width: `${Math.min(100, (password.length / 8) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <span className={`text-xs font-medium ${getPasswordStrength(password).color}`}>
                      {getPasswordStrength(password).strength}
                    </span>
                  </div>
                  
                  {/* Password Requirements */}
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div className={`flex items-center space-x-1 ${password.length >= 6 ? 'text-green-600' : 'text-gray-400'}`}>
                      {password.length >= 6 ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      <span>Min 6 characters</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${/[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
                      {/[A-Z]/.test(password) ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      <span>Uppercase</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${/[a-z]/.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
                      {/[a-z]/.test(password) ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      <span>Lowercase</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${/\d/.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
                      {/\d/.test(password) ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      <span>Number</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={isLocked}
                />
                <span className="ml-2 text-sm text-gray-700">Remember me</span>
              </label>
              
              {loginAttempts > 0 && (
                <div className="text-xs text-red-600">
                  {isLocked ? (
                    <span>Locked for {getRemainingLockoutTime()} minutes</span>
                  ) : (
                    <span>{5 - loginAttempts} attempts remaining</span>
                  )}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || isLocked}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : isLocked ? (
                'Account Locked'
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo Credentials - Commented out for security */}
          {/* 
          <div className="mt-8 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <Building2 className="h-4 w-4 mr-2 text-blue-500" />
              Demo Credentials:
            </h3>
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex justify-between items-center p-2 bg-white rounded border">
                <span><strong>Admin:</strong> admin / Aronax@2k25</span>
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">Full Access</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white rounded border">
                <span><strong>Manager:</strong> manager / manager123</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Management</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white rounded border">
                <span><strong>Staff:</strong> staff / staff123</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Limited</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white rounded border">
                <span><strong>Accounts:</strong> accounts / accounts123</span>
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">Reports Only</span>
              </div>
            </div>
          </div>
          */}
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            © 2024 Hotel Diplomat Residency. All rights reserved.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Secure login with enhanced authentication
          </p>
        </div>
      </div>

      <Notification
        type={notification.type}
        message={notification.message}
        isVisible={notification.isVisible}
        onClose={hideNotification}
        duration={notification.duration}
      />
    </div>
  )
}

export default Login 