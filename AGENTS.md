# Graphify — Knowledge Graph

This project has a graphify knowledge graph at `graphify-out/`.

## Rules for AI assistants

- Before answering architecture or codebase questions, read `graphify-out/GRAPH_REPORT.md` for god nodes and community structure.
- Use the graph CLI for precise lookups instead of guessing relationships:
  - `graphify explain "NodeName"` — explain a node and its neighbors
  - `graphify path "A" "B"` — shortest path between two nodes
  - `graphify query "<question>"` — BFS traversal of the graph for a question
  - `graphify god-nodes` — list the most connected architectural hubs
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost).
- The interactive visualization is at `graphify-out/graph.html`; open it in a browser to explore nodes and edges.
- The MCP server is available at `http://0.0.0.0:8099/mcp` when the `graphify: MCP server` workflow is running.

## Project graph summary (as of 2026-07-27)

- 3359 nodes · 4331 edges · 328 communities
- Top god nodes: `cn()`, `customFetch()`, `useAuthContext()`, `compilerOptions`
- Key application communities:
  - Community 8 — Pages and routing: `AuthPage`, `AuthConfirmPage`, `CatatanPage`, `ConnectSheetPage`, `BottomSheetNav`, `AuthGuard()`
  - Community 9 — Notes data layer: `useNotes()`, `apiGet()`, `apiPost()`, `apiDelete()`
  - Community 14 — API client: `ApiError`, `customFetch()`, `CustomFetchOptions`, `applyBaseUrl()`
  - Community 18 — Auth context and settings: `AuthContext`, `useAuthContext()`, `MainLayout()`, `SettingsSheet()`
  - Community 21 — API server routes: `activateSubscription()`, `archiveExpiredAccounts()`, `supabaseAdmin`, `router`
  - Community 23 — Google Sheets store: `listByUser()`, `archiveDeletedRow()`, `coerceValue()`, `withGoogleRetry()`
  - Community 33 — Google OAuth/Sheets connection: `SHEET_SCHEMAS`, `getUserSheetConnection()`, `classifyGoogleError()`
  - Community 34 — Architecture and data layer documentation

For details, open `graphify-out/GRAPH_REPORT.md` or the interactive `graphify-out/graph.html`.
