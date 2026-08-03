export function PageSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 animate-pulse">
      <div className="rounded-2xl border-2 border-border bg-surface-2 shadow-card p-6 h-24"></div>
      <div className="rounded-2xl border-2 border-border bg-surface-2 shadow-card p-6 h-64"></div>
      <div className="rounded-2xl border-2 border-border bg-surface-2 shadow-card p-6 h-48"></div>
    </div>
  );
}

export function EmptyState({ 
  title, 
  description, 
  actionLabel, 
  onAction 
}: { 
  title: string; 
  description: string; 
  actionLabel?: string; 
  onAction?: () => void;
}) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-border-strong bg-surface-1 p-12 text-center flex flex-col items-center justify-center">
      <div className="text-lg font-bold text-ink-900 mb-2">{title}</div>
      <div className="text-sm text-ink-600 mb-6 max-w-sm">{description}</div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="rounded-xl border-2 border-ink-900 bg-brand-500 px-4 py-2 text-sm font-bold text-white shadow-pop-sm transition hover:bg-brand-400 active:translate-y-0.5 active:shadow-none"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border-2 border-coral-500 bg-coral-100/50 p-6 text-center flex flex-col items-center justify-center">
      <div className="text-coral-500 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <div className="text-lg font-bold text-coral-700 mb-2">Something went wrong</div>
      <div className="text-sm text-coral-600 mb-6 max-w-sm">{error}</div>
      <button
        onClick={onRetry}
        className="rounded-xl border-2 border-coral-700 bg-coral-500 px-4 py-2 text-sm font-bold text-white shadow-pop-sm transition hover:bg-coral-400 active:translate-y-0.5 active:shadow-none"
      >
        Retry
      </button>
    </div>
  );
}
