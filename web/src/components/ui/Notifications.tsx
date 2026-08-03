import { useState, useEffect, useCallback, createContext, useContext, useRef } from "react";

// ─── Toast System ───────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "info" | "warning";
type Toast = { id: number; message: string; type: ToastType };

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

let toastId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const icons: Record<ToastType, string> = {
    success: "✅",
    error: "❌",
    info: "💬",
    warning: "⚠️",
  };

  const colors: Record<ToastType, string> = {
    success: "border-mint-400 bg-mint-50 text-mint-900",
    error: "border-coral-400 bg-coral-50 text-coral-900",
    info: "border-brand-300 bg-brand-50 text-brand-900",
    warning: "border-sun-400 bg-sun-50 text-sun-900",
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border-2 px-4 py-3 shadow-pop font-bold text-sm animate-slide-up ${colors[t.type]}`}
          >
            <span className="text-base shrink-0">{icons[t.type]}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

// ─── Modal / Dialog System ──────────────────────────────────────────────────

type ModalButton = {
  label: string;
  variant?: "primary" | "danger" | "secondary";
  onClick: () => void;
};

type ModalState = {
  title: string;
  message: string;
  buttons: ModalButton[];
} | null;

type PromptState = {
  title: string;
  placeholder?: string;
  defaultValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
} | null;

type DialogContextValue = {
  showAlert: (title: string, message: string, onOk?: () => void) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => void;
  showPrompt: (title: string, placeholder?: string, defaultValue?: string) => Promise<string | null>;
};

const DialogContext = createContext<DialogContextValue>({
  showAlert: () => {},
  showConfirm: () => {},
  showPrompt: async () => null,
});

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [modal, setModal] = useState<ModalState>(null);
  const [prompt, setPrompt] = useState<PromptState>(null);
  const [promptValue, setPromptValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (prompt) {
      setPromptValue(prompt.defaultValue ?? "");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [prompt]);

  const showAlert = useCallback((title: string, message: string, onOk?: () => void) => {
    setModal({
      title, message,
      buttons: [{ label: "OK", variant: "primary", onClick: () => { setModal(null); onOk?.(); } }],
    });
  }, []);

  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void, onCancel?: () => void) => {
    setModal({
      title, message,
      buttons: [
        { label: "Cancel", variant: "secondary", onClick: () => { setModal(null); onCancel?.(); } },
        { label: "Confirm", variant: "primary", onClick: () => { setModal(null); onConfirm(); } },
      ],
    });
  }, []);

  const showPrompt = useCallback((title: string, placeholder?: string, defaultValue?: string): Promise<string | null> => {
    return new Promise((resolve) => {
      setPrompt({
        title, placeholder, defaultValue,
        onConfirm: (val) => { setPrompt(null); resolve(val); },
        onCancel: () => { setPrompt(null); resolve(null); },
      });
    });
  }, []);

  const btnClass: Record<string, string> = {
    primary: "rounded-xl border-2 border-brand-600 bg-brand-500 px-5 py-2 font-bold text-white shadow-pop-sm hover:bg-brand-600 transition",
    danger: "rounded-xl border-2 border-coral-600 bg-coral-500 px-5 py-2 font-bold text-white shadow-pop-sm hover:bg-coral-600 transition",
    secondary: "rounded-xl border-2 border-border bg-surface-2 px-5 py-2 font-bold text-ink-700 hover:bg-surface-raised transition",
  };

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
      {children}

      {/* Alert / Confirm Modal */}
      {modal && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border-2 border-border bg-surface-0 shadow-pop overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-bold text-ink-900 mb-2">{modal.title}</h3>
              <p className="text-ink-600 text-sm">{modal.message}</p>
            </div>
            <div className="flex justify-end gap-3 border-t-2 border-border px-6 py-4 bg-surface-1">
              {modal.buttons.map((b) => (
                <button key={b.label} onClick={b.onClick} className={btnClass[b.variant ?? "secondary"]}>
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Prompt Modal */}
      {prompt && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border-2 border-border bg-surface-0 shadow-pop overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-bold text-ink-900 mb-4">{prompt.title}</h3>
              <input
                ref={inputRef}
                type="text"
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") prompt.onConfirm(promptValue); if (e.key === "Escape") prompt.onCancel(); }}
                placeholder={prompt.placeholder}
                className="w-full rounded-xl border-2 border-border bg-surface-2 px-4 py-2.5 font-bold text-ink-900 outline-none focus:border-brand-500 transition"
              />
            </div>
            <div className="flex justify-end gap-3 border-t-2 border-border px-6 py-4 bg-surface-1">
              <button onClick={prompt.onCancel} className={btnClass.secondary}>Cancel</button>
              <button onClick={() => prompt.onConfirm(promptValue)} className={btnClass.primary}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  return useContext(DialogContext);
}
