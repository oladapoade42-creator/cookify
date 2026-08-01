import React, { useState, useRef, useEffect, useMemo } from "react";
import recipes from "../data/recipes";
import RecipeCard from "../components/RecipeCard";
import { Flame, Star, ChefHat, Camera, Loader2, X, ScanLine, ArrowLeft, MoreHorizontal, Volume2, Square, Mic } from "lucide-react";
import { supabase } from "../supabase";
import { pickNaturalVoice, stopSpeaking } from "../utils/voice";
import { getDailyTrivia } from "../utils/dailyTrivia";
import AdSlot from "../components/AdSlot";

const GEMINI_MODEL = "gemini-2.5-flash";

const SCAN_MODE_PROMPTS = {
  calories: `You are a food-only calorie scanner for Cookify. Analyze this photo. If it is not clearly food, tell the user to point the camera at a meal or snack instead. Otherwise identify the dish and give an estimated calorie count plus a rough macro breakdown (protein/carbs/fat). Keep it concise and under 80 words.`,
  dietplan: `You are a nutrition assistant for Cookify. Analyze this photo of food. If it is not clearly food, tell the user to point the camera at a meal instead. Otherwise suggest how this food could fit into a simple, balanced daily diet plan (what to pair it with for a full day of eating). Keep it concise, practical, and under 100 words.`,
  ingredients: `You are a kitchen assistant for Cookify. Analyze this photo of ingredients. If it is not clearly food or ingredients, tell the user to point the camera at their ingredients instead. Otherwise list the ingredients you can see, then suggest one simple dish the user could make with them. Keep it concise and under 100 words.`,
};

async function analyzeFoodImage(imageBase64, mode = "calories") {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
  const prompt = SCAN_MODE_PROMPTS[mode] || SCAN_MODE_PROMPTS.calories;

  if (!apiKey) {
    return {
      title: "Camera ready",
      body: "No Gemini API key is configured yet, so this demo is running in local mode. Add a Gemini API key to get live food analysis.",
    };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: "image/jpeg", data: imageBase64 } },
            ],
          }],
        }),
      }
    );

    if (!response.ok) throw new Error("Gemini request failed");

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't read the food clearly from this photo.";

    return {
      title: mode === "calories" ? "Calorie estimate" : mode === "dietplan" ? "Diet plan suggestion" : "Ingredient suggestion",
      body: text,
    };
  } catch (error) {
    return {
      title: "Food scan result",
      body: "The scan could not be completed right now. Please try again with a clearer photo of food.",
    };
  }
}

