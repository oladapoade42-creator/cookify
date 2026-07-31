import { useEffect, useState } from "react";
import { ChefHat, Clock, Star, Flame, TrendingUp } from "lucide-react";
import { supabase } from "../supabase";

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

export default function Learn() {
  const [ranking, setRanking] = useState([]);
  const [rankingSource, setRankingSource] = useState("local"); // 'global' | 'local'

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

            <button className="mt-5 w-full bg-white text-black py-3 rounded-xl font-bold">
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

    </div>
  );
}
