import * as React from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { cn } from '@/utils'

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'spinner' | 'dots' | 'pulse' | 'skeleton'
  text?: string
  className?: string
}

interface LoadingSpinnerProps extends LoadingProps {
  variant: 'spinner'
}

interface LoadingDotsProps extends LoadingProps {
  variant: 'dots'
}

interface LoadingPulseProps extends LoadingProps {
  variant: 'pulse'
}

interface LoadingSkeletonProps extends LoadingProps {
  variant: 'skeleton'
  lines?: number
}

type LoadingComponentProps = LoadingSpinnerProps | LoadingDotsProps | LoadingPulseProps | LoadingSkeletonProps

const Loading: React.FC<LoadingComponentProps> = (props) => {
  const { 
    size = 'md', 
    variant = 'spinner', 
    text, 
    className 
  } = props
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  }

  const renderSpinner = () => (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <Loader2 className={cn('animate-spin text-primary-600', sizeClasses[size])} />
      {text && (
        <p className="mt-2 text-sm text-gray-600">{text}</p>
      )}
    </div>
  )

  const renderDots = () => (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div className="flex space-x-1">
        <div className={cn('w-2 h-2 bg-primary-600 rounded-full animate-bounce', {
          'w-1 h-1': size === 'sm',
          'w-3 h-3': size === 'lg',
          'w-4 h-4': size === 'xl'
        })} />
        <div className={cn('w-2 h-2 bg-primary-600 rounded-full animate-bounce', {
          'w-1 h-1': size === 'sm',
          'w-3 h-3': size === 'lg',
          'w-4 h-4': size === 'xl'
        })} style={{ animationDelay: '0.1s' }} />
        <div className={cn('w-2 h-2 bg-primary-600 rounded-full animate-bounce', {
          'w-1 h-1': size === 'sm',
          'w-3 h-3': size === 'lg',
          'w-4 h-4': size === 'xl'
        })} style={{ animationDelay: '0.2s' }} />
      </div>
      {text && (
        <p className="mt-2 text-sm text-gray-600">{text}</p>
      )}
    </div>
  )

  const renderPulse = () => (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div className={cn('animate-pulse bg-primary-600 rounded-full', {
        'w-4 h-4': size === 'sm',
        'w-6 h-6': size === 'md',
        'w-8 h-8': size === 'lg',
        'w-12 h-12': size === 'xl'
      })} />
      {text && (
        <p className="mt-2 text-sm text-gray-600">{text}</p>
      )}
    </div>
  )

  const renderSkeleton = () => {
    const lines = variant === 'skeleton' && 'lines' in props ? props.lines : 3
    
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn('animate-pulse bg-gray-200 rounded', {
              'h-4': size === 'sm',
              'h-5': size === 'md',
              'h-6': size === 'lg',
              'h-8': size === 'xl'
            })}
            style={{ 
              width: `${100 - (index * 10)}%`,
              animationDelay: `${index * 0.1}s`
            }}
          />
        ))}
      </div>
    )
  }

  switch (variant) {
    case 'dots':
      return renderDots()
    case 'pulse':
      return renderPulse()
    case 'skeleton':
      return renderSkeleton()
    case 'spinner':
    default:
      return renderSpinner()
  }
}

// Loading overlay component
interface LoadingOverlayProps {
  isLoading: boolean
  children: React.ReactNode
  text?: string
  variant?: LoadingProps['variant']
  size?: LoadingProps['size']
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  children,
  text = 'Loading...',
  variant = 'spinner',
  size = 'lg'
}) => {
  if (!isLoading) return <>{children}</>

  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
        <Loading variant={variant} size={size} text={text} />
      </div>
    </div>
  )
}

// Loading button component
interface LoadingButtonProps {
  isLoading: boolean
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
  loadingText?: string
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  isLoading,
  children,
  onClick,
  disabled,
  className,
  loadingText = 'Loading...'
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        'btn-primary flex items-center justify-center',
        className
      )}
    >
      {isLoading && (
        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
      )}
      {isLoading ? loadingText : children}
    </button>
  )
}

export default Loading 