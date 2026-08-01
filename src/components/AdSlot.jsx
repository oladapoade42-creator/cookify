import { Sparkles } from "lucide-react";

// Shows a placeholder ad slot — ONLY for free-tier users. Pro and Pro+
// subscribers never see this component at all (gated by the parent
// passing `tier`). This is a placeholder until a real ad network (e.g.
// Google AdMob for a web-wrapped app, or a header-bidding network like
// Ezoic) is connected — swap the inner content for that network's ad
// unit/script once you have an account, the gating logic below already
// does the free-vs-paid split correctly.
export default function AdSlot({ tier }) {
  const isFree = tier !== "pro" && tier !== "pro_plus";
  if (!isFree) return null;

  return (
    <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-4 text-center">
      <p className="text-[10px] uppercase tracking-[0.35em] text-gray-500 mb-2">Advertisement</p>
      <div className="flex items-center justify-center gap-2 text-gray-400 text-sm py-4">
        <Sparkles className="h-4 w-4" />
        Ad space — upgrade to Cookify Pro to remove ads
      </div>
    </div>
  );
}
