import { useEffect, useState } from "react";

// Small set of flame particles that drift/flicker upward — built with
// plain CSS keyframes (scoped to this component via a <style> tag) so it
// doesn't need any animation library or changes to the Tailwind config.
const PARTICLE_COUNT = 14;

export default function StreakMilestoneModal({ streak, onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Mount in, then trigger the entrance transition on the next frame.
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200); // let the exit transition finish first
  };

  return (
    <div
      className={`fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={handleClose}
    >
      <style>{`
        @keyframes cookify-flame-rise {
          0%   { transform: translateY(0) scale(0.6); opacity: 0; }
          15%  { opacity: 1; }
          100% { transform: translateY(-160px) scale(1.1); opacity: 0; }
        }
        @keyframes cookify-flame-pulse {
          0%, 100% { transform: scale(1) rotate(-2deg); }
          50%      { transform: scale(1.12) rotate(2deg); }
        }
        @keyframes cookify-pop-in {
          0%   { transform: scale(0.7); opacity: 0; }
          60%  { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div
        className={`relative flex flex-col items-center gap-4 rounded-[32px] border border-orange-500/30 bg-zinc-950 px-8 py-10 mx-6 text-center shadow-[0_20px_80px_rgba(249,115,22,0.25)] ${
          visible ? "" : ""
        }`}
        style={{ animation: visible ? "cookify-pop-in 0.35s ease-out" : "none" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Rising flame particles */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-full overflow-hidden rounded-[32px]">
          {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
            <span
              key={i}
              className="absolute bottom-8 text-xl"
              style={{
                left: `${8 + ((i * 97) % 84)}%`,
                animation: `cookify-flame-rise ${1.6 + (i % 5) * 0.3}s ease-in ${i * 0.12}s infinite`,
              }}
            >
              🔥
            </span>
          ))}
        </div>

        <div className="relative text-7xl" style={{ animation: "cookify-flame-pulse 1.1s ease-in-out infinite" }}>
          🔥
        </div>

        <p className="relative text-xs uppercase tracking-[0.35em] text-orange-400">Milestone reached</p>
        <p className="relative text-4xl font-black text-white">{streak}-Day Streak!</p>
        <p className="relative max-w-[220px] text-sm text-gray-400">
          You've opened Cookify {streak} days in a row. Keep it going!
        </p>

        <button
          onClick={handleClose}
          className="relative mt-2 rounded-full bg-white px-8 py-3 text-sm font-bold uppercase tracking-[0.2em] text-black transition hover:bg-white/90"
        >
          Let's go
        </button>
      </div>
    </div>
  );
}
