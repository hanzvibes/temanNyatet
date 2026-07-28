# AI Voice Note Design

## Goal

Add a premium AI Voice Note capability to the existing TemanNyatet note
creation/editing form. Users can press and hold a Material Design 3 microphone
control, speak, release to stop, and receive editable Indonesian text appended
to the current note content.

The feature must preserve all existing note CRUD, editor validation, tags,
colors, drawer behavior, save behavior, search, ordering, and AI summary
functionality.

## Product decisions

- Transcription is appended to the end of the current editor content.
- Existing editor content is never overwritten by a voice transcription.
- A blank line separates existing content and newly transcribed text.
- Audio is processed in memory only and is not stored in Google Sheets or the
  application database.
- Recording starts on press-and-hold. Releasing completes the recording.
- Sliding the pointer at least 72px away from its starting point cancels the
  recording before release.
- The feature uses a hybrid transcription strategy:
  - `MediaRecorder` is the cross-platform recording path.
  - Browser `SpeechRecognition` is used opportunistically where supported for
    low-latency interim/fallback text.
  - A server transcription route is used when a configured audio provider is
    available.
- If the current SumoPod configuration does not provide audio transcription,
  the server returns an explicit configuration/provider error. Any browser
  speech text already captured remains available in the editor.

## User experience

### Idle

- Add a floating Material 3 extended FAB in the note editor area:
  - microphone icon;
  - `Voice Note` label;
  - rounded, elevated primary-container treatment matching the existing
    TemanNyatet palette;
  - minimum 48px touch target;
  - placed so it does not cover the title, textarea, tags, color picker, or
    save action.
- The control has an accessible name equivalent to
  `Mulai merekam voice note`.
- Existing textarea focus, typing, and form submission remain unchanged.

### Recording

- Pointer/touch down requests microphone permission and starts recording.
- The button transitions to an animated microphone state with:
  - elapsed duration in `MM:SS`;
  - animated waveform;
  - `Geser untuk membatalkan` guidance;
  - clear visual recording indicator.
- The waveform is driven by `AnalyserNode` and
  `requestAnimationFrame`, not by a React state update on every audio sample.
- Use `navigator.vibrate(10)` where available. Haptic support is optional and
  must never block or fail recording.
- Pointer capture keeps the gesture active when the finger leaves the button.

### Completed recording

- Release without crossing the cancel threshold stops the recorder.
- The UI enters a processing state immediately:
  - recording control is disabled;
  - spinner/progress treatment is shown;
  - label is `Mengubah suara menjadi teks…`;
  - duplicate submissions are prevented.
- The resulting transcription is appended to the form's `content` field with
  one blank line when existing content is non-empty.
- The textarea remains editable and the user can revise the transcription
  before saving.

### Cancelled recording

- Moving at least 72px from the initial pointer position changes the visual
  state to `Lepaskan untuk membatalkan`.
- Releasing after crossing the threshold:
  - stops and discards the recording;
  - stops speech recognition;
  - cancels waveform and timer work;
  - does not call the transcription API;
  - does not modify the editor content.
- A short haptic cue may be used if supported.

### Keyboard and assistive technology

- The control is keyboard reachable and has a visible focus ring.
- Enter/Space provides a click-based recording fallback for users who cannot
  perform a press-and-hold gesture. The UI exposes a clear start/stop state.
- State changes are announced through a polite live region.
- Recording and processing controls expose `aria-pressed`/`aria-busy` as
  appropriate.
- `prefers-reduced-motion: reduce` disables decorative pulse/wave animation
  while retaining state and duration information.

## Client architecture

### Components and responsibilities

- `VoiceNoteButton` owns the visual control, pointer gesture, state labels,
  waveform canvas/visualizer, duration, and accessibility attributes.
- `useVoiceRecorder` owns:
  - microphone permission and `MediaRecorder` lifecycle;
  - supported MIME type selection;
  - pointer cancel threshold;
  - timer and animation cleanup;
  - optional `SpeechRecognition` lifecycle;
  - audio Blob creation.
- `CatatanPage` integrates the hook with `react-hook-form`:
  - passes the current content to the append helper;
  - calls the upload API after recording;
  - writes only the final transcription into `form.setValue('content', ...)`;
  - leaves title, tags, color, validation, and submit behavior unchanged.

The recorder and button should be separate from `CatatanPage` so the page does
not own per-frame animation details and so recorder behavior can be tested
independently.

### Client state machine

The feature has these explicit states:

```text
idle
  -> requesting-permission
  -> recording
  -> processing
  -> idle

recording
  -> cancelling
  -> idle

any state
  -> error
  -> idle
```

Unmounting or closing the drawer from any non-idle state must stop all tracks,
cancel the animation frame, clear timers, stop recognition, and release
references to the Blob.

### Transcription selection

- Start browser `SpeechRecognition` only when the browser exposes it and the
  language can be set to `id-ID`.
- Interim browser results may be displayed as non-persisted feedback, but the
  editor is updated only with the accepted final transcription.
- The recorded Blob is still retained through the processing transition so the
  server route can provide the final text where configured.
- If the server route succeeds, use its final text.
- If the server route is unavailable but browser final text exists, append the
  browser result and show a non-blocking notice that the browser transcription
  was used.
- If neither path yields text, preserve the original content and show a
  retryable error.

## API design

### Endpoint

Add an authenticated multipart endpoint:

```text
POST /api/notes/transcribe
Content-Type: multipart/form-data
Field: audio
```

The route uses `requireUser` rather than `requireAuth` because transcription
does not read or write the user's Google Sheet. It still uses
`userRateLimit`, and the global API rate limit remains in effect.

