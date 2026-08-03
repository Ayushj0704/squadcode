/**
 * usePlan — single source of truth for the current user's plan.
 *
 * Fetches from GET /billing/status once per mount and caches the result.
 * Components call this hook instead of individually fetching /me.
 */
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { createApiClient } from "./api";

export type PlanTier = "free" | "pro" | "elite";

export interface PlanLimits {
  squads: number;
  membersPerSquad: number;
  sheets: number;
  playground: boolean;
  aiFeatures: boolean;
  priorityRefresh: boolean;
  customInviteLink: boolean;
  pricePerMonth: number;
}

export interface PlanTag {
  label: string;
  emoji: string;
  color: "free" | "pro" | "elite";
  description: string;
}

export interface PlanStatus {
  plan: PlanTier;
  rawPlan: string;
  limits: PlanLimits;
  tag: PlanTag;
  planExpiresAt: string | null;
  hasPaymentMethod: boolean;
  hasSubscription: boolean;
  loading: boolean;
}

const FREE_LIMITS: PlanLimits = {
  squads: 1,
  membersPerSquad: 3,
  sheets: 1,
  playground: false,
  aiFeatures: false,
  priorityRefresh: false,
  customInviteLink: false,
  pricePerMonth: 0,
};

const FREE_TAG: PlanTag = {
  label: "Free",
  emoji: "🆓",
  color: "free",
  description: "Basic access — get started with a small squad",
};

const DEFAULT_STATUS: PlanStatus = {
  plan: "free",
  rawPlan: "free",
  limits: FREE_LIMITS,
  tag: FREE_TAG,
  planExpiresAt: null,
  hasPaymentMethod: false,
  hasSubscription: false,
  loading: true,
};

const TIER_ORDER: PlanTier[] = ["free", "pro", "elite"];

/** Returns true when the user meets or exceeds `required` tier. */
export function hasMinPlan(userPlan: PlanTier, required: PlanTier): boolean {
  return TIER_ORDER.indexOf(userPlan) >= TIER_ORDER.indexOf(required);
}

export function usePlan(): PlanStatus {
  const { getToken, isSignedIn } = useAuth();
  const [status, setStatus] = useState<PlanStatus>(DEFAULT_STATUS);

  useEffect(() => {
    if (!isSignedIn) {
      setStatus({ ...DEFAULT_STATUS, loading: false });
      return;
    }
    let alive = true;
    createApiClient(() => getToken())
      .get("/billing/status")
      .then((res) => {
        if (alive) setStatus({ ...res.data, loading: false });
      })
      .catch(() => {
        if (alive) setStatus({ ...DEFAULT_STATUS, loading: false });
      });
    return () => {
      alive = false;
    };
  }, [isSignedIn, getToken]);

  return status;
}
