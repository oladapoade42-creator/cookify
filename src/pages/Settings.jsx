import { useState, useEffect } from "react";
import { ArrowLeft, Bell, Moon, Sun, LogOut, Crown, ChevronRight, Trash2, Loader2, Droplet, Utensils, ShieldAlert, Check } from "lucide-react";
import { supabase } from "../supabase";
import { Capacitor } from "@capacitor/core";
import { getUserItem, setUserItem } from "../utils/userStorage";
import { enableWaterReminders, disableWaterReminders, enableMealReminders, disableMealReminders } from "../utils/notifications";
import { isAdmin } from "../utils/admin";

export default function Settings({ isPremium = false, onBack = () => {}, onLogout = () => {}, theme = "dark", onToggleTheme = () => {}, authUser = null }) {
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notifications, setNotifications] = useState(
    typeof Notification !== "undefined" && Notification.permission === "granted"
  );
  const [notifStatus, setNotifStatus] = useState("");
  const [soundEffects, setSoundEffects] = useState(true);

  const [waterReminders, setWaterReminders] = useState(false);
  const [mealReminders, setMealReminders] = useState(false);
  const [reminderStatus, setReminderStatus] = useState("");

  const admin = isAdmin(authUser);
  const [flaggedComments, setFlaggedComments] = useState([]);
  const [flaggedListings, setFlaggedListings] = useState([]);

  useEffect(() => {
    if (!admin) return;
    supabase.from("comments").select("id, text, flag_reason, created_at").eq("flagged", true)
      .order("created_at", { ascending: false }).then(({ data }) => setFlaggedComments(data || []));
    supabase.from("food_listings").select("id, title, description, flag_reason, created_at").eq("flagged", true)
      .order("created_at", { ascending: false }).then(({ data }) => setFlaggedListings(data || []));
  }, [admin]);

  const approveComment = async (id) => {
    await supabase.from("comments").update({ flagged: false }).eq("id", id);
    setFlaggedComments((prev) => prev.filter((c) => c.id !== id));
  };
  const deleteComment = async (id) => {
    await supabase.from("comments").delete().eq("id", id);
    setFlaggedComments((prev) => prev.filter((c) => c.id !== id));
  };
  const approveListing = async (id) => {
    await supabase.from("food_listings").update({ flagged: false, is_visible: true }).eq("id", id);
    setFlaggedListings((prev) => prev.filter((l) => l.id !== id));
  };
  const deleteListing = async (id) => {
    await supabase.from("food_listings").delete().eq("id", id);
    setFlaggedListings((prev) => prev.filter((l) => l.id !== id));
  };

  useEffect(() => {
    setWaterReminders(getUserItem(authUser, "cookify_water_reminders_on") === "true");
    setMealReminders(getUserItem(authUser, "cookify_meal_reminders_on") === "true");
  }, [authUser?.id]);

  const toggleWaterReminders = async () => {
    setReminderStatus("");
    if (waterReminders) {
      await disableWaterReminders(authUser);
      setUserItem(authUser, "cookify_water_reminders_on", "false");
      setWaterReminders(false);
      return;
    }
    const ok = await enableWaterReminders(authUser, 2);
    if (ok) {
      setUserItem(authUser, "cookify_water_reminders_on", "true");
      setWaterReminders(true);
      setReminderStatus(
        Capacitor.isNativePlatform()
          ? "On — you'll get a real reminder every 2 hours, plus a confirmation just now."
          : "On — you should see a confirmation notification just now. On the website, reminders only fire while this tab stays open; the native app delivers them in the background."
      );
    } else {
      setReminderStatus("Notification permission was denied — enable it in your device settings to use reminders.");
    }
  };

  const toggleMealReminders = async () => {
    setReminderStatus("");
    if (mealReminders) {
      await disableMealReminders();
      setUserItem(authUser, "cookify_meal_reminders_on", "false");
      setMealReminders(false);
      return;
    }
    const ok = await enableMealReminders();
    if (ok) {
      setUserItem(authUser, "cookify_meal_reminders_on", "true");
      setMealReminders(true);
      setReminderStatus(
        Capacitor.isNativePlatform()
          ? "On — breakfast, lunch, and supper reminders scheduled, plus a confirmation just now."
          : "On — you should see a confirmation notification just now. On the website, reminders only fire while this tab stays open; the native app delivers them in the background."
      );
    } else {
      setReminderStatus("Notification permission was denied — enable it in your device settings to use reminders.");
    }
  };

  const toggleNotifications = async () => {
    if (typeof Notification === "undefined") {
      setNotifStatus("This browser doesn't support notifications.");
      return;
    }

    if (notifications) {
      // Browsers don't allow revoking permission from JS — direct them to browser settings.
      setNotifications(false);
      setNotifStatus("To fully disable, turn off notifications for this site in your browser settings.");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setNotifications(true);
      setNotifStatus("Notifications enabled.");
      new Notification("Cookify", { body: "Nice — you'll get reminders here for daily challenges and streaks." });
    } else {
      setNotifications(false);
      setNotifStatus("Permission was denied — enable it from your browser's site settings.");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-black p-5 text-white">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label="Back"
          className="rounded-full border border-white/10 bg-white/5 p-2 transition hover:bg-white/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-black">Settings</h1>
      </div>

      <div className="space-y-4">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="mb-4 text-xs uppercase tracking-[0.35em] text-gray-400">Preferences</p>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-white/80" />
              <span className="font-medium">Notifications</span>
            </div>
            <button
              onClick={toggleNotifications}
              className={`h-7 w-12 rounded-full transition ${notifications ? "bg-white" : "bg-white/10"}`}
              aria-pressed={notifications}
            >
              <span
                className={`block h-6 w-6 rounded-full bg-black shadow transition-transform ${
                  notifications ? "translate-x-5 bg-black" : "translate-x-0.5 bg-gray-500"
                }`}
              />
            </button>
          </div>
          {notifStatus && <p className="text-xs text-gray-500 mt-1">{notifStatus}</p>}

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Moon className="h-5 w-5 text-white/80" />
              <span className="font-medium">Sound Effects</span>
            </div>
            <button
              onClick={() => setSoundEffects((v) => !v)}
              className={`h-7 w-12 rounded-full transition ${soundEffects ? "bg-white" : "bg-white/10"}`}
              aria-pressed={soundEffects}
            >
              <span
                className={`block h-6 w-6 rounded-full shadow transition-transform ${
                  soundEffects ? "translate-x-5 bg-black" : "translate-x-0.5 bg-gray-500"
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              {theme === "light" ? <Sun className="h-5 w-5 text-white/80" /> : <Moon className="h-5 w-5 text-white/80" />}
              <span className="font-medium">Light Mode</span>
            </div>
            <button
              onClick={onToggleTheme}
              className={`h-7 w-12 rounded-full transition ${theme === "light" ? "bg-white" : "bg-white/10"}`}
              aria-pressed={theme === "light"}
            >
              <span
                className={`block h-6 w-6 rounded-full shadow transition-transform ${
                  theme === "light" ? "translate-x-5 bg-black" : "translate-x-0.5 bg-gray-500"
                }`}
              />
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="mb-4 text-xs uppercase tracking-[0.35em] text-gray-400">Reminders</p>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Droplet className="h-5 w-5 text-white/80" />
              <div>
                <p className="font-medium">Water Reminders</p>
                <p className="text-xs text-gray-500">Every 2 hours</p>
              </div>
            </div>
            <button
              onClick={toggleWaterReminders}
              className={`h-7 w-12 rounded-full transition ${waterReminders ? "bg-white" : "bg-white/10"}`}
              aria-pressed={waterReminders}
            >
              <span
                className={`block h-6 w-6 rounded-full shadow transition-transform ${
                  waterReminders ? "translate-x-5 bg-black" : "translate-x-0.5 bg-gray-500"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Utensils className="h-5 w-5 text-white/80" />
              <div>
                <p className="font-medium">Meal Reminders</p>
                <p className="text-xs text-gray-500">Breakfast, lunch & supper</p>
              </div>
            </div>
            <button
              onClick={toggleMealReminders}
              className={`h-7 w-12 rounded-full transition ${mealReminders ? "bg-white" : "bg-white/10"}`}
              aria-pressed={mealReminders}
            >
              <span
                className={`block h-6 w-6 rounded-full shadow transition-transform ${
                  mealReminders ? "translate-x-5 bg-black" : "translate-x-0.5 bg-gray-500"
                }`}
              />
            </button>
          </div>

          {reminderStatus && <p className="mt-1 text-xs text-gray-500">{reminderStatus}</p>}
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown className="h-5 w-5 text-white/80" />
              <div>
                <p className="font-medium">Cookify Pro</p>
                <p className="text-sm text-gray-400">{isPremium ? "Active" : "Not subscribed"}</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-white/40" />
          </div>
        </section>

        {admin && (flaggedComments.length > 0 || flaggedListings.length > 0) && (
          <section className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="h-4 w-4 text-amber-300" />
              <p className="text-xs uppercase tracking-[0.35em] text-amber-300">Needs Review</p>
            </div>

            {flaggedComments.map((c) => (
              <div key={c.id} className="mb-3 rounded-2xl border border-white/10 bg-black/40 p-3">
                <p className="text-sm text-white/90">{c.text}</p>
                <p className="mt-1 text-xs text-amber-300/80">Flagged: {c.flag_reason || "unspecified"}</p>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => approveComment(c.id)} className="flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white">
                    <Check className="h-3 w-3" /> Approve
                  </button>
                  <button onClick={() => deleteComment(c.id)} className="flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs text-rose-300">
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              </div>
            ))}

            {flaggedListings.map((l) => (
              <div key={l.id} className="mb-3 rounded-2xl border border-white/10 bg-black/40 p-3">
                <p className="text-sm font-bold text-white/90">{l.title}</p>
                <p className="text-sm text-white/70">{l.description}</p>
                <p className="mt-1 text-xs text-amber-300/80">Flagged: {l.flag_reason || "unspecified"}</p>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => approveListing(l.id)} className="flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white">
                    <Check className="h-3 w-3" /> Approve
                  </button>
                  <button onClick={() => deleteListing(l.id)} className="flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs text-rose-300">
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        <section className="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-5">
          <div className="flex items-center gap-3 mb-2">
            <Trash2 className="h-5 w-5 text-rose-300" />
            <p className="font-medium text-rose-200">Remove Profile</p>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Permanently deletes your account, favorites, comments, likes, subscription, and any food listings you've posted. This can't be undone.
          </p>

          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full rounded-2xl border border-rose-400/40 bg-rose-500/10 py-3 font-bold text-rose-200"
            >
              Remove Profile
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-center text-xs text-rose-300">Are you sure? This is permanent.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-2xl border border-white/15 bg-white/5 py-3 font-bold text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!authUser) { onLogout(); return; }
                    setDeleting(true);
                    try {
                      const { data: sessionData } = await supabase.auth.getSession();
                      const accessToken = sessionData?.session?.access_token;
                      const { error } = await supabase.functions.invoke("delete-account", {
                        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
                      });
                      if (error) throw error;
                      onLogout();
                    } catch (e) {
                      alert("Couldn't delete your account automatically right now — please try again, or contact support if it keeps failing.");
                    }
                    setDeleting(false);
                  }}
                  disabled={deleting}
                  className="flex-1 rounded-2xl bg-rose-500 py-3 font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {deleting ? "Deleting..." : "Yes, delete"}
                </button>
              </div>
            </div>
          )}
        </section>

        <button
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-3xl bg-white py-4 font-bold uppercase tracking-[0.35em] text-black"
        >
          <LogOut className="h-4 w-4" />
          Log Out
        </button>
      </div>
    </div>
  );
}
