import { User } from '@supabase/supabase-js'
import { prisma } from './prisma'

/**
 * Ensures a Supabase Auth user exists in our Prisma database
 * This is needed because Supabase Auth users exist in auth.users but not in our users table
 */
export async function ensureUserExists(user: User) {
  try {
    // Handle different OAuth providers and extract name appropriately
    const fullName = user.user_metadata?.full_name || 
                     user.user_metadata?.name ||
                     user.user_metadata?.display_name ||
                     user.email?.split('@')[0] || 
                     'Unknown User'
    
    // Handle avatar URL from different providers
    const avatarUrl = user.user_metadata?.avatar_url || 
                      user.user_metadata?.picture ||
                      null

    const dbUser = await prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email!,
        fullName,
        avatarUrl,
      },
      update: {
        fullName,
        avatarUrl,
        // Update email in case it changed (though unlikely)
        email: user.email!,
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