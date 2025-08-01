"use client"

import React from "react"
import type { Database } from "@/types/database"
import { createClient } from "@/lib/supabase/client"
import type { SupabaseClient, User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import { createContext, useContext, useEffect, useState } from "react"
import { debugLoadingState, createLoadingTimeout } from "@/lib/loading-debug"

type SupabaseContext = {
  supabase: SupabaseClient<Database>
  user: User | null
  isLoading: boolean
}

const Context = createContext<SupabaseContext | undefined>(undefined)

export default function SupabaseProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      debugLoadingState('SupabaseProvider', { status: 'initializing' });
      
      // Check if Supabase is properly configured
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error('Supabase environment variables not configured');
        debugLoadingState('SupabaseProvider', { status: 'config error', error: 'Missing env vars' });
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      const timeout = createLoadingTimeout('Auth initialization', 8000, () => {
        if (isMounted) {
          console.warn('Auth initialization timed out, continuing without user');
          setUser(null);
          setIsLoading(false);
        }
      });
      
      try {
        debugLoadingState('SupabaseProvider', { status: 'getting session' });
        
        // Use a more aggressive timeout for the session call
        const sessionPromise = supabase.auth.getSession();
        const sessionTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session fetch timeout')), 5000)
        );
        
        const sessionResult = await Promise.race([sessionPromise, sessionTimeout]);
        
        if (!isMounted) return;
        
        if (!sessionResult.data.session) {
          debugLoadingState('SupabaseProvider', { status: 'no session found' });
          setUser(null);
          return;
        }

        debugLoadingState('SupabaseProvider', { status: 'getting user' });
        
        // Also timeout the user fetch
        const userPromise = supabase.auth.getUser();
        const userTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('User fetch timeout')), 3000)
        );
        
        const userResult = await Promise.race([userPromise, userTimeout]);
        
        if (!isMounted) return;
        
        if (userResult.error) {
          console.error('Error fetching user:', userResult.error);
          debugLoadingState('SupabaseProvider', { status: 'user fetch error', error: userResult.error.message });
          setUser(null);
          return;
        }
        
        debugLoadingState('SupabaseProvider', { status: 'user found', userId: userResult.data.user?.id });
        setUser(userResult.data.user);
        
      } catch (error) {
        if (!isMounted) return;
        
        console.error('Error initializing auth:', error);
        debugLoadingState('SupabaseProvider', { 
          status: 'auth error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        setUser(null);
      } finally {
        timeout.clear();
        if (isMounted) {
          setIsLoading(false);
          debugLoadingState('SupabaseProvider', { status: 'loading complete' });
        }
      }
    }
    
    initializeAuth();
    
    return () => {
      isMounted = false;
    };
  }, [supabase])

  useEffect(() => {
    let isMounted = true;
    
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      debugLoadingState('SupabaseProvider', { status: 'auth state change', event, hasSession: !!session });
      
      try {
        if (event === "SIGNED_IN" && session?.user) {
          setUser(session.user);
          
          // Auto-sync user data when they sign in (with timeout)
          if (session.user.id) {
            try {
              const syncPromise = fetch('/api/auth/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
              });
              
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Sync timeout')), 5000)
              );
              
              await Promise.race([syncPromise, timeoutPromise]);
            } catch (error) {
              console.warn('Failed to sync user on login:', error);
              // Don't block the login process if sync fails
            }
          }
          
          router.refresh();
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          router.refresh();
        } else if (event === "TOKEN_REFRESHED" && session?.user) {
          setUser(session.user);
        }
      } catch (error) {
        console.error('Error handling auth state change:', error);
        debugLoadingState('SupabaseProvider', { 
          status: 'auth state error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  return (
    <Context.Provider value={{ supabase, user, isLoading }}>
      {children}
    </Context.Provider>
  )
}

export const useSupabase = () => {
  const context = useContext(Context)

  if (context === undefined) {
    throw new Error("useSupabase must be used inside SupabaseProvider")
  }

  return context
}
