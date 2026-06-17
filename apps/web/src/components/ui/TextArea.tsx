import type { TextareaHTMLAttributes } from "react";

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={
        "w-full min-h-28 rounded-xl border-2 border-ink-900 bg-surface-0 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400 outline-none transition focus:ring-2 focus:ring-brand-500/40 " +
        (props.className ?? "")
      }
    />
  );
}
