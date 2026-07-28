# AI Voice Note Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a press-and-hold AI Voice Note control to the existing note editor that records audio, transcribes it through a hybrid browser/server path, and appends editable text without changing existing note behavior.

**Architecture:** Keep recording and animation concerns in a reusable `useVoiceRecorder` hook plus a focused `VoiceNoteButton` component. Keep transcription validation/provider forwarding in a dedicated API route and helper so the existing notes CRUD and summarization route stay unchanged. `CatatanPage` owns only the form integration: uploading the completed Blob, selecting the server/browser text fallback, and appending within the existing 50,000-character limit.

**Tech Stack:** React 19, TypeScript, Vite, react-hook-form, Framer Motion/Tailwind tokens, Lucide icons, MediaRecorder, Web Audio `AnalyserNode`, optional browser `SpeechRecognition`, Express 5, Multer memory storage, OpenAI-compatible multipart transcription, Vitest, Testing Library, and existing Sonner toasts.

## Global Constraints

- Append transcription to the end of the current editor content; never overwrite existing content.
- Insert one blank line between existing content and newly transcribed text.
- Do not change note schema, Google Sheets schema, existing CRUD routes, save validation, search, ordering, tags, colors, or AI summarization behavior.
- Do not request microphone permission on page load or when the drawer opens.
- The existing content limit remains 50,000 characters; reject an append that would exceed it without changing the editor.
- Use `MediaRecorder` as the cross-platform recording path and browser `SpeechRecognition` only as an opportunistic low-latency/fallback path.
- Audio is processed in memory only and is never persisted to Google Sheets, Supabase, local persistent storage, or logs.
- The transcription endpoint requires authentication, uses `requireUser` and `userRateLimit`, and accepts a maximum 10MB audio file.
- Keep `OPENAI_API_KEY` and provider responses server-only.
- The current SumoPod model list exposes chat models but does not advertise speech-to-text; if no transcription base URL/model is configured, return an explicit 503 and preserve any browser text already captured.
- Use `requestAnimationFrame` for waveform rendering, cancel it on every terminal transition, and keep per-frame values out of React state.
- The control must remain usable when SpeechRecognition, vibration, Web Audio, or server transcription is unavailable.
- Respect `prefers-reduced-motion: reduce`.
- Verify with frontend/API typechecks and builds, `git diff --check`, workflow restarts, logs, and preview/health checks.

---

## File Map

### Create

- `artifacts/teman-nyatet/src/lib/voiceNote.ts` — pure append, duration, MIME, gesture, and error-message helpers.
- `artifacts/teman-nyatet/src/hooks/useVoiceRecorder.ts` — microphone permission, MediaRecorder, SpeechRecognition, pointer gesture, timer, analyser, and cleanup lifecycle.
- `artifacts/teman-nyatet/src/components/VoiceNoteButton.tsx` — Material Design 3 control, waveform canvas, state labels, accessibility, and haptics.
- `artifacts/teman-nyatet/src/test/setup.ts` — frontend Vitest/Testing Library setup.
- `artifacts/teman-nyatet/src/lib/voiceNote.test.ts` — pure helper tests.
- `artifacts/teman-nyatet/src/hooks/useVoiceRecorder.test.ts` — recorder lifecycle and gesture tests.
- `artifacts/teman-nyatet/src/components/VoiceNoteButton.test.tsx` — component state/accessibility tests.
- `artifacts/teman-nyatet/vitest.config.ts` — frontend test configuration.
- `artifacts/api-server/src/lib/transcription.ts` — upload validation, provider configuration, multipart forwarding, timeout, and response parsing.
- `artifacts/api-server/src/lib/transcription.test.ts` — API transcription helper tests.
- `artifacts/api-server/src/routes/transcription.ts` — authenticated `POST /notes/transcribe` route.
- `artifacts/api-server/src/routes/transcription.test.ts` — route-level validation/configuration tests.
- `artifacts/api-server/vitest.config.ts` — API test configuration.

### Modify

- `artifacts/teman-nyatet/src/pages/CatatanPage.tsx` — render the voice control beside the content editor and append accepted transcription.
- `artifacts/teman-nyatet/package.json` — add frontend test command and test-only dependencies.
- `artifacts/api-server/src/routes/index.ts` — register the transcription router.
- `artifacts/api-server/package.json` — add API test command and test-only dependencies.
- `docs/ENVIRONMENT.md` — document optional server transcription variables without secrets.
- `docs/TESTING.md` — add the manual Voice Note checklist.

