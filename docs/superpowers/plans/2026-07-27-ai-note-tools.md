# AI Note Tools Implementation Plan

> **For agentic workers:** Implement this plan task-by-task with the existing
> project conventions.

**Goal:** Add authenticated Anthropic note summaries and OpenAI Whisper voice
transcription to the TemanNyatet note flows.

**Architecture:** Keep provider calls in the Express API, protected by the
existing Supabase Bearer-token and per-user rate-limit middleware. Add a
frontend hook backed by the existing token-refreshing API client, then attach
voice recording to note creation/editing and summarization to note editing.

**Tech Stack:** Express 5, TypeScript, multer memory storage, Anthropic
Messages API, OpenAI Whisper API, React, react-hook-form, lucide-react,
Sonner, Vite.

## Global Constraints

- `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` must remain server-only.
- All AI endpoints require the existing authenticated user flow.
- Audio uploads are memory-backed and limited to 10 MB.
- Voice transcription appends text and summary output is not auto-saved.
- Keep the existing monorepo layout and API client conventions.

---

### Task 1: Add provider-safe AI route behavior

**Files:**
- Create: `artifacts/api-server/src/routes/ai.ts`
- Modify: `artifacts/api-server/src/app.ts`
- Modify: `artifacts/api-server/src/routes/index.ts`
- Modify: `artifacts/api-server/.env.example`
- Modify: `replit.md`

**Interfaces:**
- Produces `POST /api/ai/summarize` with `{ content: string }` → `{ summary: string }`.
- Produces `POST /api/ai/transcribe` with multipart field `audio` → `{ text: string }`.

- [ ] Add request validation and provider response parsing tests/helpers first.
- [ ] Verify the new tests fail because the AI route behavior is absent.
- [ ] Implement authenticated, rate-limited routes with safe errors and provider calls.
- [ ] Mount multer only for `/api/ai/transcribe` with a 10 MB limit.
- [ ] Register the router and document required environment names.
- [ ] Run the API typecheck.

### Task 2: Add authenticated frontend AI client

**Files:**
- Create: `artifacts/teman-nyatet/src/hooks/useAI.ts`
- Modify: `artifacts/teman-nyatet/src/lib/apiClient.ts` only if a missing typed upload behavior is required.

**Interfaces:**
- `useAI()` returns `summarizeNote(content)`, `transcribeAudio(blob)`,
  `summarizing`, and `transcribing`.

- [ ] Add hook behavior tests or focused type-level verification before implementation.
- [ ] Implement the hook with `apiPost` and `apiUpload`.
- [ ] Preserve existing token refresh and structured API error behavior.

### Task 3: Add voice note controls

**Files:**
- Modify: `artifacts/teman-nyatet/src/components/SheetFormContent.tsx`
- Modify: `artifacts/teman-nyatet/src/pages/CatatanPage.tsx`

- [ ] Add press-and-hold recording state and cleanup.
- [ ] Add microphone controls to the compact note sheet and create/edit drawer.
- [ ] Append the transcription to the current form content.
- [ ] Show loading and permission/provider errors in Indonesian.

### Task 4: Add note summarization UI

**Files:**
- Modify: `artifacts/teman-nyatet/src/pages/CatatanPage.tsx`

- [ ] Add the summary action in note edit mode.
- [ ] Display the transient summary and loading state.
- [ ] Prevent empty-content requests and surface failures with a toast.
- [ ] Run frontend typecheck and capture the preview.

### Task 5: End-to-end verification

**Files:**
- No additional source files.

- [ ] Restart the frontend and API workflows.
- [ ] Refresh workflow and browser logs.
- [ ] Run workspace typechecks.
- [ ] Confirm the preview renders the note UI and no browser errors appear.