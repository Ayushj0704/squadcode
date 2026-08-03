import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

import { X, Zap } from "lucide-react";

interface UpgradeModalState {
  open: boolean;
  message: string;
  feature?: string;
}

interface UpgradeModalContextValue {
  showUpgrade: (message: string, feature?: string) => void;
}

const UpgradeModalContext = createContext<UpgradeModalContextValue>({
  showUpgrade: () => {},
});

export function useUpgradeModal() {
  return useContext(UpgradeModalContext);
}

export function UpgradeModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UpgradeModalState>({ open: false, message: "" });


  const showUpgrade = useCallback((message: string, feature?: string) => {
    setState({ open: true, message, feature });
  }, []);

  const close = () => setState({ open: false, message: "" });

  return (
    <UpgradeModalContext.Provider value={{ showUpgrade }}>
      {children}
      {state.open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-ink-900/60 backdrop-blur-sm"
            onClick={close}
          />

          {/* Modal */}
          <div className="relative w-full max-w-md rounded-3xl border-2 border-ink-900 bg-surface-0 shadow-[0_8px_0_0_var(--ink-900)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Top accent strip */}
            <div className="h-1.5 w-full bg-gradient-to-r from-brand-500 via-sun-400 to-mint-400" />

            <div className="p-8">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-brand-100 border-2 border-brand-200 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-brand-600" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-brand-600 mb-0.5">
                      Plan Limit Reached
                    </div>
                    <h2 className="font-display text-xl font-extrabold text-ink-900">
                      Upgrade to continue
                    </h2>
                  </div>
                </div>
                <button
                  onClick={close}
                  className="p-2 rounded-xl hover:bg-surface-2 transition text-ink-400 hover:text-ink-900"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Message */}
              <p className="text-ink-600 text-sm leading-relaxed mb-6">
                {state.message}
              </p>

              {/* Plan cards */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="rounded-2xl border-2 border-brand-500 bg-brand-50 p-4 shadow-[0_3px_0_0_var(--brand-500)]">
                  <div className="font-bold text-brand-700 text-sm mb-1">⚡ Pro</div>
                  <div className="font-display text-2xl font-extrabold text-brand-900">$5<span className="text-sm font-normal text-brand-600">/mo</span></div>
                  <ul className="mt-2 space-y-1">
                    <li className="text-xs text-brand-700 font-medium">3 squads</li>
                    <li className="text-xs text-brand-700 font-medium">10 members</li>
                    <li className="text-xs text-brand-700 font-medium">Playground + AI</li>
                  </ul>
                </div>
                <div className="rounded-2xl border-2 border-sun-400 bg-sun-100 p-4 shadow-[0_3px_0_0_var(--sun-400)]">
                  <div className="font-bold text-sun-600 text-sm mb-1">👑 Elite</div>
                  <div className="font-display text-2xl font-extrabold text-ink-900">$15<span className="text-sm font-normal text-ink-600">/mo</span></div>
                  <ul className="mt-2 space-y-1">
                    <li className="text-xs text-ink-700 font-medium">Unlimited squads</li>
                    <li className="text-xs text-ink-700 font-medium">25 members</li>
                    <li className="text-xs text-ink-700 font-medium">Priority refresh</li>
                  </ul>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex gap-3">
                <button
                  onClick={() => setState({ open: false, message: "" })}
                  className="flex-1 rounded-2xl border-2 border-ink-900 bg-brand-500 px-4 py-3 font-bold text-white shadow-[0_4px_0_0_var(--ink-900)] transition hover:bg-brand-400 active:translate-y-1 active:shadow-none flex items-center justify-center gap-2"
                >
                  Got it — coming soon!
                </button>
                <button
                  onClick={close}
                  className="rounded-2xl border-2 border-border bg-surface-1 px-4 py-3 font-bold text-ink-600 transition hover:bg-surface-2 active:translate-y-0.5"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </UpgradeModalContext.Provider>
  );
}
