import React, { Component, ReactNode } from 'react';
import { motion } from 'framer-motion';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

interface WindowWithGtag extends Window {
  gtag?: (command: string, eventName: string, parameters?: Record<string, unknown>) => void;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Log to analytics service if available
    if (typeof window !== 'undefined') {
      const windowWithGtag = window as WindowWithGtag;
      if (windowWithGtag.gtag) {
        windowWithGtag.gtag('event', 'exception', {
          description: error.message,
          fatal: false
        });
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="error-content"
          >
            <h1>Oops! Something went wrong</h1>
            <p>We&apos;re sorry, but something unexpected happened.</p>
            <button
              onClick={() => window.location.reload()}
              className="retry-button"
            >
              Reload Page
            </button>
            {process.env.NODE_ENV === 'development' && (
              <details className="error-details">
                <summary>Error Details (Development)</summary>
                <pre>{this.state.error?.stack}</pre>
              </details>
            )}
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
