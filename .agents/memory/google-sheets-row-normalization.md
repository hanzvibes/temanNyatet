---
name: Google Sheets row normalization
description: Defensive handling for spreadsheet-backed app data before it reaches React rendering.
---

Spreadsheet rows are user-editable and may contain empty cells, invalid dates, JSON strings, wrong primitive types, or duplicate IDs. Normalize and validate rows at the client data boundary, and use safe formatting for dates in the UI.

**Why:** A malformed row can throw during render—for example, string methods on non-strings or date-fns formatting an invalid date—and crash the whole SPA even though the API request succeeded.

**How to apply:** Keep normalizers focused on the response shape for each resource, discard records without stable IDs, coerce optional fields to safe defaults, and make display formatters return a fallback label for invalid values. Keep an app-level error boundary as a final recovery path, not as the primary data fix.