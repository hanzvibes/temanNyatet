---
name: Secrets pasted in chat
description: How to handle a user pasting real secret values directly into a chat message.
---

Users sometimes paste actual credential values (API keys, service role keys, etc.) directly into a chat
message when answering a question, instead of using a secure form.

Rule: do not read those values back, echo them, or try to shell/env-inject them yourself. Call
`requestSecrets({ keys: [...] })` for the relevant key names so the user re-enters them through the secure
secrets form. Treat the chat-pasted text only as a signal for *which* secrets are needed, not as the value
to use.

**Why:** the environment-secrets skill's only sanctioned way to persist a secret value is the user-facing
`requestSecrets` form; there is no programmatic "set secret value" callback, and printing/pasting secret
values back (including via shell `echo`/`env`) risks leaking them into logs.

**How to apply:** whenever a user's answer or comment contains what looks like a credential, key, or token,
immediately call `requestSecrets` for those keys instead of trying to persist the pasted value directly.
