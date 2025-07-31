/**
 * Test script for Timeline Events API endpoints
 * 
 * This script tests all CRUD operations for timeline events:
 * - GET /api/organizations/[id]/members/[memberId]/timeline
 * - POST /api/organizations/[id]/members/[memberId]/timeline
 * - PUT /api/organizations/[id]/members/[memberId]/timeline/[eventId]
 * - DELETE /api/organizations/[id]/members/[memberId]/timeline/[eventId]
 */

const BASE_URL = 'http://localhost:3000'

// Test data
const testData = {
  organizationId: '550e8400-e29b-41d4-a716-446655440000', // Replace with actual org ID
  memberId: '550e8400-e29b-41d4-a716-446655440001', // Replace with actual member ID
  timelineEvent: {
    eventName: 'Started at Company',
    eventDate: new Date().toISOString(),
    description: 'First day at the company'
  },
  updatedTimelineEvent: {
    eventName: 'Promoted to Senior Developer',
    eventDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    description: 'Received promotion to senior developer role'
  }
}

let createdEventId = null

async function makeRequest(url, options = {}) {
  try {
    console.log(`\n🔄 ${options.method || 'GET'} ${url}`)
    if (options.body) {
      console.log('📤 Request body:', JSON.stringify(JSON.parse(options.body), null, 2))
    }
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    })
    
    const data = await response.text()
    let jsonData
    try {
      jsonData = JSON.parse(data)
    } catch {
      jsonData = data
    }
    
    console.log(`📊 Status: ${response.status}`)
    console.log('📥 Response:', typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData, null, 2))
    
    return { response, data: jsonData }
  } catch (error) {
    console.error('❌ Request failed:', error.message)
    return { error }
  }
}

async function testGetTimelineEvents() {
  console.log('\n' + '='.repeat(50))
  console.log('🧪 Testing GET Timeline Events')
  console.log('='.repeat(50))
  
  const url = `${BASE_URL}/api/organizations/${testData.organizationId}/members/${testData.memberId}/timeline`
  const result = await makeRequest(url)
  
  if (result.response?.ok) {
    console.log('✅ GET timeline events successful')
    return result.data
  } else {
    console.log('❌ GET timeline events failed')
    return null
  }
}

async function testCreateTimelineEvent() {
  console.log('\n' + '='.repeat(50))
  console.log('🧪 Testing POST Timeline Event')
  console.log('='.repeat(50))
  
  const url = `${BASE_URL}/api/organizations/${testData.organizationId}/members/${testData.memberId}/timeline`
  const result = await makeRequest(url, {
    method: 'POST',
    body: JSON.stringify(testData.timelineEvent)
  })
  
  if (result.response?.ok) {
    console.log('✅ POST timeline event successful')
    createdEventId = result.data.id
    return result.data
  } else {
    console.log('❌ POST timeline event failed')
    return null
  }
}

async function testUpdateTimelineEvent() {
  if (!createdEventId) {
    console.log('⚠️ Skipping UPDATE test - no event ID available')
    return null
  }
  
  console.log('\n' + '='.repeat(50))
  console.log('🧪 Testing PUT Timeline Event')
  console.log('='.repeat(50))
  
  const url = `${BASE_URL}/api/organizations/${testData.organizationId}/members/${testData.memberId}/timeline/${createdEventId}`
  const result = await makeRequest(url, {
    method: 'PUT',
    body: JSON.stringify(testData.updatedTimelineEvent)
  })
  
  if (result.response?.ok) {
    console.log('✅ PUT timeline event successful')
    return result.data
  } else {
    console.log('❌ PUT timeline event failed')
    return null
  }
}

async function testDeleteTimelineEvent() {
  if (!createdEventId) {
    console.log('⚠️ Skipping DELETE test - no event ID available')
    return null
  }
  
  console.log('\n' + '='.repeat(50))
  console.log('🧪 Testing DELETE Timeline Event')
  console.log('='.repeat(50))
  
  const url = `${BASE_URL}/api/organizations/${testData.organizationId}/members/${testData.memberId}/timeline/${createdEventId}`
  const result = await makeRequest(url, {
    method: 'DELETE'
  })
  
  if (result.response?.ok) {
    console.log('✅ DELETE timeline event successful')
    return result.data
  } else {
    console.log('❌ DELETE timeline event failed')
    return null
  }
}

async function testValidationErrors() {
  console.log('\n' + '='.repeat(50))
  console.log('🧪 Testing Validation Errors')
  console.log('='.repeat(50))
  
  // Test invalid event data
  const invalidData = {
    eventName: '', // Empty name should fail
    eventDate: 'invalid-date', // Invalid date should fail
    description: 'x'.repeat(1001) // Too long description should fail
  }
  
  const url = `${BASE_URL}/api/organizations/${testData.organizationId}/members/${testData.memberId}/timeline`
  const result = await makeRequest(url, {
    method: 'POST',
    body: JSON.stringify(invalidData)
  })
  
  if (result.response?.status === 400) {
    console.log('✅ Validation errors handled correctly')
  } else {
    console.log('❌ Validation errors not handled properly')
  }
}

async function testInvalidIds() {
  console.log('\n' + '='.repeat(50))
  console.log('🧪 Testing Invalid IDs')
  console.log('='.repeat(50))
  
  // Test invalid organization ID
  const invalidOrgUrl = `${BASE_URL}/api/organizations/invalid-id/members/${testData.memberId}/timeline`
  const result1 = await makeRequest(invalidOrgUrl)
  
  if (result1.response?.status === 400) {
    console.log('✅ Invalid organization ID handled correctly')
  } else {
    console.log('❌ Invalid organization ID not handled properly')
  }
  
  // Test invalid member ID
  const invalidMemberUrl = `${BASE_URL}/api/organizations/${testData.organizationId}/members/invalid-id/timeline`
  const result2 = await makeRequest(invalidMemberUrl)
  
  if (result2.response?.status === 400) {
    console.log('✅ Invalid member ID handled correctly')
  } else {
    console.log('❌ Invalid member ID not handled properly')
  }
}

async function runAllTests() {
  console.log('🚀 Starting Timeline Events API Tests')
  console.log('📝 Note: Make sure to update organizationId and memberId in the test data')
  console.log('🔐 Note: Make sure you have proper authentication set up')
  
  try {
    // Test basic CRUD operations
    await testGetTimelineEvents()
    await testCreateTimelineEvent()
    await testUpdateTimelineEvent()
    await testGetTimelineEvents() // Get again to see the updated event
    await testDeleteTimelineEvent()
    await testGetTimelineEvents() // Get again to confirm deletion
    
    // Test error cases
    await testValidationErrors()
    await testInvalidIds()
    
    console.log('\n' + '='.repeat(50))
    console.log('🎉 All tests completed!')
    console.log('='.repeat(50))
    
  } catch (error) {
    console.error('💥 Test suite failed:', error)
  }
}

// Run the tests
runAllTests()