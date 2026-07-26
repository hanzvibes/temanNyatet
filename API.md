# API.md — TemanNyatet API Reference

> Base URL (production): `https://teman-nyatet-api-server.vercel.app`  
> Base URL (Replit dev): proxied via Vite at `/api/*` → `http://localhost:8080`

## Related documentation

| Document | Path |
|---|---|
| README — project overview & docs map | [`README.md`](./README.md) |
| AI_CONTEXT — quick reference for AI agents | [`AI_CONTEXT.md`](./AI_CONTEXT.md) |
| ARCHITECTURE — system architecture & middleware stack | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |
| AUTH — token format & auth flows | [`AUTH.md`](./AUTH.md) |
| DATABASE — request/response schemas | [`DATABASE.md`](./DATABASE.md) |
| ENVIRONMENT — env vars for the API server | [`ENVIRONMENT.md`](./ENVIRONMENT.md) |

---

---

## Authentication

All data routes require a Supabase JWT:

```
Authorization: Bearer <supabase-access-token>
```

The token is obtained from `supabase.auth.getSession()` on the frontend. The API server verifies it against Supabase. Email must be confirmed; unconfirmed users get `401`.

Data routes additionally require a connected Google Spreadsheet. If the user has not completed Google OAuth, the response is:

```json
HTTP 428
{ "error": "GOOGLE_NOT_CONNECTED" }
```

Rate limit: 120 requests/minute per user (per-user, in-memory). Global limit: 300 requests/15 minutes per IP.

---

## Health

### `GET /healthz`

Public. No auth required.

**Response `200`**
```json
{ "status": "ok" }
```

### `GET /`

Public. Returns API info.

**Response `200`**
```json
{ "name": "TemanNyatet API", "status": "running", "health": "/api/healthz" }
```

---

## Google OAuth

### `GET /api/auth/google/initiate`

Requires `requireUser` (Supabase JWT only — no spreadsheet required).

Returns the Google OAuth consent URL. The frontend opens this URL in the same tab.

**Response `200`**
```json
{ "url": "https://accounts.google.com/o/oauth2/v2/auth?..." }
```

---

### `GET /api/auth/google/callback`

Called by Google after user approves the consent screen. Not called directly by the frontend.

Query params: `code`, `state` (HMAC-signed, verified server-side).

On success:
1. Exchanges code for tokens
2. Creates a Google Spreadsheet in user's Drive
3. Initializes spreadsheet tabs + headers
4. Saves `spreadsheet_id` + `google_refresh_token` to `profiles`
5. Redirects to `FRONTEND_URL` (or `REPLIT_DEV_DOMAIN`/`localhost:5000` fallback)

On error: redirects to `FRONTEND_URL?error=<code>`.

---

### `GET /api/auth/google/status`

Requires `requireUser`.

**Response `200`**
```json
{
  "connected": true,
  "spreadsheet_id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
}
```

---

### `DELETE /api/auth/google/disconnect`

Requires `requireUser`.

Revokes the Google refresh token and clears `spreadsheet_id` + `google_refresh_token` from `profiles`. The user's spreadsheet is NOT deleted from their Drive.

**Response `200`**
```json
{ "success": true }
```

---

## Subscription

### `GET /api/subscription/status`

Requires valid Supabase Bearer token (no spreadsheet required).

**Response `200`**
```json
{
  "subscription_status": "active",
  "subscription_plan": "monthly",
  "subscription_end": "2026-08-26T00:00:00.000Z",
  "days_remaining": 31
}
```

`days_remaining` is `null` if `subscription_end` is null. `subscription_plan` is `null` for `pending`/`archived` users.

---

## Notes

All note routes require `requireAuth` (Supabase JWT + connected Google Spreadsheet) and `userRateLimit`.

### `GET /api/notes`

Returns all notes for the authenticated user, sorted by `position` (descending) then `created_at` (descending).

