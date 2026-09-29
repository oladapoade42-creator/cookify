import { ChefHat, Leaf } from "lucide-react";

export default function LoadingScreen({ fact, factNumber }) {
  return (
    <main
      className="cookify-loading-screen relative flex min-h-screen items-center justify-center overflow-hidden bg-[#101713] px-6 py-10 text-white"
      role="status"
      aria-live="polite"
      aria-label={`Cookify is loading. Food health fact ${factNumber} of 2.`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-50" aria-hidden="true">
        <div className="absolute -left-24 top-[-8rem] h-80 w-80 rounded-full border border-emerald-300/15" />
        <div className="absolute -left-12 top-[-5rem] h-56 w-56 rounded-full border border-emerald-300/10" />
        <div className="absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full border border-orange-200/15" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-14 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-300 text-[#102118]">
            <ChefHat className="h-6 w-6" aria-hidden="true" />
          </div>
          <span className="text-sm font-extrabold uppercase tracking-[0.22em]">Cookify</span>
        </div>

        <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-200">
          <Leaf className="h-4 w-4" aria-hidden="true" />
          Food fact {factNumber} of 2
        </p>
        <h1 className="mb-6 text-4xl font-black leading-tight">A little food for thought.</h1>
        <p key={factNumber} className="min-h-32 text-xl leading-8 text-white/80">
          {fact}
        </p>

        <div className="mt-10 flex items-center gap-3" aria-hidden="true">
          <div className="flex flex-1 gap-1">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
              <div className={`h-full bg-emerald-300 ${factNumber === 1 ? "cookify-loading-progress" : "w-full"}`} />
            </div>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
              <div className={`h-full bg-emerald-300 ${factNumber === 2 ? "cookify-loading-progress" : "w-0"}`} />
            </div>
          </div>
          <span className="min-w-20 text-right text-xs font-semibold uppercase tabular-nums text-white/55">20 sec each</span>
        </div>
        <p className="mt-3 text-xs text-white/45">Getting your kitchen ready</p>
      </div>
    </main>
  );
}