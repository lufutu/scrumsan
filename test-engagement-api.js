/**
 * Test script for Project Engagement Management API
 * 
 * This script tests the engagement endpoints to ensure they work correctly.
 * Run with: node test-engagement-api.js
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Mock data for testing
const testData = {
  organizationId: '550e8400-e29b-41d4-a716-446655440000', // Replace with actual org ID
  memberId: '550e8400-e29b-41d4-a716-446655440001', // Replace with actual member ID
  projectId: '550e8400-e29b-41d4-a716-446655440002', // Replace with actual project ID
}

async function testEngagementAPI() {
  console.log('🧪 Testing Project Engagement Management API...\n')

  try {
    // Test 1: GET engagements (should return empty array initially)
    console.log('1. Testing GET /api/organizations/[id]/members/[memberId]/engagements')
    const getResponse = await fetch(
      `${BASE_URL}/api/organizations/${testData.organizationId}/members/${testData.memberId}/engagements`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
    
    if (getResponse.ok) {
      const engagements = await getResponse.json()
      console.log('✅ GET engagements successful')
      console.log('   Engagements count:', engagements.engagements?.length || 0)
      console.log('   Summary:', engagements.summary)
    } else {
      console.log('❌ GET engagements failed:', getResponse.status, await getResponse.text())
    }

    // Test 2: POST new engagement
    console.log('\n2. Testing POST /api/organizations/[id]/members/[memberId]/engagements')
    const newEngagement = {
      projectId: testData.projectId,
      role: 'Developer',
      hoursPerWeek: 20,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    }

    const postResponse = await fetch(
      `${BASE_URL}/api/organizations/${testData.organizationId}/members/${testData.memberId}/engagements`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newEngagement),
      }
    )

    let createdEngagementId = null
    if (postResponse.ok) {
      const createdEngagement = await postResponse.json()
      createdEngagementId = createdEngagement.id
      console.log('✅ POST engagement successful')
      console.log('   Created engagement ID:', createdEngagementId)
      console.log('   Hours per week:', createdEngagement.hoursPerWeek)
    } else {
      console.log('❌ POST engagement failed:', postResponse.status, await postResponse.text())
    }

    // Test 3: PUT update engagement (only if creation was successful)
    if (createdEngagementId) {
      console.log('\n3. Testing PUT /api/organizations/[id]/members/[memberId]/engagements/[engagementId]')
      const updateData = {
        role: 'Senior Developer',
        hoursPerWeek: 25,
      }

      const putResponse = await fetch(
        `${BASE_URL}/api/organizations/${testData.organizationId}/members/${testData.memberId}/engagements/${createdEngagementId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        }
      )

      if (putResponse.ok) {
        const updatedEngagement = await putResponse.json()
        console.log('✅ PUT engagement successful')
        console.log('   Updated role:', updatedEngagement.role)
        console.log('   Updated hours:', updatedEngagement.hoursPerWeek)
      } else {
        console.log('❌ PUT engagement failed:', putResponse.status, await putResponse.text())
      }

      // Test 4: DELETE engagement
      console.log('\n4. Testing DELETE /api/organizations/[id]/members/[memberId]/engagements/[engagementId]')
      const deleteResponse = await fetch(
        `${BASE_URL}/api/organizations/${testData.organizationId}/members/${testData.memberId}/engagements/${createdEngagementId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (deleteResponse.ok) {
        const deleteResult = await deleteResponse.json()
        console.log('✅ DELETE engagement successful')
        console.log('   Deleted engagement:', deleteResult.deletedEngagement.id)
      } else {
        console.log('❌ DELETE engagement failed:', deleteResponse.status, await deleteResponse.text())
      }
    }

    // Test 5: Validation tests
    console.log('\n5. Testing validation errors')
    
    // Test invalid hours
    const invalidHoursResponse = await fetch(
      `${BASE_URL}/api/organizations/${testData.organizationId}/members/${testData.memberId}/engagements`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: testData.projectId,
          hoursPerWeek: 200, // Invalid: exceeds 168 hours per week
          startDate: new Date().toISOString(),
        }),
      }
    )

    if (invalidHoursResponse.status === 400) {
      console.log('✅ Validation error for invalid hours handled correctly')
    } else {
      console.log('❌ Validation error for invalid hours not handled:', invalidHoursResponse.status)
    }

    // Test invalid UUID
    const invalidUUIDResponse = await fetch(
      `${BASE_URL}/api/organizations/invalid-uuid/members/${testData.memberId}/engagements`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (invalidUUIDResponse.status === 400) {
      console.log('✅ Validation error for invalid UUID handled correctly')
    } else {
      console.log('❌ Validation error for invalid UUID not handled:', invalidUUIDResponse.status)
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
  }

  console.log('\n🏁 Engagement API tests completed!')
}

// Run the tests
testEngagementAPI()