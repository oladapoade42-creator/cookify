import { inject } from '@vercel/analytics';
import { supabase } from './supabase';
import RecipeCard from "./components/RecipeCard";
import XPCard from "./components/XPCard";
import BottomNav from "./components/BottomNav";
import Header from "./components/Header";
import Profile from "./pages/Profile";
import AI from './pages/AIChef';
import Learn from './pages/Learn';
import Home from './pages/Home';
import Favorites from './pages/Favorites';
import Settings from './pages/Settings';
import ERestaurant from './pages/ERestaurant';
import UpgradeButton from './components/UpgradeButton';
import { getUserItem, setUserItem, migrateAllLegacyKeys } from './utils/userStorage';
import React, { useState, useEffect } from 'react';
import {
  ChefHat,
  BookOpen,
  User,
  Flame,
  Sparkles,
  Camera,
  Loader2,
  Lock,
  Star,
  CheckCircle,
  ArrowRight,
  LogOut,
  House,
  Heart,
  X,
} from 'lucide-react';

export default function App() {
  useEffect (() => {
    //This ensures it only runs safely in the browser context
    inject();
  }, []);
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authProvider, setAuthProvider] = useState(null); // 'google' | 'apple' | 'guest'
  const [authUser, setAuthUser] = useState(null); // { id, email } for Google/Apple — null for guest

  // useState
  const handleLogin = async (provider) => {
    if (provider === 'guest') {
      setAuthProvider('guest');
      setIsAuthenticated(true);
      return;
    }
    if (provider === 'apple') {
      // Apple Sign In requires a paid Apple Developer account to configure —
      // not wired up yet, so fail gracefully instead of erroring on an
      // unconfigured provider.
      alert('Service temporarily not available at the moment.');
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      // Without this, Google silently reuses whatever Google account is
      // still signed into the browser instead of letting the person pick
      // a different one — this is what "shows the same account" was.
      options: provider === 'google' ? { queryParams: { prompt: 'select_account' } } : undefined,
    });
    if (error) {
      alert(`Login failed: ${error.message}`);
      return;
    }
    // Supabase redirects the browser through the OAuth flow — the actual
    // session gets picked up by onAuthStateChange below once it returns.
  };

  // Logging out has to end the actual Supabase session — just flipping
  // isAuthenticated left the old session (and authUser/authProvider) alive,
  // so logging back in just picked the same session right back up.
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setAuthUser(null);
    setAuthProvider(null);
  };

  // Pick up the real Supabase session after an OAuth redirect (Google/Apple),
  // and keep it in sync if it changes.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const session = data?.session;
      if (session?.user) {
        setAuthUser({ id: session.user.id, email: session.user.email });
        setAuthProvider(session.user.app_metadata?.provider || 'google');
        setIsAuthenticated(true);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAuthUser({ id: session.user.id, email: session.user.email });
        setAuthProvider(session.user.app_metadata?.provider || 'google');
        setIsAuthenticated(true);
      }
    });

    return () => listener?.subscription?.unsubscribe();
  }, []);

  // App States
  const [activeTab, setActiveTab] = useState('home');
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [cookedCount, setCookedCount] = useState(0);
  const [cookedRecipesList, setCookedRecipesList] = useState([]);
  const [isPremium, setIsPremium] = useState(false);
  const [tier, setTier] = useState(null); // 'pro' | 'pro_plus' | null
  const isSeller = tier === 'pro_plus'; // only Pro+ subscribers can sell on E-Restaurant
  const [tutorOpenRequest, setTutorOpenRequest] = useState(0);
  const [openListingId, setOpenListingId] = useState(null);
  const [favorites, setFavorites] = useState([]);
  // Prevents a subtle bug: when authUser changes, this render's `favorites`
  // closure is still the *previous* account's array until the load effect's
  // async setFavorites takes effect. Without this guard, the save effect
  // below would fire once with the old account's favorites and overwrite
  // the new account's storage with them.
  const skipNextFavoritesSaveRef = React.useRef(false);

  // Keyed on authUser?.id so this reloads (with fresh, per-account data)
  // every time someone logs in as a *different* account — not just once
  // on mount. Always resets to defaults first so a brand-new account
  // never briefly shows the previous account's numbers before its own
  // (empty) data loads.
  useEffect(() => {
    // One-time move of any pre-existing unscoped data onto this account.
    migrateAllLegacyKeys(authUser);

    skipNextFavoritesSaveRef.current = true;
    setFavorites([]);
    setXp(0);
    setCookedCount(0);
    setCookedRecipesList([]);
    setStreak(0);

    const stored = getUserItem(authUser, 'cookify_favorites');
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch (e) {
        setFavorites([]);
      }
    }

    // Restore progress (XP, streak, cooked count) saved from previous sessions
    const storedProgress = getUserItem(authUser, 'cookify_progress');
    if (storedProgress) {
      try {
        const progress = JSON.parse(storedProgress);
        setXp(progress.xp ?? 0);
        setCookedCount(progress.cookedCount ?? 0);

        const storedList = getUserItem(authUser, 'cookify_cooked_list');
        if (storedList) {
          try { setCookedRecipesList(JSON.parse(storedList)); } catch (e) {}
        }

        // Streak logic: only keep the streak alive if the user was last
        // active yesterday or today. Otherwise it resets.
        const today = new Date().toDateString();
        const lastActive = progress.lastActiveDate;
        if (lastActive === today) {
          setStreak(progress.streak ?? 0);
        } else if (lastActive) {
          const daysSince = Math.round((new Date(today) - new Date(lastActive)) / 86400000);
          setStreak(daysSince === 1 ? (progress.streak ?? 0) : 0);
        } else {
          setStreak(0);
        }
      } catch (e) {
        // ignore corrupted data
      }
    }
  }, [authUser?.id]);

  useEffect(() => {
    if (skipNextFavoritesSaveRef.current) {
      skipNextFavoritesSaveRef.current = false;
      return;
    }
    setUserItem(authUser, 'cookify_favorites', JSON.stringify(favorites));
  }, [favorites, authUser?.id]);

  const upgradeToPro = (newTier = 'pro') => {
    setIsPremium(true);
    setTier(newTier);
  };

  // Real Pro status comes from the subscriptions table, not a local click.
  useEffect(() => {
    setIsPremium(false);
    setTier(null);
    if (!authUser) return;
    supabase
      .from('subscriptions')
      .select('status, tier')
      .eq('user_id', authUser.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.status === 'active') {
          setIsPremium(true);
          setTier(data.tier || 'pro');
        }
      })
      .catch(() => {}); // subscriptions table not set up yet
  }, [authUser?.id]);

  const persistProgress = (partial) => {
    const existing = JSON.parse(getUserItem(authUser, 'cookify_progress') || '{}');
    setUserItem(authUser, 'cookify_progress', JSON.stringify({ ...existing, ...partial }));
  };

  // Called whenever the AI tutor is activated for a recipe.
  // This is what actually drives XP, streak, and the "Recipes Cooked" list —
  // XP/streak only fire the first time a given recipe is opened, so
  // reopening the same dish repeatedly doesn't farm XP.
  const handleRecipeCooked = (recipe) => {
    if (!recipe) return;
    const today = new Date().toDateString();
    const alreadyLogged = cookedRecipesList.some((r) => r.id === recipe.id);

    setCookedRecipesList((prev) => {
      const withoutDupe = prev.filter((r) => r.id !== recipe.id);
      const next = [
        { id: recipe.id, title: recipe.title || recipe.name, image: recipe.image, cookedAt: new Date().toISOString() },
        ...withoutDupe,
      ];
      setUserItem(authUser, 'cookify_cooked_list', JSON.stringify(next));
      setCookedCount(next.length);
      persistProgress({ cookedCount: next.length });
      return next;
    });

    if (alreadyLogged) return; // no XP/streak farming from reopening the same recipe

    setXp((prev) => {
      const next = prev + 30;
      persistProgress({ xp: next });
      return next;
    });
    setStreak((prev) => {
      const stored = JSON.parse(getUserItem(authUser, 'cookify_progress') || '{}');
      const lastActive = stored.lastActiveDate;
      const next = lastActive === today ? prev : prev + 1;
      persistProgress({ streak: next, lastActiveDate: today });
      return next;
    });
  };

  // Daily Challenge: 3 trivia questions/day (breakfast/lunch/dinner).
  // Each correct answer is worth +20 XP; the streak bumps once per day on
  // the first slot answered (right or wrong still counts as engagement).
  const today = new Date().toDateString();
  const storedProgress = JSON.parse(getUserItem(authUser, 'cookify_progress') || '{}');
  const dailyAnswers = storedProgress.dailyChallengeDate === today ? (storedProgress.dailyChallengeAnswers || {}) : {};
  const dailyChallengeDone = ['breakfast', 'lunch', 'dinner'].every((slot) => dailyAnswers[slot] !== undefined);

  const handleAnswerChallenge = (slot, wasCorrect) => {
    const now = new Date().toDateString();
    const stored = JSON.parse(getUserItem(authUser, 'cookify_progress') || '{}');
    const answersToday = stored.dailyChallengeDate === now ? (stored.dailyChallengeAnswers || {}) : {};
    if (answersToday[slot] !== undefined) return; // already answered this slot today

    const isFirstSlotToday = Object.keys(answersToday).length === 0;
    const nextAnswers = { ...answersToday, [slot]: wasCorrect };
    persistProgress({ dailyChallengeDate: now, dailyChallengeAnswers: nextAnswers });

    if (wasCorrect) {
      setXp((prev) => {
        const next = prev + 20;
        persistProgress({ xp: next });
        return next;
      });
    }

    if (isFirstSlotToday) {
      setStreak((prev) => {
        const lastActive = stored.lastActiveDate;
        const next = lastActive === now ? prev : prev + 1;
        persistProgress({ streak: next, lastActiveDate: now });
        return next;
      });
    }
  };

  const handleSaveRecipe = (recipe) => {
    if (!recipe) return;
    setFavorites((prev) => {
      const exists = prev.some((item) => String(item.id) === String(recipe.id));
      if (exists) return prev;
      return [...prev, recipe];
    });
    setActiveTab('favorites');
  };

  const handleRemoveFavorite = (recipeId) => {
    setFavorites((prev) => prev.filter((item) => String(item.id) !== String(recipeId)));
  };

  const [theme, setTheme] = useState(() => localStorage.getItem('cookify_theme') || 'dark');
  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('cookify_theme', next);
      return next;
    });
  };

  // If not logged in, show the Auth Screen
  if (!isAuthenticated) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return (
    <div className={`relative flex flex-col h-screen w-full max-w-[430px] mx-auto bg-slate-950 text-white overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.45)] sm:rounded-[32px] ${theme === 'light' ? 'light-theme' : ''}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_18%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.04),transparent_18%),linear-gradient(180deg,rgba(0,0,0,0.95),rgba(0,0,0,0.99))]" />
      {/* Top Header */}
      <header title="Cookify - Learn, Cook, Enjoy" className="relative flex flex-col gap-3 px-4 py-4 bg-black/80 backdrop-blur-3xl border-b border-white/10 z-10 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveTab('home')} aria-label="Home" className="p-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition">
              <ChefHat className="w-6 h-6 text-white" />
            </button>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">Cookify</h1>
              <p className="text-[11px] uppercase tracking-[0.35em] text-gray-400">Black & white kitchen feed</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('ai');
                setTutorOpenRequest((v) => v + 1);
              }}
              className="rounded-full px-4 py-2 text-[12px] font-bold uppercase tracking-[0.24em] bg-white/10 text-white border border-white/15 hover:bg-white/20 transition"
            >
              Open AI Chef
            </button>
            <UpgradeButton authUser={authUser} currentTier={tier} tier="pro" onUpgraded={upgradeToPro} />
          </div>
        </div>
      </header>
      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative bg-black">
        <div className="h-full overflow-y-auto">
          {activeTab === 'home' && (
            <Home
              openTutorSignal={tutorOpenRequest}
              onTutorOpened={() => setTutorOpenRequest(0)}
              onSaveRecipe={handleSaveRecipe}
              onOpenFavorites={() => setActiveTab('favorites')}
              onRecipeCooked={handleRecipeCooked}
              cookedCount={cookedCount}
              streak={streak}
              xp={xp}
              authProvider={authProvider}
              dailyChallengeDone={dailyChallengeDone}
              dailyAnswers={dailyAnswers}
              onAnswerChallenge={handleAnswerChallenge}
              callGeminiApi={callGeminiApi}
              onOrderNow={(listingId) => { setOpenListingId(listingId); setActiveTab('restaurant'); }}
              authUser={authUser}
              tier={tier}
            />
          )}
          {activeTab === 'learn' && <Learn />}
          {activeTab === 'ai' && <AI callGeminiApi={callGeminiApi} isPremium={isPremium} tier={tier} authUser={authUser} onUpgraded={upgradeToPro} />}
          {activeTab === 'favorites' && <Favorites favorites={favorites} onRemoveFavorite={handleRemoveFavorite} />}
          {activeTab === 'restaurant' && (
            <ERestaurant authUser={authUser} isSeller={isSeller} openListingId={openListingId} />
          )}
          {activeTab === 'profile' && (
            <Profile
              xp={xp}
              streak={streak}
              cookedCount={cookedCount}
              cookedRecipesList={cookedRecipesList}
              favoritesCount={favorites.length}
              isPremium={isPremium}
              tier={tier}
              authUser={authUser}
              authProvider={authProvider}
              onLogout={handleLogout}
              onOpenSettings={() => setActiveTab('settings')}
              onOpenFavorites={() => setActiveTab('favorites')}
              onUpgraded={upgradeToPro}
            />
          )}
          {activeTab === 'settings' && (
            <Settings
              isPremium={isPremium}
              onBack={() => setActiveTab('profile')}
              onLogout={handleLogout}
              theme={theme}
              onToggleTheme={toggleTheme}
              authUser={authUser}
            />
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

// --- AUTHENTICATION SCREEN ---
function AuthScreen({ onLogin }) {
  const [isLoading, setIsLoading] = useState(false);
  const [legalDoc, setLegalDoc] = useState(null); // 'terms' | 'privacy' | null
  const [activeProvider, setActiveProvider] = useState(null);

  const handleLogin = (provider = 'guest') => {
    if (provider === 'apple') {
      onLogin('apple'); // shows the "not available" alert immediately, no fake loading
      return;
    }
    setActiveProvider(provider);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setActiveProvider(null);
      onLogin(provider);
    }, 1000);
  };

  return (
    <div className="relative flex flex-col h-screen w-full max-w-[430px] mx-auto bg-black text-white overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.45)] sm:rounded-[32px] sm:border sm:border-white/10">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-12%] left-[-12%] w-60 h-60 rounded-full bg-white/10 blur-3xl -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-72 h-72 rounded-full bg-white/5 blur-3xl -z-10" />

      {/* Logo & Branding */}
      <div className="flex flex-col items-center justify-center flex-1 mt-12">
        <div className="bg-white/10 backdrop-blur-2xl text-white p-6 rounded-[2rem] border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.25)] mb-8 transform -rotate-3">
          <ChefHat className="w-20 h-20" />
        </div>
        <h1 className="text-5xl font-black tracking-tighter uppercase mb-4 text-center text-white">Cookify</h1>
        <p className="text-gray-400 font-bold text-center uppercase tracking-widest text-sm max-w-[250px] leading-relaxed">
          Master global cuisines. One bite at a time.
        </p>
      </div>

      {/* Login Buttons */}
      <div className="px-6 mb-8 space-y-3">
        <button
          onClick={() => handleLogin('google')}
          disabled={isLoading}
          className="w-full bg-white text-black font-semibold py-4 rounded-[24px] shadow-[0_12px_30px_rgba(0,0,0,0.24)] hover:bg-gray-100 transition-all disabled:opacity-50 flex items-center justify-center uppercase tracking-wide text-sm"
        >
          {isLoading && activeProvider === 'google' ? (
            <Loader2 className="animate-spin w-5 h-5 mr-3" />
          ) : (
            <svg className="w-4 h-4 mr-3" viewBox="0 0 488 512" fill="currentColor" aria-hidden="true">
              <path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
            </svg>
          )}
          Continue with Google
        </button>
        <button
          onClick={() => handleLogin('apple')}
          disabled={isLoading}
          className="w-full bg-white text-black font-semibold py-4 rounded-[24px] shadow-[0_12px_30px_rgba(0,0,0,0.24)] hover:bg-gray-100 transition-all disabled:opacity-50 flex items-center justify-center uppercase tracking-wide text-sm"
        >
          {isLoading && activeProvider === 'apple' ? (
            <Loader2 className="animate-spin w-5 h-5 mr-3" />
          ) : (
            <svg className="w-4 h-4 mr-3" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
              <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
            </svg>
          )}
          Continue with Apple
        </button>
        <button
          onClick={() => handleLogin('guest')}
          disabled={isLoading}
          className="w-full bg-zinc-900 text-white font-semibold py-4 rounded-[24px] border border-white/10 hover:bg-zinc-800 transition-all disabled:opacity-50 flex items-center justify-center uppercase tracking-wide text-sm"
        >
          {isLoading && activeProvider === 'guest' ? <Loader2 className="animate-spin w-5 h-5 mr-3" /> : <ChefHat className="mr-3 w-5 h-5" />}
          Continue as Guest
        </button>
      </div>

      <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest px-4">
        By continuing, you agree to Cookify's <br />
        <button type="button" onClick={() => setLegalDoc('terms')} className="text-white underline">Terms of Service</button> & <button type="button" onClick={() => setLegalDoc('privacy')} className="text-white underline">Privacy Policy</button>
      </p>

      {legalDoc && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-[440px] max-h-[80vh] overflow-y-auto rounded-[28px] border border-white/15 bg-zinc-950 backdrop-blur-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black">{legalDoc === 'terms' ? 'Terms of Service' : 'Privacy Policy'}</h3>
              <button onClick={() => setLegalDoc(null)} className="rounded-full border border-white/15 bg-white/10 p-2"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3 text-sm text-gray-300 leading-6">
              {legalDoc === 'terms' ? (
                <>
                  <p>By using Cookify, you agree to use the app for its intended purpose — discovering, learning, and cooking recipes, and where applicable, buying and selling food through E-Restaurant.</p>
                  <p>Cookify Pro and Cookify Pro+ are recurring monthly subscriptions billed through our payment processor. You can cancel anytime; access continues until the end of the current billing period.</p>
                  <p>E-Restaurant sellers are independent users, not Cookify employees. Cookify does not process, verify, or guarantee payments made directly between buyers and sellers, and is not responsible for food quality, safety, or delivery.</p>
                  <p>You're responsible for the accuracy of content you post, including food listings, comments, and profile information.</p>
                  <p>We may suspend accounts that violate these terms, abuse the platform, or engage in fraudulent activity.</p>
                </>
              ) : (
                <>
                  <p>Cookify collects the information you provide directly: your email (via Google/Apple sign-in), profile details, recipes you interact with, comments, and E-Restaurant listings/orders.</p>
                  <p>We use Supabase to store account and app data, and Google Gemini to power the AI Chef and Tutor features — messages you send to those features are processed by Google's API.</p>
                  <p>Payment card details are handled entirely by our payment processor (Flutterwave); Cookify never receives or stores your card number.</p>
                  <p>If you're an E-Restaurant seller, payment account details you add are shown to buyers who choose to order from you — only add details you're comfortable sharing.</p>
                  <p>You can request deletion of your account and associated data at any time by contacting support.</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- NAVIGATION COMPONENT ---
function NavButton({ icon, label, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center px-3 py-2 rounded-[18px] transition-all duration-200 ${
        isActive ? 'text-black bg-white shadow-[0_10px_24px_rgba(0,0,0,0.24)]' : 'text-gray-400 hover:bg-white/10 hover:text-white backdrop-blur-sm'
      }`}
    >
      <div className={`${isActive ? 'opacity-100' : 'opacity-70'} mb-1`}>{icon}</div>
      <span className={`text-[10px] font-bold uppercase tracking-wide ${isActive ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
    </button>
  );
}

// --- LEARN VIEW ---
function LearnView() {
  const levels = [
    { id: 1, title: 'Egg Basics', status: 'completed', icon: <CheckCircle className="text-white w-8 h-8" /> },
    { id: 2, title: 'Knife Skills', status: 'completed', icon: <CheckCircle className="text-white w-8 h-8" /> },
    { id: 3, title: 'Italian Pasta', status: 'active', icon: <ChefHat className="text-black w-8 h-8" /> },
    { id: 4, title: 'French Sauces', status: 'locked', icon: <Lock className="text-gray-400 w-8 h-8" /> },
    { id: 5, title: 'Wok Master', status: 'locked', icon: <Lock className="text-gray-400 w-8 h-8" /> },
  ];

  return (
    <div className="h-full overflow-y-auto p-6 pb-24 scroll-smooth">
      <div className="flex flex-col items-center space-y-8 mt-4">
        {levels.map((level, index) => {
          const isOffset = index % 2 !== 0;
          let btnClass =
            'w-20 h-20 rounded-full flex items-center justify-center border border-white/10 shadow-[0_10px_24px_rgba(0,0,0,0.18)] backdrop-blur-xl active:scale-[0.97] transition-all z-10 ';

          if (level.status === 'completed') {
            btnClass += 'bg-white text-black';
          } else if (level.status === 'active') {
            btnClass += 'bg-zinc-900 text-white animate-pulse';
          } else {
            btnClass += 'bg-zinc-900/70 text-gray-500 cursor-not-allowed';
          }

          return (
            <div key={level.id} className={`flex flex-col items-center relative ${isOffset ? 'ml-24' : 'mr-24'}`}>
              {index < levels.length - 1 && (
                <div
                  className={`absolute w-3 h-20 -bottom-16 -z-10 ${isOffset ? '-rotate-[30deg] -left-4' : 'rotate-[30deg] -right-4'} ${
                    level.status === 'locked' ? 'bg-zinc-800' : 'bg-white'
                  }`}
                />
              )}
              <button className={btnClass} disabled={level.status === 'locked'}>
                {level.icon}
              </button>
              <span className={`mt-3 font-bold uppercase tracking-wide text-xs ${level.status === 'locked' ? 'text-gray-400' : 'text-white'}`}>
                {level.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- GEMINI API HELPER ---
async function callGeminiApi(payload) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ''; // API Key handled by environment / platform
  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const delays = [1000, 2000, 4000, 8000, 16000];

  for (let i = 0; i < 5; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      return await response.json();
    } catch (error) {
      if (i === 4) throw error;
      await new Promise((r) => setTimeout(r, delays[i]));
    }
  }
}

// --- AI CHEF VIEW (WITH PREMIUM PAYWALL) ---
function AIChefView({ isPremium, setIsPremium }) {
  const [activeTool, setActiveTool] = useState('recipe');

  return (
    <div className="h-full flex flex-col bg-black">
      <div className="p-4 bg-zinc-950/80 border-b border-white/10 shrink-0">
        <h2 className="text-2xl font-black text-white mb-4 flex items-center">
          <Sparkles className="mr-2" /> AI Kitchen
        </h2>
        <div className="flex bg-gray-100 p-1 rounded-2xl overflow-x-auto hide-scrollbar space-x-1 border-2 border-black">
          <button
            onClick={() => setActiveTool('recipe')}
            className={`flex-1 min-w-[100px] py-2 px-1 text-sm font-bold rounded-[18px] transition-all border border-white/60 backdrop-blur-xl ${
              activeTool === 'recipe' ? 'bg-white text-black shadow-[0_8px_20px_rgba(0,0,0,0.24)]' : 'bg-white/10 text-gray-300 hover:text-white'
            }`}
          >
            Pantry
          </button>
          <button
            onClick={() => setActiveTool('remix')}
            className={`flex-1 min-w-[100px] py-2 px-1 text-sm font-bold rounded-[18px] transition-all border border-white/60 backdrop-blur-xl flex justify-center items-center ${
              activeTool === 'remix' ? 'bg-white text-black shadow-[0_8px_20px_rgba(0,0,0,0.24)]' : 'bg-white/10 text-gray-300 hover:text-white'
            }`}
          >
            Remixer {!isPremium && <Lock className="w-3 h-3 ml-1" />}
          </button>
          <button
            onClick={() => setActiveTool('calories')}
            className={`flex-1 min-w-[100px] py-2 px-1 text-sm font-bold rounded-[18px] transition-all border border-white/60 backdrop-blur-xl flex justify-center items-center ${
              activeTool === 'calories' ? 'bg-white text-black shadow-[0_8px_20px_rgba(0,0,0,0.24)]' : 'bg-white/10 text-gray-300 hover:text-white'
            }`}
          >
            Calories {!isPremium && <Lock className="w-3 h-3 ml-1" />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-20 bg-black">
        {activeTool === 'recipe' && <RecipeGenerator />}
        {activeTool === 'remix' && (isPremium ? <FlavorRemixer /> : <PremiumUpsell onUpgrade={() => setIsPremium(true)} feature="Flavor Remixer" />)}
        {activeTool === 'calories' && (isPremium ? <CalorieScanner /> : <PremiumUpsell onUpgrade={() => setIsPremium(true)} feature="Calorie Scanner" />)}
      </div>
    </div>
  );
}

// --- FREE FEATURE ---
function RecipeGenerator() {
  const [ingredients, setIngredients] = useState('');
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState(null);

  const generateRecipe = async () => {
    if (!ingredients.trim()) return;
    setLoading(true);
    setRecipe(null);

    const prompt = `You are an expert, encouraging AI chef for a gamified cooking app called "Cookify".
The user has the following ingredients: ${ingredients}.
Create a simple, delicious recipe they can make using mostly these (and basic pantry staples).
Format the response clearly using Markdown (headers starting with ##, bullet points, numbered lists).
Keep it concise and minimalist, fitting a black and white app theme.`;

    try {
      const result = await callGeminiApi({
        contents: [{ parts: [{ text: prompt }] }],
      });
      if (result?.candidates?.[0]?.content) {
        setRecipe(result.candidates[0].content.parts[0].text || String(result.candidates[0].content));
      } else {
        setRecipe("Sorry, Chef! I couldn't come up with a recipe this time. Try adding more ingredients.");
      }
    } catch (error) {
      console.error(error);
      setRecipe('System Error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900/80 backdrop-blur-2xl p-5 rounded-[24px] border border-white/10 shadow-[0_12px_35px_rgba(0,0,0,0.25)]">
        <label className="block font-black text-white mb-2 uppercase text-sm tracking-wider">What's in your fridge?</label>
        <textarea
          className="w-full bg-zinc-950 border border-white/15 rounded-2xl p-3 focus:outline-none focus:border-white/40 transition-colors resize-none text-white placeholder-gray-500"
          rows="3"
          placeholder="e.g., chicken breast, rice, broccoli..."
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
        />
        <button
          onClick={generateRecipe}
          disabled={loading || !ingredients.trim()}
          className="w-full mt-4 bg-white text-black font-black py-3 rounded-[20px] shadow-[0_10px_24px_rgba(0,0,0,0.24)] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center uppercase tracking-wide"
        >
          {loading ? <Loader2 className="animate-spin mr-2 w-5 h-5" /> : <ChefHat className="mr-2 w-5 h-5" />}
          {loading ? 'Cooking...' : 'Generate Recipe'}
        </button>
      </div>

      {recipe && (
        <div className="bg-zinc-900/80 backdrop-blur-2xl p-5 rounded-[24px] border border-white/10 shadow-[0_12px_35px_rgba(0,0,0,0.25)] animate-fade-in-up">
          <div className="max-w-none text-white text-sm leading-relaxed whitespace-pre-wrap">
            {recipe.split('\n').map((line, i) => {
              if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-black mt-4 mb-2 uppercase border-b-2 border-black pb-1 inline-block">{line.replace('## ', '')}</h2>;
              if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-black mb-3 uppercase">{line.replace('# ', '')}</h1>;
              if (line.startsWith('* ')) return <p key={i} className="mb-2 font-medium">• {line.replace('* ', '')}</p>;
              return <p key={i} className="mb-2 font-medium" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// --- PREMIUM UPSELL COMPONENT ---
function PremiumUpsell({ onUpgrade, feature }) {
  return (
    <div className="bg-[linear-gradient(135deg,_rgba(255,255,255,0.12),_rgba(255,255,255,0.04))] text-white p-6 rounded-[28px] border border-white/15 text-center relative overflow-hidden mt-4 shadow-[0_16px_45px_rgba(0,0,0,0.3)]">
      <div className="absolute top-0 right-0 -mr-8 -mt-8 text-gray-800 opacity-20">
        <Star className="w-48 h-48" fill="currentColor" />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <div className="bg-white text-black p-3 rounded-full mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-black mb-2 uppercase tracking-wide">Cookify Pro</h3>
        <p className="text-gray-300 font-medium mb-6 text-sm">
          Unlock the <strong className="text-white">{feature}</strong> and take your culinary skills to the next level with our advanced AI tools.
        </p>

        <ul className="text-left space-y-3 mb-8 w-full max-w-xs mx-auto">
          <li className="flex items-center text-sm font-bold">
            <CheckCircle className="w-5 h-5 mr-3 text-white" /> Unlimited Recipes
          </li>
          <li className="flex items-center text-sm font-bold">
            <CheckCircle className="w-5 h-5 mr-3 text-white" /> Flavor Remixer Tool
          </li>
          <li className="flex items-center text-sm font-bold">
            <CheckCircle className="w-5 h-5 mr-3 text-white" /> Photo Calorie Scanner
          </li>
        </ul>

        <button
          onClick={onUpgrade}
          className="w-full bg-white text-black font-black py-4 rounded-[20px] shadow-[0_10px_24px_rgba(0,0,0,0.24)] active:scale-[0.98] transition-all flex items-center justify-center uppercase tracking-wider text-lg"
        >
          Upgrade Now <ArrowRight className="ml-2 w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// --- PREMIUM FEATURE: FLAVOR REMIXER ---
function FlavorRemixer() {
  const [dish, setDish] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState(null);

  const generateRemix = async () => {
    if (!dish.trim() || !cuisine.trim()) return;
    setLoading(true);
    setRecipe(null);

    const prompt = `You are an expert culinary AI for the "Cookify" app.
The user wants to take a classic dish: "${dish}" and remix it using the flavor profile of "${cuisine}" cuisine.
Provide a creative, delicious recipe for this fusion dish.
Format with Markdown. Include a catchy fusion name, prep/cook time, ingredients list, step-by-step instructions. Keep formatting minimalist.`;

    try {
      const result = await callGeminiApi({
        contents: [{ parts: [{ text: prompt }] }],
      });
      if (result?.candidates?.[0]?.content) {
        setRecipe(result.candidates[0].content.parts[0].text || String(result.candidates[0].content));
      } else {
        setRecipe('System could not compute fusion. Try different inputs.');
      }
    } catch (error) {
      console.error(error);
      setRecipe('System Error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900/80 backdrop-blur-2xl p-5 rounded-[24px] border border-white/10 shadow-[0_12px_35px_rgba(0,0,0,0.25)]">
        <label className="block font-black text-white mb-1 uppercase text-sm tracking-wider">Classic Dish</label>
        <input
          type="text"
          className="w-full bg-zinc-950 border border-white/15 rounded-2xl p-3 mb-4 focus:outline-none focus:border-white/40 text-white placeholder-gray-500"
          placeholder="e.g., Tacos, Pizza, Ramen"
          value={dish}
          onChange={(e) => setDish(e.target.value)}
        />

        <label className="block font-black text-white mb-1 uppercase text-sm tracking-wider">Fusion Style / Cuisine</label>
        <input
          type="text"
          className="w-full bg-zinc-950 border border-white/15 rounded-2xl p-3 focus:outline-none focus:border-white/40 text-white placeholder-gray-500"
          placeholder="e.g., Indian, Mexican, Thai"
          value={cuisine}
          onChange={(e) => setCuisine(e.target.value)}
        />

        <button
          onClick={generateRemix}
          disabled={loading || !dish.trim() || !cuisine.trim()}
          className="w-full mt-4 bg-white text-black font-black py-3 rounded-[20px] shadow-[0_10px_24px_rgba(0,0,0,0.24)] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center uppercase tracking-wide"
        >
          {loading ? <Loader2 className="animate-spin mr-2 w-5 h-5" /> : <Sparkles className="mr-2 w-5 h-5" />}
          {loading ? 'Remixing...' : 'Remix Flavor'}
        </button>
      </div>

      {recipe && (
        <div className="bg-zinc-900/80 backdrop-blur-2xl p-5 rounded-[24px] border border-white/10 shadow-[0_12px_35px_rgba(0,0,0,0.25)] animate-fade-in-up">
          <div className="max-w-none text-white text-sm leading-relaxed whitespace-pre-wrap">
            {recipe}
          </div>
        </div>
      )}
    </div>
  );
}

// --- PREMIUM FEATURE: CALORIE SCANNER ---
function CalorieScanner() {
  return (
    <div className="bg-zinc-900/80 backdrop-blur-2xl p-5 rounded-[24px] border border-white/10 shadow-[0_12px_35px_rgba(0,0,0,0.25)] text-center space-y-3">
      <div className="bg-zinc-950/80 p-6 rounded-[22px] border border-dashed border-white/20 flex flex-col items-center justify-center">
        <Camera className="w-12 h-12 text-white mb-2" />
        <p className="font-black text-white uppercase text-sm">Snap a Photo of Your Meal</p>
        <p className="text-gray-400 text-xs font-bold mt-1">AI will estimate calories & macros</p>
      </div>
    </div>
  );
}

