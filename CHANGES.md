# Cookify — gallery upload for Scan Food

1 file: `src/pages/Home.jsx` (overwrite at the same path).

## What changed

The Scan Food modal now has a second button next to "Open camera" — a
small photo icon that opens your device's native file/photo picker
(`<input type="file" accept="image/*">`, no `capture` attribute set on
purpose, so the OS picker offers gallery/Photos as well as camera,
letting the person choose either).

This works the exact same way across all three modes — Calories, Diet
Plan, and Ingredients — since they all share this one modal. So this one
change covers the "snap food and paste it on Snap Food" request and the
"diet plan" request together: whichever mode is selected when they pick
a photo, it gets analyzed the same way a live camera capture would.

Picked photos are resized down to a max of 1280px and compressed to
JPEG client-side before being sent off for analysis — same treatment as
a camera capture gets, so a giant phone photo doesn't slow things down
or blow past any size limits.

No account/dashboard setup needed — pure code change, ready to drop in.
