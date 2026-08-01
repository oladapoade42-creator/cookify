import { useEffect, useRef, useState } from "react";
import { ChefHat, Clock, Star, Flame, TrendingUp, X, Mic, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "../supabase";
import { pickNaturalVoice } from "../utils/voice";

const GEMINI_MODEL = "gemini-2.5-flash";

async function sendPromptToGemini(promptText) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
  if (!apiKey) return null;
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] }),
      }
    );
    if (!resp.ok) throw new Error("Gemini request failed");
    const data = await resp.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (e) {
    return null;
  }
}

const DISHES = [
  {
    title: "Nigerian Jollof Rice",
    time: "45 mins",
    level: "Easy",
    calories: 420,
    protein: "9g",
    carbs: "62g",
    fat: "14g",
    fact: "A tomato-and-pepper base gives jollof rice a strong dose of vitamin C and lycopene, an antioxidant linked to heart health.",
  },
  {
    title: "Spaghetti Bolognese",
    time: "35 mins",
    level: "Medium",
    calories: 560,
    protein: "28g",
    carbs: "65g",
    fat: "18g",
    fact: "The lean beef in a traditional bolognese is a strong source of iron and B12 — pair it with a side salad to balance the carb-heavy pasta.",
  },
  {
    title: "Chicken Fried Rice",
    time: "40 mins",
    level: "Easy",
    calories: 480,
    protein: "24g",
    carbs: "58g",
    fat: "12g",
    fact: "Using day-old rice reduces resistant starch breakdown during cooking, which can make the dish gentler on blood sugar than fresh rice.",
  },
  {
    title: "Pancakes",
    time: "20 mins",
    level: "Beginner",
    calories: 350,
    protein: "8g",
    carbs: "52g",
    fat: "11g",
    fact: "Topping pancakes with fruit instead of syrup roughly halves the added sugar while still adding natural sweetness and fiber.",
  },
];

const FALLBACK_STEPS = [
  "Gather and prep all your ingredients before you start cooking — this makes everything faster.",
  "Heat your pan or pot and add your base ingredients (oil, aromatics, etc).",
  "Add your main ingredients and cook until they're properly done.",
  "Season to taste and adjust as needed.",
  "Plate it up and serve while hot. Enjoy!",
];

