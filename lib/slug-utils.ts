/**
 * Slug utilities for generating URL-safe slugs from names
 */

// Reserved words that cannot be used as slugs
const RESERVED_WORDS = new Set([
  'api', 'auth', 'login', 'signup', 'admin', 'settings', 'profile', 'dashboard',
  'organizations', 'orgs', 'projects', 'boards', 'sprints', 'tasks', 'members',
  'invitations', 'notifications', 'help', 'about', 'contact', 'privacy', 'terms',
  'app', 'www', 'mail', 'ftp', 'blog', 'docs', 'support', 'status', 'new', 'edit',
  'create', 'delete', 'update', 'manage', 'analytics', 'reports', 'export',
  'import', 'backup', 'restore', 'migrate', 'test', 'staging', 'prod', 'dev'
])

/**
 * Generate a URL-safe slug from a string
 * @param input - The input string to convert to a slug
 * @returns URL-safe slug
 */
export function generateSlug(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new Error('Input must be a non-empty string')
  }

  return input
    .toString()
    .toLowerCase()
    .trim()
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, '-')
    // Remove special characters except hyphens
    .replace(/[^\w\-]+/g, '')
    // Remove multiple consecutive hyphens
    .replace(/\-\-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit length to 50 characters
    .substring(0, 50)
    .replace(/-+$/, '') // Remove trailing hyphen if truncation created one
}

/**
 * Check if a slug is valid
 * @param slug - The slug to validate
 * @returns true if valid, false otherwise
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') {
    return false
  }

  // Check length (3-50 characters)
  if (slug.length < 3 || slug.length > 50) {
    return false
  }

  // Check format: only lowercase letters, numbers, and hyphens
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return false
  }

  // Cannot start or end with hyphen
  if (slug.startsWith('-') || slug.endsWith('-')) {
    return false
  }

  // Cannot have consecutive hyphens
  if (slug.includes('--')) {
    return false
  }

  // Cannot be a reserved word
  if (RESERVED_WORDS.has(slug)) {
    return false
  }

  // Cannot be only numbers (to avoid confusion with IDs)
  if (/^\d+$/.test(slug)) {
    return false
  }

  return true
}

/**
 * Generate a unique slug by checking against existing slugs
 * @param baseSlug - The base slug to make unique
 * @param existingSlugs - Array of existing slugs to check against
 * @param maxIterations - Maximum number of iterations to try
 * @returns Unique slug
 */
export function generateUniqueSlug(
  baseSlug: string, 
  existingSlugs: string[], 
  maxIterations: number = 1000
): string {
  if (!baseSlug) {
    throw new Error('Base slug is required')
  }

  let slug = baseSlug
  let counter = 1

  // If base slug is not valid, generate one
  if (!isValidSlug(slug)) {
    slug = generateSlug(baseSlug)
  }

  // If still not valid after generation, use fallback
  if (!isValidSlug(slug)) {
    slug = 'item'
  }

  const existingSet = new Set(existingSlugs.map(s => s.toLowerCase()))

  // Check if base slug is already unique
  if (!existingSet.has(slug.toLowerCase())) {
    return slug
  }

  // Try adding numbers until we find a unique slug
  while (counter <= maxIterations) {
    const candidateSlug = `${slug}-${counter}`
    
    // Make sure the candidate is still valid
    if (isValidSlug(candidateSlug) && !existingSet.has(candidateSlug.toLowerCase())) {
      return candidateSlug
    }
    
    counter++
  }

  // Fallback: use timestamp if we can't find a unique slug
  const timestamp = Date.now().toString().slice(-6)
  const fallbackSlug = `${slug}-${timestamp}`
  
  if (isValidSlug(fallbackSlug)) {
    return fallbackSlug
  }

  // Ultimate fallback
  return `item-${timestamp}`
}

/**
 * Check if a string is a UUID (to distinguish from slugs)
 * @param str - String to check
 * @returns true if it's a UUID, false otherwise
 */
export function isUUID(str: string): boolean {
  if (!str || typeof str !== 'string') {
    return false
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

/**
 * Validate slug against reserved words and format
 * @param slug - Slug to validate
 * @returns Validation result with errors if any
 */
export function validateSlug(slug: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!slug || typeof slug !== 'string') {
    errors.push('Slug is required and must be a string')
    return { valid: false, errors }
  }

  if (slug.length < 3) {
    errors.push('Slug must be at least 3 characters long')
  }

  if (slug.length > 50) {
    errors.push('Slug must be no more than 50 characters long')
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    errors.push('Slug can only contain lowercase letters, numbers, and hyphens')
  }

  if (slug.startsWith('-') || slug.endsWith('-')) {
    errors.push('Slug cannot start or end with a hyphen')
  }

  if (slug.includes('--')) {
    errors.push('Slug cannot contain consecutive hyphens')
  }

  if (RESERVED_WORDS.has(slug)) {
    errors.push('This slug is reserved and cannot be used')
  }

  if (/^\d+$/.test(slug)) {
    errors.push('Slug cannot be only numbers')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Generate slug suggestions based on a name
 * @param name - Original name
 * @param count - Number of suggestions to generate
 * @returns Array of slug suggestions
 */
export function generateSlugSuggestions(name: string, count: number = 3): string[] {
  if (!name) return []

  const baseSlug = generateSlug(name)
  const suggestions: string[] = []

  // Add the base slug
  if (isValidSlug(baseSlug)) {
    suggestions.push(baseSlug)
  }

  // Generate variations
  const words = name.toLowerCase().split(/\s+/)
  
  if (words.length > 1) {
    // Try first word + last word
    const firstLast = generateSlug(`${words[0]} ${words[words.length - 1]}`)
    if (isValidSlug(firstLast) && !suggestions.includes(firstLast)) {
      suggestions.push(firstLast)
    }

    // Try first 2 words
    if (words.length >= 2) {
      const firstTwo = generateSlug(`${words[0]} ${words[1]}`)
      if (isValidSlug(firstTwo) && !suggestions.includes(firstTwo)) {
        suggestions.push(firstTwo)
      }
    }

    // Try initials + last word
    if (words.length >= 2) {
      const initials = words.slice(0, -1).map(w => w.charAt(0)).join('')
      const initialsLast = generateSlug(`${initials} ${words[words.length - 1]}`)
      if (isValidSlug(initialsLast) && !suggestions.includes(initialsLast)) {
        suggestions.push(initialsLast)
      }
    }
  }

  // Fill remaining with numbered variants
  while (suggestions.length < count && suggestions.length < 10) {
    const numbered = `${baseSlug || 'item'}-${suggestions.length + 1}`
    if (isValidSlug(numbered)) {
      suggestions.push(numbered)
    } else {
      break
    }
  }

  return suggestions.slice(0, count)
}

/**
 * Convert between slug and UUID for backward compatibility
 */
export type EntityIdentifier = {
  isSlug: boolean
  value: string
}

/**
 * Parse an entity identifier to determine if it's a slug or UUID
 * @param identifier - The identifier to parse
 * @returns EntityIdentifier object
 */
export function parseEntityIdentifier(identifier: string): EntityIdentifier {
  if (!identifier) {
    throw new Error('Identifier is required')
  }

  return {
    isSlug: !isUUID(identifier),
    value: identifier
  }
}