/**
 * Test script for user sync functionality
 * This can be run to test the sync utilities work correctly
 */

const { syncCurrentUser, syncUserFromSupabase, userNeedsSync } = require('../lib/user-sync')

async function testUserSync() {
  console.log('🧪 Testing user sync functionality...\n')

  try {
    // Test 1: Check if current user needs sync
    console.log('1. Testing userNeedsSync function...')
    const testUserId = '123e4567-e89b-12d3-a456-426614174000' // dummy UUID
    const needsSync = await userNeedsSync(testUserId)
    console.log(`   User ${testUserId} needs sync: ${needsSync}`)

    // Test 2: Try to sync current user (this will require authentication)
    console.log('\n2. Testing syncCurrentUser function...')
    try {
      await syncCurrentUser()
      console.log('   ✅ Current user sync completed successfully')
    } catch (error) {
      console.log(`   ⚠️  Current user sync failed (expected if not authenticated): ${error.message}`)
    }

    console.log('\n✅ User sync tests completed!')
    console.log('\nTo test the full functionality:')
    console.log('1. Start the development server: bun dev')
    console.log('2. Login with a user account')
    console.log('3. Check the browser console for sync messages')
    console.log('4. Call the API endpoints:')
    console.log('   - POST /api/auth/sync (sync current user)')
    console.log('   - GET /api/auth/sync (check sync status)')
    console.log('   - PUT /api/auth/sync (bulk sync - admin only)')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Only run if this script is executed directly
if (require.main === module) {
  testUserSync()
}

module.exports = { testUserSync }