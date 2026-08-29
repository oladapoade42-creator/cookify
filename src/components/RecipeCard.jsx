import { useState, useEffect, useRef } from "react";
import { Clock, Star, Heart, MessageSquare, Share2, MoreHorizontal, X, CirclePlay, MapPin, Loader2 } from "lucide-react";
import { supabase } from "../supabase";
import { moderateText } from "../utils/moderation";

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
  onSaveRecipe,
  authProvider = null,
  authUser = null,
  onExpand,
  onNotInterested,
  onView,
  nutrition = null, // { calories, protein, carbs, fat }
  description = null, // short blurb about the dish, shown in the expanded detail view
  instructions = null, // string or array of prep steps, shown in the expanded detail view
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
  const [commentDraft, setCommentDraft] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [showWhereToBuy, setShowWhereToBuy] = useState(false);
  const [whereToBuyResults, setWhereToBuyResults] = useState(null); // null = not searched yet
  const [loadingWhereToBuy, setLoadingWhereToBuy] = useState(false);
  const cardRootRef = useRef(null);

  // Fires onView once, the first time this card is genuinely visible on
  // screen (not just mounted off-screen in a long feed) — this is what
  // makes the view counter climb as people actually scroll past a dish,
  // instead of staying at zero until they tap into it.
  useEffect(() => {
    if (!onView || !cardRootRef.current) return;
    let fired = false;
    const node = cardRootRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !fired) {
            fired = true;
            onView();
            observer.disconnect();
          }
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [onView]);

  // Prep instructions can arrive as a clean array (local recipes) or as one
  // raw block of text with its own line breaks (dishes pulled from search).
  // Normalize both into a simple list of steps to render.
  const prepSteps = Array.isArray(instructions)
    ? instructions.filter(Boolean)
    : (instructions || "")
        .split(/\r?\n+/)
        .map((s) => s.trim())
        .filter(Boolean);

  const canComment = authProvider === "google" || authProvider === "apple";
  const canLike = authProvider === "google" || authProvider === "apple"; // guests can't like

  // The same recipe can be mounted twice at once (e.g. the feed card behind
  // the Expand detail view). Supabase errors if two instances both try to
  // `.on()` the same channel topic, so each mounted card gets its own
  // unique topic suffix even when they're watching the same recipeId.
  const instanceIdRef = useRef(Math.random().toString(36).slice(2));

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
      .channel(`likes-${recipeId}-${instanceIdRef.current}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "likes", filter: `recipe_id=eq.${recipeId}` }, refreshCount)
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [recipeId, authUser]);

  useEffect(() => {
    if (!recipeId) return;
    let cancelled = false;
    supabase
      .from("comments")
      .select("id, provider, text, created_at, flagged")
      .eq("recipe_id", String(recipeId))
      .eq("flagged", false)
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

  const handleComment = (ev) => {
    ev.stopPropagation();
    setShowComments(true);
  };

  const postComment = async () => {
    if (!canComment) {
      setFeedback("Sign in with Google or Apple to comment on recipes.");
      return;
    }
    const text = commentDraft.trim();
    if (!text) return;

    setPostingComment(true);

    // Runs before the insert — flagged comments still get saved (so
    // nothing is ever silently lost), just hidden from the public feed
    // (the .eq("flagged", false) filter above) until reviewed.
    const { flagged, reason } = await moderateText(text);

    const newComment = {
      recipe_id: String(recipeId),
      user_id: authUser?.id || null,
      provider: authProvider,
      text,
      flagged,
      flag_reason: flagged ? reason : null,
    };

    try {
      const { data, error } = await supabase.from("comments").insert(newComment).select().single();
      if (error) throw error;
      if (!flagged) setComments((prev) => [data, ...prev]);
      setCommentDraft("");
      if (flagged) setFeedback("Your comment was posted and is pending a quick review.");
    } catch (e) {
      setFeedback("Comments aren't set up on the backend yet — this comment wasn't saved.");
    }
    setPostingComment(false);
  };

  // Finds E-Restaurant sellers listing this dish (matched loosely on
  // title, since sellers type their own listing names) and gives each
  // one a "Get Directions" link — same Google Maps URL pattern already
  // used in ERestaurant.jsx, opened via the address on the seller's
  // profile rather than needing a paid Maps API key.
  const handleWhereToBuy = async () => {
    setShowWhereToBuy(true);
    if (whereToBuyResults !== null || !title) return; // already searched once
    setLoadingWhereToBuy(true);
    try {
      const { data: listings } = await supabase
        .from("food_listings")
        .select("id, seller_id, seller_name, title, price")
        .ilike("title", `%${title}%`)
        .eq("is_visible", true)
        .limit(10);

      if (!listings || listings.length === 0) {
        setWhereToBuyResults([]);
        return;
      }

      const sellerIds = [...new Set(listings.map((l) => l.seller_id))];
      const { data: sellerProfiles } = await supabase
        .from("profiles")
        .select("user_id, seller_address")
        .in("user_id", sellerIds);

      const addressBySeller = Object.fromEntries((sellerProfiles || []).map((p) => [p.user_id, p.seller_address]));

      setWhereToBuyResults(
        listings.map((l) => ({ ...l, address: addressBySeller[l.seller_id] || null }))
      );
    } catch (e) {
      setWhereToBuyResults([]);
    }
    setLoadingWhereToBuy(false);
  };

  const directionsUrl = (address) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

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
    <div ref={cardRootRef} className="overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/90 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
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

        {nutrition && (
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="rounded-xl bg-black/40 border border-white/10 p-2">
              <p className="text-lg font-black text-white">{nutrition.calories}</p>
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Cal</p>
            </div>
            <div className="rounded-xl bg-black/40 border border-white/10 p-2">
              <p className="text-lg font-black text-white">{nutrition.protein}</p>
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Protein</p>
            </div>
            <div className="rounded-xl bg-black/40 border border-white/10 p-2">
              <p className="text-lg font-black text-white">{nutrition.carbs}</p>
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Carbs</p>
            </div>
            <div className="rounded-xl bg-black/40 border border-white/10 p-2">
              <p className="text-lg font-black text-white">{nutrition.fat}</p>
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Fat</p>
            </div>
          </div>
        )}

        {(description || prepSteps.length > 0) && (
          <div className="cookify-detail-in space-y-5 rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
            {description && (
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-gray-500 mb-2">About this dish</p>
                <p className="text-sm leading-6 text-gray-300">{description}</p>
              </div>
            )}
            {prepSteps.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-gray-500 mb-3">How to prepare</p>
                <ol className="space-y-3">
                  {prepSteps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-6 text-gray-300">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      <span className="pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {title && (
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} recipe how to cook`)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(ev) => ev.stopPropagation()}
                className="flex items-center justify-center gap-2 rounded-[20px] border border-white/10 bg-red-600/10 py-3 text-sm font-bold uppercase tracking-[0.2em] text-red-400 transition hover:bg-red-600/20"
              >
                <CirclePlay className="w-4 h-4" />
                Watch on YouTube
              </a>
            )}

            {title && (
              <button
                type="button"
                onClick={(ev) => { ev.stopPropagation(); handleWhereToBuy(); }}
                className="flex items-center justify-center gap-2 rounded-[20px] border border-white/10 bg-emerald-600/10 py-3 text-sm font-bold uppercase tracking-[0.2em] text-emerald-400 transition hover:bg-emerald-600/20"
              >
                <MapPin className="w-4 h-4" />
                Where to Buy
              </button>
            )}

            {showWhereToBuy && (
              <div className="rounded-[20px] border border-white/10 bg-zinc-900/80 p-4" onClick={(ev) => ev.stopPropagation()}>
                {loadingWhereToBuy ? (
                  <p className="flex items-center gap-2 text-sm text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> Looking for sellers nearby...</p>
                ) : whereToBuyResults?.length ? (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500">Sold by Cookify sellers</p>
                    {whereToBuyResults.map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/40 p-3">
                        <div>
                          <p className="text-sm font-bold text-white">{r.title}</p>
                          <p className="text-xs text-gray-400">{r.seller_name || "Cookify Seller"} • ${r.price}</p>
                        </div>
                        {r.address ? (
                          <a
                            href={directionsUrl(r.address)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/10"
                          >
                            Directions
                          </a>
                        ) : (
                          <span className="shrink-0 text-xs text-gray-500">No address listed</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No Cookify sellers currently list this dish. Check E-Restaurant to see everything on offer.</p>
                )}
              </div>
            )}
          </div>
        )}

        {feedback && <p className="text-sm text-emerald-300">{feedback}</p>}

        {showComments && (
          <div
            onClick={(ev) => ev.stopPropagation()}
            className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm"
          >
            <div className="w-full sm:max-w-[480px] sm:rounded-[28px] rounded-t-[28px] border border-white/10 bg-zinc-950 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-white/10 p-4">
                <div>
                  <h3 className="font-black text-white">Comments</h3>
                  <p className="text-xs text-gray-500">{comments.length} on {title}</p>
                </div>
                <button onClick={() => setShowComments(false)} className="rounded-full border border-white/10 bg-white/5 p-2 text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {comments.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">No comments yet — be the first.</p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <div className="h-9 w-9 shrink-0 rounded-full bg-white/10 border border-white/10 grid place-items-center text-xs font-bold text-white uppercase">
                        {c.provider?.[0] || "?"}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">{c.provider}</p>
                        <p className="text-sm text-gray-200 mt-0.5">{c.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-white/10 p-3">
                {canComment ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={commentDraft}
                      onChange={(e) => setCommentDraft(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && postComment()}
                      placeholder="Add a comment..."
                      className="flex-1 rounded-full bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-white/30"
                    />
                    <button
                      onClick={postComment}
                      disabled={postingComment || !commentDraft.trim()}
                      className="rounded-full bg-white text-black px-4 py-2.5 text-sm font-bold disabled:opacity-40"
                    >
                      Post
                    </button>
                  </div>
                ) : (
                  <p className="text-center text-xs text-gray-500 py-2">
                    Sign in with Google or Apple to leave a comment.
                  </p>
                )}
              </div>
            </div>
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