**Response `200`**
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "title": "Judul catatan",
      "content": "Isi catatan",
      "tags": ["kerja", "ide"],
      "created_at": "2026-07-01T10:00:00Z",
      "updated_at": "2026-07-01T10:00:00Z",
      "position": "10"
    }
  ]
}
```

---

### `POST /api/notes`

**Body**
```json
{
  "content": "string (required, max 50000 chars)",
  "title": "string (optional, max 200 chars)",
  "tags": ["string"] 
}
```

**Response `201`** — returns `{ "data": <new-note> }`

**Error `400`** — validation error (missing content, title too long, etc.)

---

### `PUT /api/notes/:id`

Updates an existing note. All fields optional; only provided fields are updated.

**Body** (all optional)
```json
{
  "title": "string",
  "content": "string",
  "tags": ["string"]
}
```

**Response `200`** — returns `{ "data": <updated-note> }`  
**Error `404`** — note not found or belongs to another user

---

### `POST /api/notes/reorder`

Updates `position` values for drag-and-drop reordering.

**Body**
```json
{ "orderedIds": ["uuid1", "uuid2", "uuid3"] }
```

**Response `200`**
```json
{ "success": true }
```

---

### `DELETE /api/notes/:id`

Soft-deletes the note (moves to `_Archive` tab).

**Response `200`**
```json
{ "success": true }
```

**Error `404`** — note not found or belongs to another user

---

## Transactions

All transaction routes require `requireAuth` + `userRateLimit`.

### `GET /api/transactions`

Returns all transactions for the authenticated user.

**Response `200`**
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "type": "expense",
      "amount": 50000,
      "category": "Makanan",
      "source": "GoPay",
      "note": "Beli kopi",
      "date": "2026-07-15",
      "created_at": "2026-07-15T08:00:00Z"
    }
  ]
}
```

---

### `POST /api/transactions`

**Body**
```json
{
  "type": "income | expense (required)",
  "amount": 100000,
  "category": "Gaji",
  "source": "BCA",
  "note": "optional string",
  "date": "YYYY-MM-DD"
}
```

**Response `201`** — returns `{ "data": <new-transaction> }`  
**Error `400`** — validation error

---

### `DELETE /api/transactions/:id`

Soft-deletes the transaction.

**Response `200`** `{ "success": true }`  
**Error `404`** — not found

---

## Todos

All todo routes require `requireAuth` + `userRateLimit`.

### `GET /api/todos`

**Response `200`** — `{ "data": [<todo>, ...] }`

Todo shape:
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "Beli susu",
  "description": null,
  "due_date": "2026-07-20",
  "due_time": "09:00",
  "is_done": false,
  "created_at": "2026-07-01T10:00:00Z"
}
```

---

### `POST /api/todos`

**Body**
```json
{
  "title": "string (required)",
  "description": "string | null",
  "due_date": "YYYY-MM-DD | null",
  "due_time": "HH:MM | null",
  "is_done": false
}
```

**Response `201`** — returns `{ "data": <new-todo> }`

---

### `PUT /api/todos/:id`

**Body** (all optional)
```json
{
  "title": "string",
  "description": "string | null",
  "due_date": "YYYY-MM-DD | null",
  "due_time": "HH:MM | null",
  "is_done": true
}
```

**Response `200`** — returns `{ "data": <updated-todo> }`  
**Error `404`** — not found

---

### `DELETE /api/todos/:id`

**Response `200`** `{ "success": true }`

---

## Links

All link routes require `requireAuth` + `userRateLimit`.

### `GET /api/links`

**Response `200`** — `{ "data": [<link>, ...] }`

Link shape:
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "Artikel React",
  "url": "https://react.dev",
  "note": "buat referensi",
  "created_at": "2026-07-01T10:00:00Z"
}
```

---

### `POST /api/links`

**Body**
```json
{
  "title": "string (required)",
  "url": "string (required, valid URL)",
  "note": "string | null"
}
```

