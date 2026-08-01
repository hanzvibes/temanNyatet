---
name: PostgreSQL progressive rollout
description: TemanNyatet migrates Google Sheets data to SumoPod PostgreSQL per user and keeps users with invalid Google grants on the legacy path.
---

PostgreSQL-primary rollout must be allowlisted per user until each connected spreadsheet has been imported successfully. A Google `invalid_grant` means the user's refresh token is no longer usable; keep that user on the Google Sheets path and require reconnect before retrying migration.

**Why:** Activating PostgreSQL for an unmigrated user makes the app appear to lose data, while forcing a stale Google token can import the wrong or incomplete spreadsheet.

**How to apply:** Run the batch importer, add only successful user IDs to `APP_DATA_POSTGRES_USER_IDS`, and retry failed users only after their Google connection is refreshed.