import Avatar, { genConfig, AvatarConfig } from 'react-nice-avatar'

/**
 * Generates a consistent avatar configuration based on a seed string
 * @param seed - Usually email or name for consistent generation
 * @returns Avatar configuration object
 */
export const generateAvatarConfig = (seed: string): AvatarConfig => {
  if (!seed || typeof seed !== 'string') {
    // Fallback seed if invalid input
    seed = 'default-user'
  }
  
  return genConfig(seed)
}

/**
 * Creates a deterministic avatar configuration with custom options
 * @param seed - Seed string for consistent generation
 * @param options - Optional overrides for specific avatar properties
 * @returns Avatar configuration object
 */
export const generateCustomAvatarConfig = (
  seed: string, 
  options?: Partial<AvatarConfig>
): AvatarConfig => {
  const baseConfig = generateAvatarConfig(seed)
  
  return {
    ...baseConfig,
    ...options
  }
}

/**
 * Generates avatar configuration with preferred styling for the application
 * @param seed - Seed string for consistent generation
 * @returns Avatar configuration optimized for the app's design
 */
export const generateAppAvatarConfig = (seed: string): AvatarConfig => {
  const config = generateAvatarConfig(seed)
  
  // Apply consistent styling preferences for the app
  return {
    ...config,
    // Ensure professional appearance
    shape: 'circle',
    // Use more professional color palette if available
    bgColor: config.bgColor,
    // Keep other generated properties
  }
}

/**
 * Utility to get a fallback seed from user data
 * @param email - User email
 * @param name - User name
 * @param id - User ID as final fallback
 * @returns Best available seed for avatar generation
 */
export const getUserAvatarSeed = (
  email?: string | null, 
  name?: string | null, 
  id?: string | null
): string => {
  // Prefer email for consistency, then name, then ID
  return email || name || id || 'anonymous-user'
}

/**
 * Validates if a seed will generate a consistent avatar
 * @param seed - Seed to validate
 * @returns boolean indicating if seed is valid
 */
export const isValidAvatarSeed = (seed: string): boolean => {
  return typeof seed === 'string' && seed.length > 0
}

/**
 * Cache key generator for avatar configurations
 * @param seed - Avatar seed
 * @param version - Optional version for cache busting
 * @returns Cache key string
 */
export const getAvatarCacheKey = (seed: string, version = '1.0'): string => {
  return `avatar-config-${seed}-${version}`
}