---

### Task 1: Add test foundation and pure voice-note helpers

**Files:**
- Create: `artifacts/teman-nyatet/vitest.config.ts`
- Create: `artifacts/teman-nyatet/src/test/setup.ts`
- Create: `artifacts/teman-nyatet/src/lib/voiceNote.test.ts`
- Create: `artifacts/api-server/vitest.config.ts`
- Create: `artifacts/api-server/src/lib/transcription.test.ts`
- Modify: `artifacts/teman-nyatet/package.json`
- Modify: `artifacts/api-server/package.json`

**Interfaces:**
- Produces `appendTranscription(existing: string, transcription: string, maxLength?: number): { ok: true; value: string } | { ok: false; reason: 'empty' | 'content-limit' }`.
- Produces `formatVoiceDuration(milliseconds: number): string`.
- Produces `isVoiceCancelGesture(origin: { x: number; y: number }, current: { x: number; y: number }, threshold?: number): boolean`.
- Produces `getSupportedAudioMimeType(mediaRecorderCtor?: typeof MediaRecorder): string | null`.
- Produces API helpers `validateAudioUpload`, `getTranscriptionConfig`, and `parseTranscriptionResponse` for later route work.

- [ ] **Step 1: Read the package-management skill before changing dependencies**

  Use the repository's package-management instructions before installing test packages. Do not add a second test framework or modify the workspace minimum release-age policy.

- [ ] **Step 2: Add the failing frontend helper tests**

  Create `voiceNote.test.ts` with these concrete expectations:

  ```ts
  expect(appendTranscription('', '  Belanja susu  ')).toEqual({
    ok: true,
    value: 'Belanja susu',
  });
  expect(appendTranscription('Catatan lama', 'Catatan baru')).toEqual({
    ok: true,
    value: 'Catatan lama\n\nCatatan baru',
  });
  expect(appendTranscription('Catatan lama', '   ')).toEqual({
    ok: false,
    reason: 'empty',
  });
  expect(appendTranscription('12345', '6', 5)).toEqual({
    ok: false,
    reason: 'content-limit',
  });
  expect(formatVoiceDuration(0)).toBe('00:00');
  expect(formatVoiceDuration(65_000)).toBe('01:05');
  expect(formatVoiceDuration(3_661_000)).toBe('61:01');
  expect(isVoiceCancelGesture({ x: 100, y: 100 }, { x: 171, y: 100 })).toBe(false);
  expect(isVoiceCancelGesture({ x: 100, y: 100 }, { x: 172, y: 100 })).toBe(true);
  ```

  Add MIME-selection cases for `audio/webm;codecs=opus`, `audio/mp4`, and a
  constructor supporting none of the accepted MIME types.

- [ ] **Step 3: Run the frontend helper test to verify it fails**

  Run:

  ```bash
  pnpm --filter @workspace/teman-nyatet test -- src/lib/voiceNote.test.ts
  ```

  Expected: FAIL because `src/lib/voiceNote.ts` does not exist yet.

- [ ] **Step 4: Add the failing API helper tests**

  In `transcription.test.ts`, test:

  ```ts
  expect(validateAudioUpload(null)).toBe('missing-file');
  expect(validateAudioUpload({
    buffer: Buffer.from('audio'),
    mimetype: 'text/plain',
    size: 5,
  })).toBe('unsupported-type');
  expect(validateAudioUpload({
    buffer: Buffer.from('audio'),
    mimetype: 'audio/webm',
    size: 0,
  })).toBe('empty-file');
  expect(parseTranscriptionResponse({ text: '  Halo dunia  ' })).toBe('Halo dunia');
  expect(() => parseTranscriptionResponse({ text: ' ' })).toThrow('empty');
  expect(getTranscriptionConfig({
    OPENAI_API_KEY: 'server-key',
    OPENAI_TRANSCRIPTION_BASE_URL: 'https://provider.example/',
    OPENAI_TRANSCRIPTION_MODEL: 'whisper-1',
  })).toEqual({
    apiKey: 'server-key',
    baseUrl: 'https://provider.example',
    model: 'whisper-1',
  });
  ```

  The test must never print the fake key or include a real secret.

