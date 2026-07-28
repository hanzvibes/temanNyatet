# AI Note Summaries Design

## Goal

Add an on-demand GPT-powered summary action to TemanNyatet's note detail view
without changing existing note data or CRUD behavior.

## User experience

- In read mode for an expanded note, show a `Ringkas dengan AI` action.
- The action sends the current note content to the API server only when tapped.
- While generating, disable the action and show a loading state.
- On success, show an Indonesian summary limited to 2–3 concise sentences.
- The summary is display-only: it is not saved to Google Sheets and disappears
  when the detail view closes or another note is opened.
- Show a retryable error state if generation fails.
- Do not offer summarization for empty notes.

## Server design

- Add an authenticated `POST /api/notes/:id/summarize` endpoint.
- Reuse the existing per-user Sheets lookup path so a caller can summarize only
  their own note.
- Validate the note id and content bounds before calling the provider.
- Call OpenAI from the API server with `OPENAI_API_KEY` from Replit Secrets.
- Keep the provider key and provider response details server-side.
- Return `{ data: { summary: string } }` on success and explicit JSON errors on
  configuration, provider, validation, and not-found failures.
- Limit summary requests with the existing per-user rate limiter.
- Do not add a database column or persist generated summaries.

## Security and reliability

- Never send the OpenAI key to the browser or log note content/provider
  credentials.
- Use a bounded request timeout and reject malformed provider responses.
- Use a small output token budget and an instruction that the model must return
  only the summary in Indonesian.
- Preserve all existing note editing, deletion, ordering, and search behavior.

## Verification

- API and frontend typechecks.
- Frontend and API builds.
- Diff whitespace check.
- Restart both application workflows and inspect logs.
- Confirm the frontend and API health endpoints respond successfully.