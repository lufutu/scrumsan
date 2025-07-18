import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { syncCurrentUser, syncUserFromSupabase, bulkSyncUsers } from '@/lib/user-sync'
import { z } from 'zod'

const syncUserSchema = z.object({
  userId: z.string().uuid().optional(),
  force: z.boolean().optional().default(false)
})

const bulkSyncSchema = z.object({
  limit: z.number().min(1).max(1000).optional().default(100)
})

// POST /api/auth/sync - Sync current user or specific user
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    await getCurrentUser(supabase) // Verify authentication
    
    const body = await req.json()
    const { userId } = syncUserSchema.parse(body)
    
    if (userId) {
      // Sync specific user (admin only for now)
      // TODO: Add admin role check
      await syncUserFromSupabase(userId)
      return NextResponse.json({ 
        success: true, 
        message: `User ${userId} synced successfully` 
      })
    } else {
      // Sync current user
      await syncCurrentUser()
      return NextResponse.json({ 
        success: true, 
        message: 'Current user synced successfully' 
      })
    }
  } catch (error: unknown) {
    console.error('Error syncing user:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to sync user'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

// PUT /api/auth/sync - Bulk sync users
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()
    await getCurrentUser(supabase) // Verify authentication
    
    // TODO: Add admin role check for bulk operations
    
    const body = await req.json()
    const { limit } = bulkSyncSchema.parse(body)
    
    const syncedCount = await bulkSyncUsers(limit)
    
    return NextResponse.json({ 
      success: true, 
      message: `Bulk sync completed. ${syncedCount} users synced.`,
      syncedCount 
    })
  } catch (error: unknown) {
    console.error('Error in bulk sync:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to bulk sync users'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

// GET /api/auth/sync - Check sync status
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const currentUser = await getCurrentUser(supabase)
    
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') || currentUser.id
    
    // Import here to avoid circular dependency
    const { userNeedsSync } = await import('@/lib/user-sync')
    const needsSync = await userNeedsSync(userId)
    
    return NextResponse.json({ 
      userId,
      needsSync,
      message: needsSync ? 'User needs sync' : 'User is up to date'
    })
  } catch (error: unknown) {
    console.error('Error checking sync status:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to check sync status'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}