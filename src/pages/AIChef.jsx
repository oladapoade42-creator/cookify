import React, { useState, useEffect } from "react";
import { Sparkles, Send, Lock, Loader2, Volume2 } from "lucide-react";
import UpgradeButton from "../components/UpgradeButton";
import { speak } from "../utils/voice";

// Daily-reset ask counter, persisted so refreshing doesn't reset the limit.
function getTodayAskCount() {
  const today = new Date().toDateString();
  const stored = JSON.parse(localStorage.getItem("cookify_ai_usage") || "{}");
  return stored.date === today ? stored.count || 0 : 0;
}
function bumpTodayAskCount() {
  const today = new Date().toDateString();
  const stored = JSON.parse(localStorage.getItem("cookify_ai_usage") || "{}");
  const count = (stored.date === today ? stored.count || 0 : 0) + 1;
  localStorage.setItem("cookify_ai_usage", JSON.stringify({ date: today, count }));
  return count;
}

export default function AI({ callGeminiApi, isPremium, tier, authUser, onUpgraded }) {
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState(
    "👋 Hi! I'm your Cookify AI Chef. Ask me anything about cooking."
  );
  const [loading, setLoading] = useState(false);
  const [askCount, setAskCount] = useState(0);
  const [voiceOn, setVoiceOn] = useState(false);

  useEffect(() => setAskCount(getTodayAskCount()), []);

  // Free = 3/day. Pro ($2) = 25/day. Pro+ ($20) = unlimited.
  const DAILY_LIMIT = tier === "pro_plus" ? Infinity : tier === "pro" ? 25 : 3;
  const limitReached = askCount >= DAILY_LIMIT;

  async function askAI() {
    if (!prompt.trim() || limitReached) return;
    setLoading(true);

    try {
      const response = await callGeminiApi({
        contents: [{ parts: [{ text: prompt }] }],
      });

      const text = response?.candidates?.[0]?.content?.parts?.[0]?.text;
      const finalText = text || "I couldn't come up with a response that time — try rephrasing your question.";
      setReply(finalText);
      setAskCount(bumpTodayAskCount());
      setPrompt("");
      if (voiceOn) speak(finalText);
    } catch (error) {
      setReply("Failed to get response from AI. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 bg-black p-5 overflow-y-auto text-white">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">AI Chef</h1>
          <p className="text-gray-400 mt-2">Ask anything about cooking.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setVoiceOn((v) => !v)}
            aria-pressed={voiceOn}
            title="Read replies aloud"
            className={`rounded-full p-2 border ${voiceOn ? "bg-white text-black border-white" : "border-white/15 text-gray-400"}`}
          >
            <Volume2 className="h-4 w-4" />
          </button>
          {tier !== "pro_plus" && (
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-gray-300">
              {askCount}/{DAILY_LIMIT} today
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 bg-zinc-900/80 border border-white/10 rounded-3xl p-5">
        <Sparkles size={40} className="text-white" />
        <p className="mt-4 whitespace-pre-wrap text-white">
          {reply}
        </p>
      </div>

      {limitReached ? (
        <div className="mt-6 rounded-3xl border border-white/15 bg-white/5 p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-black">
            <Lock className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-black uppercase tracking-wide">Daily limit reached</h3>
          <p className="mt-2 text-sm text-gray-400">
            {tier === "pro"
              ? "Upgrade to Cookify Pro+ for unlimited AI Chef questions."
              : "Upgrade to Cookify Pro for 25/day, or Pro+ for unlimited."}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {tier !== "pro" && tier !== "pro_plus" && (
              <UpgradeButton
                authUser={authUser}
                currentTier={tier}
                tier="pro"
                onUpgraded={onUpgraded}
                className="w-full rounded-2xl bg-white/10 border border-white/20 py-3 font-bold uppercase tracking-wide text-white"
              />
            )}
            <UpgradeButton
              authUser={authUser}
              currentTier={tier}
              tier="pro_plus"
              onUpgraded={onUpgraded}
              className="w-full rounded-2xl bg-white py-3 font-bold uppercase tracking-wide text-black"
            />
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask AI Chef..."
            className="w-full rounded-2xl border border-white/15 bg-zinc-900 p-4 h-32 resize-none text-white placeholder-gray-500 outline-none focus:border-white/40"
          />

          <button
            onClick={askAI}
            disabled={loading || !prompt.trim()}
            className="mt-4 w-full bg-white text-black rounded-2xl py-3 font-bold flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            {loading ? "Thinking..." : "Ask AI"}
          </button>
        </div>
      )}

    </div>
  );
}