**Response `201`** — returns `{ "data": <new-link> }`

---

### `DELETE /api/links/:id`

**Response `200`** `{ "success": true }`

---

## Spreadsheet

All spreadsheet routes require `requireUser` (Supabase JWT — spreadsheet may not exist for status/validate).

### `GET /api/spreadsheet/status`

Returns the spreadsheet connection status for the authenticated user.

**Response `200`**
```json
{
  "connected": true,
  "spreadsheet_id": "...",
  "spreadsheet_url": "https://docs.google.com/spreadsheets/d/.../edit"
}
```

---

### `POST /api/spreadsheet/validate`

Checks whether the user's spreadsheet is accessible and has the expected tabs.

**Response `200`**
```json
{
  "valid": true,
  "missing_sheets": []
}
```

---

### `POST /api/spreadsheet/repair`

Re-creates any missing tabs and repairs header rows. Safe to call on a spreadsheet with data — only missing tabs and missing header rows are added; existing data rows are not touched.

**Response `200`**
```json
{
  "repaired": ["📝 Notes", "💰 Transactions", "✅ Todos", "🔗 Links", "📦 _Archive"]
}
```

---

## Profile

### `POST /api/profile/avatar`

Requires `requireUser`. Uploads a profile photo to Supabase Storage (`avatars` bucket) and updates `profiles.avatar_url`.

**Body**: `multipart/form-data` with field `avatar` (image file).

**Response `200`**
```json
{ "avatar_url": "https://...supabase.co/storage/v1/object/public/avatars/..." }
```

---

## Webhook

### `POST /api/mayar-webhook`

**Public** (no Supabase auth). Secured via HMAC-SHA256 signature verification.

Header required: `x-mayar-signature` (hex-encoded HMAC-SHA256 of raw body using `MAYAR_WEBHOOK_SECRET`).

Processes `payment.success`, `order.completed`, `invoice.paid` events. Other events are acknowledged with `200` but not processed.

On payment success:
- Resolves plan (`monthly` or `yearly`) from `plan_name`, `plan_id`, or `amount` (Rp249.000+ = yearly)
- Calls `activateSubscription(customer_email, plan)` → updates `profiles.subscription_status` to `'active'`

Returns `503` if `MAYAR_WEBHOOK_SECRET` is not set (endpoint disabled).

---

## Cron

### `POST /api/cron/archive-expired`

Secured by `Authorization: Bearer <CRON_SECRET>` header. Not a Supabase JWT.

Archives users whose `subscription_end` has passed by setting their `subscription_status` to `'archived'`.

**Response `200`**
```json
{ "archived": 3 }
```

> ⚠️ Vercel Cron Jobs only support GET. Call this endpoint from an external scheduler (GitHub Actions, cron-job.org, etc.) or add a GET handler if migrating to Vercel Cron.

---

## Error codes

| HTTP | `error` field | Meaning |
|---|---|---|
| `400` | `"<field> is required"` | Validation error |
| `401` | `"Authorization header with Bearer token is required"` | Missing token |
| `401` | `"Invalid or expired token"` | Bad/expired Supabase JWT |
| `401` | `"Email not confirmed"` | User email unverified |
| `404` | `"Note not found"` | Row not found or owned by different user |
| `428` | `"GOOGLE_NOT_CONNECTED"` | User has not connected Google OAuth |
| `503` | `"SPREADSHEET_NOT_FOUND"` | User's spreadsheet was deleted from their Drive |
| `503` | `"GOOGLE_TOKEN_INVALID"` | OAuth token revoked; user must reconnect |
| `503` | `"SPREADSHEET_ACCESS_DENIED"` | Insufficient permissions on spreadsheet |
| `503` | `"Webhook not configured"` | `MAYAR_WEBHOOK_SECRET` not set |
| `500` | `"Internal server error"` | Unexpected server error |
