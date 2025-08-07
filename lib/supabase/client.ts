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
            realtime: {
                params: {
                    eventsPerSecond: 50, // Increase for high-frequency updates
                },
                // For self-hosted instances, ensure proper heartbeat
                heartbeatIntervalMs: 30000,
                reconnectAfterMs: (tries: number) => {
                    // Exponential backoff with max 30 seconds
                    return Math.min(1000 * Math.pow(2, tries), 30000)
                }
            },
            global: {
                headers: {
                    'X-Client-Info': 'scrumsan-realtime'
                }
            }
        }
    )
}

export const supabase = createClient()