import { X, CheckCircle } from "lucide-react";
import UpgradeButton from "./UpgradeButton";

const PRO_BENEFITS = [
  "25 AI Chef questions per day",
  "Flavor Remixer tool",
  "Photo Calorie Scanner",
  "Diet Plan builder + PDF export",
  "Ad-free browsing for your first month",
];

const PRO_PLUS_BENEFITS = [
  "Everything in Cookify Pro",
  "Unlimited AI Chef questions",
  "Sell your own dishes on E-Restaurant",
  "Ad-free browsing for your first month",
];

export default function PaywallModal({ authUser, tier, onUpgraded, onSkip }) {
  return (
    <div className="fixed inset-0 z-[998] flex flex-col bg-black">
      <div className="flex items-center justify-between p-5 shrink-0">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Cookify</p>
          <h1 className="text-2xl font-black text-white">Go further with Pro</h1>
        </div>
        <button
          onClick={onSkip}
          aria-label="Close"
          className="rounded-full border border-white/10 bg-white/5 p-2 text-white transition hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-4">
        <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-black text-white uppercase tracking-wide">Cookify Pro</h2>
            <span className="text-sm font-bold text-gray-400">$2/mo</span>
          </div>
          <ul className="mt-4 space-y-2.5">
            {PRO_BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm text-gray-200">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-white" />
                {b}
              </li>
            ))}
          </ul>
          <UpgradeButton
            authUser={authUser}
            currentTier={tier}
            tier="pro"
            onUpgraded={onUpgraded}
            className="mt-5 w-full rounded-2xl border border-white/20 bg-white/10 py-3 text-sm font-bold uppercase tracking-[0.2em] text-white transition hover:bg-white/20"
          />
        </div>

        <div className="rounded-3xl border border-white/20 bg-white p-5 text-black">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-black uppercase tracking-wide">Cookify Pro+</h2>
            <span className="text-sm font-bold text-black/60">$4/mo</span>
          </div>
          <ul className="mt-4 space-y-2.5">
            {PRO_PLUS_BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm font-medium">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-black" />
                {b}
              </li>
            ))}
          </ul>
          <UpgradeButton
            authUser={authUser}
            currentTier={tier}
            tier="pro_plus"
            onUpgraded={onUpgraded}
            className="mt-5 w-full rounded-2xl bg-black py-3 text-sm font-bold uppercase tracking-[0.2em] text-white transition hover:bg-black/85"
          />
        </div>

        <p className="text-center text-xs text-gray-500">
          Recurring monthly subscriptions billed through our payment processor. Cancel anytime — access continues until the end of the current billing period.
        </p>

        <button
          onClick={onSkip}
          className="w-full rounded-2xl border border-white/10 py-3 text-sm font-bold uppercase tracking-[0.2em] text-gray-400 transition hover:text-white"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
