import { genConfig } from 'react-nice-avatar'

/**
 * Avatar generation utility functions for react-nice-avatar integration
 */

export interface AvatarConfig {
  seed: string
  config: any // react-nice-avatar config type
  generatedAt: Date
  version: string
}

/**
 * Generate a consistent avatar configuration based on a seed string
 * @param seed - The seed string (typically email or name) for consistent generation
 * @returns Avatar configuration object
 */
export const generateAvatarConfig = (seed: string) => {
  if (!seed || typeof seed !== 'string') {
    // Fallback to a default seed if invalid input
    seed = 'default-user'
  }
  
  return genConfig(seed)
}

/**
 * Generate avatar configuration with caching support
 * @param seed - The seed string for avatar generation
 * @param version - Version string for cache busting (optional)
 * @returns Cached or newly generated avatar configuration
 */
export const generateCachedAvatarConfig = (seed: string, version: string = '1.0'): AvatarConfig => {
  const cacheKey = `avatar-config-${seed}-${version}`
  
  // Try to get from localStorage cache
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const parsedCache = JSON.parse(cached) as AvatarConfig
        // Check if cache is still valid (less than 24 hours old)
        const cacheAge = Date.now() - new Date(parsedCache.generatedAt).getTime()
        const maxAge = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
        
        if (cacheAge < maxAge) {
          return parsedCache
        }
      }
    } catch (error) {
      console.warn('Failed to read avatar config from cache:', error)
    }
  }
  
  // Generate new config
  const config = generateAvatarConfig(seed)
  const avatarConfig: AvatarConfig = {
    seed,
    config,
    generatedAt: new Date(),
    version
  }
  
  // Cache the result
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(avatarConfig))
    } catch (error) {
      console.warn('Failed to cache avatar config:', error)
    }
  }
  
  return avatarConfig
}

/**
 * Get a fallback seed from user data
 * @param email - User email
 * @param name - User name
 * @param userId - User ID as final fallback
 * @returns Best available seed for avatar generation
 */
export const getFallbackSeed = (email?: string | null, name?: string | null, userId?: string | null): string => {
  // Priority: email > name > userId > default
  if (email && email.trim()) {
    return email.trim().toLowerCase()
  }
  
  if (name && name.trim()) {
    return name.trim().toLowerCase()
  }
  
  if (userId && userId.trim()) {
    return userId.trim()
  }
  
  return 'default-user'
}

/**
 * Clear avatar cache for a specific seed or all cached avatars
 * @param seed - Optional specific seed to clear, if not provided clears all
 */
export const clearAvatarCache = (seed?: string) => {
  if (typeof window === 'undefined') return
  
  try {
    if (seed) {
      // Clear specific seed cache
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith('avatar-config-') && key.includes(seed)
      )
      keys.forEach(key => localStorage.removeItem(key))
    } else {
      // Clear all avatar cache
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith('avatar-config-')
      )
      keys.forEach(key => localStorage.removeItem(key))
    }
  } catch (error) {
    console.warn('Failed to clear avatar cache:', error)
  }
}

/**
 * Validate if a seed will generate a consistent avatar
 * @param seed - The seed to validate
 * @returns boolean indicating if seed is valid for avatar generation
 */
export const isValidAvatarSeed = (seed: string): boolean => {
  return typeof seed === 'string' && seed.trim().length > 0
}