import React, { useEffect, useRef, useState } from "react";
import {
  User,
  Settings,
  Camera,
  Store,
  X,
  ChefHat,
  Droplet,
  Salad,
  Trash2,
} from "lucide-react";
import { supabase } from "../supabase";
import UpgradeButton from "../components/UpgradeButton";
import { getUserItem, setUserItem } from "../utils/userStorage";
import { findAvailableUsername, isUsernameAvailable, nameFromAuthUser, slugifyUsername } from "../utils/username";
import { getNextWaterReminderTime, rollWaterReminderForward } from "../utils/notifications";
import { EmptyBowlDoodle } from "../components/EmptyStateDoodles";

const ACCENT_COLORS = [
  { name: "White", value: "#ffffff" },
  { name: "Orange", value: "#fb923c" },
  { name: "Emerald", value: "#34d399" },
  { name: "Sky", value: "#38bdf8" },
  { name: "Rose", value: "#fb7185" },
  { name: "Violet", value: "#a78bfa" },
];

export default function Profile({
  xp = 0,
  streak = 0,
  cookedCount = 0,
  cookedRecipesList = [],
  favoritesCount = 0,
  isPremium = false,
  tier = null,
  authUser = null,
  authProvider = null,
  onLogout = () => {},
  onOpenSettings = () => {},
  onOpenFavorites = () => {},
  onUpgraded = () => {},
}) {
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [username, setUsername] = useState("");
  const [accentColor, setAccentColor] = useState("#ffffff");
  const fileInputRef = useRef(null);
  const isGuest = authProvider === "guest" || !authProvider;
  const isSeller = tier === "pro_plus";

  const [sellerForm, setSellerForm] = useState({
    bank_name: "",
    account_name: "",
    account_number: "",
    address: "",
    delivery_radius_km: "5",
  });
  const [savingSeller, setSavingSeller] = useState(false);
  const [locatingSeller, setLocatingSeller] = useState(false);
  const [locationStatus, setLocationStatus] = useState("");
  const [showCookedModal, setShowCookedModal] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(""); // transient feedback while editing

  // Live water-reminder countdown — only runs if the person has turned
  // water reminders on in Settings. Rolls itself forward to the next
  // 2-hour window as soon as it hits zero, so it keeps counting down
  // "after each session" indefinitely without needing anything else to
  // trigger it.
  const [waterRemindersOn, setWaterRemindersOn] = useState(false);
  const [waterCountdown, setWaterCountdown] = useState("");

  useEffect(() => {
    const on = getUserItem(authUser, "cookify_water_reminders_on") === "true";
    setWaterRemindersOn(on);
    if (!on) return;

    const WATER_INTERVAL_HOURS = 2;
    const tick = () => {
      let target = getNextWaterReminderTime(authUser, WATER_INTERVAL_HOURS);
      let remainingMs = target.getTime() - Date.now();
      if (remainingMs <= 0) {
        target = rollWaterReminderForward(authUser, WATER_INTERVAL_HOURS);
        remainingMs = target.getTime() - Date.now();
      }
      const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      setWaterCountdown(`${h > 0 ? `${h}h ` : ""}${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [authUser?.id]);

  // Saved diet plans (from the Diet Plan scan mode's "Save" button).
  // Stored per account, same pattern as favorites/progress.
  const [dietPlans, setDietPlans] = useState([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(getUserItem(authUser, "cookify_diet_plans") || "[]");
      setDietPlans(Array.isArray(stored) ? stored : []);
    } catch (e) {
      setDietPlans([]);
    }
  }, [authUser?.id]);

  const deleteDietPlan = (id) => {
    const next = dietPlans.filter((p) => p.id !== id);
    setDietPlans(next);
    setUserItem(authUser, "cookify_diet_plans", JSON.stringify(next));
  };

  // Local (fast) load, scoped per account so switching Google accounts
  // never shows a different person's photo/username/color.
  useEffect(() => {
    setProfilePhoto(null);
    setUsername("");
    setAccentColor("#ffffff");

    const stored = getUserItem(authUser, "cookify_profile_photo");
    if (stored) setProfilePhoto(stored);

    const storedName = getUserItem(authUser, "cookify_username");
    if (storedName) setUsername(storedName);

    const storedColor = getUserItem(authUser, "cookify_accent_color");
    if (storedColor) setAccentColor(storedColor);
  }, [authUser?.id]);

  // Source of truth: the `profiles` table. On first login for this account,
  // auto-generate a unique username from their Google name (e.g. "Ade Ola"
  // -> "ade_ola", or "ade_ola_2" if that's already taken by someone else)
  // and save it — this is what guarantees no two people share a username.
  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;

    supabase
      .from("profiles")
      .select("username, accent_color, seller_bank_name, seller_account_name, seller_account_number, seller_address, delivery_radius_km, seller_lat, seller_lng")
      .eq("user_id", authUser.id)
      .maybeSingle()
      .then(async ({ data }) => {
        if (cancelled) return;

        if (data?.accent_color) setAccentColor(data.accent_color);
        if (data) {
          setSellerForm({
            bank_name: data.seller_bank_name || "",
            account_name: data.seller_account_name || "",
            account_number: data.seller_account_number || "",
            address: data.seller_address || "",
            delivery_radius_km: data.delivery_radius_km ? String(data.delivery_radius_km) : "5",
            lat: data.seller_lat ?? null,
            lng: data.seller_lng ?? null,
          });
        }

        if (data?.username) {
          setUsername(data.username);
          setUserItem(authUser, "cookify_username", data.username);
          return;
        }

        // No username on file yet for this account — generate one from
        // their Google display name and reserve it.
        const base = nameFromAuthUser(authUser);
        const unique = await findAvailableUsername(supabase, base, authUser.id);
        if (cancelled) return;

        setUsername(unique);
        setUserItem(authUser, "cookify_username", unique);
        try {
          await supabase.from("profiles").upsert({ user_id: authUser.id, username: unique });
        } catch (e) {
          // profiles table/username column may not be migrated yet —
          // the username still works locally for this session.
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [authUser?.id]);

  const handleEditUsername = async () => {
    const draft = window.prompt("Choose a username:", username || "");
    if (!draft || !draft.trim()) return;

    const clean = slugifyUsername(draft.trim());
    if (clean === username) return;

    setUsernameStatus("Checking availability...");
    const available = authUser
      ? await isUsernameAvailable(supabase, clean, authUser.id)
      : true;

    if (!available) {
      setUsernameStatus(`"${clean}" is already taken — try another.`);
      return;
    }

    setUsername(clean);
    setUserItem(authUser, "cookify_username", clean);
    setUsernameStatus("Username updated.");

    if (authUser) {
      try {
        await supabase.from("profiles").upsert({ user_id: authUser.id, username: clean });
      } catch (e) {
        setUsernameStatus("Saved locally — couldn't sync to the server yet.");
      }
    }
  };

  const handleUploadPhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setProfilePhoto(result);
        setUserItem(authUser, "cookify_profile_photo", result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePickColor = async (color) => {
    setAccentColor(color);
    setUserItem(authUser, "cookify_accent_color", color);
    if (authUser) {
      try {
        await supabase.from("profiles").upsert({ user_id: authUser.id, accent_color: color });
      } catch (e) {}
    }
  };

  const captureSellerLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("Geolocation isn't supported on this device.");
      return;
    }
    setLocatingSeller(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSellerForm((s) => ({ ...s, lat: pos.coords.latitude, lng: pos.coords.longitude }));
        setLocationStatus("Location captured — save to apply it to your delivery radius.");
        setLocatingSeller(false);
      },
      () => {
        setLocationStatus("Couldn't get your location — check location permission for this site.");
        setLocatingSeller(false);
      }
    );
  };

  const saveSellerDetails = async () => {
    if (!authUser) return;
    setSavingSeller(true);
    try {
      await supabase.from("profiles").upsert({
        user_id: authUser.id,
        seller_bank_name: sellerForm.bank_name.trim(),
        seller_account_name: sellerForm.account_name.trim(),
        seller_account_number: sellerForm.account_number.trim(),
        seller_address: sellerForm.address.trim(),
        delivery_radius_km: parseFloat(sellerForm.delivery_radius_km) || 5,
        seller_lat: sellerForm.lat ?? null,
        seller_lng: sellerForm.lng ?? null,
      });
    } catch (e) {
      alert("Couldn't save — the profiles table may not be set up yet.");
    }
    setSavingSeller(false);
  };

  const tierLabel = tier === "pro_plus" ? "Cookify Pro+" : tier === "pro" ? "Cookify Pro" : "Free";

  return (
    <div className="flex-1 overflow-y-auto bg-black p-5 text-white">

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black">Profile</h1>
          <p className="text-sm uppercase tracking-[0.35em] text-gray-400 mt-1">Your kitchen identity</p>
        </div>
        <span
          className="rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.35em]"
          style={{ borderColor: accentColor, color: accentColor }}
        >
          {tierLabel}
        </span>
      </div>

      <div
        className="bg-white/5 border rounded-[32px] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-colors"
        style={{ borderColor: `${accentColor}55` }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div
              className="h-28 w-28 rounded-full border-2 bg-white/5 overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
              style={{ borderColor: accentColor }}
            >
              {profilePhoto ? (
                <img src={profilePhoto} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-white/70 bg-black/40">
                  <User size={40} />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -right-2 -bottom-2 flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-[0_8px_24px_rgba(0,0,0,0.25)] border border-white/20"
              aria-label="Change profile photo"
            >
              <Camera className="w-5 h-5" />
            </button>
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
              {isGuest ? "Guest" : (username || "Set your username")}
              {!isGuest && (
                <button type="button" onClick={handleEditUsername} aria-label="Edit username" className="text-white/40 hover:text-white transition text-base">
                  ✏️
                </button>
              )}
            </h2>
            <p className="text-sm text-gray-400">
              {isGuest ? "Browsing as guest" : isSeller ? "Cookify Pro+ Seller" : "Cookify Creator"}
            </p>
            {!isGuest && usernameStatus && (
              <p className="text-xs text-gray-500 mt-1">{usernameStatus}</p>
            )}
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadPhoto} />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm uppercase tracking-[0.35em] font-bold text-white transition hover:bg-white/15"
          >
            {profilePhoto ? "Change Photo" : "Upload Photo"}
          </button>

          <div className="flex gap-2 mt-1">
            {ACCENT_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => handlePickColor(c.value)}
                aria-label={c.name}
                className="h-7 w-7 rounded-full border-2"
                style={{ backgroundColor: c.value, borderColor: accentColor === c.value ? "#fff" : "transparent" }}
              />
            ))}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="rounded-3xl border border-white/10 bg-black/60 p-5 text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-gray-400">Streak</p>
            <p className="mt-3 text-3xl font-black">{streak}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/60 p-5 text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-gray-400">XP</p>
            <p className="mt-3 text-3xl font-black">{xp}</p>
          </div>
        </div>

        {waterRemindersOn && (
          <div className="mt-4 rounded-3xl border border-sky-400/20 bg-sky-500/5 p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Droplet className="h-6 w-6 text-sky-300" />
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-gray-400">Next Water Break</p>
                <p className="text-sm text-white/60">Turn off anytime in Settings</p>
              </div>
            </div>
            <p className="text-2xl font-black tabular-nums text-sky-200">{waterCountdown}</p>
          </div>
        )}

        <div className="mt-6 space-y-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-gray-400">Cookify Pro</p>
              <p className="mt-2 text-sm text-white/80">25 AI Chef questions/day — $2/month.</p>
            </div>
            <UpgradeButton authUser={authUser} currentTier={tier} tier="pro" onUpgraded={onUpgraded} />
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-gray-400">Cookify Pro+</p>
              <p className="mt-2 text-sm text-white/80">Unlimited AI + sell food on E-Restaurant — $4/month.</p>
            </div>
            <UpgradeButton authUser={authUser} currentTier={tier} tier="pro_plus" onUpgraded={onUpgraded} />
          </div>
        </div>

        {isSeller && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Store className="h-4 w-4" />
              <p className="text-xs uppercase tracking-[0.35em] text-gray-400">Seller Payment Details</p>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Shown to buyers on E-Restaurant so they can pay you directly. Only add real details you're comfortable sharing.
            </p>
            <div className="space-y-2">
              <input
                value={sellerForm.bank_name}
                onChange={(e) => setSellerForm((s) => ({ ...s, bank_name: e.target.value }))}
                placeholder="Bank name"
                className="w-full rounded-xl bg-black border border-white/15 p-3 text-sm"
              />
              <input
                value={sellerForm.account_name}
                onChange={(e) => setSellerForm((s) => ({ ...s, account_name: e.target.value }))}
                placeholder="Account name"
                className="w-full rounded-xl bg-black border border-white/15 p-3 text-sm"
              />
              <input
                value={sellerForm.account_number}
                onChange={(e) => setSellerForm((s) => ({ ...s, account_number: e.target.value }))}
                placeholder="Account number"
                className="w-full rounded-xl bg-black border border-white/15 p-3 text-sm"
              />
              <input
                value={sellerForm.address}
                onChange={(e) => setSellerForm((s) => ({ ...s, address: e.target.value }))}
                placeholder="Pickup address (for buyer directions)"
                className="w-full rounded-xl bg-black border border-white/15 p-3 text-sm"
              />

              <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Delivery Range</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={sellerForm.delivery_radius_km}
                    onChange={(e) => setSellerForm((s) => ({ ...s, delivery_radius_km: e.target.value }))}
                    className="w-20 rounded-lg bg-black border border-white/15 p-2 text-sm text-center"
                  />
                  <span className="text-sm text-gray-400">km radius from your location</span>
                </div>
                <button
                  type="button"
                  onClick={captureSellerLocation}
                  disabled={locatingSeller}
                  className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 py-2 text-xs font-bold uppercase tracking-wide text-white disabled:opacity-50"
                >
                  {locatingSeller ? "Locating..." : sellerForm.lat ? "Update My Location" : "Use My Current Location"}
                </button>
                {locationStatus && <p className="mt-2 text-xs text-gray-500">{locationStatus}</p>}
              </div>
            </div>
            <button
              onClick={saveSellerDetails}
              disabled={savingSeller}
              className="mt-3 w-full rounded-xl bg-white text-black py-2.5 font-bold text-sm disabled:opacity-50"
            >
              {savingSeller ? "Saving..." : "Save Seller Details"}
            </button>
          </div>
        )}

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Salad className="h-4 w-4" />
            <p className="text-xs uppercase tracking-[0.35em] text-gray-400">My Diet Plans</p>
          </div>

          {dietPlans.length === 0 ? (
            <div className="py-2 text-center">
              <EmptyBowlDoodle className="mx-auto mb-3 w-16 h-16 text-white/30" />
              <p className="text-sm text-gray-500">
                Diet plans you save from Scan Food → Diet Plan will show up here, with reminders and the ingredients you'll need.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {dietPlans.map((plan) => (
                <div key={plan.id} className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-white">{plan.title}</p>
                      <p className="text-xs text-gray-500">{new Date(plan.createdAt).toLocaleDateString()}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteDietPlan(plan.id)}
                      aria-label="Delete diet plan"
                      className="shrink-0 text-white/40 transition hover:text-rose-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-white/80 whitespace-pre-wrap">{plan.body}</p>
                  {plan.ingredients?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500 mb-1">Ingredients needed</p>
                      <ul className="flex flex-wrap gap-1.5">
                        {plan.ingredients.map((ing, i) => (
                          <li key={i} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/80">
                            {ing}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 space-y-4">
          <button
            type="button"
            onClick={() => setShowCookedModal(true)}
            className="w-full rounded-3xl border border-white/10 bg-white/10 py-4 text-left px-5 text-white transition hover:bg-white/15 flex items-center justify-between"
          >
            <span className="font-bold uppercase tracking-[0.35em]">Recipes Cooked</span>
            <span className="text-white/80">{cookedCount}</span>
          </button>
          <button
            type="button"
            onClick={onOpenFavorites}
            className="w-full rounded-3xl border border-white/10 bg-white/10 py-4 text-left px-5 text-white transition hover:bg-white/15 flex items-center justify-between"
          >
            <span className="font-bold uppercase tracking-[0.35em]">Favorites</span>
            <span className="text-white/80">{favoritesCount}</span>
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full rounded-3xl border border-white/10 bg-white/10 py-4 text-left px-5 text-white transition hover:bg-white/15 flex items-center justify-between"
          >
            <span className="font-bold uppercase tracking-[0.35em]">Settings</span>
            <Settings className="w-5 h-5 text-white/80" />
          </button>
        </div>

        <button
          onClick={onLogout}
          className="mt-6 w-full rounded-3xl bg-white text-black py-4 font-bold uppercase tracking-[0.35em] shadow-[0_12px_30px_rgba(255,255,255,0.18)]"
        >
          Log Out
        </button>
      </div>

      {showCookedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-[420px] rounded-[28px] border border-white/10 bg-zinc-950 p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black">Recipes Cooked</h3>
              <button onClick={() => setShowCookedModal(false)} className="rounded-full border border-white/10 bg-white/10 p-2">
                <X className="h-5 w-5" />
              </button>
            </div>

            {cookedRecipesList.length === 0 ? (
              <p className="text-sm text-gray-500">
                No recipes yet — opening the AI Tutor on a dish logs it here.
              </p>
            ) : (
              <div className="space-y-3">
                {cookedRecipesList.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                    {r.image ? (
                      <img src={r.image} alt={r.title} loading="lazy" decoding="async" className="h-12 w-12 rounded-xl object-cover" />
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center">
                        <ChefHat className="h-5 w-5 text-white/40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{r.title}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(r.cookedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