export default function Learn() {
  const [ranking, setRanking] = useState([]);
  const [rankingSource, setRankingSource] = useState("local");

  // AI Preview state
  const [previewDish, setPreviewDish] = useState(null);
  const [steps, setSteps] = useState([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [loadingSteps, setLoadingSteps] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("dish_stats")
      .select("dish_name, image, view_count")
      .order("view_count", { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data && data.length > 0) {
          setRanking(data);
          setRankingSource("global");
        } else {
          setRanking(fallbackRanking());
          setRankingSource("local");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRanking(fallbackRanking());
          setRankingSource("local");
        }
      });
    return () => { cancelled = true; };
  }, []);

  function fallbackRanking() {
    try {
      const now = new Date();
      const weekKey = `${now.getFullYear()}-W${Math.ceil(now.getDate() / 7)}`;
      const stored = JSON.parse(localStorage.getItem(`cookify_weekly_views_${weekKey}`) || "{}");
      return Object.entries(stored)
        .map(([id, count]) => ({ dish_name: `Dish #${id}`, view_count: count }))
        .sort((a, b) => b.view_count - a.view_count)
        .slice(0, 5);
    } catch (e) {
      return [];
    }
  }

  const startLearning = async (dish) => {
    setPreviewDish(dish);
    setStepIndex(0);
    setLoadingSteps(true);
    setSteps([]);

    const prompt = `Give a quick, beginner-friendly walkthrough for preparing "${dish.title}" in exactly 5-6 short steps. Each step should be one concise sentence, practical and easy to follow while actively cooking. Return ONLY a numbered list, one step per line, no intro or outro text.`;
    const text = await sendPromptToGemini(prompt);

    if (text) {
      const parsed = text
        .split("\n")
        .map((line) => line.replace(/^\s*\d+[\).\s-]*/, "").trim())
        .filter(Boolean);
      setSteps(parsed.length > 0 ? parsed : FALLBACK_STEPS);
    } else {
      setSteps(FALLBACK_STEPS);
    }
    setLoadingSteps(false);
  };

  const speakStep = (text) => {
    if (!("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const voice = pickNaturalVoice();
    if (voice) utter.voice = voice;
    const usingNeural = !!voice && /online \(natural\)/i.test(voice.name);
    utter.rate = usingNeural ? 1 : 0.96;
    utter.pitch = usingNeural ? 1 : 1.02;
    window.speechSynthesis.speak(utter);
  };

  useEffect(() => {
    if (previewDish && steps[stepIndex]) speakStep(steps[stepIndex]);
  }, [stepIndex, steps, previewDish]);

  const goNext = () => {
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const closePreview = () => {
    window.speechSynthesis?.cancel();
    stopListening();
    setPreviewDish(null);
    setSteps([]);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    setListening(false);
  };

  const toggleVoiceControl = async () => {
    if (listening) {
      stopListening();
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      alert("Microphone access is required to say \"next\" while you cook.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition isn't supported in this browser.");
      return;
    }

    const recog = new SpeechRecognition();
    recog.lang = "en-US";
    recog.continuous = true;
    recog.interimResults = false;

    recog.onresult = (ev) => {
      const lastResult = ev.results[ev.results.length - 1];
      const transcript = lastResult[0].transcript.toLowerCase();
      if (transcript.includes("next")) {
        setStepIndex((i) => Math.min(i + 1, steps.length - 1));
      }
    };
    recog.onend = () => setListening(false);
    recog.onerror = () => setListening(false);

    recognitionRef.current = recog;
    recog.start();
    setListening(true);
  };

  return (
    <div className="flex-1 bg-black p-5 overflow-y-auto text-white">

      <h1 className="text-3xl font-black">Learn</h1>
      <p className="text-gray-400 mb-6">Master delicious meals step by step.</p>

      <div className="space-y-5">
        {DISHES.map((recipe, index) => (
          <div
            key={index}
            className="bg-zinc-900/80 border border-white/10 rounded-3xl p-5"
          >
            <ChefHat size={40} />

            <h2 className="text-xl font-bold mt-3">{recipe.title}</h2>

            <div className="flex justify-between mt-4 text-gray-300">
              <div className="flex items-center">
                <Clock size={18} className="mr-2" />
                {recipe.time}
              </div>
              <div className="flex items-center">
                <Star size={18} className="mr-2" />
                {recipe.level}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2 text-center">
              <div className="rounded-xl bg-black/40 border border-white/10 p-2">
                <p className="text-lg font-black">{recipe.calories}</p>
                <p className="text-[10px] uppercase tracking-wide text-gray-500">Cal</p>
              </div>
              <div className="rounded-xl bg-black/40 border border-white/10 p-2">
                <p className="text-lg font-black">{recipe.protein}</p>
                <p className="text-[10px] uppercase tracking-wide text-gray-500">Protein</p>
              </div>
              <div className="rounded-xl bg-black/40 border border-white/10 p-2">
                <p className="text-lg font-black">{recipe.carbs}</p>
                <p className="text-[10px] uppercase tracking-wide text-gray-500">Carbs</p>
              </div>
              <div className="rounded-xl bg-black/40 border border-white/10 p-2">
                <p className="text-lg font-black">{recipe.fat}</p>
                <p className="text-[10px] uppercase tracking-wide text-gray-500">Fat</p>
              </div>
            </div>

            <p className="mt-4 text-sm text-gray-400 leading-6">{recipe.fact}</p>

            <button
              onClick={() => startLearning(recipe)}
              className="mt-5 w-full bg-white text-black py-3 rounded-xl font-bold backdrop-blur-xl"
            >
              Start Learning
            </button>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-5 h-5 text-orange-400" />
          <h2 className="text-xl font-black">Top Dishes</h2>
        </div>
        <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-4">
          {rankingSource === "global" ? "Ranked by views across all Cookify users" : "Ranked by your recent views"}
        </p>

        {ranking.length === 0 ? (
          <p className="text-sm text-gray-500">Search and open a few dishes to build the rankings.</p>
        ) : (
          <div className="space-y-3">
            {ranking.map((dish, i) => (
              <div key={i} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
                <span className="text-2xl font-black text-white/30 w-6">{i + 1}</span>
                {dish.image && (
                  <img src={dish.image} alt={dish.dish_name} className="w-12 h-12 rounded-lg object-cover" />
                )}
                <div className="flex-1">
                  <p className="font-bold">{dish.dish_name}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Flame className="w-3 h-3" /> {dish.view_count?.toLocaleString?.() ?? dish.view_count} views
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {previewDish && (
        <div className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-[440px] rounded-[28px] border border-white/10 bg-zinc-950 p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500">AI Preview</p>
                <h3 className="text-lg font-black">{previewDish.title}</h3>
              </div>
              <button
                onClick={closePreview}
                className="rounded-full border border-white/15 bg-white/10 backdrop-blur-xl px-4 py-2 text-xs font-bold uppercase tracking-wide flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Done
              </button>
            </div>

            {loadingSteps ? (
              <div className="flex items-center justify-center py-12 text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Preparing your quick guide...
              </div>
            ) : (
              <>
                <div className="flex gap-1.5 mb-5">
                  {steps.map((_, i) => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= stepIndex ? "bg-white" : "bg-white/10"}`} />
                  ))}
                </div>

                <p className="text-[11px] uppercase tracking-[0.3em] text-gray-500 mb-2">
                  Step {stepIndex + 1} of {steps.length}
                </p>
                <p className="text-lg font-bold leading-7 text-white min-h-[80px]">
                  {steps[stepIndex]}
                </p>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={toggleVoiceControl}
                    className={`rounded-2xl p-4 backdrop-blur-xl border transition ${
                      listening ? "bg-rose-500/80 border-rose-400 text-white" : "bg-white/5 border-white/15 text-white"
                    }`}
                    aria-label="Voice control"
                    title={listening ? "Listening for 'next'..." : "Say 'next' to advance"}
                  >
                    <Mic className="h-5 w-5" />
                  </button>

                  {stepIndex < steps.length - 1 ? (
                    <button
                      onClick={goNext}
                      className="flex-1 rounded-2xl bg-white text-black py-4 font-bold uppercase tracking-wide flex items-center justify-center gap-2"
                    >
                      Next <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={closePreview}
                      className="flex-1 rounded-2xl bg-white text-black py-4 font-bold uppercase tracking-wide"
                    >
                      Finish
                    </button>
                  )}
                </div>
                {listening && (
                  <p className="mt-3 text-center text-xs text-rose-300">Listening — say "next" to move on.</p>
                )}
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
