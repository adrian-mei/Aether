'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/shared/lib/logger';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('APP', 'Uncaught error in UI', { error, componentStack: errorInfo.componentStack });
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
          return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center h-[100dvh] bg-stone-950 text-stone-200 p-4 text-center">
          <div className="glass-panel p-8 max-w-md space-y-4">
            <h2 className="text-2xl font-light text-rose-400">Something went wrong</h2>
            <p className="text-stone-400">Aether encountered an unexpected error. Please try refreshing the page.</p>
            <button 
                onClick={() => window.location.reload()}
                className="px-6 py-2 mt-4 rounded-full bg-stone-800 hover:bg-stone-700 transition-colors"
            >
                Reload Aether
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
                <pre className="mt-4 text-xs text-left bg-black/50 p-2 rounded overflow-auto max-h-32">
                    {this.state.error.message}
                </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
