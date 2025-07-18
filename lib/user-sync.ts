import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export interface SupabaseUser {
  id: string
  email?: string
  user_metadata?: {
    full_name?: string
    avatar_url?: string
    name?: string
  }
  raw_user_meta_data?: {
    full_name?: string
    avatar_url?: string
    name?: string
  }
  phone?: string
  email_confirmed_at?: string
  last_sign_in_at?: string
  created_at?: string
  updated_at?: string
}

/**
 * Sync a user from Supabase auth to our Prisma database
 */
export async function syncUserFromSupabase(supabaseUserId: string): Promise<void> {
  try {
    const supabase = await createClient()
    
    // Get user from Supabase auth
    const { data: authUser, error } = await supabase.auth.admin.getUserById(supabaseUserId)
    
    if (error || !authUser.user) {
      console.error('Failed to fetch user from Supabase:', error)
      return
    }

    const user = authUser.user as SupabaseUser
    
    // Extract user data
    const userData = {
      id: user.id,
      email: user.email || null,
      fullName: user.user_metadata?.full_name || 
                user.raw_user_meta_data?.full_name || 
                user.user_metadata?.name ||
                user.raw_user_meta_data?.name ||
                null,
      avatarUrl: user.user_metadata?.avatar_url || 
                 user.raw_user_meta_data?.avatar_url || 
                 null,
      phone: user.phone || null,
      emailConfirmed: !!user.email_confirmed_at,
      lastSignIn: user.last_sign_in_at ? new Date(user.last_sign_in_at) : null,
      authSyncedAt: new Date()
    }

    // Upsert user in our database
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: userData.email,
        fullName: userData.fullName,
        avatarUrl: userData.avatarUrl,
        phone: userData.phone,
        emailConfirmed: userData.emailConfirmed,
        lastSignIn: userData.lastSignIn,
        authSyncedAt: userData.authSyncedAt,
        updatedAt: new Date()
      },
      create: userData
    })

    console.log(`User ${user.id} synced successfully`)
  } catch (error) {
    console.error('Error syncing user:', error)
    throw error
  }
}

/**
 * Sync the current authenticated user
 */
export async function syncCurrentUser(): Promise<void> {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      throw new Error('No authenticated user found')
    }

    await syncUserFromSupabase(user.id)
  } catch (error) {
    console.error('Error syncing current user:', error)
    throw error
  }
}

/**
 * Bulk sync users from Supabase to Prisma
 * This can be used for initial migration or periodic sync
 */
export async function bulkSyncUsers(limit = 100): Promise<number> {
  try {
    const supabase = await createClient()
    
    let page = 1
    let totalSynced = 0
    
    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page: page,
        perPage: limit
      })
      
      if (error) {
        console.error('Error fetching users from Supabase:', error)
        break
      }
      
      if (!data.users || data.users.length === 0) {
        break
      }
      
      // Sync each user
      for (const user of data.users) {
        try {
          await syncUserFromSupabase(user.id)
          totalSynced++
        } catch (error) {
          console.error(`Failed to sync user ${user.id}:`, error)
        }
      }
      
      page++
      
      // If we got fewer users than the limit, we've reached the end
      if (data.users.length < limit) {
        break
      }
    }
    
    console.log(`Bulk sync completed. ${totalSynced} users synced.`)
    return totalSynced
  } catch (error) {
    console.error('Error in bulk sync:', error)
    throw error
  }
}

/**
 * Check if a user needs to be synced (hasn't been synced recently)
 */
export async function userNeedsSync(userId: string, maxAgeHours = 24): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { authSyncedAt: true }
    })
    
    if (!user || !user.authSyncedAt) {
      return true // User doesn't exist or has never been synced
    }
    
    const maxAge = maxAgeHours * 60 * 60 * 1000 // Convert to milliseconds
    const timeSinceSync = Date.now() - user.authSyncedAt.getTime()
    
    return timeSinceSync > maxAge
  } catch (error) {
    console.error('Error checking if user needs sync:', error)
    return true // Default to sync on error
  }
}