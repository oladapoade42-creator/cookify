import React from "react";

export default function Favorites({ favorites = [], onRemoveFavorite }) {
  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="mb-6 rounded-[32px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.4)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-gray-400">Saved Favorites</p>
            <h1 className="mt-2 text-3xl font-black text-white">Your saved recipes</h1>
          </div>
          <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-gray-200">{favorites.length} items</span>
        </div>
      </div>

      {favorites.length === 0 ? (
        <div className="rounded-[32px] border border-dashed border-white/10 bg-white/5 p-8 text-center text-gray-300">
          <p className="mb-3 text-lg font-semibold text-white">No favorites yet</p>
          <p className="text-sm text-gray-400">Tap Save Recipe on any dish to build your favorites list.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {favorites.map((recipe) => (
            <div key={recipe.id} className="grid gap-4 rounded-[32px] border border-white/10 bg-slate-950/70 p-5 sm:grid-cols-[170px_minmax(0,1fr)]">
              <img src={recipe.image} alt={recipe.title} className="h-40 w-full rounded-[24px] object-cover" />
              <div className="flex flex-col justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-white">{recipe.title}</h2>
                  <p className="mt-3 text-gray-300">{recipe.difficulty} · {recipe.time}</p>
                </div>
                <div className="flex flex-wrap gap-3 items-center">
                  <button
                    onClick={() => onRemoveFavorite?.(recipe.id)}
                    className="rounded-[24px] border border-white/10 bg-white/10 px-5 py-3 text-sm font-bold uppercase tracking-[0.24em] text-white transition hover:bg-white/15"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
