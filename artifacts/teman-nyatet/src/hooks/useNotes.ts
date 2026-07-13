import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/apiClient';
import type { Note, NoteInsert, NoteUpdate } from '@/lib/database.types';
import { toast } from 'sonner';

// Data now lives in a Google Sheet (via the api-server), which has no
// realtime push. We poll instead so edits made directly in the sheet still
// show up without a manual refresh.
const POLL_INTERVAL_MS = 15000;

// Custom event used to synchronise multiple hook instances (e.g. bottom-sheet
// form vs. the page that displays the list) without a shared state layer.
const REFETCH_EVENT = 'teman-nyatet:refetch:notes';

export function useNotes(userId?: string) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const firstLoad = useRef(true);

  const fetchNotes = useCallback(async () => {
    if (!userId) return;
    if (firstLoad.current) setLoading(true);
    try {
      const data = await apiGet<Note[]>('/notes');
      setNotes((data || []).slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
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
    fetchNotes();
    const interval = setInterval(fetchNotes, POLL_INTERVAL_MS);
    // Listen for creates from OTHER hook instances (e.g. bottom-sheet form)
    // so the page list updates immediately without waiting for the poll.
    const onExternalChange = () => fetchNotes();
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
      // Notify other hook instances (e.g. on the page) to refetch immediately.
      window.dispatchEvent(new CustomEvent(REFETCH_EVENT));
      return data;
    } catch (err) {
      toast.error('Gagal menyimpan catatan');
      throw err;
    }
  };

  const updateNote = async (id: string, updates: NoteUpdate) => {
    try {
      const data = await apiPut<Note>(`/notes/${id}`, updates);
      setNotes(prev => prev.map(n => n.id === id ? data : n));
      toast.success('Catatan diperbarui!');
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
      toast.success('Catatan dihapus');
    } catch (err) {
      setNotes(prev);
      toast.error('Gagal menghapus catatan');
      throw err;
    }
  };

  return {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
    refetch: fetchNotes
  };
}
