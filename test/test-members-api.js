// Simple test to verify the members API is working
// Run this in the browser console on your team management page

async function testMembersAPI() {
  const organizationId = '5739525e-b5a5-43c2-9c2f-e64066fedea1';
  
  try {
    console.log('Testing members API...');
    const response = await fetch(`/api/organizations/${organizationId}/members`);
    
    if (!response.ok) {
      console.error('API Error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('API Response:', data);
    console.log('Members array:', data.members);
    console.log('Number of members:', data.members?.length || 0);
    
    if (data.members && data.members.length > 0) {
      console.log('First member:', data.members[0]);
      console.log('Your user should be in this list');
    } else {
      console.log('No members found - this is the issue!');
    }
    
  } catch (error) {
    console.error('Network error:', error);
  }
}

// Run the test
testMembersAPI();