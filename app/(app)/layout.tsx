'use client';

import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/animate-ui/radix/sidebar";
import { useSupabase } from "@/providers/supabase-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loading } from "@/components/loading";
import { LoadingErrorBoundary } from "@/components/loading-error-boundary";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useSupabase();
  const router = useRouter();
  const [forceRedirect, setForceRedirect] = useState(false);

  // Aggressive fallback - if loading takes too long, force redirect
  useEffect(() => {
    if (isLoading) {
      const fallbackTimer = setTimeout(() => {
        console.warn('AppLayout: Forcing redirect due to prolonged loading');
        setForceRedirect(true);
        router.push('/login');
      }, 15000); // 15 seconds max

      return () => clearTimeout(fallbackTimer);
    }
  }, [isLoading, router]);

  useEffect(() => {
    if (!isLoading && !user && !forceRedirect) {
      router.push('/login');
    }
  }, [user, isLoading, router, forceRedirect]);

  if (forceRedirect) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p>Redirecting to login...</p>
          <p className="text-sm text-muted-foreground">
            If this takes too long, <a href="/login" className="underline">click here</a>
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <LoadingErrorBoundary>
        <Loading 
          timeout={10000}
          onTimeout={() => {
            console.warn('Authentication loading timeout, will force redirect soon');
          }}
        />
      </LoadingErrorBoundary>
    );
  }

  if (!user) {
    return (
      <LoadingErrorBoundary>
        <Loading 
          timeout={5000}
          onTimeout={() => {
            console.warn('User authentication timeout, redirecting to login');
            router.push('/login');
          }}
        />
      </LoadingErrorBoundary>
    );
  }

  return (
    <LoadingErrorBoundary>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="overflow-auto">
          {children}
        </SidebarInset>
      </SidebarProvider>
    </LoadingErrorBoundary>
  );
} 