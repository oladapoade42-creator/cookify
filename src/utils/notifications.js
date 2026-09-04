import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { getUserItem, setUserItem, removeUserItem } from "./userStorage";

// Real, repeating local notifications only exist on the native
// Android/iOS build (via Capacitor). On the plain website there's no
// background process to fire a notification while the tab is closed, so
// there we fall back to the browser Notification API + a plain
// setInterval/setTimeout — it only works while the site tab stays open,
// which is a real limitation, but it's the closest web equivalent and
// still lets you demo/test the feature without the native app.
const isNative = () => Capacitor.isNativePlatform();

// Fixed IDs so re-scheduling a category (e.g. changing the water
// interval) reliably replaces its own old notification instead of
// piling up duplicates, and never collides with another category.
const IDS = {
  water: 1001,
  breakfast: 2001,
  lunch: 2002,
  dinner: 2003,
  dietPlan: 3001,
  confirmation: 9001,
  streak: 4001,
};

// Fires a one-off notification right away — used only to confirm a
// reminder category was actually turned on, since otherwise there's no
// visible feedback until the *first real* reminder fires (which could be
// up to 2 hours away for water, or until the next meal time). Without
// this, turning a toggle on looks like it did nothing.
async function fireConfirmationNotification(title, body) {
  if (isNative()) {
    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: IDS.confirmation,
          title,
          body,
          schedule: { at: new Date(Date.now() + 500) },
        }],
      });
    } catch (e) {
      // Non-critical — the real reminder is still scheduled either way.
    }
  } else if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

export async function requestNotificationPermission() {
  if (isNative()) {
    try {
      const { display } = await LocalNotifications.requestPermissions();
      return display === "granted";
    } catch (e) {
      return false;
    }
  }
  if (typeof Notification !== "undefined") {
    try {
      const perm = await Notification.requestPermission();
      return perm === "granted";
    } catch (e) {
      return false;
    }
  }
  return false;
}

// ---------------- Water reminders (repeating every N hours) ----------------

let webWaterTimer = null;

// Returns the water reminder's next-fire time as a Date, so the UI (the
// countdown on the profile page) can render against it without having to
// separately track scheduling state. Scoped per signed-in user (same
// pattern as favorites/progress) so switching Google accounts on the
// same device doesn't carry over someone else's countdown.
export function getNextWaterReminderTime(authUser, intervalHours) {
  const stored = getUserItem(authUser, "cookify_next_water_reminder");
  const stamp = stored ? Number(stored) : NaN;
  if (!Number.isNaN(stamp) && stamp > Date.now()) return new Date(stamp);
  const next = Date.now() + intervalHours * 60 * 60 * 1000;
  setUserItem(authUser, "cookify_next_water_reminder", String(next));
  return new Date(next);
}

// Call when the current countdown reaches zero — records + returns the
// following one so the profile page's countdown can keep going
// indefinitely ("after each session", as requested) without needing the
// notification itself to have fired first.
export function rollWaterReminderForward(authUser, intervalHours) {
  const next = Date.now() + intervalHours * 60 * 60 * 1000;
  setUserItem(authUser, "cookify_next_water_reminder", String(next));
  return new Date(next);
}

export async function enableWaterReminders(authUser, intervalHours = 2) {
  const granted = await requestNotificationPermission();
  if (!granted) return false;

  getNextWaterReminderTime(authUser, intervalHours); // seed the countdown if not already running

  if (isNative()) {
    await LocalNotifications.cancel({ notifications: [{ id: IDS.water }] });
    await LocalNotifications.schedule({
      notifications: [{
        id: IDS.water,
        title: "Time for some water 💧",
        body: "Take a quick water break — a good habit while you're cooking or working through a recipe.",
        schedule: { every: "hour", count: intervalHours, repeats: true, allowWhileIdle: true },
      }],
    });
  } else if (typeof Notification !== "undefined") {
    if (webWaterTimer) clearInterval(webWaterTimer);
    webWaterTimer = setInterval(() => {
      new Notification("Time for some water 💧", {
        body: "Take a quick water break — a good habit while you're cooking or working through a recipe.",
      });
    }, intervalHours * 60 * 60 * 1000);
  }
  fireConfirmationNotification("Water reminders on 💧", "You'll get a reminder like this every 2 hours.");
  return true;
}

export async function disableWaterReminders(authUser) {
  removeUserItem(authUser, "cookify_next_water_reminder");
  if (isNative()) {
    await LocalNotifications.cancel({ notifications: [{ id: IDS.water }] });
  } else if (webWaterTimer) {
    clearInterval(webWaterTimer);
    webWaterTimer = null;
  }
}

// ---------------- Meal reminders (daily, fixed times) ----------------

