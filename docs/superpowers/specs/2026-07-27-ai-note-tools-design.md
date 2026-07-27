# AI Note Tools Design

## Goal

Add two authenticated AI-assisted note tools to TemanNyatet:

1. Summarize note content in Bahasa Indonesia without automatically saving the result.
2. Record a press-and-hold voice note and append its Indonesian Whisper transcription to the note content.

## Architecture

The Express API owns all provider calls. It exposes `/api/ai/summarize` and
`/api/ai/transcribe`, authenticates through the existing Supabase Bearer-token
middleware, and applies the existing per-user rate limiter. Anthropic and
OpenAI keys remain server-only environment values.

The React frontend adds a small `useAI` hook on top of the existing authenticated
`apiPost` and `apiUpload` helpers. The note creation sheet and note create/edit
drawer share the voice-recording interaction. The note edit form also exposes a
summary action and displays the returned summary locally.

## Interaction and error handling

- The microphone action starts on pointer down and stops on pointer up or when
  the pointer leaves the control.
- A recording stream is always stopped after recording ends.
- Transcription is appended to existing content with a newline and never
  replaces content.
- Provider keys are checked on the server and missing keys produce a clear
  configuration error.
- Empty summaries/transcriptions and invalid uploads are rejected.
- Provider failures return a safe user-facing error while detailed provider
  responses are logged server-side.
- Summary results are transient and are not persisted unless the user manually
  copies them.

## Verification

- Typecheck both workspace packages.
- Start both Replit workflows and inspect logs.
- Capture the frontend preview to verify the note controls render.
- Manually verify the existing note form remains usable when microphone access
  is unavailable.