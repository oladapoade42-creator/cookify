import { useState } from "react";
import { useFlutterwave, closePaymentModal } from "flutterwave-react-v3";
import { Loader2 } from "lucide-react";
import { supabase } from "../supabase";

const TIER_CONFIG = {
  pro: {
    amount: 2,
    label: "Cookify Pro • $2/mo",
    activeLabel: "Cookify Pro Active",
    title: "Cookify Pro",
    description: "25 AI Chef questions/day + Pro features — $2/month",
    planEnvKey: "VITE_FLW_PLAN_ID_PRO",
  },
  pro_plus: {
    amount: 20,
    label: "Cookify Pro+ • $20/mo",
    activeLabel: "Cookify Pro+ Active",
    title: "Cookify Pro+",
    description: "Unlimited AI Chef + sell food on E-Restaurant — $20/month",
    planEnvKey: "VITE_FLW_PLAN_ID_PRO_PLUS",
  },
};

// Real payment flow: Flutterwave handles the card/PayPal entry and storage
// (PCI-DSS Level 1 certified) — we never see or store raw card numbers.
// After a successful charge, a Supabase Edge Function verifies the
// transaction server-side (using the secret key, never exposed to the
// browser) before marking the account as Pro/Pro+. A client-side click
// alone can never grant either tier — it only opens checkout.
export default function UpgradeButton({ authUser, currentTier, tier = "pro", onUpgraded, className }) {
  const [verifying, setVerifying] = useState(false);
  const cfg = TIER_CONFIG[tier];
  const isActive = currentTier === tier;

  const publicKey = import.meta.env.VITE_FLW_PUBLIC_KEY || "";
  const planId = import.meta.env[cfg.planEnvKey] || "";

  const config = {
    public_key: publicKey,
    tx_ref: `cookify-${tier}-${authUser?.id || "guest"}-${Date.now()}`,
    amount: cfg.amount,
    currency: "USD",
    payment_options: "card,paypal",
    payment_plan: planId || undefined, // enables recurring monthly billing
    meta: { tier }, // read back by the verify-payment function to grant the right tier
    customer: {
      email: authUser?.email || "",
      name: authUser?.email || "Cookify user",
    },
    customizations: {
      title: cfg.title,
      description: cfg.description,
    },
  };

  const handleFlutterPayment = useFlutterwave(config);

  const startCheckout = () => {
    if (!publicKey) {
      alert("Payments aren't configured yet — missing VITE_FLW_PUBLIC_KEY.");
      return;
    }
    if (!authUser) {
      alert(`Sign in with Google or Apple first — ${cfg.title} is tied to your account.`);
      return;
    }

    handleFlutterPayment({
      callback: async (response) => {
        closePaymentModal();
        if (response.status !== "successful") return;

        setVerifying(true);
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData?.session?.access_token;

          const { data, error } = await supabase.functions.invoke("verify-payment", {
            body: { transaction_id: response.transaction_id, tx_ref: response.tx_ref, tier },
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
          });

          if (error || !data?.success) {
            alert("Payment received, but we couldn't confirm it automatically. Contact support if it doesn't activate shortly.");
          } else {
            onUpgraded?.(tier);
          }
        } catch (e) {
          alert("Payment received, but verification failed to reach the server.");
        } finally {
          setVerifying(false);
        }
      },
      onClose: () => {},
    });
  };

  return (
    <button
      onClick={startCheckout}
      disabled={isActive || verifying}
      className={className || `rounded-full px-4 py-2 text-[12px] font-bold uppercase tracking-[0.24em] transition ${
        isActive ? "bg-white text-black border border-white/20" : "bg-white/10 text-white border border-white/15 hover:bg-white/20"
      }`}
    >
      {verifying ? (
        <span className="flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Confirming...</span>
      ) : isActive ? (
        cfg.activeLabel
      ) : (
        cfg.label
      )}
    </button>
  );
}
