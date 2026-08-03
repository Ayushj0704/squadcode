/**
 * PlanBadge — a compact inline badge showing the user's plan tier.
 *
 * Usage:
 *   <PlanBadge plan="pro" />
 *   <PlanBadge plan="elite" size="lg" />
 *   <PlanBadge plan="free" showDescription />
 */

import type { PlanTier, PlanTag } from "../../lib/usePlan";

// Plan-to-style map (uses project CSS variables / Tailwind tokens)
const BADGE_STYLES: Record<PlanTier, { bg: string; text: string; border: string; glow: string }> = {
  free: {
    bg: "bg-ink-100 dark:bg-ink-800",
    text: "text-ink-600 dark:text-ink-300",
    border: "border-ink-200 dark:border-ink-600",
    glow: "",
  },
  pro: {
    bg: "bg-brand-100 dark:bg-brand-900/40",
    text: "text-brand-700 dark:text-brand-300",
    border: "border-brand-300 dark:border-brand-600",
    glow: "shadow-[0_0_8px_0_rgba(99,102,241,0.35)]",
  },
  elite: {
    bg: "bg-gradient-to-r from-sun-100 to-amber-100 dark:from-sun-900/40 dark:to-amber-900/40",
    text: "text-amber-700 dark:text-sun-300",
    border: "border-sun-400 dark:border-sun-600",
    glow: "shadow-[0_0_10px_0_rgba(245,158,11,0.4)]",
  },
};

type Size = "xs" | "sm" | "md" | "lg";

const SIZE_CLASSES: Record<Size, string> = {
  xs: "text-[10px] px-1.5 py-0.5 gap-0.5",
  sm: "text-xs px-2 py-0.5 gap-1",
  md: "text-sm px-2.5 py-1 gap-1",
  lg: "text-base px-3 py-1.5 gap-1.5",
};

interface PlanBadgeProps {
  plan: PlanTier;
  /** Override with a custom tag object (e.g. from API response) */
  tag?: PlanTag;
  size?: Size;
  showDescription?: boolean;
  className?: string;
}

// Inline static tag data so the component works without the hook
const STATIC_TAGS: Record<PlanTier, PlanTag> = {
  free:  { label: "Free",  emoji: "🆓", color: "free",  description: "Basic access — get started with a small squad" },
  pro:   { label: "Pro",   emoji: "⚡", color: "pro",   description: "Serious coders — unlock the playground & more squads" },
  elite: { label: "Elite", emoji: "👑", color: "elite", description: "Maximum power — unlimited squads, priority refresh & more" },
};

export function PlanBadge({
  plan,
  tag,
  size = "sm",
  showDescription = false,
  className = "",
}: PlanBadgeProps) {
  const resolved = tag ?? STATIC_TAGS[plan] ?? STATIC_TAGS.free;
  const styles = BADGE_STYLES[plan] ?? BADGE_STYLES.free;

  return (
    <span
      title={resolved.description}
      className={[
        "inline-flex items-center font-bold rounded-full border transition-all select-none",
        styles.bg,
        styles.text,
        styles.border,
        styles.glow,
        SIZE_CLASSES[size],
        className,
      ].join(" ")}
    >
      <span role="img" aria-hidden="true">{resolved.emoji}</span>
      {resolved.label}
      {showDescription && (
        <span className="ml-1 font-normal opacity-80 hidden sm:inline">
          — {resolved.description}
        </span>
      )}
    </span>
  );
}
