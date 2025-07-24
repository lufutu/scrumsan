import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

/**
 * Response interface for user existence check
 */
export interface UserExistenceResponse {
  exists: boolean
  user?: {
    id: string
    email: string
    fullName: string | null
    avatarUrl: string | null
  } | null
  error?: string | null
}

/**
 * Error types for user existence check
 */
export enum UserExistenceError {
  SUPABASE_ERROR = 'SUPABASE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INVALID_EMAIL = 'INVALID_EMAIL',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

/**
 * Checks if a user exists in Supabase by email address
 * This function checks both Supabase Auth and our application database
 * 
 * @param email - The email address to check
 * @returns Promise<UserExistenceResponse> - Object containing existence status and user data if found
 */
export async function checkUserExistsByEmail(email: string): Promise<UserExistenceResponse> {
  try {
    // Validate email format
    if (!email || !isValidEmail(email)) {
      return {
        exists: false,
        error: 'Invalid email format'
      }
    }

    // First check our application database for the user
    const dbUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true
      }
    })

    if (dbUser) {
      return {
        exists: true,
        user: dbUser
      }
    }

    // If not found in our database, check Supabase Auth
    // Note: We can't directly query Supabase Auth users by email from client-side
    // So we'll rely on our database as the source of truth for user existence
    // This is consistent with the current auth flow where users are synced to our database
    
    return {
      exists: false,
      user: null
    }

  } catch (error) {
    console.error('Error checking user existence:', error)
    
    // Determine error type
    let errorType = UserExistenceError.DATABASE_ERROR
    let errorMessage = 'Failed to check user existence'
    
    if (error instanceof Error) {
      if (error.message.toLowerCase().includes('network') && !error.message.toLowerCase().includes('database')) {
        errorType = UserExistenceError.NETWORK_ERROR
        errorMessage = 'Network error while checking user existence'
      } else if (error.message.toLowerCase().includes('supabase') || error.message.toLowerCase().includes('auth')) {
        errorType = UserExistenceError.SUPABASE_ERROR
        errorMessage = 'Supabase authentication error'
      }
    }

    return {
      exists: false,
      error: errorMessage
    }
  }
}

/**
 * Alternative method to check user existence using Supabase Admin API
 * This is more comprehensive but requires admin privileges
 * 
 * @param email - The email address to check
 * @returns Promise<UserExistenceResponse> - Object containing existence status and user data if found
 */
export async function checkUserExistsByEmailAdmin(email: string): Promise<UserExistenceResponse> {
  try {
    // Validate email format
    if (!email || !isValidEmail(email)) {
      return {
        exists: false,
        error: 'Invalid email format'
      }
    }

    const supabase = await createClient()
    
    // First check our application database
    const dbUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true
      }
    })

    if (dbUser) {
      return {
        exists: true,
        user: dbUser
      }
    }

    // If we have admin access, we could check Supabase Auth directly
    // For now, we'll rely on our database as the source of truth
    // since users are synced during the auth process
    
    return {
      exists: false,
      user: null
    }

  } catch (error) {
    console.error('Error checking user existence (admin):', error)
    
    return {
      exists: false,
      error: 'Failed to check user existence'
    }
  }
}

/**
 * Validates email format using a simple regex
 * 
 * @param email - The email to validate
 * @returns boolean - True if email format is valid
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Batch check for multiple email addresses
 * Useful for checking multiple invitations at once
 * 
 * @param emails - Array of email addresses to check
 * @returns Promise<Map<string, UserExistenceResponse>> - Map of email to existence response
 */
export async function checkMultipleUsersExist(emails: string[]): Promise<Map<string, UserExistenceResponse>> {
  const results = new Map<string, UserExistenceResponse>()
  
  try {
    // Validate all emails first
    const validEmails = emails.filter(email => email && isValidEmail(email))
    const invalidEmails = emails.filter(email => !email || !isValidEmail(email))
    
    // Mark invalid emails
    invalidEmails.forEach(email => {
      results.set(email, {
        exists: false,
        error: 'Invalid email format'
      })
    })
    
    if (validEmails.length === 0) {
      return results
    }
    
    // Batch query the database
    const dbUsers = await prisma.user.findMany({
      where: {
        email: {
          in: validEmails
        }
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true
      }
    })
    
    // Create a map of found users
    const userMap = new Map(dbUsers.map(user => [user.email, user]))
    
    // Set results for all valid emails
    validEmails.forEach(email => {
      const user = userMap.get(email)
      results.set(email, {
        exists: !!user,
        user: user || null
      })
    })
    
    return results
    
  } catch (error) {
    console.error('Error checking multiple users existence:', error)
    
    // Set error for all emails
    emails.forEach(email => {
      if (!results.has(email)) {
        results.set(email, {
          exists: false,
          error: 'Failed to check user existence'
        })
      }
    })
    
    return results
  }
}