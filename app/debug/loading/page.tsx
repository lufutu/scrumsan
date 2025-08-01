'use client';

import { useSupabase } from '@/providers/supabase-provider';
import { useOrganization } from '@/providers/organization-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { testSupabaseConnection } from '@/lib/supabase-diagnostics';

export default function LoadingDebugPage() {
  const { user, isLoading: userLoading } = useSupabase();
  const { organizations, activeOrg, isLoading: orgLoading, error: orgError } = useOrganization();
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const info = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      localStorage: {
        activeOrgId: localStorage.getItem('activeOrgId'),
        keys: Object.keys(localStorage)
      },
      sessionStorage: {
        keys: Object.keys(sessionStorage)
      },
      performance: {
        navigation: performance.getEntriesByType('navigation')[0],
        memory: (performance as unknown).memory
      }
    };
    setDebugInfo(info);
  }, []);

  const runDiagnostics = async () => {
    const diagnostics = {
      supabaseTest: await testSupabaseConnection(),
      authTest: await testAuth(),
      apiTest: await testAPI(),
      networkTest: await testNetwork()
    };
    
    console.log('Loading Diagnostics:', diagnostics);
    setDebugInfo(prev => ({ ...prev, diagnostics }));
    alert('Diagnostics complete - check console and debug info below');
  };

  const testAuth = async () => {
    try {
      const response = await fetch('/api/debug/auth');
      return {
        status: response.status,
        ok: response.ok,
        data: await response.json()
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const testAPI = async () => {
    try {
      const response = await fetch('/api/organizations');
      return {
        status: response.status,
        ok: response.ok,
        data: response.ok ? await response.json() : null
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const testNetwork = async () => {
    try {
      const start = Date.now();
      await fetch('/api/health', { method: 'HEAD' });
      return {
        latency: Date.now() - start,
        online: navigator.onLine
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        online: navigator.onLine
      };
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Loading Debug Information</h1>
        <Button onClick={runDiagnostics}>Run Diagnostics</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Authentication Status
              <Badge variant={user ? 'default' : 'destructive'}>
                {user ? 'Authenticated' : 'Not Authenticated'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>Loading: <Badge variant={userLoading ? 'secondary' : 'outline'}>{userLoading ? 'Yes' : 'No'}</Badge></div>
            <div>User ID: <code className="text-xs">{user?.id || 'None'}</code></div>
            <div>Email: <code className="text-xs">{user?.email || 'None'}</code></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Organizations Status
              <Badge variant={organizations.length > 0 ? 'default' : 'destructive'}>
                {organizations.length} orgs
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>Loading: <Badge variant={orgLoading ? 'secondary' : 'outline'}>{orgLoading ? 'Yes' : 'No'}</Badge></div>
            <div>Active Org: <code className="text-xs">{activeOrg?.name || 'None'}</code></div>
            <div>Error: <code className="text-xs text-destructive">{orgError || 'None'}</code></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Browser Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>Online: <Badge variant={navigator.onLine ? 'default' : 'destructive'}>{navigator.onLine ? 'Yes' : 'No'}</Badge></div>
            <div>Cookies: <Badge variant={navigator.cookieEnabled ? 'default' : 'destructive'}>{navigator.cookieEnabled ? 'Enabled' : 'Disabled'}</Badge></div>
            <div>Local Storage: <Badge variant="outline">{Object.keys(localStorage).length} items</Badge></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <div className="flex gap-2 flex-wrap">
        <Button onClick={() => window.location.reload()} variant="outline">
          Refresh Page
        </Button>
        <Button onClick={() => {
          localStorage.clear();
          sessionStorage.clear();
          window.location.reload();
        }} variant="destructive">
          Clear Storage & Refresh
        </Button>
        <Button onClick={() => {
          // Force logout and redirect
          localStorage.clear();
          sessionStorage.clear();
          document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
          });
          window.location.href = '/login';
        }} variant="secondary">
          Force Logout
        </Button>
        <Button onClick={() => {
          // Emergency reset - clear everything and go to login
          if (confirm('This will clear all local data and force a fresh start. Continue?')) {
            localStorage.clear();
            sessionStorage.clear();
            indexedDB.deleteDatabase('supabase-auth-token');
            window.location.href = '/login?reset=true';
          }
        }} variant="destructive">
          Emergency Reset
        </Button>
      </div>
    </div>
  );
}