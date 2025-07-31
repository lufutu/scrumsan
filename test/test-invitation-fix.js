// Simple test to verify the invitation system is working
// Run this in the browser console on your team management page

async function testInvitationSystem() {
  const organizationId = '5739525e-b5a5-43c2-9c2f-e64066fedea1';
  const testEmail = 'test-invitation@example.com';
  
  console.log('🧪 Testing invitation system...');
  console.log(`Organization ID: ${organizationId}`);
  console.log(`Test email: ${testEmail}`);
  console.log();
  
  try {
    const response = await fetch(`/api/organizations/${organizationId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail,
        role: 'member',
        jobTitle: 'Test User',
        workingHoursPerWeek: 40,
      }),
    });
    
    console.log(`Response status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Invitation created successfully!');
      console.log('Response data:', data);
      
      if (data.status === 'invited') {
        console.log('🎉 Invitation system is working!');
        console.log(`Invitation sent to: ${data.email}`);
        console.log(`Role: ${data.role}`);
        console.log(`Expires at: ${data.expiresAt}`);
      } else {
        console.log('✅ User was added directly (they already exist)');
      }
    } else {
      const errorData = await response.json();
      console.log('❌ Error creating invitation:');
      console.log('Error details:', errorData);
      
      if (response.status === 409) {
        console.log('💡 This might be because an invitation already exists for this email');
      }
    }
    
  } catch (error) {
    console.log('❌ Network error:');
    console.log(error);
  }
}

// Run the test
testInvitationSystem();