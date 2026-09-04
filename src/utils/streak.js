import { getUserItem, setUserItem } from "./userStorage";

// Streak model (rolling 24h windows, not calendar days — matches what
// was asked for specifically):
//
// - lastOpenedAt: timestamp of the most recent time the app was opened,
//   updated on every single open. Used to detect the streak breaking —
//   if more than 24h passed since the last open, the chain is broken.
// - lastStreakDayAt: timestamp of the last time the streak counter
//   itself was incremented. Used so opening the app 5 times in one
//   afternoon only credits one streak day, not five.
//
// Both are per-account (same pattern as favorites/progress elsewhere).

const MILESTONES = [10, 30, 50, 100, 200];

export function isMilestone(streak) {
  if (MILESTONES.includes(streak)) return true;
  return streak > 200 && streak % 100 === 0; // 300, 400, 500... "and so on"
}

// Call this once per app session (on mount). Returns the up-to-date
// streak count and whether this specific open just hit a milestone (so
// the caller can show the celebration exactly once, not on every open).
export function touchStreakOnOpen(authUser) {
  const now = Date.now();
  const lastOpenedAt = Number(getUserItem(authUser, "cookify_last_opened_at")) || null;
  const lastStreakDayAt = Number(getUserItem(authUser, "cookify_last_streak_day_at")) || null;
  let streak = Number(getUserItem(authUser, "cookify_streak_count")) || 0;

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  let milestoneHit = false;

  if (!lastStreakDayAt) {
    // First time ever opening the app.
    streak = 1;
    setUserItem(authUser, "cookify_last_streak_day_at", String(now));
    milestoneHit = isMilestone(streak);
  } else {
    const hoursSinceLastOpen = lastOpenedAt ? now - lastOpenedAt : 0;
    const hoursSinceStreakDay = now - lastStreakDayAt;

    if (hoursSinceLastOpen > ONE_DAY_MS) {
      // Went more than 24h without opening the app at some point since
      // the last credited day — the chain is broken, start over.
      streak = 1;
      setUserItem(authUser, "cookify_last_streak_day_at", String(now));
      milestoneHit = isMilestone(streak);
    } else if (hoursSinceStreakDay >= ONE_DAY_MS) {
      // Opened again within the 24h grace window, and it's been at
      // least a full day since the last credited streak day — award it.
      streak += 1;
      setUserItem(authUser, "cookify_last_streak_day_at", String(now));
      milestoneHit = isMilestone(streak);
    }
    // else: already credited for the current window — no change.
  }

  setUserItem(authUser, "cookify_streak_count", String(streak));
  setUserItem(authUser, "cookify_last_opened_at", String(now));

  return { streak, milestoneHit, lastOpenedAt: now };
}
