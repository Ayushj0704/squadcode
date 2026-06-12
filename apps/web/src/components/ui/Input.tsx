import type { InputHTMLAttributes } from "react";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={
        "w-full rounded-xl border-2 border-ink-900 bg-white px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400 outline-none transition focus:ring-2 focus:ring-brand-500/40 " +
        (props.className ?? "")
      }
    />
  );
}
