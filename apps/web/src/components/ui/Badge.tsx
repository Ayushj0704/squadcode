export function Badge(props: {
  children: React.ReactNode;
  variant?: "default" | "success" | "danger" | "warning" | "brand";
}) {
  const variant = props.variant ?? "default";
  const cls =
    variant === "success"
      ? "border-mint-500 bg-mint-300/50 text-mint-500"
      : variant === "danger"
        ? "border-coral-500 bg-coral-300/40 text-coral-500"
        : variant === "warning"
          ? "border-sun-500 bg-sun-300/50 text-sun-500"
          : variant === "brand"
            ? "border-brand-500 bg-brand-100 text-brand-600"
            : "border-ink-900 bg-ink-100 text-ink-800";

  return (
    <span
      className={
        "inline-flex items-center rounded-full border-2 px-2.5 py-0.5 text-xs font-bold tracking-wide " +
        cls
      }
    >
      {props.children}
    </span>
  );
}
