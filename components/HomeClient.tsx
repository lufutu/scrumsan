'use client';
import { useSupabase } from "@/providers/supabase-provider";
import LandingPage from "@/components/landing/LandingPage";
import Dashboard from "@/components/dashboard/Dashboard";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useEffect, useState } from "react";
import { Loading } from "@/components/loading";

export default function HomeClient() {
  const { user, isLoading } = useSupabase();

  useEffect(() => {
  }, [isLoading, user]);

  if (isLoading) {
    return <Loading />;
  }

  if (user) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <Dashboard />
        </SidebarInset>
      </SidebarProvider>
    );
  }
  
  return <LandingPage />;
} 