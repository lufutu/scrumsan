/**
 * Password validation utility
 */

interface PasswordValidation {
  isValid: boolean
  errors: string[]
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = []

  // Minimum length
  if (password.length < 8) {
    errors.push('Must be at least 8 characters long')
  }

  // Must contain at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Must contain at least one uppercase letter')
  }

  // Must contain at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Must contain at least one lowercase letter')
  }

  // Must contain at least one number
  if (!/\d/.test(password)) {
    errors.push('Must contain at least one number')
  }

  // Must contain at least one special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Must contain at least one special character (!@#$%^&*...)')
  }

  // No common patterns
  const commonPatterns = [
    'password',
    '12345',
    'qwerty',
    'admin',
    'user',
    'test',
  ]

  for (const pattern of commonPatterns) {
    if (password.toLowerCase().includes(pattern)) {
      errors.push(`Cannot contain common patterns like "${pattern}"`)
      break
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Generate a password strength score (0-100)
 */
export function getPasswordStrength(password: string): number {
  let score = 0

  // Length bonus
  score += Math.min(password.length * 2, 20)

  // Character variety bonus
  if (/[a-z]/.test(password)) score += 10
  if (/[A-Z]/.test(password)) score += 10
  if (/\d/.test(password)) score += 10
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 15

  // Length variety bonus
  if (password.length >= 12) score += 10
  if (password.length >= 16) score += 10

  // Penalty for common patterns
  const commonPatterns = ['password', '12345', 'qwerty', 'admin', 'user', 'test']
  for (const pattern of commonPatterns) {
    if (password.toLowerCase().includes(pattern)) {
      score -= 20
      break
    }
  }

  // Bonus for non-repeating characters
  const uniqueChars = new Set(password.toLowerCase()).size
  if (uniqueChars / password.length > 0.7) {
    score += 10
  }

  return Math.max(0, Math.min(100, score))
}

/**
 * Get password strength label
 */
export function getPasswordStrengthLabel(score: number): {
  label: string
  color: string
} {
  if (score >= 80) {
    return { label: 'Very Strong', color: 'text-green-600' }
  } else if (score >= 60) {
    return { label: 'Strong', color: 'text-green-500' }
  } else if (score >= 40) {
    return { label: 'Good', color: 'text-yellow-600' }
  } else if (score >= 20) {
    return { label: 'Fair', color: 'text-orange-600' }
  } else {
    return { label: 'Weak', color: 'text-red-600' }
  }
}