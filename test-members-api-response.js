/**
 * Test script to check if the members API is returning pendingInvitations
 */

const organizationId = '5739525e-b5a5-43c2-9c2f-e64066fedea1' // From your network log

async function testMembersAPI() {
    console.log('🧪 Testing Members API Response...\n')

    try {
        const response = await fetch(`http://localhost:3000/api/organizations/${organizationId}/members`)

        if (!response.ok) {
            console.error('❌ API Error:', response.status, response.statusText)
            return
        }

        const data = await response.json()

        console.log('✅ API Response Structure:')
        console.log('- Members count:', data.members?.length || 0)
        console.log('- Pending invitations count:', data.pendingInvitations?.length || 0)
        console.log('- Has pendingInvitations field:', 'pendingInvitations' in data)

        if (data.pendingInvitations && data.pendingInvitations.length > 0) {
            console.log('\n📧 Pending Invitations:')
            data.pendingInvitations.forEach((inv, index) => {
                console.log(`  ${index + 1}. ${inv.email} (${inv.role}) - Expires: ${inv.expiresAt}`)
            })
        } else {
            console.log('\n📭 No pending invitations found')
        }

        console.log('\n🔍 Full Response Keys:', Object.keys(data))

    } catch (error) {
        console.error('❌ Test failed:', error.message)
    }
}

console.log('📝 Instructions:')
console.log('1. Make sure your app is running on localhost:3000')
console.log('2. Run: node test-members-api-response.js')
console.log('3. Check if pendingInvitations field is present in the response\n')

// Uncomment to run the test
// testMembersAPI()