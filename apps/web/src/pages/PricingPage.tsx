import { useState } from "react";
import { Check, ArrowRight, Crown, Zap } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "../lib/usePageTitle";
import { createApiClient } from "../lib/api";
import { useToast } from "../components/ui/Notifications";
import { usePlan } from "../lib/usePlan";
import { PlanBadge } from "../components/ui/PlanBadge";

type PlanTierId = "free" | "pro" | "elite";

interface PricingPlan {
  name: string;
  tierId: PlanTierId;
  price: string;
  originalPrice?: string | null;
  period: string;
  desc: string;
  features: string[];
  highlighted: boolean;
  badgeLabel?: string;
  borderClass: string;
  shadowClass: string;
  btnClass: string;
}

export function PricingPage() {
  usePageTitle("Pricing | SquadCode");
  const { isSignedIn, getToken } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const { showToast } = useToast();
  const { plan: currentPlan } = usePlan();

  const plans: PricingPlan[] = [
    {
      name: "Free",
      tierId: "free",
      price: "$0",
      period: "/mo",
      originalPrice: null,
      desc: "Perfect for a small group of friends trying out competitive programming.",
      features: [
        "1 squad",
        "Up to 3 members",
        "1 practice sheet",
        "Basic thread discussions",
        "5 AI recommendations",
        "5 Code Playground uses",
      ],
      highlighted: false,
      borderClass: "border-border-strong",
      shadowClass: "shadow-pop",
      btnClass: "bg-surface-1 text-ink-400 border-2 border-border cursor-not-allowed",
    },
    {
      name: "Pro",
      tierId: "pro",
      price: "$5",
      period: "/mo",
      originalPrice: "$10",
      desc: "For serious coding groups who need more tools, more space, and AI-powered insights.",
      features: [
        "Up to 3 squads",
        "Up to 10 members per squad",
        "Unlimited practice sheets",
        "Integrated Code Playground",
        "✨ AI problem recommendations",
        "Advanced threads",
      ],
      highlighted: false,
      badgeLabel: "Most Popular",
      borderClass: "border-brand-500",
      shadowClass: "shadow-[0_4px_0_0_var(--brand-500)]",
      btnClass: "bg-ink-900 text-white border-2 border-ink-900 hover:-translate-y-1 hover:shadow-pop-sm active:translate-y-0 active:shadow-none",
    },
    {
      name: "Elite",
      tierId: "elite",
      price: "$15",
      period: "/mo",
      originalPrice: "$30",
      desc: "The ultimate CP toolkit for large university clubs, elite teams, and serious competitors.",
      features: [
        "Unlimited squads",
        "Up to 25 members per squad",
        "Unlimited practice sheets",
        "Integrated Code Playground",
        "✨ AI problem recommendations",
        "👑 Priority data refresh",
        "Custom invite links",
      ],
      highlighted: true,
      badgeLabel: "Best Value",
      borderClass: "border-sun-500",
      shadowClass: "shadow-[0_4px_0_0_var(--sun-500)]",
      btnClass: "bg-gradient-to-r from-sun-400 to-amber-400 text-amber-900 border-2 border-sun-500 hover:-translate-y-1 hover:shadow-pop-sm active:translate-y-0 active:shadow-none",
    },
  ];

  async function handleSelectPlan(tierId: PlanTierId) {
    if (!isSignedIn) {
      navigate("/");
      return;
    }
    if (tierId === "free" || tierId === currentPlan) return;
    // Temporarily intercept payments
    alert("Payments are currently disabled. Coming soon!");
    return;
    
    // setLoading(tierId);
    try {
      const api = createApiClient(() => getToken());
      const res = await api.post("/billing/checkout", {
        plan: tierId,
        successUrl: window.location.origin + "/pricing?success=true",
        cancelUrl: window.location.origin + "/pricing",
      });
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error
        ?? (e as Error)?.message
        ?? "Checkout failed";
      showToast("Failed to start checkout: " + msg, "error");
    } finally {
      setLoading(null);
    }
  }

  function getButtonText(plan: PricingPlan): string {
    if (plan.tierId === "free") return isSignedIn ? "Current plan" : "Get Started";
    if (plan.tierId === currentPlan) return "Current plan ✓";
    if (loading === plan.tierId) return "Loading...";
    return `Upgrade to ${plan.name}`;
  }

  function isDisabled(plan: PricingPlan): boolean {
    return plan.tierId === "free" || plan.tierId === currentPlan || loading !== null;
  }

  return (
    <div className="min-h-screen bg-bg-page pt-12 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* ── Header ── */}
        <div className="text-center mb-16">
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-ink-900 mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-ink-600 max-w-2xl mx-auto">
            Choose the plan that fits your squad's needs. Upgrade or downgrade at any time.
          </p>
          {isSignedIn && currentPlan !== "free" && (
            <div className="mt-4 inline-flex items-center gap-2 text-sm text-ink-500">
              Current plan: <PlanBadge plan={currentPlan} size="sm" />
            </div>
          )}
        </div>

        {/* ── Plan cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.tierId}
              id={`pricing-card-${plan.tierId}`}
              className={`relative flex flex-col bg-surface-0 rounded-3xl border-2 ${plan.borderClass} ${plan.shadowClass} p-8 ${plan.highlighted ? "ring-2 ring-sun-400/40" : ""}`}
            >
              {/* Badge */}
              {plan.badgeLabel && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border-2 ${plan.tierId === "elite" ? "bg-sun-400 border-sun-500 text-amber-900" : "bg-brand-500 border-brand-600 text-white"}`}>
                    {plan.tierId === "elite" ? <><Crown className="inline w-3 h-3 mr-1" />{plan.badgeLabel}</> : plan.badgeLabel}
                  </span>
                </div>
              )}

              {/* Plan name + badge */}
              <div className="flex items-center gap-2 mb-2">
                <h2 className="font-display text-2xl font-bold text-ink-900">{plan.name}</h2>
                <PlanBadge plan={plan.tierId} size="xs" />
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-extrabold text-ink-900">{plan.price}</span>
                <span className="text-ink-600 font-bold">{plan.period}</span>
                {plan.originalPrice && (
                  <span className="ml-2 text-lg text-ink-400 line-through font-medium">
                    {plan.originalPrice}
                  </span>
                )}
              </div>

              <p className="text-sm text-ink-600 mb-8 flex-1">{plan.desc}</p>

              {/* Features */}
              <div className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-mint-500 mt-0.5 shrink-0" />
                    <span className="text-sm font-bold text-ink-800">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                id={`pricing-cta-${plan.tierId}`}
                disabled={isDisabled(plan)}
                onClick={() => handleSelectPlan(plan.tierId)}
                className={`w-full rounded-xl py-4 font-bold text-base flex items-center justify-center gap-2 transition ${isDisabled(plan) ? plan.btnClass : plan.btnClass}`}
              >
                {plan.tierId === "pro" && !isDisabled(plan) && <Zap className="w-4 h-4" />}
                {plan.tierId === "elite" && !isDisabled(plan) && <Crown className="w-4 h-4" />}
                {getButtonText(plan)}
                {!isDisabled(plan) && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          ))}
        </div>

        {/* ── Feature comparison ── */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="font-display text-2xl font-bold text-ink-900 text-center mb-8">
            Full feature comparison
          </h2>
          <div className="rounded-3xl border-2 border-border bg-surface-0 overflow-hidden shadow-pop">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-border bg-surface-1">
                  <th className="text-left p-4 font-bold text-ink-700">Feature</th>
                  <th className="text-center p-4 font-bold text-ink-700">🆓 Free</th>
                  <th className="text-center p-4 font-bold text-brand-700">⚡ Pro</th>
                  <th className="text-center p-4 font-bold text-amber-700">👑 Elite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { label: "Squads", free: "1", pro: "3", elite: "Unlimited" },
                  { label: "Members / squad", free: "3", pro: "10", elite: "25" },
                  { label: "Practice sheets", free: "1", pro: "Unlimited", elite: "Unlimited" },
                  { label: "Code Playground", free: "5 uses", pro: "✅", elite: "✅" },
                  { label: "AI Recommendations", free: "5 uses", pro: "✅", elite: "✅" },
                  { label: "Priority data refresh", free: "✅", pro: "✅", elite: "✅" },
                  { label: "Custom invite links", free: "✅", pro: "✅", elite: "✅" },
                  { label: "Contest threads", free: "✅", pro: "✅", elite: "✅" },
                  { label: "Challenges & leaderboard", free: "✅", pro: "✅", elite: "✅" },
                ].map((row) => (
                  <tr key={row.label} className="hover:bg-surface-1 transition">
                    <td className="p-4 font-medium text-ink-800">{row.label}</td>
                    <td className="p-4 text-center text-ink-600">{row.free}</td>
                    <td className="p-4 text-center text-brand-700 font-semibold">{row.pro}</td>
                    <td className="p-4 text-center text-amber-700 font-semibold">{row.elite}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
