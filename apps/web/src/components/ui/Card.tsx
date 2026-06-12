import type { PropsWithChildren } from "react";

export function Card(props: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={
        "rounded-2xl border-2 border-border bg-surface-0 p-6 shadow-card " +
        (props.className ?? "")
      }
    >
      {props.children}
    </div>
  );
}
