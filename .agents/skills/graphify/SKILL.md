---
name: graphify
description: Use the graphify knowledge graph for TemanNyatet to answer architecture questions, trace relationships, and keep the graph up to date after code changes.
---

# Graphify — TemanNyatet Knowledge Graph

This project has a graphify knowledge graph generated under `graphify-out/`.

## When to use

- User asks about architecture, relationships, or "how does X connect to Y" in the codebase
- User asks how a feature is implemented or what files are involved
- After code changes, the graph needs to be refreshed
- User wants to query the graph via the MCP server or explore the visual graph

## What graphify provides

- `graphify-out/graph.json` — queryable graph (nodes, edges, communities)
- `graphify-out/GRAPH_REPORT.md` — summary with god nodes, community structure, and surprising connections
- `graphify-out/graph.html` — interactive visualization in a browser
- `graphify-out/.graphify_analysis.json` — clustering analysis

## Useful commands

Run from the project root:

```bash
# Explain a node and its neighbors
graphify explain "NodeName"

# Shortest path between two nodes
graphify path "A" "B"

# Answer a question by traversing the graph
graphify query "How does authentication flow work?"

# List top architectural hubs
graphify god-nodes

# Update the graph after code changes (AST-only, no API cost)
graphify update .

# Re-cluster only (no LLM labels)
graphify cluster-only . --no-label
```

## MCP server

A graphify MCP server is configured as a Replit workflow. When running, it serves the graph over HTTP at:

```
http://0.0.0.0:8099/mcp
```

Start it from the Replit Workflows panel: `graphify: MCP server`.

## Rules for answering questions

1. Before answering architecture questions, read `graphify-out/GRAPH_REPORT.md` for the latest god nodes and community structure.
2. Use `graphify explain`, `graphify path`, or `graphify query` to get precise relationships instead of guessing from file names.
3. After modifying code files in a session, run `graphify update .` to keep the graph current.
4. If the graph is missing or stale, generate it with:
   ```bash
   graphify update . --no-cluster
   graphify cluster-only . --no-label
   ```

## Key project communities (graphified)

- Community 8 — Pages/routing: `AuthPage`, `AuthConfirmPage`, `CatatanPage`, `ConnectSheetPage`, `BottomSheetNav`, `AuthGuard()`
- Community 9 — Notes data layer: `useNotes()`, `apiGet()`, `apiPost()`, `apiDelete()`
- Community 14 — API client: `ApiError`, `customFetch()`, `applyBaseUrl()`
- Community 18 — Auth context/settings: `AuthContext`, `useAuthContext()`, `MainLayout()`, `SettingsSheet()`
- Community 21 — API server routes: `activateSubscription()`, `archiveExpiredAccounts()`, `supabaseAdmin`, `router`
- Community 23 — Google Sheets store: `listByUser()`, `archiveDeletedRow()`, `coerceValue()`, `withGoogleRetry()`
- Community 33 — Google OAuth/Sheets connection: `SHEET_SCHEMAS`, `getUserSheetConnection()`, `classifyGoogleError()`
- Community 34 — Architecture and data layer docs

For more, see `AGENTS.md` in the project root.
