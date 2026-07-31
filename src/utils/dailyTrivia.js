// Daily food trivia for the "Daily Challenge" card — 3 questions per day
// (Breakfast / Lunch / Dinner), generated fresh each day via Gemini and
// cached locally so re-opening the app the same day shows the same 3
// questions instead of regenerating them.

export function getTodayKey() {
  return new Date().toDateString();
}

const FALLBACK_QUESTIONS = [
  {
    slot: "breakfast",
    question: "The croissant, now iconic in France, actually originated in which country?",
    options: ["Austria", "Italy", "Belgium", "Spain"],
    correctIndex: 0,
    funFact: "The croissant descends from the Austrian kipferl and was popularized in France in the 1800s.",
  },
  {
    slot: "lunch",
    question: "Jollof rice, a lunch staple in many households, originated in which region?",
    options: ["South America", "West Africa", "Southeast Asia", "Northern Europe"],
    correctIndex: 1,
    funFact: "Jollof rice traces back to the Senegambia region and has countless variations across West Africa today.",
  },
  {
    slot: "dinner",
    question: "Modern pizza, a dinner-table favorite worldwide, was born in which city?",
    options: ["Athens", "Naples", "Istanbul", "Barcelona"],
    correctIndex: 1,
    funFact: "Naples, Italy is credited with creating pizza as we know it in the 18th century.",
  },
];

export async function getDailyTrivia(callGeminiApi) {
  const today = getTodayKey();

  try {
    const cached = JSON.parse(localStorage.getItem("cookify_daily_trivia") || "null");
    if (cached && cached.date === today && Array.isArray(cached.questions) && cached.questions.length === 3) {
      return cached.questions;
    }
  } catch (e) {}

  const prompt = `Generate exactly 3 multiple-choice food trivia questions for a cooking app's daily challenge — one themed around breakfast, one around lunch, one around dinner. Mix in interesting facts like which country/region a dish originated from, food history, or a notable nutrition fact. Keep questions and options short. Return ONLY valid JSON, no markdown formatting, no code fences, exactly in this shape:
[
  {"slot":"breakfast","question":"...","options":["A","B","C","D"],"correctIndex":0,"funFact":"one short sentence revealed after answering"},
  {"slot":"lunch","question":"...","options":["A","B","C","D"],"correctIndex":0,"funFact":"..."},
  {"slot":"dinner","question":"...","options":["A","B","C","D"],"correctIndex":0,"funFact":"..."}
]`;

  try {
    const response = await callGeminiApi({ contents: [{ parts: [{ text: prompt }] }] });
    const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleaned = text.replace(/```json|```/g, "").trim();
    const questions = JSON.parse(cleaned);

    const valid =
      Array.isArray(questions) &&
      questions.length === 3 &&
      questions.every((q) => q.question && Array.isArray(q.options) && q.options.length === 4 && typeof q.correctIndex === "number");

    if (!valid) throw new Error("Malformed trivia response");

    localStorage.setItem("cookify_daily_trivia", JSON.stringify({ date: today, questions }));
    return questions;
  } catch (e) {
    // Gemini unavailable/misconfigured — fall back so the feature never breaks.
    return FALLBACK_QUESTIONS;
  }
}
