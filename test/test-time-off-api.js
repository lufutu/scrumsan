/**
 * Test script for Time-off Management API endpoints
 * 
 * This script tests the CRUD operations for time-off entries:
 * - GET /api/organizations/[id]/members/[memberId]/time-off
 * - POST /api/organizations/[id]/members/[memberId]/time-off
 * - GET /api/organizations/[id]/members/[memberId]/time-off/[entryId]
 * - PUT /api/organizations/[id]/members/[memberId]/time-off/[entryId]
 * - DELETE /api/organizations/[id]/members/[memberId]/time-off/[entryId]
 */

const BASE_URL = 'http://localhost:3000'

// Test data
const testData = {
  organizationId: '550e8400-e29b-41d4-a716-446655440000', // Replace with actual org ID
  memberId: '550e8400-e29b-41d4-a716-446655440001', // Replace with actual member ID
  timeOffEntry: {
    type: 'vacation',
    startDate: new Date('2024-12-01').toISOString(),
    endDate: new Date('2024-12-05').toISOString(),
    description: 'Holiday vacation'
  }
}

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        // Add authentication headers here if needed
        ...options.headers
      },
      ...options
    })
    
    const data = await response.json()
    
    console.log(`${options.method || 'GET'} ${url}`)
    console.log(`Status: ${response.status}`)
    console.log('Response:', JSON.stringify(data, null, 2))
    console.log('---')
    
    return { response, data }
  } catch (error) {
    console.error(`Error making request to ${url}:`, error)
    return { error }
  }
}

async function testTimeOffAPI() {
  const { organizationId, memberId, timeOffEntry } = testData
  const baseUrl = `${BASE_URL}/api/organizations/${organizationId}/members/${memberId}/time-off`
  
  console.log('Testing Time-off Management API')
  console.log('================================\n')
  
  // Test 1: GET time-off entries (should return empty list initially)
  console.log('1. Testing GET time-off entries')
  const getResult1 = await makeRequest(baseUrl)
  
  // Test 2: POST create time-off entry
  console.log('2. Testing POST create time-off entry')
  const postResult = await makeRequest(baseUrl, {
    method: 'POST',
    body: JSON.stringify(timeOffEntry)
  })
  
  let createdEntryId = null
  if (postResult.data && postResult.data.id) {
    createdEntryId = postResult.data.id
  }
  
  // Test 3: GET time-off entries (should now include the created entry)
  console.log('3. Testing GET time-off entries after creation')
  const getResult2 = await makeRequest(baseUrl)
  
  // Test 4: GET specific time-off entry
  if (createdEntryId) {
    console.log('4. Testing GET specific time-off entry')
    const getSpecificResult = await makeRequest(`${baseUrl}/${createdEntryId}`)
  }
  
  // Test 5: PUT update time-off entry
  if (createdEntryId) {
    console.log('5. Testing PUT update time-off entry')
    const updateData = {
      description: 'Updated holiday vacation',
      type: 'paid_time_off'
    }
    const putResult = await makeRequest(`${baseUrl}/${createdEntryId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    })
  }
  
  // Test 6: Test validation errors
  console.log('6. Testing validation errors')
  const invalidData = {
    type: 'invalid_type',
    startDate: '2024-12-05',
    endDate: '2024-12-01', // End date before start date
    description: 'A'.repeat(1001) // Too long description
  }
  const validationResult = await makeRequest(baseUrl, {
    method: 'POST',
    body: JSON.stringify(invalidData)
  })
  
  // Test 7: Test filtering
  console.log('7. Testing filtering by status')
  const filterResult = await makeRequest(`${baseUrl}?status=pending&limit=5`)
  
  // Test 8: DELETE time-off entry
  if (createdEntryId) {
    console.log('8. Testing DELETE time-off entry')
    const deleteResult = await makeRequest(`${baseUrl}/${createdEntryId}`, {
      method: 'DELETE'
    })
  }
  
  // Test 9: Verify deletion
  console.log('9. Testing GET time-off entries after deletion')
  const getResult3 = await makeRequest(baseUrl)
  
  console.log('Time-off API testing completed!')
}

// Test edge cases
async function testEdgeCases() {
  const { organizationId, memberId } = testData
  const baseUrl = `${BASE_URL}/api/organizations/${organizationId}/members/${memberId}/time-off`
  
  console.log('\nTesting Edge Cases')
  console.log('==================\n')
  
  // Test overlapping time-off entries
  console.log('1. Testing overlapping time-off entries')
  
  // Create first entry
  const entry1 = {
    type: 'vacation',
    startDate: new Date('2024-12-10').toISOString(),
    endDate: new Date('2024-12-15').toISOString(),
    description: 'First vacation'
  }
  
  const createResult1 = await makeRequest(baseUrl, {
    method: 'POST',
    body: JSON.stringify(entry1)
  })
  
  // Try to create overlapping entry
  const entry2 = {
    type: 'sick_leave',
    startDate: new Date('2024-12-12').toISOString(),
    endDate: new Date('2024-12-18').toISOString(),
    description: 'Overlapping sick leave'
  }
  
  const createResult2 = await makeRequest(baseUrl, {
    method: 'POST',
    body: JSON.stringify(entry2)
  })
  
  // Clean up
  if (createResult1.data && createResult1.data.id) {
    await makeRequest(`${baseUrl}/${createResult1.data.id}`, {
      method: 'DELETE'
    })
  }
}

// Test invalid IDs
async function testInvalidIds() {
  console.log('\nTesting Invalid IDs')
  console.log('===================\n')
  
  const invalidOrgId = 'invalid-uuid'
  const invalidMemberId = 'invalid-uuid'
  const invalidEntryId = 'invalid-uuid'
  
  // Test invalid organization ID
  console.log('1. Testing invalid organization ID')
  await makeRequest(`${BASE_URL}/api/organizations/${invalidOrgId}/members/${testData.memberId}/time-off`)
  
  // Test invalid member ID
  console.log('2. Testing invalid member ID')
  await makeRequest(`${BASE_URL}/api/organizations/${testData.organizationId}/members/${invalidMemberId}/time-off`)
  
  // Test invalid entry ID
  console.log('3. Testing invalid entry ID')
  await makeRequest(`${BASE_URL}/api/organizations/${testData.organizationId}/members/${testData.memberId}/time-off/${invalidEntryId}`)
}

// Run all tests
async function runAllTests() {
  try {
    await testTimeOffAPI()
    await testEdgeCases()
    await testInvalidIds()
  } catch (error) {
    console.error('Test execution failed:', error)
  }
}

// Check if running directly
if (typeof require !== 'undefined' && require.main === module) {
  console.log('Note: Update the test data with actual organization and member IDs before running')
  console.log('Also ensure you have proper authentication setup\n')
  
  // Uncomment the line below to run tests
  // runAllTests()
}

module.exports = {
  testTimeOffAPI,
  testEdgeCases,
  testInvalidIds,
  runAllTests
}