import * as React from 'react'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'
import { NotificationType, NotificationData } from '@/types'
import { cn } from '@/utils'

interface NotificationProps {
  type: NotificationType
  message: string
  isVisible: boolean
  onClose: () => void
  duration?: number
  id?: string
  persistent?: boolean
}

const Notification: React.FC<NotificationProps> = ({ 
  type, 
  message, 
  isVisible, 
  onClose, 
  duration = 4000,
  persistent = false
}) => {
  useEffect(() => {
    if (isVisible && duration > 0 && !persistent) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [isVisible, duration, onClose, persistent])

  if (!isVisible) return null

  const iconMap = useMemo(() => ({
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <XCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertCircle className="h-5 w-5 text-yellow-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />
  }), [])

  const bgColorMap = useMemo(() => ({
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200'
  }), [])

  const textColorMap = useMemo(() => ({
    success: 'text-green-800',
    error: 'text-red-800',
    warning: 'text-yellow-800',
    info: 'text-blue-800'
  }), [])

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose()
    }
  }, [onClose])

  return (
    <div 
      className="fixed top-4 right-4 z-50 max-w-sm w-full"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div 
        className={cn(
          bgColorMap[type],
          'border rounded-lg shadow-lg p-4 transition-all duration-300 ease-in-out transform translate-x-0',
          'hover:shadow-xl focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500'
        )}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {iconMap[type]}
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className={cn('text-sm font-medium', textColorMap[type])}>
              {message}
            </p>
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={onClose}
              className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors duration-200"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Enhanced notification context and hook for global usage
interface NotificationContextType {
  showNotification: (type: NotificationType, message: string, duration?: number, persistent?: boolean) => string
  hideNotification: (id: string) => void
  hideAllNotifications: () => void
  notifications: NotificationData[]
}

const NotificationContext = React.createContext<NotificationContextType | undefined>(undefined)

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([])

  const showNotification = useCallback((
    type: NotificationType, 
    message: string, 
    duration?: number,
    persistent?: boolean
  ): string => {
    const id = Math.random().toString(36).substr(2, 9)
    const newNotification: NotificationData = {
      id,
      type,
      message,
      isVisible: true,
      ...(duration !== undefined && { duration }),
      ...(persistent !== undefined && { persistent })
    }

    setNotifications(prev => [...prev, newNotification])
    return id
  }, [])

  const hideNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }, [])

  const hideAllNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  const contextValue = useMemo(() => ({
    showNotification,
    hideNotification,
    hideAllNotifications,
    notifications
  }), [showNotification, hideNotification, hideAllNotifications, notifications])

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <NotificationStack />
    </NotificationContext.Provider>
  )
}

// Notification stack component to display multiple notifications
const NotificationStack: React.FC = () => {
  const { notifications, hideNotification } = useNotification()

  if (!notifications.length) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          className="transform transition-all duration-300 ease-in-out"
          style={{
            transform: `translateY(${index * 10}px)`,
            zIndex: 50 - index
          }}
        >
                      <Notification
              type={notification.type}
              message={notification.message}
              isVisible={notification.isVisible}
              onClose={() => hideNotification(notification.id!)}
              duration={notification.duration || 4000}
              persistent={notification.persistent || false}
            />
        </div>
      ))}
    </div>
  )
}

export const useNotification = (): NotificationContextType => {
  const context = React.useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}

// Convenience functions for common notification types
export const useNotificationHelpers = () => {
  const { showNotification } = useNotification()

  return {
    success: (message: string, duration?: number) => 
      showNotification('success', message, duration),
    error: (message: string, duration?: number) => 
      showNotification('error', message, duration),
    warning: (message: string, duration?: number) => 
      showNotification('warning', message, duration),
    info: (message: string, duration?: number) => 
      showNotification('info', message, duration),
    persistent: (type: NotificationType, message: string) => 
      showNotification(type, message, undefined, true)
  }
}

export default Notification 