// Debug authentication and member lookup
// Run this in the browser console to test authentication

async function debugAuth() {
  const organizationId = '5739525e-b5a5-43c2-9c2f-e64066fedea1';
  
  console.log('=== Authentication Debug ===');
  
  // Test 1: Check if we can access the API at all
  try {
    console.log('1. Testing basic API access...');
    const response = await fetch(`/api/organizations/${organizationId}/members`);
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.status === 401) {
      console.error('❌ Authentication failed - user not logged in');
      return;
    }
    
    if (response.status === 403) {
      console.error('❌ Authorization failed - user not a member of organization');
      const errorData = await response.json();
      console.error('Error details:', errorData);
      return;
    }
    
    if (response.status === 200) {
      console.log('✅ API access successful');
      const data = await response.json();
      console.log('Response data:', data);
    } else {
      console.error('❌ Unexpected status:', response.status);
      const errorData = await response.text();
      console.error('Error details:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Network error:', error);
  }
  
  // Test 2: Check current user from Supabase
  console.log('\n2. Checking Supabase user...');
  try {
    // This assumes Supabase client is available globally
    if (typeof window !== 'undefined' && window.supabase) {
      const { data: { user }, error } = await window.supabase.auth.getUser();
      if (error) {
        console.error('❌ Supabase auth error:', error);
      } else if (user) {
        console.log('✅ Supabase user found:', {
          id: user.id,
          email: user.email,
        });
      } else {
        console.log('❌ No Supabase user found');
      }
    } else {
      console.log('⚠️ Supabase client not available in global scope');
    }
  } catch (error) {
    console.error('❌ Error checking Supabase user:', error);
  }
}

// Run the debug
debugAuth();