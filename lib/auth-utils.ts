import { User } from '@supabase/supabase-js'
import { prisma } from './prisma'
import { logger } from './logger'

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

    // First, check if a user with this email already exists (migration case)
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: user.email! }
    })

    if (existingUserByEmail) {
      // User exists with same email but different ID (migration from cloud to self-hosted)
      if (existingUserByEmail.id !== user.id) {
        logger.info(`Migrating user ${user.email} from ID ${existingUserByEmail.id} to ${user.id}`)
        
        // Update the existing user's ID to match the new Supabase auth ID
        const updatedUser = await prisma.user.update({
          where: { email: user.email! },
          data: {
            id: user.id,  // Update to new Supabase ID
            fullName,
            avatarUrl,
          }
        })
        
        return updatedUser
      }
      
      // User exists with same ID and email, just update metadata
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          fullName,
          avatarUrl,
        }
      })
      
      return updatedUser
    }

    // No existing user, create new one
    const dbUser = await prisma.user.create({
      data: {
        id: user.id,
        email: user.email!,
        fullName,
        avatarUrl,
      }
    })
    
    return dbUser
  } catch (error: any) {
    // If it's a database connection error, log it but don't throw
    if (error.code === 'P1001') {
      logger.error('Database connection error in ensureUserExists:', error.message)
      // Return a minimal user object to allow the app to continue
      return {
        id: user.id,
        email: user.email!,
        fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown User',
        avatarUrl: user.user_metadata?.avatar_url || null
      }
    }
    logger.error('Error ensuring user exists:', error)
    throw new Error('Failed to sync user data')
  }
}

/**
 * Gets the current authenticated user from Supabase and ensures they exist in our database
 */
export async function getCurrentUser(supabase: any) {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError) {
    logger.error('Supabase auth error:', userError)
    throw new Error(`Authentication failed: ${userError.message}`)
  }
  
  if (!user) {
    logger.error('No user found in session')
    throw new Error('No authenticated user found')
  }
  
  // Ensure user exists in our database
  await ensureUserExists(user)
  
  return user
}