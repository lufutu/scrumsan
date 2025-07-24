"use client"

import * as React from "react"
import { useMemo, useState, useCallback } from "react"
import Avatar from "react-nice-avatar"
import { Avatar as UIAvatar, AvatarImage, AvatarFallback } from "./avatar"
import { generateCachedAvatarConfig, getFallbackSeed } from "@/lib/avatar-utils"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "./button"
import { toast } from "sonner"
import { handleAvatarError, AvatarErrorType, createAvatarRetryFunction } from "@/lib/avatar-error-handling"

const enhancedAvatarVariants = cva(
  "relative flex shrink-0 overflow-hidden rounded-full",
  {
    variants: {
      size: {
        sm: "size-6",
        md: "size-8", 
        lg: "size-12",
        xl: "size-16",
        "2xl": "size-20",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

export interface EnhancedAvatarProps 
  extends React.ComponentProps<typeof UIAvatar>,
    VariantProps<typeof enhancedAvatarVariants> {
  /**
   * Image source URL for the avatar
   */
  src?: string | null
  
  /**
   * Fallback seed for generating consistent avatars when no src is provided
   * Usually email, name, or user ID
   */
  fallbackSeed: string
  
  /**
   * Alternative fallback seeds to try if primary seed fails
   */
  fallbackSeeds?: string[]
  
  /**
   * Alt text for the avatar image
   */
  alt?: string
  
  /**
   * Whether to show upload overlay on hover (for future upload functionality)
   */
  showUploadOnHover?: boolean
  
  /**
   * Upload handler for future upload functionality
   */
  onUpload?: (file: File) => void
  
  /**
   * Whether the avatar is editable
   */
  editable?: boolean
  
  /**
   * Custom class name for the avatar container
   */
  className?: string
  
  /**
   * Custom class name for the fallback avatar
   */
  fallbackClassName?: string
  
  /**
   * Whether to show error states and retry options
   */
  showErrorHandling?: boolean
  
  /**
   * Callback when image fails to load
   */
  onImageError?: (error: Event) => void
  
  /**
   * Callback when avatar generation fails
   */
  onAvatarError?: (error: Error) => void
  
  /**
   * Maximum number of retry attempts for failed images
   */
  maxRetries?: number
}

/**
 * Enhanced Avatar Component
 * 
 * Wraps the existing Avatar UI component with react-nice-avatar fallback support.
 * Provides consistent avatar generation based on seed values and multiple size variants.
 * 
 * Features:
 * - Automatic fallback to generated avatar when no src provided
 * - Consistent generation based on seed (email, name, or ID)
 * - Multiple size variants (sm, md, lg, xl, 2xl)
 * - Caching support for generated avatar configurations
 * - Fallback chain for robust avatar display
 */
export const EnhancedAvatar = React.forwardRef<
  React.ElementRef<typeof UIAvatar>,
  EnhancedAvatarProps
>(({
  src,
  fallbackSeed,
  fallbackSeeds = [],
  alt,
  size = "md",
  showUploadOnHover = false,
  onUpload,
  editable = false,
  className,
  fallbackClassName,
  showErrorHandling = true,
  onImageError,
  onAvatarError,
  maxRetries = 3,
  ...props
}, ref) => {
  // Error handling state
  const [imageError, setImageError] = useState(false)
  const [avatarError, setAvatarError] = useState<Error | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)

  // Generate the primary seed from the provided fallback seed
  const primarySeed = useMemo(() => {
    return getFallbackSeed(fallbackSeed)
  }, [fallbackSeed])
  
  // Generate avatar configuration with error handling
  const avatarConfig = useMemo(() => {
    try {
      // Try primary seed first
      if (primarySeed && primarySeed !== 'default-user') {
        return generateCachedAvatarConfig(primarySeed)
      }
      
      // Try alternative seeds
      for (const seed of fallbackSeeds) {
        const processedSeed = getFallbackSeed(seed)
        if (processedSeed && processedSeed !== 'default-user') {
          return generateCachedAvatarConfig(processedSeed)
        }
      }
      
      // Final fallback
      return generateCachedAvatarConfig('default-user')
    } catch (error) {
      const avatarGenError = error instanceof Error ? error : new Error('Avatar generation failed')
      setAvatarError(avatarGenError)
      onAvatarError?.(avatarGenError)
      return null
    }
  }, [primarySeed, fallbackSeeds, onAvatarError])
  
  // Generate initials fallback as final backup
  const initialsFromSeed = useMemo(() => {
    const seed = primarySeed || fallbackSeed || 'U'
    if (seed.includes('@')) {
      // Email - use first letter
      return seed.charAt(0).toUpperCase()
    }
    if (seed.includes(' ')) {
      // Full name - use first letters of first and last name
      const parts = seed.trim().split(' ')
      return (parts[0]?.charAt(0) + (parts[parts.length - 1]?.charAt(0) || '')).toUpperCase()
    }
    // Single word or ID - use first two characters
    return seed.substring(0, 2).toUpperCase()
  }, [primarySeed, fallbackSeed])

  // Handle image load error with retry logic
  const handleImageError = useCallback((event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const avatarError = handleAvatarError(
      new Error('Avatar image failed to load'),
      'display',
      { 
        showToast: false, // We'll handle toast manually
        logError: true 
      }
    )

    setImageError(true)
    onImageError?.(event.nativeEvent)
    
    if (retryCount < maxRetries && !isRetrying && avatarError.canRetry) {
      // Automatic retry with exponential backoff
      const retryDelay = avatarError.retryDelay || Math.pow(2, retryCount) * 1000
      setTimeout(() => {
        setRetryCount(prev => prev + 1)
        setImageError(false)
        setIsRetrying(false)
      }, retryDelay)
      setIsRetrying(true)
    }
  }, [retryCount, maxRetries, isRetrying, onImageError])

  // Manual retry function
  const handleManualRetry = useCallback(() => {
    setImageError(false)
    setAvatarError(null)
    setRetryCount(0)
    setIsRetrying(false)
    toast.info('Retrying avatar load...')
  }, [])

  // Reset error state when src changes
  React.useEffect(() => {
    if (src) {
      setImageError(false)
      setRetryCount(0)
      setIsRetrying(false)
    }
  }, [src])
  
  // Determine what to show based on error states
  const shouldShowImage = src && !imageError && retryCount <= maxRetries
  const shouldShowRetryButton = showErrorHandling && (imageError || avatarError) && retryCount >= maxRetries

  return (
    <div className="relative">
      <UIAvatar
        ref={ref}
        className={cn(
          enhancedAvatarVariants({ size }), 
          className,
          (imageError || avatarError) && showErrorHandling && "border-2 border-red-200"
        )}
        {...props}
      >
        {/* Primary: User uploaded image with error handling */}
        {shouldShowImage && (
          <AvatarImage 
            src={src} 
            alt={alt || `Avatar for ${fallbackSeed}`}
            onError={handleImageError}
          />
        )}
        
        {/* Secondary: Generated avatar fallback */}
        <AvatarFallback className={cn("p-0", fallbackClassName)}>
          <div className="w-full h-full flex items-center justify-center">
            {avatarConfig?.config && !avatarError ? (
              <Avatar 
                {...avatarConfig.config}
                style={{ 
                  width: '100%', 
                  height: '100%',
                  borderRadius: '50%'
                }}
              />
            ) : (
              /* Tertiary: Initials fallback */
              <span className="text-xs font-medium text-muted-foreground">
                {initialsFromSeed}
              </span>
            )}
          </div>
        </AvatarFallback>
        
        {/* Upload overlay for future functionality */}
        {showUploadOnHover && editable && !shouldShowRetryButton && (
          <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-full cursor-pointer">
            <span className="text-white text-xs font-medium">Upload</span>
          </div>
        )}
      </UIAvatar>

      {/* Error indicator and retry button */}
      {shouldShowRetryButton && (
        <div className="absolute -top-1 -right-1">
          <Button
            size="sm"
            variant="outline"
            className="h-6 w-6 p-0 rounded-full bg-red-50 border-red-200 hover:bg-red-100"
            onClick={handleManualRetry}
            title="Retry loading avatar"
          >
            <RefreshCw className="h-3 w-3 text-red-600" />
          </Button>
        </div>
      )}

      {/* Loading indicator during retry */}
      {isRetrying && (
        <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error tooltip for accessibility */}
      {(imageError || avatarError) && showErrorHandling && (
        <div className="sr-only" role="alert">
          {imageError && `Avatar image failed to load after ${retryCount} attempts`}
          {avatarError && `Avatar generation failed: ${avatarError.message}`}
        </div>
      )}
    </div>
  )
})

EnhancedAvatar.displayName = "EnhancedAvatar"

export { enhancedAvatarVariants }