- [ ] **Step 5: Run the API helper test to verify it fails**

  Run:

  ```bash
  pnpm --filter @workspace/api-server test -- src/lib/transcription.test.ts
  ```

  Expected: FAIL because the helper module does not exist yet.

- [ ] **Step 6: Implement the pure helpers**

  Implement the exact interfaces above. Trim transcription before appending,
  preserve the original string on rejection, clamp negative durations to zero,
  use a 72px default cancel threshold, and select the first supported MIME type
  from:

  ```ts
  [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/wav',
  ]
  ```

  API validation must accept those MIME families, cap size at
  `10 * 1024 * 1024`, and return stable error kinds rather than provider text.

- [ ] **Step 7: Run both helper tests and typechecks**

  Run:

  ```bash
  pnpm --filter @workspace/teman-nyatet test -- src/lib/voiceNote.test.ts
  pnpm --filter @workspace/api-server test -- src/lib/transcription.test.ts
  pnpm --filter @workspace/teman-nyatet run typecheck
  pnpm --filter @workspace/api-server run typecheck
  ```

  Expected: all helper tests PASS and both typechecks PASS.

- [ ] **Step 8: Commit the test foundation and helpers**

  ```bash
  git add artifacts/teman-nyatet/vitest.config.ts \
    artifacts/teman-nyatet/src/test/setup.ts \
    artifacts/teman-nyatet/src/lib/voiceNote.ts \
    artifacts/teman-nyatet/src/lib/voiceNote.test.ts \
    artifacts/teman-nyatet/package.json \
    artifacts/api-server/vitest.config.ts \
    artifacts/api-server/src/lib/transcription.ts \
    artifacts/api-server/src/lib/transcription.test.ts \
    artifacts/api-server/package.json
  git commit -m "test: add voice note helper foundations"
  ```

### Task 2: Implement the authenticated server transcription endpoint

**Files:**
- Create: `artifacts/api-server/src/routes/transcription.ts`
- Create: `artifacts/api-server/src/routes/transcription.test.ts`
- Modify: `artifacts/api-server/src/routes/index.ts`

**Interfaces:**
- Consumes `validateAudioUpload`, `getTranscriptionConfig`,
  `transcribeAudio`, and `parseTranscriptionResponse` from
  `src/lib/transcription.ts`.
- Produces `POST /api/notes/transcribe` with multipart field `audio`.
- Produces success response `{ data: { text: string } }`.
- Produces stable error statuses: 400 validation, 401 auth, 429 rate limit,
  503 missing configuration, 502 provider failure/malformed response, 504
  timeout, and 500 unexpected failure.

- [ ] **Step 1: Add failing provider-request tests**

  Extend `transcription.test.ts` with a fake `fetch` test that asserts:

  ```ts
  expect(request.url).toBe(
    'https://provider.example/v1/audio/transcriptions',
  );
  expect(request.init.method).toBe('POST');
  expect(request.init.headers).toEqual({
    Authorization: 'Bearer server-key',
  });
  ```

  Read the multipart body and assert it contains `file` and `model=whisper-1`.
  Assert a provider `{ text: 'hasil' }` response becomes `'hasil'`, a non-2xx
  response throws a categorized provider error, and an aborted fetch throws a
  timeout error.

- [ ] **Step 2: Run the provider-request test and verify it fails**

  Run:

  ```bash
  pnpm --filter @workspace/api-server test -- src/lib/transcription.test.ts
  ```

  Expected: FAIL because `transcribeAudio` has not been implemented.

- [ ] **Step 3: Implement provider configuration and forwarding**

  In `src/lib/transcription.ts`:

  - Read `OPENAI_TRANSCRIPTION_BASE_URL`, falling back to
    `OPENAI_BASE_URL`; read `OPENAI_TRANSCRIPTION_MODEL`.
  - Require all three values (`OPENAI_API_KEY`, base URL, model) before a
    provider request.
  - Strip trailing slashes from the base URL.
  - Build a native `FormData` body with a `Blob` made from the in-memory
    `Buffer`, the original MIME type, a safe fallback filename, and the model.
  - Send only the `Authorization` header so the runtime creates the multipart
    boundary.
  - Abort after 30 seconds.
  - Parse only a non-empty string `text` response.
  - Do not log audio, transcription, headers, provider body, or credentials.

