import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "sun";

export function Button(
  props: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
  }
) {
  const variant = props.variant ?? "primary";
  const { className, ...rest } = props;

  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all duration-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-1 active:shadow-none";

  const styles =
    variant === "primary"
      ? "bg-brand-500 text-white border-2 border-ink-900 shadow-pop hover:bg-brand-400"
      : variant === "secondary"
        ? "border-2 border-ink-900 bg-surface-0 text-ink-800 shadow-pop hover:bg-ink-100"
        : variant === "sun"
          ? "bg-sun-400 text-ink-900 border-2 border-ink-900 shadow-pop hover:bg-sun-300"
          : variant === "danger"
            ? "border-2 border-coral-500 bg-coral-300/40 text-coral-500 shadow-[0_4px_0_0_#ff6347] hover:bg-coral-300/60"
            : "text-ink-600 hover:bg-ink-100 hover:text-ink-800";

  return <button {...rest} className={base + " " + styles + " " + (className ?? "")} />;
}
