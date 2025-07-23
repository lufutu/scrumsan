"use client"

import React, { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { 
  AlertTriangle, 
  RefreshCw, 
  ChevronLeft,
  WifiOff,
  ServerCrash,
  Shield,
  Search
} from 'lucide-react'

interface ErrorStateProps {
  type?: 'general' | 'network' | 'server' | 'permission' | 'notFound' | 'validation'
  title?: string
  message?: string
  error?: string | Error
  icon?: ReactNode
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'secondary'
  }
  secondaryAction?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'secondary'
  }
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showDetails?: boolean
}

const defaultConfigs = {
  general: {
    icon: AlertTriangle,
    title: "Something went wrong",
    message: "An unexpected error occurred. Please try again.",
    actionLabel: "Try Again"
  },
  network: {
    icon: WifiOff,
    title: "Connection Error",
    message: "Unable to connect to the server. Please check your internet connection and try again.",
    actionLabel: "Retry"
  },
  server: {
    icon: ServerCrash,
    title: "Server Error",
    message: "Our servers are experiencing issues. Please try again in a few minutes.",
    actionLabel: "Refresh"
  },
  permission: {
    icon: Shield,
    title: "Access Denied",
    message: "You don't have permission to access this resource. Contact your administrator if you believe this is an error.",
    actionLabel: "Go Back"
  },
  notFound: {
    icon: Search,
    title: "Not Found",
    message: "The resource you're looking for doesn't exist or has been moved.",
    actionLabel: "Go Home"
  },
  validation: {
    icon: AlertTriangle,
    title: "Invalid Data",
    message: "The provided data is invalid. Please check your input and try again.",
    actionLabel: "Try Again"
  }
}

export function ErrorState({
  type = 'general',
  title,
  message,
  error,
  icon,
  action,
  secondaryAction,
  className,
  size = 'md',
  showDetails = false
}: ErrorStateProps) {
  const config = defaultConfigs[type]
  const IconComponent = icon || config.icon
  
  const finalTitle = title || config.title
  const finalMessage = message || config.message
  
  const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : null

  const sizeClasses = {
    sm: {
      container: 'py-6',
      iconSize: 'w-10 h-10',
      titleSize: 'text-lg',
      messageSize: 'text-sm',
      maxWidth: 'max-w-sm'
    },
    md: {
      container: 'py-12',
      iconSize: 'w-14 h-14',
      titleSize: 'text-xl',
      messageSize: 'text-base',
      maxWidth: 'max-w-md'
    },
    lg: {
      container: 'py-16',
      iconSize: 'w-20 h-20',
      titleSize: 'text-2xl',
      messageSize: 'text-lg',
      maxWidth: 'max-w-lg'
    }
  }

  const sizeConfig = sizeClasses[size]

  const getErrorColor = () => {
    switch (type) {
      case 'network':
        return 'text-blue-500'
      case 'server':
        return 'text-orange-500'
      case 'permission':
        return 'text-purple-500'
      case 'notFound':
        return 'text-gray-500'
      case 'validation':
        return 'text-yellow-500'
      default:
        return 'text-red-500'
    }
  }

  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center',
      sizeConfig.container,
      className
    )}>
      <div className="relative space-y-6">
        {/* Error Icon */}
        <div className="relative">
          <div className={cn(
            "mx-auto rounded-full bg-gradient-to-br from-red-50 to-red-100 p-4",
            "border-2 border-red-200 shadow-sm"
          )}>
            {React.createElement(IconComponent, {
              className: cn(sizeConfig.iconSize, getErrorColor())
            })}
          </div>
        </div>

        {/* Error Content */}
        <div className={cn("space-y-3", sizeConfig.maxWidth, "mx-auto")}>
          <h3 className={cn(
            "font-semibold text-gray-900",
            sizeConfig.titleSize
          )}>
            {finalTitle}
          </h3>
          
          <p className={cn(
            "text-gray-600 leading-relaxed",
            sizeConfig.messageSize
          )}>
            {finalMessage}
          </p>

          {/* Error Details */}
          {showDetails && errorMessage && (
            <details className="mt-4 p-3 bg-gray-50 rounded-lg border text-left">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                Show Error Details
              </summary>
              <div className="mt-2 text-xs text-gray-600 font-mono bg-white p-2 rounded border">
                {errorMessage}
              </div>
            </details>
          )}
        </div>

        {/* Actions */}
        {(action || secondaryAction) && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {action && (
              <Button
                onClick={action.onClick}
                variant={action.variant || 'default'}
                size="lg"
                className="shadow-sm hover:shadow-md transition-all duration-200"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {action.label}
              </Button>
            )}
            
            {secondaryAction && (
              <Button
                onClick={secondaryAction.onClick}
                variant={secondaryAction.variant || 'outline'}
                size="lg"
                className="shadow-sm hover:shadow-md transition-all duration-200"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Specialized error state components for common use cases
export function PageErrorState({ 
  error,
  onRetry,
  onGoHome,
  className 
}: { 
  error?: string | Error
  onRetry?: () => void
  onGoHome?: () => void
  className?: string 
}) {
  return (
    <ErrorState
      type="general"
      error={error}
      action={onRetry ? {
        label: "Try Again",
        onClick: onRetry
      } : undefined}
      secondaryAction={onGoHome ? {
        label: "Go Home",
        onClick: onGoHome,
        variant: 'outline'
      } : undefined}
      className={cn('min-h-[60vh]', className)}
      size="lg"
      showDetails={true}
    />
  )
}

export function NetworkErrorState({ 
  onRetry,
  className 
}: { 
  onRetry?: () => void
  className?: string 
}) {
  return (
    <ErrorState
      type="network"
      action={onRetry ? {
        label: "Retry Connection",
        onClick: onRetry
      } : undefined}
      className={className}
      size="md"
    />
  )
}

export function PermissionErrorState({ 
  onGoBack,
  className 
}: { 
  onGoBack?: () => void
  className?: string 
}) {
  return (
    <ErrorState
      type="permission"
      action={onGoBack ? {
        label: "Go Back",
        onClick: onGoBack,
        variant: 'outline'
      } : undefined}
      className={className}
      size="md"
    />
  )
}

export function NotFoundErrorState({ 
  onGoHome,
  className 
}: { 
  onGoHome?: () => void
  className?: string 
}) {
  return (
    <ErrorState
      type="notFound"
      action={onGoHome ? {
        label: "Go Home",
        onClick: onGoHome
      } : undefined}
      className={className}
      size="lg"
    />
  )
}

export function ValidationErrorState({ 
  error,
  onTryAgain,
  className 
}: { 
  error?: string | Error
  onTryAgain?: () => void
  className?: string 
}) {
  return (
    <ErrorState
      type="validation"
      error={error}
      action={onTryAgain ? {
        label: "Try Again",
        onClick: onTryAgain
      } : undefined}
      className={className}
      size="sm"
      showDetails={true}
    />
  )
}