- [ ] **Step 4: Add failing route tests**

  In `transcription.test.ts`, use Vitest module mocks for `requireUser` and
  `userRateLimit`, mount the router in a small Express app, and test:

  - `POST /api/notes/transcribe` without a file returns `400` with
    `error: 'missing-file'`.
  - A `text/plain` upload returns `400` with `error: 'unsupported-type'`.
  - Valid audio with missing provider configuration returns `503` with
    `error: 'AI_TRANSCRIPTION_NOT_CONFIGURED'`.
  - Valid configured audio returns `200` with
    `{ data: { text: 'hasil transkripsi' } }`.
  - The route is mounted at `/api/notes/transcribe` by `routes/index.ts`.

- [ ] **Step 5: Run the route tests to verify they fail**

  Run:

  ```bash
  pnpm --filter @workspace/api-server test -- src/routes/transcription.test.ts
  ```

  Expected: FAIL because the route and router registration do not exist.

- [ ] **Step 6: Implement the route**

  Create a memory-storage Multer instance with a 10MB file-size limit. Wrap
  `upload.single('audio')` in an Express middleware that converts Multer file
  errors into the documented 400 JSON responses. The route order must be:

  ```ts
  router.post(
    '/notes/transcribe',
    requireUser,
    userRateLimit,
    uploadAudio,
    asyncHandler,
  );
  ```

  The handler must validate `req.file`, return 503 before contacting a provider
  when configuration is missing, call `transcribeAudio`, and map timeout/provider
  failures without leaking provider response text. Register the router in
  `routes/index.ts` without changing the existing notes router.

- [ ] **Step 7: Run API tests, typecheck, and build**

  Run:

  ```bash
  pnpm --filter @workspace/api-server test
  pnpm --filter @workspace/api-server run typecheck
  pnpm --filter @workspace/api-server run build
  ```

  Expected: all API tests PASS, typecheck PASS, and build completes.

- [ ] **Step 8: Commit the API endpoint**

  ```bash
  git add artifacts/api-server/src/lib/transcription.ts \
    artifacts/api-server/src/lib/transcription.test.ts \
    artifacts/api-server/src/routes/transcription.ts \
    artifacts/api-server/src/routes/transcription.test.ts \
    artifacts/api-server/src/routes/index.ts
  git commit -m "feat: add authenticated voice transcription endpoint"
  ```

### Task 3: Build the recorder hook and Material Design 3 voice control

**Files:**
- Create: `artifacts/teman-nyatet/src/hooks/useVoiceRecorder.ts`
- Create: `artifacts/teman-nyatet/src/hooks/useVoiceRecorder.test.ts`
- Create: `artifacts/teman-nyatet/src/components/VoiceNoteButton.tsx`
- Create: `artifacts/teman-nyatet/src/components/VoiceNoteButton.test.tsx`

**Interfaces:**
- `VoiceRecording`:

  ```ts
  export interface VoiceRecording {
    blob: Blob;
    browserText: string;
    durationMs: number;
  }
  ```

- `VoiceRecorderState` is
  `'idle' | 'requesting-permission' | 'recording' | 'cancelling' | 'processing' | 'error'`.
- `useVoiceRecorder(options)` returns:
  `state`, `elapsedMs`, `cancelDistance`, `waveformCanvasRef`,
  `beginPointerRecording(event)`, `movePointerRecording(event)`,
  `endPointerRecording()`, `toggleKeyboardRecording()`, and `reset()`.
- `VoiceNoteButtonProps` is:

  ```ts
  interface VoiceNoteButtonProps {
    onComplete: (recording: VoiceRecording) => Promise<void>;
    disabled?: boolean;
  }
  ```

- [ ] **Step 1: Add failing hook tests with browser fakes**

  In `useVoiceRecorder.test.ts`, provide deterministic fake implementations for
  `navigator.mediaDevices.getUserMedia`, `MediaRecorder`, and
  `SpeechRecognition`. Test:

  - permission request starts only after `beginPointerRecording`;
  - `recording` state starts after `getUserMedia` resolves;
  - `pointerup` creates one Blob and calls `onComplete`;
  - moving 72px or more enters `cancelling`;
  - releasing after cancellation does not call `onComplete`;
  - a second keyboard toggle stops recording;
  - `MediaStream.getTracks().forEach(track.stop)` runs on completion, cancel,
    error, and cleanup;
  - browser final SpeechRecognition results are returned in `browserText`;
  - permission rejection enters `error` without throwing an unhandled promise.

