import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle } from 'lucide-react';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
  children: ReactNode;
  pageName?: string;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Phase 2: pipe to Sentry / Supabase
    if (import.meta.env.DEV) {
      console.error(`[ErrorBoundary: ${this.props.pageName ?? 'unknown'}]`, error, info);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    const isDev = import.meta.env.DEV;

    return (
      <div className={styles.boundary} role="alert">
        <div className={styles.icon}>
          <AlertTriangle size={28} />
        </div>

        <div>
          <p className={styles.eyebrow}>{this.props.pageName ?? 'Page'} · Error</p>
          <h2 className={styles.title}>Something broke here</h2>
          <p className={styles.body}>
            This section ran into an unexpected error. The rest of your store is fine.
          </p>
        </div>

        {isDev && this.state.error && (
          <div className={styles.devBlock}>
            <pre>{this.state.error.message}{'\n\n'}{this.state.error.stack}</pre>
          </div>
        )}

        <button className={styles.retryBtn} onClick={this.handleRetry}>
          Try Again
        </button>
      </div>
    );
  }
}