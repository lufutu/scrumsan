import { createClient } from './supabase/client';

export async function testSupabaseConnection() {
  // Only run on client side
  if (typeof window === 'undefined') {
    return {
      timestamp: new Date().toISOString(),
      environment: { error: 'Server-side execution not supported' },
      tests: { error: 'Client-side only' }
    };
  }

  const results = {
    timestamp: new Date().toISOString(),
    environment: {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 
        process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 20) + '...' : 
        'Not set'
    },
    tests: {} as Record<string, any>
  };

  try {
    const supabase = createClient();
    results.tests.clientCreation = { success: true };

    // Test basic connection
    try {
      const start = Date.now();
      const { data, error } = await Promise.race([
        supabase.auth.getSession(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ]) as any;
      
      results.tests.sessionFetch = {
        success: !error,
        duration: Date.now() - start,
        hasSession: !!data?.session,
        error: error?.message
      };
    } catch (error) {
      results.tests.sessionFetch = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test user fetch if we have a session
    if (results.tests.sessionFetch.success && results.tests.sessionFetch.hasSession) {
      try {
        const start = Date.now();
        const { data, error } = await Promise.race([
          supabase.auth.getUser(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 3000)
          )
        ]) as any;
        
        results.tests.userFetch = {
          success: !error,
          duration: Date.now() - start,
          hasUser: !!data?.user,
          userId: data?.user?.id,
          error: error?.message
        };
      } catch (error) {
        results.tests.userFetch = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    // Test a simple query to check database connectivity
    try {
      const start = Date.now();
      const { error } = await Promise.race([
        supabase.from('organizations').select('count').limit(1),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ]) as any;
      
      results.tests.databaseQuery = {
        success: !error,
        duration: Date.now() - start,
        error: error?.message
      };
    } catch (error) {
      results.tests.databaseQuery = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

  } catch (error) {
    results.tests.clientCreation = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  return results;
}

export function logSupabaseDiagnostics() {
  // Only run on client side
  if (typeof window === 'undefined') {
    console.warn('Supabase diagnostics can only run on client side');
    return;
  }

  testSupabaseConnection().then(results => {
    console.group('🔍 Supabase Diagnostics');
    console.log('Environment:', results.environment);
    console.log('Tests:', results.tests);
    
    const failures = Object.entries(results.tests)
      .filter(([_, test]: [string, any]) => !test.success)
      .map(([name, test]: [string, unknown]) => `${name}: ${test.error}`);
    
    if (failures.length > 0) {
      console.warn('❌ Failed tests:', failures);
    } else {
      console.log('✅ All tests passed');
    }
    
    console.groupEnd();
  }).catch(error => {
    console.error('Failed to run Supabase diagnostics:', error);
  });
}