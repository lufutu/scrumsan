"use client"

import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface LoadingStateProps {
  message?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'spinner' | 'dots' | 'pulse'
  centered?: boolean
}

export function LoadingState({ 
  message = "Loading...", 
  className, 
  size = 'md',
  variant = 'spinner',
  centered = true 
}: LoadingStateProps) {
  const sizeClasses = {
    sm: {
      spinner: 'w-4 h-4',
      text: 'text-sm',
      container: 'py-4'
    },
    md: {
      spinner: 'w-8 h-8',
      text: 'text-base',
      container: 'py-8'
    },
    lg: {
      spinner: 'w-12 h-12',
      text: 'text-lg',
      container: 'py-12'
    }
  }

  const sizeConfig = sizeClasses[size]

  if (variant === 'spinner') {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center text-center',
        sizeConfig.container,
        centered && 'min-h-[200px]',
        className
      )}>
        <Loader2 className={cn(
          'animate-spin text-blue-500 mb-4',
          sizeConfig.spinner
        )} />
        <p className={cn(
          'text-gray-600 animate-pulse',
          sizeConfig.text
        )}>
          {message}
        </p>
      </div>
    )
  }

  if (variant === 'dots') {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center text-center',
        sizeConfig.container,
        centered && 'min-h-[200px]',
        className
      )}>
        <div className="flex space-x-2 mb-4">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
        </div>
        <p className={cn(
          'text-gray-600',
          sizeConfig.text
        )}>
          {message}
        </p>
      </div>
    )
  }

  if (variant === 'pulse') {
    return (
      <div className={cn(
        'flex flex-col space-y-4',
        sizeConfig.container,
        className
      )}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
        <p className={cn(
          'text-gray-600 text-center',
          sizeConfig.text
        )}>
          {message}
        </p>
      </div>
    )
  }

  return null
}

// Specialized loading states for common use cases
export function PageLoadingState({ 
  message = "Loading page...",
  className 
}: { 
  message?: string
  className?: string 
}) {
  return (
    <LoadingState
      message={message}
      className={cn('min-h-[60vh]', className)}
      size="lg"
      variant="spinner"
    />
  )
}

export function CardLoadingState({ 
  message = "Loading...",
  className 
}: { 
  message?: string
  className?: string 
}) {
  return (
    <LoadingState
      message={message}
      className={className}
      size="md"
      variant="spinner"
      centered={false}
    />
  )
}

export function InlineLoadingState({ 
  message = "Loading...",
  className 
}: { 
  message?: string
  className?: string 
}) {
  return (
    <div className={cn('flex items-center gap-2 text-gray-600', className)}>
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="text-sm">{message}</span>
    </div>
  )
}

export function SkeletonLoadingState({ 
  rows = 3,
  className 
}: { 
  rows?: number
  className?: string 
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6 mt-2"></div>
        </div>
      ))}
    </div>
  )
}