#!/usr/bin/env node

/**
 * Test script for member removal functionality
 * Tests the API endpoints and basic functionality
 */

const BASE_URL = 'http://localhost:3000'

// Mock data for testing
const testData = {
  organizationId: '123e4567-e89b-12d3-a456-426614174000',
  memberId: '123e4567-e89b-12d3-a456-426614174001',
  currentUserId: '123e4567-e89b-12d3-a456-426614174002',
}

async function testMemberBoardsEndpoint() {
  console.log('🧪 Testing member boards endpoint...')
  
  try {
    const response = await fetch(
      `${BASE_URL}/api/organizations/${testData.organizationId}/members/${testData.memberId}/boards`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    console.log('Status:', response.status)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Member boards endpoint working')
      console.log('Response structure:', {
        boards: Array.isArray(data.boards),
        targetMember: !!data.targetMember,
        canRemoveFrom: typeof data.canRemoveFrom === 'number',
      })
    } else {
      const error = await response.json()
      console.log('❌ Member boards endpoint failed:', error.error)
    }
  } catch (error) {
    console.log('❌ Network error:', error.message)
  }
}

async function testMemberRemovalEndpoint() {
  console.log('🧪 Testing member removal endpoint...')
  
  const testPayload = {
    boardsToRemoveFrom: ['123e4567-e89b-12d3-a456-426614174003'],
    isVoluntaryLeave: false,
  }

  try {
    const response = await fetch(
      `${BASE_URL}/api/organizations/${testData.organizationId}/members/${testData.memberId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload),
      }
    )

    console.log('Status:', response.status)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Member removal endpoint working')
      console.log('Response structure:', {
        message: !!data.message,
        removedMember: !!data.removedMember,
        cleanupSummary: !!data.cleanupSummary,
        boardsRemovedFrom: Array.isArray(data.boardsRemovedFrom),
      })
    } else {
      const error = await response.json()
      console.log('❌ Member removal endpoint failed:', error.error)
    }
  } catch (error) {
    console.log('❌ Network error:', error.message)
  }
}

async function testOwnershipTransfer() {
  console.log('🧪 Testing ownership transfer scenario...')
  
  const testPayload = {
    transferOwnership: {
      newOwnerId: '123e4567-e89b-12d3-a456-426614174004',
    },
    isVoluntaryLeave: true,
  }

  try {
    const response = await fetch(
      `${BASE_URL}/api/organizations/${testData.organizationId}/members/${testData.memberId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload),
      }
    )

    console.log('Status:', response.status)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Ownership transfer endpoint working')
      console.log('Response structure:', {
        message: !!data.message,
        ownershipTransferred: !!data.ownershipTransferred,
      })
    } else {
      const error = await response.json()
      console.log('❌ Ownership transfer failed:', error.error)
    }
  } catch (error) {
    console.log('❌ Network error:', error.message)
  }
}

async function runTests() {
  console.log('🚀 Starting member removal functionality tests...\n')
  
  await testMemberBoardsEndpoint()
  console.log('')
  
  await testMemberRemovalEndpoint()
  console.log('')
  
  await testOwnershipTransfer()
  console.log('')
  
  console.log('✨ Tests completed!')
  console.log('\n📝 Manual testing checklist:')
  console.log('- [ ] Member removal dialog opens correctly')
  console.log('- [ ] Board selection works properly')
  console.log('- [ ] Ownership transfer UI appears for owners')
  console.log('- [ ] Confirmation dialog shows correct information')
  console.log('- [ ] Leave organization button works for current user')
  console.log('- [ ] Proper error handling for various scenarios')
  console.log('- [ ] Loading states work correctly')
  console.log('- [ ] Success messages and redirects work')
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error)
}

module.exports = {
  testMemberBoardsEndpoint,
  testMemberRemovalEndpoint,
  testOwnershipTransfer,
}