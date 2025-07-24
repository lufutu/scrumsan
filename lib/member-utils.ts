/**
 * Utility functions for safely accessing member data
 */

export interface SafeUser {
  id?: string
  fullName?: string | null
  email?: string
  avatarUrl?: string | null
}

export interface SafeMember {
  id: string
  user?: SafeUser | null
  role: string
  [key: string]: any
}

/**
 * Safely get user display name with fallback
 */
export function getUserDisplayName(user?: SafeUser | null): string {
  if (!user) return 'Unknown User'
  return user.fullName || user.email || 'Unknown User'
}

/**
 * Safely get user email with fallback
 */
export function getUserEmail(user?: SafeUser | null): string {
  if (!user) return 'No email'
  return user.email || 'No email'
}

/**
 * Safely get user avatar URL
 */
export function getUserAvatarUrl(user?: SafeUser | null): string | undefined {
  if (!user) return undefined
  return user.avatarUrl || undefined
}

/**
 * Safely get user initials for avatar fallback
 */
export function getUserInitials(user?: SafeUser | null): string {
  if (!user) return 'U'
  
  if (user.fullName) {
    return user.fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  
  if (user.email) {
    return user.email[0].toUpperCase()
  }
  
  return 'U'
}

/**
 * Safely get member display name
 */
export function getMemberDisplayName(member?: SafeMember | null): string {
  if (!member) return 'Unknown Member'
  return getUserDisplayName(member.user)
}

/**
 * Safely get member email
 */
export function getMemberEmail(member?: SafeMember | null): string {
  if (!member) return 'No email'
  return getUserEmail(member.user)
}

/**
 * Safely get member avatar URL
 */
export function getMemberAvatarUrl(member?: SafeMember | null): string | undefined {
  if (!member) return undefined
  return getUserAvatarUrl(member.user)
}

/**
 * Safely get member initials
 */
export function getMemberInitials(member?: SafeMember | null): string {
  if (!member) return 'U'
  return getUserInitials(member.user)
}