- [ ] **Step 2: Run hook tests to verify they fail**

  Run:

  ```bash
  pnpm --filter @workspace/teman-nyatet test -- src/hooks/useVoiceRecorder.test.ts
  ```

  Expected: FAIL because the hook does not exist.

- [ ] **Step 3: Implement the recorder lifecycle**

  Implement the hook with:

  - permission requested inside `beginPointerRecording`;
  - MIME selection from `getSupportedAudioMimeType`;
  - `MediaRecorder.start()` and chunk collection;
  - optional `SpeechRecognition` configured with `lang = 'id-ID'`,
    `interimResults = true`, and `continuous = true`;
  - pointer origin and `isVoiceCancelGesture` for the 72px threshold;
  - elapsed duration based on `performance.now()`;
  - a `requestAnimationFrame` loop that draws analyser levels to the supplied
    canvas ref without storing every frame in React state;
  - cleanup that cancels RAF, clears timers, closes `AudioContext`, stops all
    tracks, stops MediaRecorder when active, and stops SpeechRecognition.

  Handle `NotAllowedError`, missing `navigator.mediaDevices`, missing
  `MediaRecorder`, and missing `AudioContext` as explicit typed errors. Lack of
  SpeechRecognition or vibration is a supported capability difference, not a
  recorder failure.

- [ ] **Step 4: Add failing component tests**

  In `VoiceNoteButton.test.tsx`, render the button with an async `onComplete` and
  test:

  - idle accessible name includes `Voice Note`;
  - `aria-label`, visible focus ring classes, and `aria-busy` are present in
    the relevant states;
  - pointer down/up shows recording then processing;
  - recording view shows `00:00` and `Geser untuk membatalkan`;
  - moving beyond the threshold shows `Lepaskan untuk membatalkan`;
  - processing disables the control and shows
    `Mengubah suara menjadi teks…`;
  - rejected completion returns to an error state with a retryable Indonesian
    message;
  - `prefers-reduced-motion` removes decorative pulse classes while labels and
    duration remain available.

- [ ] **Step 5: Run component tests to verify they fail**

  Run:

  ```bash
  pnpm --filter @workspace/teman-nyatet test -- src/components/VoiceNoteButton.test.tsx
  ```

  Expected: FAIL because the component does not exist.

- [ ] **Step 6: Implement the Material Design 3 control**

  Build an extended FAB using `Mic`, `Loader2`, and `AudioLines`/equivalent
  Lucide icons. Use the existing primary/card tokens, a minimum 48px target,
  rounded full treatment, restrained elevation, and transform/opacity motion.
  Attach `onPointerDown`, `onPointerMove`, `onPointerUp`, and
  `onPointerCancel`, using pointer capture on the gesture surface. Provide a
  keyboard click fallback that toggles recording. Render the canvas waveform,
  duration, cancel guidance, processing spinner, and a polite live region.
  Call `navigator.vibrate(10)` only after a successful recording start and
  guard the call for browsers without vibration support.

- [ ] **Step 7: Run hook/component tests and frontend typecheck**

  Run:

  ```bash
  pnpm --filter @workspace/teman-nyatet test
  pnpm --filter @workspace/teman-nyatet run typecheck
  ```

  Expected: all recorder/button tests PASS and typecheck PASS.

- [ ] **Step 8: Commit the recorder UI**

  ```bash
  git add artifacts/teman-nyatet/src/hooks/useVoiceRecorder.ts \
    artifacts/teman-nyatet/src/hooks/useVoiceRecorder.test.ts \
    artifacts/teman-nyatet/src/components/VoiceNoteButton.tsx \
    artifacts/teman-nyatet/src/components/VoiceNoteButton.test.tsx
  git commit -m "feat: add press and hold voice note control"
  ```

### Task 4: Integrate transcription into the existing note editor

**Files:**
- Modify: `artifacts/teman-nyatet/src/pages/CatatanPage.tsx`
- Modify: `artifacts/teman-nyatet/src/lib/voiceNote.test.ts`

