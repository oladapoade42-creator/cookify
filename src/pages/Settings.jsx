import { useState, useEffect } from "react";
import { ArrowLeft, Bell, Moon, Sun, LogOut, Crown, ChevronRight, Trash2, Loader2, Phone, ShieldCheck } from "lucide-react";
import { supabase } from "../supabase";

export default function Settings({ isPremium = false, onBack = () => {}, onLogout = () => {}, theme = "dark", onToggleTheme = () => {}, authUser = null }) {
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notifications, setNotifications] = useState(
    typeof Notification !== "undefined" && Notification.permission === "granted"
  );
  const [notifStatus, setNotifStatus] = useState("");
  const [soundEffects, setSoundEffects] = useState(true);

  // Phone verification
  const [phone, setPhone] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpStage, setOtpStage] = useState("idle"); // 'idle' | 'sending' | 'sent' | 'verifying'
  const [otpCode, setOtpCode] = useState("");
  const [phoneStatus, setPhoneStatus] = useState("");

  useEffect(() => {
    if (!authUser) return;
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user;
      if (!u) return;
      if (u.phone) setPhone(u.phone);
      setPhoneVerified(!!u.phone_confirmed_at);
    });
  }, [authUser?.id]);

  const sendPhoneCode = async () => {
    const cleaned = phone.trim();
    if (!cleaned) {
      setPhoneStatus("Enter your number with country code, e.g. +14155551234.");
      return;
    }
    setOtpStage("sending");
    setPhoneStatus("");
    // Links this phone number to the already-signed-in account and
    // triggers Supabase to text a verification code to it.
    const { error } = await supabase.auth.updateUser({ phone: cleaned });
    if (error) {
      setPhoneStatus(error.message || "Couldn't send a code — check the number and try again.");
      setOtpStage("idle");
      return;
    }
    setOtpStage("sent");
    setPhoneStatus("Code sent — enter it below.");
  };

  const verifyPhoneCode = async () => {
    if (!otpCode.trim()) return;
    setOtpStage("verifying");
    setPhoneStatus("");
    const { error } = await supabase.auth.verifyOtp({
      phone: phone.trim(),
      token: otpCode.trim(),
      type: "phone_change",
    });
    if (error) {
      setPhoneStatus(error.message || "That code didn't match — check it and try again.");
      setOtpStage("sent");
      return;
    }
    setPhoneVerified(true);
    setOtpStage("idle");
    setOtpCode("");
    setPhoneStatus("Phone number verified.");
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

        {authUser && (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-3 mb-3">
              {phoneVerified ? <ShieldCheck className="h-5 w-5 text-emerald-400" /> : <Phone className="h-5 w-5 text-white/80" />}
              <div>
                <p className="font-medium">Phone Verification</p>
                <p className="text-sm text-gray-400">
                  {phoneVerified ? `Verified — ${phone}` : "Verify your number for account security"}
                </p>
              </div>
            </div>

            {!phoneVerified && (
              <div className="space-y-2">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+14155551234"
                  disabled={otpStage === "sent" || otpStage === "verifying"}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-white placeholder-gray-500 outline-none disabled:opacity-50"
                />

                {otpStage !== "sent" && otpStage !== "verifying" && (
                  <button
                    onClick={sendPhoneCode}
                    disabled={otpStage === "sending"}
                    className="w-full rounded-2xl bg-white py-3 font-bold text-black disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {otpStage === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {otpStage === "sending" ? "Sending code..." : "Send verification code"}
                  </button>
                )}

                {(otpStage === "sent" || otpStage === "verifying") && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="6-digit code"
                      className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-white placeholder-gray-500 outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setOtpStage("idle"); setOtpCode(""); setPhoneStatus(""); }}
                        className="flex-1 rounded-2xl border border-white/15 bg-white/5 py-3 font-bold text-white"
                      >
                        Change number
                      </button>
                      <button
                        onClick={verifyPhoneCode}
                        disabled={otpStage === "verifying"}
                        className="flex-1 rounded-2xl bg-white py-3 font-bold text-black disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {otpStage === "verifying" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {otpStage === "verifying" ? "Verifying..." : "Verify"}
                      </button>
                    </div>
                  </div>
                )}

                {phoneStatus && <p className="text-xs text-gray-500">{phoneStatus}</p>}
              </div>
            )}
          </section>
        )}

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
