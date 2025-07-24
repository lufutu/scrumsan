/**
 * Test script for pending invitations system
 * Run this to verify the pending invitations functionality works correctly
 */

const BASE_URL = 'http://localhost:3000'

async function testPendingInvitations() {
  console.log('🧪 Testing Pending Invitations System...\n')

  // You'll need to replace these with actual values from your app
  const organizationId = 'your-org-id-here'
  const testEmail = 'test@example.com'
  
  try {
    // Test 1: Fetch pending invitations
    console.log('1️⃣ Testing: Fetch pending invitations')
    const response1 = await fetch(`${BASE_URL}/api/organizations/${organizationId}/invitations`)
    
    if (response1.ok) {
      const data = await response1.json()
      console.log('✅ Successfully fetched pending invitations:', data.count, 'invitations')
    } else {
      console.log('❌ Failed to fetch pending invitations:', response1.status)
    }

    // Test 2: Try to invite the same email twice (should get better error message)
    console.log('\n2️⃣ Testing: Duplicate invitation handling')
    const inviteData = {
      email: testEmail,
      role: 'member'
    }

    // First invitation
    const response2a = await fetch(`${BASE_URL}/api/organizations/${organizationId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inviteData)
    })

    if (response2a.ok) {
      console.log('✅ First invitation sent successfully')
    } else {
      const error = await response2a.json()
      console.log('ℹ️ First invitation result:', error.error)
    }

    // Second invitation (should get helpful error)
    const response2b = await fetch(`${BASE_URL}/api/organizations/${organizationId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inviteData)
    })

    if (!response2b.ok) {
      const error = await response2b.json()
      console.log('✅ Got expected duplicate error:', error.error)
      
      if (error.error.includes('Pending Invitations tab')) {
        console.log('✅ Error message includes guidance about Pending Invitations tab')
      }
    }

    console.log('\n🎉 Test completed! Check your team management page for the new "Invitations" tab.')
    console.log('📋 Features to test manually:')
    console.log('   - View pending invitations in the new tab')
    console.log('   - Resend invitations with new expiry dates')
    console.log('   - Cancel pending invitations')
    console.log('   - Copy invitation links to clipboard')
    console.log('   - See expiry status and countdown')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Instructions for running the test
console.log('📝 Instructions:')
console.log('1. Update organizationId and testEmail variables above')
console.log('2. Make sure your app is running on localhost:3000')
console.log('3. Run: node test-pending-invitations.js')
console.log('4. Check the team management page for the new Invitations tab\n')

// Uncomment the line below to run the test
// testPendingInvitations()