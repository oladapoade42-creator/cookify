// Text-to-speech using the browser's built-in Web Speech API — no extra
// API key or cost. Microsoft Edge ships genuine neural voices (labelled
// "... Online (Natural) ...") that sound dramatically less robotic than
// the classic system voices every browser falls back to. We prioritize
// those specifically, then fall back gracefully on browsers that don't
// have them (Chrome/Firefox/Safari).

let cachedVoice = null;

export function pickNaturalVoice() {
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis?.getVoices?.() || [];
  if (voices.length === 0) return null;

  // Highest priority: Edge's actual neural voices. These are labelled with
  // "Online (Natural)" in the voice name — e.g. "Microsoft Aria Online
  // (Natural) - English (United States)". Named ones listed in the order
  // we'd prefer to actually hear (warm, clear, not overly synthetic).
  const edgeNeuralNames = [
    /aria.*online \(natural\)/i,
    /jenny.*online \(natural\)/i,
    /guy.*online \(natural\)/i,
    /christopher.*online \(natural\)/i,
    /eric.*online \(natural\)/i,
    /online \(natural\)/i, // any other Edge neural voice we didn't name explicitly
  ];

  for (const pattern of edgeNeuralNames) {
    const match = voices.find((v) => pattern.test(v.name) && v.lang.startsWith("en"));
    if (match) {
      cachedVoice = match;
      return cachedVoice;
    }
  }

  // Second priority: other browsers' higher-quality voices.
  const otherGoodVoices = [
    /neural/i,
    /premium/i,
    /google us english/i,
    /google uk english/i,
    /samantha/i, // macOS's more natural default voice
    /daniel/i,
  ];

  for (const pattern of otherGoodVoices) {
    const match = voices.find((v) => pattern.test(v.name) && v.lang.startsWith("en"));
    if (match) {
      cachedVoice = match;
      return cachedVoice;
    }
  }

  // Fall back to any English voice, then any voice at all.
  cachedVoice = voices.find((v) => v.lang.startsWith("en")) || voices[0] || null;
  return cachedVoice;
}

// Voices load asynchronously in some browsers — warm the cache once ready,
// and clear it if the voice list changes (e.g. switching browsers/tabs).
if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = null;
    pickNaturalVoice();
  };
}

export function isUsingEdgeNeuralVoice() {
  return !!cachedVoice && /online \(natural\)/i.test(cachedVoice.name);
}

export function speak(text) {
  if (typeof window === "undefined" || !window.speechSynthesis || !text) return;

  window.speechSynthesis.cancel(); // don't stack overlapping speech
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickNaturalVoice();
  if (voice) utterance.voice = voice;

  // Edge's neural voices already sound natural at default rate/pitch —
  // over-tuning them can make it worse. Only nudge the classic/robotic
  // fallback voices toward sounding less flat.
  const usingNeural = isUsingEdgeNeuralVoice();
  utterance.rate = usingNeural ? 1 : 0.96;
  utterance.pitch = usingNeural ? 1 : 1.02;
  utterance.volume = 1;

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  window.speechSynthesis?.cancel();
}
