import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet, apiPost, apiPut, apiDelete, ApiError } from '@/lib/apiClient';
import type { Note, NoteInsert, NoteUpdate } from '@/lib/database.types';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { normalizeNotes, noteTimestamp } from '@/lib/noteData';
import { requestFreePlanLimitDialog } from '@/lib/app-events';

// Data lives in PostgreSQL (via the api-server). We poll so changes made
// from another device or session still show up without a manual refresh.
const POLL_INTERVAL_MS = 15000;
const REFETCH_EVENT = 'teman-nyatet:refetch:notes';
const REFETCH_LINKS_EVENT = 'teman-nyatet:refetch:links';

function refreshLinksAfterNoteSave() {
  // The API persists the note response first and syncs links in the
  // background. Refresh now for fast feedback, then once more after the
  // background sync has had time to finish.
  window.dispatchEvent(new CustomEvent(REFETCH_LINKS_EVENT));
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent(REFETCH_LINKS_EVENT));
  }, 750);
}

// ── Module-level cache ────────────────────────────────────────────────────────
// Why: wouter's `<Switch>` only renders the matched route. Navigating between
// Catatan / Keuangan / Todo / Link Saver unmounts the previous page component
// — and with it the local `useState` in this hook. On a remount the page would
// show an empty grid until the next fetch round-trip finishes. Caching the
// notes outside the component lifecycle (KeyedMap by userId) means re-entering
// a tab populates the grid instantly with the last-known data, while polling
// continues to keep it fresh in the background.
const notesByUser = new Map<string, Note[]>();
let cacheSubscriber: { unsubscribe: () => void } | null = null;

// Drop cached data when the user signs out so the next sign-in (potentially
// a different account on the same browser) cannot briefly read the previous
// user's notes. Lazy-attached once on first useNotes call.
function ensureCacheCleanupWired() {
  if (cacheSubscriber) return;
  const { data } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') notesByUser.clear();
  });
  cacheSubscriber = data.subscription;
}

export function useNotes(userId?: string) {
  ensureCacheCleanupWired();

  // Hydrate from cache so tab re-entry shows the existing grid immediately.
  const [notes, setNotes] = useState<Note[]>(() =>
    userId ? notesByUser.get(userId) ?? [] : [],
  );
  const [loading, setLoading] = useState(() => !(userId && notesByUser.has(userId)));
  const [error, setError] = useState<Error | null>(null);
  const firstLoad = useRef(true);
  const notesRef = useRef(notes);
  const pendingReorderRef = useRef<{ requestId: number; orderedIds: string[] } | null>(null);
  const reorderRequestIdRef = useRef(0);
  const reorderQueueRef = useRef(Promise.resolve());

  // Keep a synchronous snapshot for drag interactions. React state updates are
  // asynchronous, so a second quick drop must build on the first optimistic
  // order instead of reading the previous render.
  notesRef.current = notes;

  // Mirror React state into the module-level cache so subsequent mounts on
  // the same tab (or any other consumer) can hydrate from it. Logout is
  // already handled by the SIGNED_OUT listener wired in `ensureCache...`.
  useEffect(() => {
    if (userId) notesByUser.set(userId, notes);
  }, [notes, userId]);

  const fetchNotes = useCallback(async () => {
    if (!userId) return;
    if (firstLoad.current) setLoading(true);
    try {
      const data = await apiGet<Note[]>('/notes');
      const safeNotes = normalizeNotes(data);
      // A poll can return before the reorder request reaches the database.
      // Keep the user's optimistic order visible until the latest write has
      // completed; otherwise cards visibly jump back every 15 seconds.
      if (pendingReorderRef.current) return;
      // Server already sorts by position desc, then created_at desc.
      setNotes(safeNotes.sort((a, b) => {
        const posA = a.position ?? 0;
        const posB = b.position ?? 0;
        if (posA !== posB) return posB - posA;
        return noteTimestamp(b.created_at) - noteTimestamp(a.created_at);
      }));
      setError(null);
    } catch (err) {
      setError(err as Error);
      if (firstLoad.current) toast.error('Gagal mengambil catatan');
    } finally {
      setLoading(false);
      firstLoad.current = false;
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    firstLoad.current = true;
    void fetchNotes().catch(() => undefined);
    const interval = setInterval(() => {
      void fetchNotes().catch(() => undefined);
    }, POLL_INTERVAL_MS);
    const onExternalChange = () => {
      void fetchNotes().catch(() => undefined);
    };
    window.addEventListener(REFETCH_EVENT, onExternalChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener(REFETCH_EVENT, onExternalChange);
    };
  }, [userId, fetchNotes]);

  const createNote = async (note: Omit<NoteInsert, 'user_id'>) => {
    if (!userId) return;
    try {
      const data = await apiPost<Note>('/notes', note);
      setNotes(prev => [data, ...prev]);
      toast.success('Catatan disimpan!');
      window.dispatchEvent(new CustomEvent(REFETCH_EVENT));
      refreshLinksAfterNoteSave();
      return data;
    } catch (err) {
      if (err instanceof ApiError && err.code === 'FREE_PLAN_LIMIT_REACHED') {
        requestFreePlanLimitDialog({
          resource: 'notes',
          limit: 3,
        });
      } else {
        toast.error('Gagal menyimpan catatan');
      }
      throw err;
    }
  };

  const updateNote = async (id: string, updates: NoteUpdate) => {
    try {
      const data = await apiPut<Note>(`/notes/${id}`, updates);
      setNotes(prev => prev.map(n => n.id === id ? data : n));
      toast.success('Catatan diperbarui!');
      refreshLinksAfterNoteSave();
      return data;
    } catch (err) {
      toast.error('Gagal memperbarui catatan');
      throw err;
    }
  };

  const deleteNote = async (id: string) => {
    const prev = [...notes];
    setNotes(notes.filter(n => n.id !== id));
    try {
      await apiDelete(`/notes/${id}`);
    } catch (err) {
      setNotes(prev);
      throw err;
    }
  };

  const reorderNotes = async (orderedIds: string[]) => {
    // Optimistic reorder so the UI feels instant.
    const orderedSet = new Set(orderedIds);
    const prev = [...notesRef.current];
    const reordered = orderedIds
      .map(id => prev.find(n => n.id === id))
      .filter((n): n is Note => n !== undefined);
    const unchanged = prev.filter(n => !orderedSet.has(n.id));
    const next = [...reordered, ...unchanged];
    const requestId = ++reorderRequestIdRef.current;
    pendingReorderRef.current = { requestId, orderedIds };
    notesRef.current = next;
    setNotes(next);

    // Serialize writes so rapid successive drops cannot finish out of order
    // and leave the database with an older arrangement.
    const write = reorderQueueRef.current.then(() =>
      apiPost('/notes/reorder', { orderedIds }),
    );
    reorderQueueRef.current = write.then(() => undefined, () => undefined);

    try {
      await write;
      if (pendingReorderRef.current?.requestId === requestId) {
        pendingReorderRef.current = null;
      }
    } catch (err) {
      if (pendingReorderRef.current?.requestId === requestId) {
        pendingReorderRef.current = null;
        notesRef.current = prev;
        setNotes(prev);
        toast.error('Gagal menyimpan urutan catatan');
      }
    }
  };

  return {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
    reorderNotes,
    refetch: fetchNotes,
  };
}
