// Lightweight inline SVG doodles for empty states — hand-drawn-style
// line art, monochrome to match the app's existing black & white theme
// (no new colors introduced, no image assets to load/host).

export function EmptyPlateDoodle({ className = "w-24 h-24" }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className}>
      <circle cx="50" cy="50" r="34" stroke="currentColor" strokeWidth="2.5" strokeDasharray="4 5" opacity="0.5" />
      <circle cx="50" cy="50" r="20" stroke="currentColor" strokeWidth="2.5" opacity="0.8" />
      <path d="M32 30c-2 4-2 8 0 11M68 30c2 4 2 8 0 11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      <path d="M28 72c8 6 36 6 44 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

export function EmptyChatDoodle({ className = "w-24 h-24" }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className}>
      <path
        d="M20 30h60a4 4 0 0 1 4 4v28a4 4 0 0 1-4 4H46l-14 12V66H20a4 4 0 0 1-4-4V34a4 4 0 0 1 4-4Z"
        stroke="currentColor" strokeWidth="2.5" opacity="0.6"
      />
      <circle cx="36" cy="48" r="2.5" fill="currentColor" opacity="0.7" />
      <circle cx="50" cy="48" r="2.5" fill="currentColor" opacity="0.7" />
      <circle cx="64" cy="48" r="2.5" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

export function EmptyMapDoodle({ className = "w-24 h-24" }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className}>
      <path
        d="M50 20c-11 0-20 9-20 20 0 15 20 38 20 38s20-23 20-38c0-11-9-20-20-20Z"
        stroke="currentColor" strokeWidth="2.5" opacity="0.6"
      />
      <circle cx="50" cy="40" r="7" stroke="currentColor" strokeWidth="2.5" opacity="0.7" />
      <path d="M22 82c8-4 48-4 56 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 5" opacity="0.35" />
    </svg>
  );
}

export function EmptyBowlDoodle({ className = "w-24 h-24" }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className}>
      <path d="M22 46h56a2 2 0 0 1 2 2c0 14-13 24-30 24s-30-10-30-24a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2.5" opacity="0.7" />
      <path d="M40 46c0-8 4-16 10-16s10 8 10 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
      <path d="M30 78h40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.35" />
    </svg>
  );
}
