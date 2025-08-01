'use client';

import React from 'react';
import { Button } from './ui/button';

interface LoadingErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface LoadingErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retry: () => void }>;
}

export class LoadingErrorBoundary extends React.Component<
  LoadingErrorBoundaryProps,
  LoadingErrorBoundaryState
> {
  constructor(props: LoadingErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): LoadingErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Loading Error Boundary caught an error:', error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} retry={this.retry} />;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-6">
          <div className="text-center space-y-2">
            <h2 className="text-lg font-semibold text-destructive">
              Something went wrong
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              The application encountered an error while loading. This might be a temporary issue.
            </p>
            {this.state.error && (
              <details className="text-xs text-muted-foreground mt-2">
                <summary className="cursor-pointer">Error details</summary>
                <pre className="mt-2 p-2 bg-muted rounded text-left overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={this.retry} variant="outline" size="sm">
              Try Again
            </Button>
            <Button 
              onClick={() => window.location.reload()} 
              variant="default" 
              size="sm"
            >
              Refresh Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function useLoadingErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback((error: Error) => {
    console.error('Loading error:', error);
    setError(error);
  }, []);

  return { error, resetError, handleError };
}