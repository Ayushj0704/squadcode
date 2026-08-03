import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught Error Boundary catch:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
          <div className="w-full max-w-md rounded-2xl border-2 border-border bg-surface-0 p-8 shadow-card-pop">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-coral-500/10 text-coral-500 mx-auto mb-4 border-2 border-coral-500/20">
              <AlertTriangle size={32} />
            </div>
            <h2 className="font-display text-xl font-black text-ink-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-sm font-medium text-ink-500 mb-6">
              {this.state.error?.message || "An unexpected error occurred while rendering this page."}
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-pop transition hover:bg-brand-400 active:translate-y-0.5"
              >
                <RefreshCw size={16} />
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
