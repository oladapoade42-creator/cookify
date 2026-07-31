import { useState, useEffect } from "react";
import { Clock, Star, Heart, MessageSquare, Share2, MoreHorizontal } from "lucide-react";
import { supabase } from "../supabase";

export default function RecipeCard({
  recipeId,
  title,
  image,
  time,
  difficulty,
  rating = 4.8,
  onClick,
  onCookNow,
  weeklyViews = 0,
  liveViewers = 0,
  onSaveRecipe,
  authProvider = null,
  authUser = null,
  onExpand,
  onNotInterested,
}) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeBusy, setLikeBusy] = useState(false);
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [shareCount, setShareCount] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const canComment = authProvider === "google" || authProvider === "apple";
  const canLike = authProvider === "google" || authProvider === "apple"; // guests can't like

  // Load the real like count + whether this user already liked it, then
  // stay live via a Supabase realtime subscription — so the count updates
  // the moment anyone (on any device) likes/unlikes, no refresh needed.
  useEffect(() => {
    if (!recipeId) return;
    let cancelled = false;

    const refreshCount = async () => {
      const { count } = await supabase
        .from("likes")
        .select("id", { count: "exact", head: true })
        .eq("recipe_id", String(recipeId));
      if (!cancelled && typeof count === "number") setLikeCount(count);
    };

    refreshCount();

    if (authUser) {
      supabase
        .from("likes")
        .select("id")
        .eq("recipe_id", String(recipeId))
        .eq("user_id", authUser.id)
        .maybeSingle()
        .then(({ data }) => { if (!cancelled) setLiked(!!data); })
        .catch(() => {});
    }

    const channel = supabase
      .channel(`likes-${recipeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "likes", filter: `recipe_id=eq.${recipeId}` }, refreshCount)
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [recipeId, authUser]);

  useEffect(() => {
    if (!recipeId) return;
    let cancelled = false;
    supabase
      .from("comments")
      .select("id, provider, text, created_at")
      .eq("recipe_id", String(recipeId))
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!cancelled && !error && data) setComments(data);
      })
      .catch(() => {}); // comments table not set up yet — stays empty
    return () => { cancelled = true; };
  }, [recipeId]);

  const handleLike = async (ev) => {
    ev.stopPropagation();

    if (!canLike) {
      setFeedback(authProvider === "guest" || !authProvider
        ? "Sign in with Google or Apple to like recipes."
        : "Sign in to like recipes.");
      return;
    }
    if (likeBusy) return;
    setLikeBusy(true);

    // Optimistic update, corrected by the realtime subscription if it fails.
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));

    try {
      if (wasLiked) {
        await supabase.from("likes").delete().eq("recipe_id", String(recipeId)).eq("user_id", authUser.id);
      } else {
        await supabase.from("likes").insert({ recipe_id: String(recipeId), user_id: authUser.id });
      }
    } catch (e) {
      // roll back optimistic update if the backend rejected it
      setLiked(wasLiked);
      setLikeCount((c) => c + (wasLiked ? 1 : -1));
      setFeedback("Couldn't save your like — the likes table may not be set up yet.");
    }
    setLikeBusy(false);
  };

  const handleComment = async (ev) => {
    ev.stopPropagation();

    if (!canComment) {
      setFeedback("Sign in with Google or Apple to comment on recipes.");
      return;
    }

    const draft = window.prompt(`Leave a comment for ${title}:`);
    if (!draft || !draft.trim()) return;

    const newComment = {
      recipe_id: String(recipeId),
      provider: authProvider,
      text: draft.trim(),
    };

    try {
      const { data, error } = await supabase.from("comments").insert(newComment).select().single();
      if (error) throw error;
      setComments((prev) => [data, ...prev]);
      setShowComments(true);
      setFeedback("Comment posted.");
    } catch (e) {
      setFeedback("Comments aren't set up on the backend yet — this comment wasn't saved.");
    }
  };

  const handleShare = async (ev) => {
    ev.stopPropagation();
    const shareText = `Check out ${title} on Cookify`;
    const shareUrl = window.location.href;
    const shareMessage = `${shareText}\n${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: shareUrl,
        });
        setShareCount((count) => count + 1);
        setFeedback("Recipe shared.");
      } catch (error) {
        if (error?.name !== "AbortError") {
          setFeedback("Sharing was cancelled.");
        }
      }
      return;
    }

    setShowShareMenu((prev) => !prev);
  };

  const shareToApp = async (platform) => {
    const shareText = `Check out ${title} on Cookify`;
    const shareUrl = window.location.href;
    const shareMessage = `${shareText}\n${shareUrl}`;

    if (platform === "copy") {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareMessage);
        setFeedback("Link copied to clipboard.");
      } else {
        window.prompt("Copy this link:", shareMessage);
      }
      setShareCount((count) => count + 1);
      setShowShareMenu(false);
      return;
    }

    const encodedMessage = encodeURIComponent(shareMessage);
    const urls = {
      whatsapp: `https://wa.me/?text=${encodedMessage}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
      x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    };

    if (urls[platform]) {
      window.open(urls[platform], "_blank", "noopener,noreferrer");
      setShareCount((count) => count + 1);
      setFeedback(`Opened ${platform === "x" ? "X" : platform.charAt(0).toUpperCase() + platform.slice(1)} share.`);
    }

    setShowShareMenu(false);
  };

  return (
    <div className="overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/90 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full border border-white/10 bg-white/10 grid place-items-center text-white">
            C
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-gray-400">Cookify</p>
            <h2 className="text-lg font-black text-white leading-tight">{title}</h2>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={(ev) => { ev.stopPropagation(); setMenuOpen((v) => !v); }}
            className="rounded-full border border-white/10 bg-white/5 backdrop-blur-xl p-2 text-white transition hover:bg-white/10"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          {menuOpen && (
            <div
              onClick={(ev) => ev.stopPropagation()}
              className="absolute right-0 top-11 z-20 w-44 overflow-hidden rounded-2xl border border-white/15 bg-black/80 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
            >
              <button
                onClick={() => { setMenuOpen(false); onExpand?.(); }}
                className="block w-full px-4 py-3 text-left text-sm text-white transition hover:bg-white/10"
              >
                Expand
              </button>
              <button
                onClick={() => { setMenuOpen(false); onNotInterested?.(); }}
                className="block w-full px-4 py-3 text-left text-sm text-rose-300 transition hover:bg-white/10 border-t border-white/10"
              >
                Not interested
              </button>
            </div>
          )}
        </div>
      </div>

      <img src={image} alt={title} className="w-full h-[380px] object-cover" />

      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-3 text-gray-400 text-xs uppercase tracking-[0.35em]">
          <span>{difficulty}</span>
          <span>•</span>
          <span>{time}</span>
          <span>•</span>
          <span>{weeklyViews.toLocaleString()} views</span>
        </div>

        <p className="text-sm leading-6 text-gray-300">
          A learning feed for every recipe. Tap Cook Now or View Tutor for a guided cooking session with AI.
        </p>

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-white">
            <div className="flex items-center gap-2 rounded-full bg-white/5 px-2 py-1.5">
              <button
                onClick={handleLike}
                disabled={likeBusy}
                className={`rounded-full p-2 backdrop-blur-xl transition disabled:opacity-60 ${liked ? "bg-rose-500/20 text-rose-400" : "bg-white/5 text-white hover:bg-white/10"} ${!canLike ? "opacity-70" : ""}`}
              >
                <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
              </button>
              <span className="pr-1 text-sm text-gray-300">{likeCount}</span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white/5 px-2 py-1.5">
              <button onClick={handleComment} className="rounded-full p-2 bg-white/5 backdrop-blur-xl text-white transition hover:bg-white/10">
                <MessageSquare className="w-4 h-4" />
              </button>
              <button
                onClick={(ev) => { ev.stopPropagation(); setShowComments((v) => !v); }}
                className="pr-1 text-sm text-gray-300"
              >
                {comments.length}
              </button>
            </div>
            <div className="relative flex items-center gap-2 rounded-full bg-white/5 px-2 py-1.5">
              <button onClick={handleShare} className="rounded-full p-2 bg-white/5 backdrop-blur-xl text-white transition hover:bg-white/10">
                <Share2 className="w-4 h-4" />
              </button>
              <span className="pr-1 text-sm text-gray-300">{shareCount}</span>
              {showShareMenu && (
                <div className="absolute left-0 top-12 z-20 flex min-w-[180px] flex-col rounded-2xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl">
                  <button onClick={() => shareToApp("copy")} className="rounded-xl px-3 py-2 text-left text-sm text-white transition hover:bg-white/10">Copy link</button>
                  <button onClick={() => shareToApp("whatsapp")} className="rounded-xl px-3 py-2 text-left text-sm text-white transition hover:bg-white/10">Share to WhatsApp</button>
                  <button onClick={() => shareToApp("telegram")} className="rounded-xl px-3 py-2 text-left text-sm text-white transition hover:bg-white/10">Share to Telegram</button>
                  <button onClick={() => shareToApp("x")} className="rounded-xl px-3 py-2 text-left text-sm text-white transition hover:bg-white/10">Share to X</button>
                </div>
              )}
            </div>
          </div>
          <button onClick={(ev) => { ev.stopPropagation(); onSaveRecipe?.(); }} className="rounded-full border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-2 text-xs uppercase tracking-[0.35em] text-white transition hover:bg-white/10">
            Save Recipe
          </button>
        </div>

        {feedback && <p className="text-sm text-emerald-300">{feedback}</p>}

        {showComments && (
          <div className="rounded-2xl border border-white/10 bg-black/40 p-3 space-y-2 max-h-40 overflow-y-auto">
            {comments.length === 0 ? (
              <p className="text-sm text-gray-500">No comments yet — be the first.</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="text-sm">
                  <span className="text-gray-400 uppercase text-[10px] tracking-wide mr-2">{c.provider}</span>
                  <span className="text-gray-200">{c.text}</span>
                </div>
              ))
            )}
            {!canComment && (
              <p className="text-xs text-gray-500 pt-1 border-t border-white/10">
                Sign in with Google or Apple to leave a comment.
              </p>
            )}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <button onClick={(ev) => { ev.stopPropagation(); onCookNow?.(); }} className="rounded-[24px] bg-white text-black py-3 font-bold uppercase tracking-[0.25em] transition hover:brightness-110">
            Cook Now
          </button>
          <button onClick={(ev) => { ev.stopPropagation(); onClick?.(); }} className="rounded-[24px] border border-white/10 bg-white/5 py-3 font-bold uppercase tracking-[0.25em] text-white transition hover:bg-white/10">
            View Tutor
          </button>
        </div>
      </div>
    </div>
  );
}