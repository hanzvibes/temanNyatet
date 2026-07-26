// ─── Runtime compatibility polyfills ─────────────────────────────────────
// `@supabase/supabase-js` eagerly constructs a `RealtimeClient` at module
// load time. RealtimeClient's `_initializeOptions` checks for a native
// `WebSocket` constructor and **throws synchronously** if it isn't there:
//
//   Error: Node.js detected but native WebSocket not found.
//
// This bites on Node.js 18 / 20 (which lack a globally-available WebSocket)
// and crashes the api-server cold-start before any route can be served.
// That's catastrophic on Vercel Functions — a single failed module load
// silently breaks every request.
//
// The server-side admin client never subscribes to Realtime channels, so
// we don't need a real socket implementation — just a constructable class
// whose statics satisfy the synchronous capability check. No-op methods
// keep the realtime client happy even if it ever tries to "connect" later.
//
// This file MUST be imported before `@supabase/supabase-js` anywhere in
// the dependency graph. We rely on ESM's left-to-right import evaluation:
// supabase-admin.ts puts `import './env-compat.js';` as its first import.

if (typeof (globalThis as { WebSocket?: unknown }).WebSocket === 'undefined') {
  class NoopWebSocket {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;

    readonly readyState = 3;
    onopen: unknown = null;
    onclose: unknown = null;
    onerror: unknown = null;
    onmessage: unknown = null;
    binaryType = '';
    bufferedAmount = 0;
    extensions = '';
    protocol = '';

    addEventListener(): void {}
    removeEventListener(): void {}
    dispatchEvent(): boolean { return true; }
    send(): void {}
    close(): void {}
  }
  (globalThis as { WebSocket?: unknown }).WebSocket = NoopWebSocket;
}

export {};
