import { User } from '@supabase/supabase-js'
import { prisma } from './prisma'

/**
 * Ensures a Supabase Auth user exists in our Prisma database
 * This is needed because Supabase Auth users exist in auth.users but not in our users table
 */
export async function ensureUserExists(user: User) {
  try {
    const dbUser = await prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        fullName: user.user_metadata?.full_name || user.email || 'Unknown User',
        avatarUrl: user.user_metadata?.avatar_url || null,
      },
      update: {
        fullName: user.user_metadata?.full_name || user.email || 'Unknown User',
        avatarUrl: user.user_metadata?.avatar_url || null,
      }
    })
    
    return dbUser
  } catch (error) {
    console.error('Error ensuring user exists:', error)
    throw new Error('Failed to sync user data')
  }
}

/**
 * Gets the current authenticated user from Supabase and ensures they exist in our database
 */
export async function getCurrentUser(supabase: any) {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    throw new Error('Unauthorized')
  }
  
  // Ensure user exists in our database
  await ensureUserExists(user)
  
  return user
}