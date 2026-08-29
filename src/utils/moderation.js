// Lightweight content moderation for user-generated text (comments,
// E-Restaurant listing titles/descriptions). Runs before posting: content
// still gets saved either way (never silently discarded — a false
// positive shouldn't erase someone's comment), but anything flagged is
// hidden from public view until you review it, instead of you having to
// read every single comment/listing yourself to catch problems.
//
// This calls Gemini directly from the client, the same way the rest of
// the app's AI features already do (AI Chef, food scanning) — consistent
// with the existing architecture rather than introducing a new pattern.
// It's a best-effort filter, not a hard security boundary: a determined
// bad actor could bypass client-side code entirely. Real moderation for
// a bigger app would run server-side; for a small app run by one person,
// this catches the obvious stuff (spam, slurs, scams) without needing a
// backend moderation pipeline.

const MODERATION_PROMPT = `You are a content moderator for Cookify, a cooking app. Classify the following user-submitted text.

Flag it if it contains: spam, scams, advertising unrelated to food, hate speech, harassment, sexual content, or anything clearly inappropriate for a general-audience cooking app. Do NOT flag normal cooking talk, criticism of a recipe, mild slang, or emoji.

Respond ONLY with strict JSON, no markdown fences, no extra text, in exactly this shape:
{"flagged": true or false, "reason": "short reason if flagged, empty string if not"}

Text to classify:
"""`;

export async function moderateText(text) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
  const trimmed = (text || "").trim();
  if (!trimmed) return { flagged: false, reason: "" };

  // No API key configured — fail open (don't flag) rather than block
  // every single post because moderation itself can't run.
  if (!apiKey) return { flagged: false, reason: "" };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${MODERATION_PROMPT}${trimmed}\n"""` }] }],
        }),
      }
    );
    if (!response.ok) return { flagged: false, reason: "" };

    const data = await response.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      flagged: parsed.flagged === true,
      reason: typeof parsed.reason === "string" ? parsed.reason : "",
    };
  } catch (e) {
    // Moderation failing should never block someone from posting —
    // fail open, same as the no-API-key case above.
    return { flagged: false, reason: "" };
  }
}