**Interfaces:**
- Consumes `VoiceNoteButton` and `VoiceRecording`.
- Uses existing `form.getValues('content')` and `form.setValue('content', value, { shouldDirty: true, shouldValidate: true })`.
- Calls existing `apiUpload<{ text: string }>('/notes/transcribe', formData)`.
- Uses `appendTranscription` with the existing `CONTENT_MAX` of 50,000 characters.

- [ ] **Step 1: Add failing append-integration tests**

  Add these assertions to the existing `voiceNote.test.ts`; this repository has
  no page-level test harness, so do not create a duplicate `CatatanPage` test
  harness just for this integration:

  ```ts
  expect(appendTranscription('Teks lama', 'Teks server')).toEqual({
    ok: true,
    value: 'Teks lama\n\nTeks server',
  });
  expect(appendTranscription('Teks lama', 'Teks browser')).toEqual({
    ok: true,
    value: 'Teks lama\n\nTeks browser',
  });
  ```

  Also test that an append over 50,000 characters returns
  `{ ok: false, reason: 'content-limit' }` and leaves the source value intact.

- [ ] **Step 2: Run the integration test to verify it fails**

  Run:

  ```bash
  pnpm --filter @workspace/teman-nyatet test -- src/lib/voiceNote.test.ts
  ```

  Expected: FAIL until the content-limit assertion and append behavior are
  implemented.

- [ ] **Step 3: Implement the upload/fallback callback in CatatanPage**

  Add an async handler that:

  1. Creates `FormData`.
  2. Appends `recording.blob` as `audio` with a safe filename and MIME type.
  3. Calls `apiUpload<{ text: string }>('/notes/transcribe', formData)`.
  4. Uses the server `text` when successful.
  5. If the server request fails but `recording.browserText` is non-empty, appends
     the browser text and shows a non-blocking Sonner notice that browser
     transcription was used.
  6. If neither path has text, throws a mapped error so the button displays the
     retryable error state.
  7. Calls `appendTranscription(form.getValues('content'), text, 50_000)`.
  8. Shows `Catatan terlalu panjang. Kurangi isi catatan sebelum menambahkan suara.`
     and does not call `form.setValue` when the limit would be exceeded.
  9. Calls `form.setValue` only with a successful append and sets
     `shouldDirty` and `shouldValidate` to true.

- [ ] **Step 4: Place the control in the note editor**

  Wrap the existing textarea in a `relative` container. Add
  `VoiceNoteButton` at the lower end of the editor as a floating control,
  reserving bottom/right padding so it never covers typed content. Pass the
  async completion handler. Keep the existing textarea registration,
  placeholder, autoFocus, height, validation error, tag controls, color picker,
  drawer close, and submit button unchanged.

- [ ] **Step 5: Add error and lifecycle integration**

  Map these cases to the exact user-facing messages from the spec:

  - `NotAllowedError` → microphone permission message;
  - unsupported recorder → browser unsupported message;
  - provider 503 → provider unavailable message;
  - provider/network/timeout → retry message;
  - empty browser/server text → no-usable-text message.

  Ensure `setIsFormOpen(false)` or component unmount causes the recorder hook to
  clean up. Do not reset the form when recording fails or is cancelled.

- [ ] **Step 6: Run frontend tests, typecheck, and build**

  Run:

  ```bash
  pnpm --filter @workspace/teman-nyatet test
  pnpm --filter @workspace/teman-nyatet run typecheck
  pnpm --filter @workspace/teman-nyatet run build
  ```

  Expected: all frontend tests PASS, typecheck PASS, and production build
  completes without changing existing route chunks except the note page.

- [ ] **Step 7: Commit the editor integration**

  ```bash
  git add artifacts/teman-nyatet/src/pages/CatatanPage.tsx \
    artifacts/teman-nyatet/src/lib/voiceNote.test.ts
  git commit -m "feat: append voice transcription to note editor"
  ```

### Task 5: Document configuration and manual compatibility checks

**Files:**
- Modify: `docs/ENVIRONMENT.md`
- Modify: `docs/TESTING.md`

**Interfaces:**
- Documents optional `OPENAI_TRANSCRIPTION_BASE_URL` and
  `OPENAI_TRANSCRIPTION_MODEL`.
