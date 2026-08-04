# Cookify fix — blank camera preview

1 file changed: `src/pages/Home.jsx` (overwrite at the same path).

## What was actually wrong

Not a permissions problem — the browser *was* prompting for and getting
camera access. The bug was a React timing issue in the Scan Food modal:

- The `<video>` element only renders once `cameraReady` is `true`.
- The old code called `getUserMedia()`, then tried to attach the
  resulting stream to `videoRef.current` — but at that exact moment
  `cameraReady` was still `false`, so the `<video>` tag didn't exist in
  the DOM yet and `videoRef.current` was `null`. The attach silently did
  nothing, then `setCameraReady(true)` ran afterward and mounted a *new*
  video element that never got the stream — hence "open camera" working
  (permission granted) but the preview staying blank.

Fixed by separating "get the stream" from "attach the stream to the
video tag": `openScanner` now just sets `cameraReady`, and a
`useEffect` that runs after that state change (i.e. after the video
element is actually in the DOM) does the attaching. This also fixes the
same issue if the modal is closed and reopened while a stream is still
active.

No dashboard/account setup needed for this one — pure code fix. Just
copy the file in and rebuild.