### Validation

- Require exactly one `audio` file.
- Process uploads with `multer.memoryStorage()`.
- Accept browser-produced audio MIME types, including WebM/Opus, MP4/AAC,
  Ogg/Opus, and WAV where the runtime supports them.
- Enforce a bounded file size suitable for a short voice note. The initial
  implementation should use a conservative 10MB limit and return a clear
  validation error when exceeded.
- Reject missing, empty, or unsupported files before contacting the provider.
- Do not persist the upload or expose it in logs.

### Provider configuration

Keep audio provider details server-only and configurable:

- `OPENAI_TRANSCRIPTION_BASE_URL` — optional, defaults to the existing
  `OPENAI_BASE_URL` when set.
- `OPENAI_TRANSCRIPTION_MODEL` — optional transcription model name.
- `OPENAI_API_KEY` — existing server-only secret.

The route forwards the multipart audio to an OpenAI-compatible
`/v1/audio/transcriptions` endpoint when the transcription base URL and model
are configured. The current SumoPod model list exposes chat models but does not
advertise a speech-to-text model, so the route must return a specific 503
configuration response instead of pretending that transcription succeeded.

### Response contract

Success:

```json
{ "data": { "text": "Teks hasil transkripsi..." } }
```

Expected errors:

- `400` — missing/invalid/oversized audio;
- `401` — unauthenticated or invalid session;
- `429` — rate limited;
- `503` — transcription provider is not configured;
- `502` — provider rejected the request or returned malformed text;
- `504` — provider timeout;
- `500` — unexpected server failure.

Provider credentials, raw audio, note text, and provider response bodies must
not be logged. Logs may include route, status, and sanitized error category.
Use a bounded provider timeout.

## Error handling

Show concise Indonesian messages without losing existing editor content:

- Permission denied:
  `Akses mikrofon ditolak. Izinkan mikrofon di pengaturan browser untuk memakai Voice Note.`
- Browser unsupported:
  `Browser ini belum mendukung perekaman suara.`
- Recording too short:
  `Rekaman terlalu singkat. Tahan tombol sedikit lebih lama.`
- Provider unavailable:
  `Transkripsi AI belum tersedia. Teks yang berhasil dikenali browser tetap bisa digunakan.`
- Provider/network failure:
  `Suara belum bisa diubah menjadi teks. Silakan coba lagi.`
- No usable text:
  `Tidak ada ucapan yang berhasil dikenali. Coba rekam lagi.`

Errors are shown through the existing toast/error conventions and an inline
state near the voice control when context is helpful. A failed transcription
must never reset the title, content, tags, or color fields.

## Security and privacy

- Never send `OPENAI_API_KEY` to the browser.
- Never store voice recordings in Google Sheets, Supabase, or local
  persistent storage.
- Keep processing in memory and release buffers after the request completes.
- Require an authenticated user for every transcription request.
- Reuse the existing user and global rate limiters.
- Restrict accepted MIME types and request size.
- Avoid logging note content, transcription text, audio metadata that could
  identify a user, or provider credentials.
- Use same-origin relative API paths from the frontend.

## Performance and compatibility

- Use `requestAnimationFrame` for waveform updates and cancel it on every
  terminal transition.
- Keep React state updates to semantic state changes, duration ticks, and
  coarse visual values.
- Stop `MediaStream` tracks and close `AudioContext` after each recording.
- Use `touch-action: none` only on the recorder gesture surface; do not alter
  the page's general scroll behavior.
- Prefer a supported MIME type selected from `MediaRecorder.isTypeSupported`.
- The UI must remain usable when `SpeechRecognition`, vibration, Web Audio,
  or server transcription is unavailable.
- Test standalone PWA behavior because microphone permission and secure-context
  behavior differ from an ordinary browser tab.

## Backward compatibility

- Do not change the note schema, Google Sheets schema, or existing API CRUD
  routes.
- Do not alter the existing save validation or content limit of 50,000
  characters. If appending would exceed that limit, keep the current content
  and show a clear message asking the user to shorten the note.
- Do not change AI summarization behavior.
- Do not request microphone permission on page load or when the drawer opens.
- Existing typing, paste, edit, tag, color, cancel, close, and save flows must
  continue to work without the microphone feature.

## Verification

### Automated checks

- Unit-test append behavior, duration formatting, cancel threshold, MIME
  selection, response parsing, and provider error mapping.
- Component-test idle → permission → recording → processing → success.
- Component-test permission denial, unsupported recorder, cancel gesture,
  too-short recording, provider failure, no-text result, and content-limit
  protection.
- Confirm transcription result is editable before form submission.

The repository currently has no automated test runner, so the implementation
should add the smallest focused test setup needed for the new pure helpers and
component behavior, or document any environment limitation explicitly rather
than claiming unrun tests passed.

### Manual checks

- Chrome Android, including installed PWA.
- Safari iOS, including installed PWA.
- Chrome/Safari desktop.
- Microphone permission allow, deny, and previously blocked states.
- Press/release recording, slide-to-cancel, pointer leaving the button, and
  drawer close during recording.
- Keyboard activation, visible focus, screen reader labels, and reduced motion.
- Light/dark theme, narrow mobile width, desktop width, and soft keyboard
  visibility.

### Build and runtime checks

- Frontend typecheck/build.
- API typecheck/build.
- `git diff --check`.
- Restart frontend and API workflows.
- Inspect workflow and browser console logs.
- Confirm API root/health endpoint and frontend preview respond successfully.