export default function Home({ openTutorSignal = false, onTutorOpened, onSaveRecipe, onOpenFavorites, onRecipeCooked, cookedCount = 0, streak = 0, xp = 0, authProvider = null, dailyChallengeDone = false, dailyAnswers = {}, onAnswerChallenge, callGeminiApi, onOrderNow, authUser = null, tier = null }) {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanMode, setScanMode] = useState("calories"); // 'calories' | 'dietplan' | 'ingredients'
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [triviaQuestions, setTriviaQuestions] = useState([]);
  const [loadingTrivia, setLoadingTrivia] = useState(false);
  const [activeSlot, setActiveSlot] = useState("breakfast");
  const [selectedOption, setSelectedOption] = useState(null);
  const [revealResult, setRevealResult] = useState(null); // { correct: bool, funFact }
  const [foodListings, setFoodListings] = useState([]);

  useEffect(() => {
    supabase
      .from("food_listings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data, error }) => {
        if (!error && data) setFoodListings(data);
      })
      .catch(() => {}); // food_listings table not set up yet
  }, []);

  const SLOTS = ["breakfast", "lunch", "dinner"];
  const answeredCount = SLOTS.filter((s) => dailyAnswers[s] !== undefined).length;

  const openChallenge = async () => {
    setChallengeOpen(true);
    if (triviaQuestions.length === 0) {
      setLoadingTrivia(true);
      const questions = await getDailyTrivia(callGeminiApi);
      setTriviaQuestions(questions);
      setLoadingTrivia(false);
    }
    const firstUnanswered = SLOTS.find((s) => dailyAnswers[s] === undefined) || "breakfast";
    setActiveSlot(firstUnanswered);
    setSelectedOption(null);
    setRevealResult(null);
  };

  const currentQuestion = triviaQuestions.find((q) => q.slot === activeSlot);

  const handleSelectOption = (index) => {
    if (revealResult || dailyAnswers[activeSlot] !== undefined) return;
    setSelectedOption(index);
    const correct = index === currentQuestion?.correctIndex;
    setRevealResult({ correct, funFact: currentQuestion?.funFact });
    onAnswerChallenge?.(activeSlot, correct);
  };

  const goToNextSlot = () => {
    const nextSlot = SLOTS.find((s) => s !== activeSlot && dailyAnswers[s] === undefined && s !== activeSlot);
    const remaining = SLOTS.filter((s) => s !== activeSlot && dailyAnswers[s] === undefined);
    setSelectedOption(null);
    setRevealResult(null);
    if (remaining.length > 0) setActiveSlot(remaining[0]);
  };
  const [cameraReady, setCameraReady] = useState(false);
  const [isLoadingScan, setIsLoadingScan] = useState(false);
  const [scanError, setScanError] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Search/autocomplete state (TheMealDB integration for worldwide popular dishes)
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [dishHistory, setDishHistory] = useState("");
  const [mealNutrition, setMealNutrition] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const searchTimeoutRef = useRef(null);
  const [weeklyViews, setWeeklyViews] = useState({});
  // AI Tutor state
  const [tutorOpen, setTutorOpen] = useState(false);
  const [tutorMessages, setTutorMessages] = useState([]); // {role:'user'|'assistant', text}
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const recognitionRef = useRef(null);
  const audioStreamRef = useRef(null);

  const getWeekKey = () => {
    const now = new Date();
    const jan1 = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - jan1) / (24 * 60 * 60 * 1000));
    const week = Math.ceil((days + jan1.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${week}`;
  };

  const getDefaultTutorMeal = () => {
    return selectedMeal || sortedRecipes[0] || recipes[0];
  };

  useEffect(() => {
    if (!openTutorSignal) return;
    const meal = getDefaultTutorMeal();
    if (meal) {
      openTutorForMeal(meal);
    }
    onTutorOpened?.();
  }, [openTutorSignal]);

  useEffect(() => {
    const weekKey = getWeekKey();
    const saved = JSON.parse(localStorage.getItem(`cookify_weekly_views_${weekKey}`) || "{}");
    setWeeklyViews(saved);

    return () => {
      stopCamera();
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  // Debounced search using TheMealDB (returns popular worldwide dishes with images)
  const fetchMeals = async (q) => {
    if (!q || !q.trim()) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(q)}`);
      const data = await res.json();
      const meals = data?.meals || [];
      const mapped = meals.map((m) => ({
        id: m.idMeal,
        name: m.strMeal,
        image: m.strMealThumb,
        category: m.strCategory,
        area: m.strArea,
        instructions: m.strInstructions,
      }));
      setSuggestions(mapped);
    } catch (e) {
      setSuggestions([]);
    }
    setIsSearching(false);
  };

  // Deterministic per-week shuffle so "Trending This Week" genuinely
  // rotates every week without needing a backend — same seed = same
  // order for everyone during that week, and it changes next week.
  const seededShuffle = (arr, seed) => {
    const a = [...arr];
    let s = seed;
    for (let i = a.length - 1; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280;
      const j = Math.floor((s / 233280) * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const weekSeed = useMemo(() => {
    const key = getWeekKey();
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) % 100000;
    return hash || 1;
  }, []);

  const [activeCategory, setActiveCategory] = useState(null); // null = all
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      const key = `cookify_dismissed_${getWeekKey()}`;
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch (e) {
      return [];
    }
  });
  const [expandedRecipe, setExpandedRecipe] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  const dismissRecipe = (id) => {
    const next = [...dismissedIds, id];
    setDismissedIds(next);
    localStorage.setItem(`cookify_dismissed_${getWeekKey()}`, JSON.stringify(next));
    setOpenMenuId(null);
  };

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!searchQuery) {
      setSuggestions([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(() => fetchMeals(searchQuery), 350);
  }, [searchQuery]);

  const allRecipesWithStats = useMemo(() => {
    return recipes.map((recipe) => ({
      ...recipe,
      weeklyViews: weeklyViews[recipe.id] || 0,
    }));
  }, [weeklyViews]);

  const sortedRecipes = useMemo(() => {
    const visible = allRecipesWithStats.filter((r) => !dismissedIds.includes(r.id));
    const scoped = activeCategory ? visible.filter((r) => r.category === activeCategory) : visible;
    // Weekly-seeded shuffle establishes this week's featured order, then
    // actual view counts break ties within that tier — so it still feels
    // "trending" while genuinely changing week to week.
    return seededShuffle(scoped, weekSeed).sort((a, b) => {
      return Math.floor(b.weeklyViews / 100) - Math.floor(a.weeklyViews / 100);
    });
  }, [allRecipesWithStats, dismissedIds, activeCategory, weekSeed]);

  const handleSelectMeal = (meal) => {
    setSelectedMeal(meal);
    setSearchQuery(meal.name);
    setSuggestions([]);
    const weekKey = getWeekKey();
    const nextViews = {
      ...weeklyViews,
      [meal.id]: (weeklyViews[meal.id] || 0) + 1,
    };
    setWeeklyViews(nextViews);
    localStorage.setItem(`cookify_weekly_views_${weekKey}`, JSON.stringify(nextViews));
    recordGlobalDishView(meal);
    fetchDishHistory(meal);
    fetchMealNutrition(meal);
  };

  const fetchDishHistory = async (meal) => {
    setDishHistory("");
    setLoadingHistory(true);
    const prompt = `Give a short, interesting 3-4 sentence history of the dish "${meal.name}" (from ${meal.area || 'unknown origin'}). Focus on where it comes from and one interesting fact. No headers, no markdown, plain text only.`;
    const text = await sendPromptToGemini(prompt);
    setDishHistory(text);
    setLoadingHistory(false);
  };

  const fetchMealNutrition = async (meal) => {
    setMealNutrition(null);
    const prompt = `Estimate typical nutrition facts for one serving of "${meal.name}". Respond with ONLY valid JSON, no markdown, in exactly this shape: {"calories": 450, "protein": "20g", "carbs": "50g", "fat": "15g"}`;
    const text = await sendPromptToGemini(prompt);
    try {
      const cleaned = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.calories) setMealNutrition(parsed);
    } catch (e) {
      // AI didn't return clean JSON — just skip showing nutrition for this dish
    }
  };

  // Best-effort global view counter for the "Top Dishes" ranking (Learn tab).
  // Requires a `dish_stats` table in Supabase — silently no-ops if it's missing.
  const recordGlobalDishView = async (meal) => {
    try {
      const { data } = await supabase
        .from('dish_stats')
        .select('view_count')
        .eq('dish_name', meal.name)
        .maybeSingle();

      if (data) {
        await supabase
          .from('dish_stats')
          .update({ view_count: data.view_count + 1 })
          .eq('dish_name', meal.name);
      } else {
        await supabase
          .from('dish_stats')
          .insert({ dish_name: meal.name, image: meal.image, view_count: 1 });
      }
    } catch (e) {
      // Table not set up yet — ranking will just use local data instead.
    }
  };

  // --- AI Tutor functions ---
  const openTutorForMeal = async (meal) => {
    if (!meal) return;
    setTutorOpen(true);
    setTutorMessages([]);
    onRecipeCooked?.(meal);
    await startTutorSession(meal);
  };

  const startTutorSession = async (meal) => {
    const mealName = meal.title || meal.name || 'the selected dish';
    const mealArea = meal.area || meal.origin || 'global';
    const mealCategory = meal.category || meal.difficulty || 'recipe';
    const introPrompt = `You are an expert, friendly cooking tutor. The user selected the meal: ${mealName} (from ${mealArea}, category: ${mealCategory}). Provide a concise, numbered step-by-step cooking guide for preparing this dish. After the steps, offer to guide the user step-by-step interactively. Keep language simple and encouraging.`;
    const assistantReply = await sendPromptToGemini(introPrompt);
    pushTutorMessage({ role: 'assistant', text: assistantReply });
    speakText(assistantReply);
  };

  const pushTutorMessage = (msg) => {
    setTutorMessages((s) => [...s, msg]);
  };

  async function sendPromptToGemini(promptText) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    if (!apiKey) {
      console.error('[Cookify] VITE_GEMINI_API_KEY is missing — set it in your hosting provider\'s environment variables, not just your local .env, then redeploy.');
      return "Demo mode: no Gemini API key configured. Enable VITE_GEMINI_API_KEY to get live tutor responses.";
    }
    try {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
        }),
      });
      if (!resp.ok) {
        const errBody = await resp.text().catch(() => '');
        console.error(`[Cookify] Gemini request failed (HTTP ${resp.status}):`, errBody);
        throw new Error('gemini error');
      }
      const data = await resp.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'I could not generate a response.';
      return text;
    } catch (e) {
      return 'The tutor is temporarily unavailable. Please try again later.';
    }
  }

  function speakText(text) {
    if (!('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const voice = pickNaturalVoice();
    if (voice) utter.voice = voice;
    utter.lang = 'en-US';
    // Edge's neural voices ("... Online (Natural) ...") already sound
    // natural at default rate/pitch — only nudge the classic system voices.
    const usingNeural = !!voice && /online \(natural\)/i.test(voice.name);
    utter.rate = usingNeural ? 1 : 0.96;
    utter.pitch = usingNeural ? 1 : 1.02;
    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false); // cancel() can fire 'error' instead of 'end' — don't leave Stop stuck disabled
    window.speechSynthesis.speak(utter);
  }

  async function ensureMicrophoneAccess() {
    if (audioStreamRef.current) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      return true;
    } catch (e) {
      alert('Microphone access is required for the interactive tutor to listen.');
      return false;
    }
  }

  function startRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    if (isRecognizing) return;
    const recog = new SpeechRecognition();
    recog.lang = 'en-US';
    recog.interimResults = false;
    recog.maxAlternatives = 1;
    recognitionRef.current = recog;

    recog.onresult = async (ev) => {
      const spoken = ev.results[0][0].transcript;
      pushTutorMessage({ role: 'user', text: spoken });
      const reply = await sendPromptToGemini(`User said: "${spoken}"\nPlease respond as the cooking tutor, helpful and concise.`);
      pushTutorMessage({ role: 'assistant', text: reply });
      speakText(reply);
    };

    recog.onend = () => setIsRecognizing(false);
    recog.onerror = () => setIsRecognizing(false);
    setIsRecognizing(true);
    recog.start();
  }

  async function handleStartListening() {
    const ok = await ensureMicrophoneAccess();
    if (!ok) return;
    startRecognition();
  }

  function closeTutor() {
    stopSpeaking();
    setIsSpeaking(false);
    setTutorOpen(false);
    setTutorMessages([]);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t=>t.stop());
      audioStreamRef.current = null;
    }
  }

  // Manual message send (typed)
  const [manualMessage, setManualMessage] = useState('');
  const sendManualMessage = async () => {
    if (!manualMessage.trim()) return;
    pushTutorMessage({ role: 'user', text: manualMessage });
    const reply = await sendPromptToGemini(`User asked: "${manualMessage}"\nRespond as a friendly cooking tutor, concise and actionable.`);
    pushTutorMessage({ role: 'assistant', text: reply });
    speakText(reply);
    setManualMessage('');
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const openScanner = async () => {
    setIsScannerOpen(true);
    setScanError("");
    setScanResult(null);
    setCameraReady(false);

    if (streamRef.current) {
      setCameraReady(true);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setScanError("This device does not support camera access in the browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraReady(true);
    } catch (error) {
      setScanError("Camera access was blocked. Please allow camera permission for food scans.");
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth || 720;
    canvas.height = videoRef.current.videoHeight || 1280;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const base64 = dataUrl.split(",")[1];

    setIsLoadingScan(true);
    setScanError("");
    setScanResult(null);

    const analysis = await analyzeFoodImage(base64, scanMode);
    setScanResult(analysis);
    setIsLoadingScan(false);
  };

  const closeScanner = () => {
    stopCamera();
    setIsScannerOpen(false);
    setCameraReady(false);
    setScanError("");
    setScanResult(null);
  };

  return (
    <>
    <div className="min-h-screen bg-black text-white rounded-3xl p-6 mb-6">
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-[430px] rounded-[32px] border border-white/10 bg-zinc-950 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Food scanner</p>
                <h3 className="text-xl font-bold text-white">Scan your meal</h3>
              </div>
              <button
                onClick={closeScanner}
                className="rounded-full border border-white/10 bg-white/10 p-2 text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              {[
                { id: "calories", label: "Calories" },
                { id: "dietplan", label: "Diet Plan" },
                { id: "ingredients", label: "Ingredients" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setScanMode(m.id); setScanResult(null); }}
                  className={`flex-1 rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-[0.2em] transition ${
                    scanMode === m.id ? "bg-white text-black" : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black">
              {cameraReady ? (
                <video ref={videoRef} autoPlay playsInline muted className="h-[280px] w-full object-cover" />
              ) : (
                <div className="flex h-[280px] items-center justify-center bg-zinc-950 p-6 text-center text-sm text-gray-400">
                  {scanMode === "calories" && "Point the camera at your meal to estimate calories and macros."}
                  {scanMode === "dietplan" && "Point the camera at your meal to get diet plan suggestions."}
                  {scanMode === "ingredients" && "Point the camera at your ingredients to get a recipe idea."}
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            {scanError && <p className="mt-3 text-sm text-red-400">{scanError}</p>}

            {scanResult && (
              <div className="mt-4 rounded-[20px] border border-white/10 bg-zinc-900/80 p-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400">{scanResult.title}</p>
                <p className="mt-2 text-sm leading-6 text-white whitespace-pre-wrap">{scanResult.body}</p>
              </div>
            )}

            <button
              onClick={cameraReady ? captureAndAnalyze : openScanner}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-[24px] bg-white px-4 py-3 font-semibold text-black shadow-[0_8px_24px_rgba(255,255,255,0.08)]"
            >
              {isLoadingScan ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : cameraReady ? (
                <ScanLine className="h-5 w-5" />
              ) : (
                <Camera className="h-5 w-5" />
              )}
              {isLoadingScan ? "Scanning food..." : cameraReady ? "Capture food" : "Open camera"}
            </button>
          </div>
        </div>
      )}

      <div className="sticky top-0 z-20 border-b border-white/10 bg-black/95 backdrop-blur-xl pb-4 pt-4">
        <div className="px-2">
          <div className="flex items-center justify-between gap-3 px-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full border border-white/10 bg-white/10 grid place-items-center text-white">
                <ChefHat className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-gray-500">Cookify</p>
                <h1 className="text-xl font-black text-white">Kitchen Feed</h1>
              </div>
            </div>
            <button onClick={() => openTutorForMeal(getDefaultTutorMeal())} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] uppercase tracking-[0.35em] text-white transition hover:bg-white/10">
              AI Tutor
            </button>
          </div>

          <div className="mt-4 flex gap-3 overflow-x-auto px-3 pb-2">
            {['Rice', 'Pasta', 'Chicken', 'Dessert', 'Favorites'].map((item) => {
              const isActive = item !== 'Favorites' && activeCategory === item;
              return (
                <button
                  key={item}
                  onClick={(ev) => {
                    ev.preventDefault();
                    if (item === 'Favorites') { onOpenFavorites?.(); return; }
                    setActiveCategory((prev) => (prev === item ? null : item));
                  }}
                  className={`shrink-0 rounded-full border px-4 py-2 text-[10px] uppercase tracking-[0.35em] transition backdrop-blur-xl ${
                    isActive
                      ? "border-white/40 bg-white/25 text-white shadow-[0_4px_20px_rgba(255,255,255,0.15)]"
                      : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>

          {activeCategory && (
            <div className="mt-2 flex gap-2 overflow-x-auto px-3 pb-1">
              {recipes.filter((r) => r.category === activeCategory).map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    const withStats = allRecipesWithStats.find((x) => x.id === r.id);
                    if (withStats) setExpandedRecipe(withStats);
                  }}
                  className="shrink-0 rounded-full border border-white/10 bg-white/5 backdrop-blur-xl px-3 py-1.5 text-[10px] text-gray-300 transition hover:bg-white/10 hover:text-white"
                >
                  {r.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {foodListings.length > 0 && (
        <div className="px-3 mt-8">
          <h2 className="text-2xl font-bold mb-4">For Sale on E-Restaurant</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {foodListings.map((listing) => (
              <div key={listing.id} className="shrink-0 w-40 rounded-3xl border border-white/10 bg-zinc-900/80 overflow-hidden">
                {listing.image ? (
                  <img src={listing.image} alt={listing.title} className="h-24 w-full object-cover" />
                ) : (
                  <div className="h-24 w-full bg-white/5 flex items-center justify-center"><ChefHat className="text-white/30 h-6 w-6" /></div>
                )}
                <div className="p-3">
                  <p className="text-xs font-bold truncate">{listing.title}</p>
                  <p className="text-xs text-gray-500">${Number(listing.price).toFixed(2)}</p>
                  <button
                    onClick={() => onOrderNow?.(listing.id)}
                    className="mt-2 w-full rounded-lg bg-white text-black py-1.5 text-[10px] font-bold uppercase tracking-wide"
                  >
                    Order Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-2xl font-bold mb-4 px-3 mt-8">Trending This Week</h2>

      <div className="space-y-6 mt-6">
            {sortedRecipes.map((recipe, i) => (
              <div key={recipe.id} className="space-y-6">
                <RecipeCard
                  recipeId={recipe.id}
                  title={recipe.title}
                  image={recipe.image}
                  time={recipe.time}
                  difficulty={recipe.difficulty}
                  rating={recipe.rating}
                  weeklyViews={recipe.weeklyViews}
                  authProvider={authProvider}
                  authUser={authUser}
                  onClick={() => openTutorForMeal(recipe)}
                  onCookNow={() => openTutorForMeal(recipe)}
                  onSaveRecipe={() => onSaveRecipe?.(recipe)}
                  onExpand={() => setExpandedRecipe(recipe)}
                  onNotInterested={() => dismissRecipe(recipe.id)}
                />
                {(i + 1) % 4 === 0 && <AdSlot tier={tier} />}
              </div>
            ))}
        </div>
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="bg-zinc-900/80 border border-white/10 rounded-3xl p-5">
            <h2 className="text-3xl font-black">
                {cookedCount}
                </h2>
                <p>Recipes</p>
                </div>
                <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-5">
            <h2 className="text-3xl font-black">
                {streak}
                </h2>

                <p>Cooking Streak</p>
        </div>
      </div>
      <div className="mb-6 relative rounded-[28px] border border-white/10 bg-slate-950/70 p-5 shadow-[0_28px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-orange-300/70">Search</p>
            <h2 className="mt-2 text-lg font-bold text-white">Find meals, recipes, and AI guidance</h2>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-2 text-xs uppercase tracking-[0.3em] text-gray-300">Global</span>
        </div>
        <input
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setSelectedMeal(null);
          }}
          type="text"
          placeholder="Search for recipes or popular dishes worldwide..."
          className="w-full p-4 rounded-[24px] border border-white/15 bg-slate-900 text-white outline-none placeholder-gray-400"
        />

        {(suggestions.length > 0 || isSearching) && (
          <div className="absolute left-0 right-0 mt-2 max-h-60 overflow-auto rounded-[24px] bg-zinc-900 border border-white/10 z-50 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
            {isSearching && <div className="p-3 text-sm text-gray-400">Searching popular dishes...</div>}
            {suggestions.map((m) => (
              <button
                key={m.id}
                onClick={() => handleSelectMeal(m)}
                className="w-full flex items-center gap-3 p-3 rounded-[20px] hover:bg-white/5 text-left"
              >
                <img src={m.image} alt={m.name} className="w-12 h-12 rounded-md object-cover" />
                <div>
                  <div className="font-semibold text-white">{m.name}</div>
                  <div className="text-xs text-gray-400">{m.area} • {m.category}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedMeal && (
        <div className="mt-4">
          <RecipeCard
            recipeId={`meal-${selectedMeal.id}`}
            title={selectedMeal.name}
            image={selectedMeal.image}
            time="—"
            difficulty={selectedMeal.category || "—"}
            rating={4.8}
            weeklyViews={weeklyViews[selectedMeal.id] || 0}
            nutrition={mealNutrition}
            authProvider={authProvider}
            authUser={authUser}
            onClick={() => openTutorForMeal(selectedMeal)}
            onCookNow={() => openTutorForMeal(selectedMeal)}
            onSaveRecipe={() => onSaveRecipe?.(selectedMeal)}
          />
          {(loadingHistory || dishHistory) && (
            <div className="mt-3 rounded-2xl border border-white/10 bg-black/40 p-3">
              <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500 mb-1">Dish History</p>
              {loadingHistory ? (
                <p className="text-sm text-gray-400 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Looking up the story behind this dish...</p>
              ) : (
                <p className="text-sm text-gray-300 leading-6">{dishHistory}</p>
              )}
            </div>
          )}
        </div>
      )}

      {tutorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-[700px] max-h-[92vh] overflow-y-auto rounded-[20px] border border-white/10 bg-zinc-950 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.5)]">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.3em] text-gray-400">AI Cooking Tutor</p>
                <h3 className="text-lg font-bold truncate">{selectedMeal?.name}</h3>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => speakText(tutorMessages.slice().reverse().find(m=>m.role==='assistant')?.text || 'Repeating...')}
                  disabled={isSpeaking}
                  aria-label="Speak"
                  title="Speak"
                  className="rounded-full border border-white/15 bg-white/90 backdrop-blur-xl p-2.5 text-black disabled:opacity-40"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { stopSpeaking(); setIsSpeaking(false); }}
                  disabled={!isSpeaking}
                  aria-label="Stop"
                  title="Stop"
                  className="rounded-full border border-white/15 bg-white/10 backdrop-blur-xl p-2.5 text-white disabled:opacity-30"
                >
                  <Square className="h-4 w-4" />
                </button>
                <button
                  onClick={handleStartListening}
                  aria-label="Listen"
                  title="Listen"
                  className={`rounded-full border p-2.5 backdrop-blur-xl ${isRecognizing ? 'border-rose-400 bg-rose-500/80 text-white' : 'border-white/15 bg-white/10 text-white'}`}
                >
                  <Mic className="h-4 w-4" />
                </button>
                <button
                  onClick={closeTutor}
                  aria-label="Close"
                  title="Close"
                  className="rounded-full border border-white/15 bg-white/10 backdrop-blur-xl p-2.5 text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="h-64 overflow-auto rounded-md border border-white/10 p-3 bg-black/40 mb-3">
              {tutorMessages.length === 0 && <p className="text-gray-400">Tutor will appear here shortly...</p>}
              {tutorMessages.map((m, i) => (
                <div key={i} className={`mb-3 ${m.role === 'assistant' ? 'text-gray-200' : 'text-white'}`}>
                  <div className={`text-[12px] font-bold ${m.role==='assistant' ? 'text-gray-400' : 'text-white'}`}>{m.role}</div>
                  <div className="mt-1 whitespace-pre-wrap">{m.text}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input value={manualMessage} onChange={(e)=>setManualMessage(e.target.value)} placeholder="Ask the tutor a question or type 'next step'..." className="flex-1 rounded-[24px] p-3 bg-zinc-900 border border-white/10 outline-none text-white placeholder-gray-500" />
              <button onClick={sendManualMessage} className="rounded-[24px] bg-white px-4 py-2 text-black">Send</button>
            </div>
          </div>
        </div>
      )}
      {/* XP Card */}

      <div className="mt-8 bg-zinc-900/80 rounded-3xl p-6 border border-white/10">

        <div className="flex justify-between">

          <div>
            <p className="text-gray-400">Current XP</p>
            <h2 className="text-4xl font-bold">
              {xp}
            </h2>
          </div>

          <div className="text-right">

            <Flame className="w-8 h-8 text-orange-400 ml-auto" />

            <p className="mt-2">
              {streak} Day Streak
            </p>

          </div>

        </div>

      </div>

      {/* Quick Actions */}

      <h2 className="text-xl font-bold mt-10">
        Quick Actions
      </h2>

      <div className="grid grid-cols-2 gap-4 mt-4">

        <button onClick={() => openTutorForMeal(getDefaultTutorMeal())} className="bg-white/90 backdrop-blur-xl text-black rounded-[24px] p-6 shadow-[0_12px_30px_rgba(255,255,255,0.08)]">
          <ChefHat className="mx-auto mb-3" />
          AI Chef
        </button>

        <button
          onClick={openScanner}
          className="bg-white/5 backdrop-blur-xl rounded-[24px] p-6 border border-white/10"
        >
          <Camera className="mx-auto mb-3" />
          Scan Food
        </button>

<button onClick={onOpenFavorites} className="bg-white/5 backdrop-blur-xl rounded-[24px] p-6 border border-white/10">
          <Star className="mx-auto mb-3" />
          Favorites
        </button>

        <button
          onClick={openChallenge}
          className={`rounded-[24px] p-6 border ${dailyChallengeDone ? 'bg-neutral-900/50 border-neutral-800 text-gray-500' : 'bg-neutral-900 border-neutral-700'}`}
        >
          <Flame className={`mx-auto mb-3 ${dailyChallengeDone ? 'text-gray-600' : 'text-orange-400'}`} />
          {dailyChallengeDone ? 'Challenge Done' : `Daily Challenge (${answeredCount}/3)`}
        </button>

      </div>

      {challengeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-[420px] rounded-[28px] border border-white/10 bg-zinc-950 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black uppercase tracking-wide">Daily Food Trivia</h3>
              <button onClick={() => setChallengeOpen(false)} className="rounded-full border border-white/10 bg-white/10 p-2">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex gap-2 mb-5">
              {SLOTS.map((slot) => (
                <div
                  key={slot}
                  className={`flex-1 rounded-full px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide ${
                    dailyAnswers[slot] !== undefined
                      ? dailyAnswers[slot] ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                      : slot === activeSlot ? "bg-white text-black" : "bg-white/5 text-gray-500"
                  }`}
                >
                  {slot}
                </div>
              ))}
            </div>

            {loadingTrivia ? (
              <div className="flex items-center justify-center py-10 text-gray-400">
                <Loader2 className="animate-spin h-5 w-5 mr-2" /> Generating today's questions...
              </div>
            ) : dailyChallengeDone ? (
              <p className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center text-sm text-gray-400">
                All 3 done for today — come back tomorrow for new questions.
              </p>
            ) : dailyAnswers[activeSlot] !== undefined ? (
              <p className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center text-sm text-gray-400">
                Already answered — pick another tab above, or close and come back tomorrow.
              </p>
            ) : currentQuestion ? (
              <>
                <p className="text-sm font-bold text-white leading-6">{currentQuestion.question}</p>
                <div className="mt-4 space-y-2">
                  {currentQuestion.options.map((opt, i) => {
                    const isSelected = selectedOption === i;
                    const isCorrectOpt = i === currentQuestion.correctIndex;
                    let style = "border-white/15 bg-white/5 hover:bg-white/10";
                    if (revealResult) {
                      if (isCorrectOpt) style = "border-emerald-400 bg-emerald-500/15 text-emerald-200";
                      else if (isSelected) style = "border-rose-400 bg-rose-500/15 text-rose-200";
                      else style = "border-white/10 bg-white/5 opacity-50";
                    }
                    return (
                      <button
                        key={i}
                        onClick={() => handleSelectOption(i)}
                        disabled={!!revealResult}
                        className={`w-full rounded-2xl border p-3 text-left text-sm transition ${style}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {revealResult && (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-3">
                    <p className={`text-sm font-bold ${revealResult.correct ? "text-emerald-300" : "text-rose-300"}`}>
                      {revealResult.correct ? "Correct! +20 XP" : "Not quite."}
                    </p>
                    {revealResult.funFact && <p className="mt-1 text-xs text-gray-400">{revealResult.funFact}</p>}
                    <button
                      onClick={goToNextSlot}
                      className="mt-3 w-full rounded-xl bg-white text-black py-2.5 text-sm font-bold uppercase tracking-wide"
                    >
                      {SLOTS.some((s) => s !== activeSlot && dailyAnswers[s] === undefined) ? "Next Question" : "Done for Today"}
                    </button>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}

    
<div className="bg-zinc-900/80 border border-white/10 rounded-3xl p-5 mt-6">
        <h3 className="font-bold">
          Level 1 chef
        </h3>
        <p className="text-gray-500">complete 5 recipes to reach level 2</p>
      </div>

    </div>

    {expandedRecipe && (
      <div className="fixed inset-0 z-[60] bg-black overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-black/90 backdrop-blur-xl p-4">
          <button
            onClick={() => setExpandedRecipe(null)}
            className="rounded-full border border-white/15 bg-white/5 backdrop-blur-xl p-2 text-white transition hover:bg-white/10"
            aria-label="Back to feed"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-black text-white">{expandedRecipe.title}</h2>
        </div>

        <div className="p-4">
          <RecipeCard
            recipeId={expandedRecipe.id}
            title={expandedRecipe.title}
            image={expandedRecipe.image}
            time={expandedRecipe.time}
            difficulty={expandedRecipe.difficulty}
            rating={expandedRecipe.rating}
            weeklyViews={expandedRecipe.weeklyViews}
            nutrition={expandedRecipe.nutrition}
            authProvider={authProvider}
            authUser={authUser}
            onClick={() => { openTutorForMeal(expandedRecipe); setExpandedRecipe(null); }}
            onCookNow={() => { openTutorForMeal(expandedRecipe); setExpandedRecipe(null); }}
            onSaveRecipe={() => onSaveRecipe?.(expandedRecipe)}
          />
        </div>
      </div>
    )}
    </>
  );
}