- Documents that `OPENAI_API_KEY` remains server-only.
- Adds a manual checklist for Android, iOS, Web, installed PWA, permissions,
  cancel gesture, keyboard, screen reader, reduced motion, and soft keyboard.

- [ ] **Step 1: Add the environment documentation**

  Explain that:

  ```text
  OPENAI_TRANSCRIPTION_BASE_URL   optional; falls back to OPENAI_BASE_URL
  OPENAI_TRANSCRIPTION_MODEL      required for server transcription
  ```

  Do not add secret values. State that the current SumoPod chat model setup may
  return the explicit provider-unavailable state until an audio-capable
  endpoint/model is configured.

- [ ] **Step 2: Add the Voice Note manual checklist**

  Add checks for:

  - Chrome Android and installed Android PWA;
  - Safari iOS and installed iOS PWA;
  - Chrome/Safari desktop;
  - allow, deny, and previously blocked microphone permission;
  - hold/release, slide 72px to cancel, pointer leaving the button, and drawer
    close during recording;
  - server transcription success, browser fallback, provider unavailable,
    network failure, no speech, too-short recording, and content-limit refusal;
  - edit the inserted text before saving;
  - keyboard activation, visible focus, live-region announcements, reduced
    motion, light/dark theme, narrow width, and soft keyboard visibility.

- [ ] **Step 3: Run whitespace and documentation checks**

  ```bash
  git diff --check
  ```

  Expected: no output and documentation contains no credentials or placeholder
  instructions.

- [ ] **Step 4: Commit documentation**

  ```bash
  git add docs/ENVIRONMENT.md docs/TESTING.md
  git commit -m "docs: document voice note setup and QA"
  ```

### Task 6: Full verification and runtime review

**Files:**
- No new source files; inspect all changed files and workflow output.

**Interfaces:**
- Final deliverable is the working Voice Note feature with unchanged existing
  note behavior and verified frontend/API runtime startup.

- [ ] **Step 1: Run the complete workspace checks**

  ```bash
  pnpm run typecheck
  pnpm --filter @workspace/api-server test
  pnpm --filter @workspace/teman-nyatet test
  pnpm --filter @workspace/api-server run build
  pnpm --filter @workspace/teman-nyatet run build
  git diff --check
  ```

  Expected: every command exits zero.

- [ ] **Step 2: Restart both application workflows**

  Restart:

  ```text
  artifacts/api-server: API Server
  artifacts/teman-nyatet: web
  ```

  Refresh workflow logs and confirm the API server and Vite server reach their
  ready states without new errors. The unrelated graphify workflow is not part
  of this feature verification.

- [ ] **Step 3: Verify health and preview**

  Confirm the API root/health response is successful and capture the frontend
  preview. Verify the unauthenticated preview still loads the existing login
  screen without browser console errors.

- [ ] **Step 4: Review the final diff against the spec**

  Confirm:

  - no existing note CRUD route changed;
  - no note schema/database migration was added;
  - no secret or raw audio appears in source/logs;
  - idle, recording, cancelling, processing, error, and success states are
    represented;
  - browser fallback preserves text when the server provider is unavailable;
  - content appending remains editable and save validation still applies.

- [ ] **Step 5: Commit the verified implementation**

  ```bash
  git add artifacts/teman-nyatet artifacts/api-server docs
  git commit -m "feat: ship premium AI voice notes"
  ```

---

## Spec Coverage Self-Review

- Recording and permission lifecycle: Tasks 3 and 4.
- Press-and-hold/release and 72px slide cancel: Tasks 1, 3, and 5.
- Waveform, duration, haptics, 60 FPS animation, reduced motion: Task 3.
- Hybrid browser/server transcription and SumoPod limitation: Tasks 2 and 4.
- Editable append at end with blank line: Tasks 1 and 4.
- Processing state and duplicate prevention: Task 3.
- Permission/provider/network/no-text errors: Tasks 2, 3, 4, and 5.
- Cross-platform Web/PWA validation: Task 5.
- API auth, limits, in-memory processing, no logging of sensitive data: Task 2.
- Existing functionality preservation: Tasks 4 and 6.
- Automated and manual verification: Tasks 1 through 6.

No unresolved placeholders, TODO markers, or undefined cross-task interfaces
remain in this plan.