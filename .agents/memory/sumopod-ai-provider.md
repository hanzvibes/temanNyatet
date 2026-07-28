---
name: SumoPod AI provider
description: OpenAI-compatible AI endpoint used by note summarization
---

The note summarization provider uses SumoPod's OpenAI-compatible API at `https://ai.sumopod.com/v1/chat/completions`, with the server-only `OPENAI_API_KEY`. The model defaults to `gpt-4o-mini` and can be overridden with `OPENAI_MODEL`; the base URL can be overridden with `OPENAI_BASE_URL`.

**Why:** The original OpenAI endpoint returned 401 for the configured key, while SumoPod accepted the same credential and supports the requested model.

**How to apply:** Keep provider calls server-side, never expose the key to the frontend, and verify both `/v1/models` and `/v1/chat/completions` when diagnosing summarization failures.