const MEAL_DEFAULTS = {
  breakfast: { hour: 8, minute: 0, label: "breakfast" },
  lunch: { hour: 13, minute: 0, label: "lunch" },
  dinner: { hour: 19, minute: 0, label: "supper" },
};

const webMealTimeouts = {};

function msUntilNextClockTime(hour, minute) {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

function scheduleWebDailyNotification(key, hour, minute, title, body) {
  if (webMealTimeouts[key]) clearTimeout(webMealTimeouts[key]);
  const fire = () => {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(title, { body });
    }
    // Reschedule for the same time tomorrow — this only keeps firing
    // while the tab stays open, same web limitation noted above.
    webMealTimeouts[key] = setTimeout(fire, 24 * 60 * 60 * 1000);
  };
  webMealTimeouts[key] = setTimeout(fire, msUntilNextClockTime(hour, minute));
}

export async function enableMealReminders(times = {}) {
  const granted = await requestNotificationPermission();
  if (!granted) return false;

  for (const meal of ["breakfast", "lunch", "dinner"]) {
    const { hour, minute, label } = { ...MEAL_DEFAULTS[meal], ...(times[meal] || {}) };
    const title = `Time for ${label} 🍽️`;
    const body = `Don't skip ${label} — check Cookify for something quick and good.`;

    if (isNative()) {
      await LocalNotifications.cancel({ notifications: [{ id: IDS[meal] }] });
      await LocalNotifications.schedule({
        notifications: [{
          id: IDS[meal],
          title,
          body,
          schedule: { on: { hour, minute }, repeats: true, allowWhileIdle: true },
        }],
      });
    } else {
      scheduleWebDailyNotification(meal, hour, minute, title, body);
    }
  }
  fireConfirmationNotification("Meal reminders on 🍽️", "You'll get a reminder for breakfast, lunch, and supper.");
  return true;
}

export async function disableMealReminders() {
  if (isNative()) {
    await LocalNotifications.cancel({
      notifications: [{ id: IDS.breakfast }, { id: IDS.lunch }, { id: IDS.dinner }],
    });
  } else {
    Object.values(webMealTimeouts).forEach((t) => clearTimeout(t));
  }
}

// ---------------- Saved diet plan reminder (daily) ----------------

export async function enableDietPlanReminder(planTitle, hour = 9, minute = 0) {
  const granted = await requestNotificationPermission();
  if (!granted) return false;

  const title = "Your diet plan 🥗";
  const body = planTitle ? `Don't forget today's plan: ${planTitle}` : "Check in on your saved diet plan for today.";

  if (isNative()) {
    await LocalNotifications.cancel({ notifications: [{ id: IDS.dietPlan }] });
    await LocalNotifications.schedule({
      notifications: [{
        id: IDS.dietPlan,
        title,
        body,
        schedule: { on: { hour, minute }, repeats: true, allowWhileIdle: true },
      }],
    });
  } else {
    scheduleWebDailyNotification("dietPlan", hour, minute, title, body);
  }
  return true;
}

export async function disableDietPlanReminder() {
  if (isNative()) {
    await LocalNotifications.cancel({ notifications: [{ id: IDS.dietPlan }] });
  } else if (webMealTimeouts.dietPlan) {
    clearTimeout(webMealTimeouts.dietPlan);
  }
}

// ---------------- Streak expiry warning (one-off, rescheduled every open) ----------------

let webStreakTimeout = null;

// Fires once, right around the moment the streak would actually expire
// (24h after the last open) — not a repeating reminder. Call this again
// every time the app opens (with the fresh lastOpenedAt) so it always
// points at the *current* deadline instead of an old one.
export async function scheduleStreakExpiryWarning(lastOpenedAt) {
  const granted = await requestNotificationPermission();
  if (!granted) return false;

  const fireAt = new Date(lastOpenedAt + 24 * 60 * 60 * 1000);
  const title = "Don't let your streak end 😭🔥";
  const body = "Open Cookify in the next few minutes to keep your streak alive.";

  if (isNative()) {
    await LocalNotifications.cancel({ notifications: [{ id: IDS.streak }] });
    if (fireAt.getTime() <= Date.now()) return true; // already past — nothing to schedule
    await LocalNotifications.schedule({
      notifications: [{ id: IDS.streak, title, body, schedule: { at: fireAt } }],
    });
  } else {
    if (webStreakTimeout) clearTimeout(webStreakTimeout);
    const msUntilFire = fireAt.getTime() - Date.now();
    if (msUntilFire <= 0) return true;
    webStreakTimeout = setTimeout(() => {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification(title, { body });
      }
    }, msUntilFire);
  }
  return true;
}

export async function cancelStreakExpiryWarning() {
  if (isNative()) {
    await LocalNotifications.cancel({ notifications: [{ id: IDS.streak }] });
  } else if (webStreakTimeout) {
    clearTimeout(webStreakTimeout);
    webStreakTimeout = null;
  }
}
