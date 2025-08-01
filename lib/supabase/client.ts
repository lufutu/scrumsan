import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: {
                autoRefreshToken: true,
                persistSession: true, // Enable session persistence
                detectSessionInUrl: true,
                flowType: 'pkce'
            },
        }
    )
}

export const supabase = createClient()