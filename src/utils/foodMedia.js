import { supabase } from "../supabase";

const GEMINI_MODEL = "gemini-2.5-flash";

// Reads a File as a base64 string (without the data: prefix), the shape
// Gemini's inline_data expects.
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.readAsDataURL(file);
  });
}

// Grabs a single frame from a video file as a JPEG base64 string, so the
// same image-based food classifier can be reused for video without
// needing to send Gemini the whole video (which the endpoint used here
// doesn't support anyway).
function extractVideoFrame(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;

    const cleanup = () => URL.revokeObjectURL(url);

    video.onloadedmetadata = () => {
      // A frame a little into the clip is more likely to show the
      // actual food than frame zero (often a black/loading frame).
      video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
        cleanup();
        resolve(base64);
      } catch (e) {
        cleanup();
        reject(e);
      }
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("Could not read that video."));
    };
  });
}

// Returns { isFood: boolean } — fails open (assumes it IS food) if the
// API key is missing or the check itself errors, so a Gemini hiccup
// never blocks someone from posting a completely legitimate listing.
export async function checkIsFood(base64Image) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
  if (!apiKey) return { isFood: true };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: 'Does this image clearly show food, a drink, or a dish being served/prepared? Respond ONLY with strict JSON, no markdown fences: {"isFood": true or false}' },
              { inline_data: { mime_type: "image/jpeg", data: base64Image } },
            ],
          }],
        }),
      }
    );
    if (!response.ok) return { isFood: true };

    const data = await response.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    return { isFood: parsed.isFood !== false };
  } catch (e) {
    return { isFood: true };
  }
}

// Runs the food-check on a single File (image or video) and returns
// { isFood: boolean }. Exported separately from uploadFoodMedia so the
// UI can classify a file the instant it's picked (for immediate "that's
// not food" feedback) without also uploading it, and then upload later
// at actual "Post" time without re-running the check a second time.
export async function classifyFile(file) {
  const isVideo = file.type.startsWith("video/");
  try {
    const base64 = isVideo ? await extractVideoFrame(file) : await fileToBase64(file);
    return await checkIsFood(base64);
  } catch (e) {
    // Extraction failed for some technical reason — fail open rather
    // than block a possibly-legitimate upload over it.
    return { isFood: true };
  }
}

// Uploads a single already-classified image/video File to the
// food-listings Storage bucket and returns { url, type }.
export async function uploadFoodMedia(authUser, file) {
  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");
  if (!isVideo && !isImage) {
    throw new Error("Please choose an image or video file.");
  }

  const ext = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
  const path = `${authUser.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("food-listings").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("food-listings").getPublicUrl(path);
  return { url: data.publicUrl, type: isVideo ? "video" : "image" };
}
