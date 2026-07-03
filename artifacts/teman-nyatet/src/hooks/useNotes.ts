import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Note, NoteInsert, NoteUpdate } from '@/lib/database.types';
import { toast } from 'sonner';

export function useNotes(userId?: string) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchNotes = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (err) {
      setError(err as Error);
      toast.error('Gagal mengambil catatan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [userId]);

  const createNote = async (note: Omit<NoteInsert, 'user_id'>) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({ ...note, user_id: userId })
        .select()
        .single();
        
      if (error) throw error;
      setNotes([data, ...notes]);
      toast.success('Catatan disimpan!');
      return data;
    } catch (err) {
      toast.error('Gagal menyimpan catatan');
      throw err;
    }
  };

  const updateNote = async (id: string, updates: NoteUpdate) => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      setNotes(notes.map(n => n.id === id ? data : n));
      toast.success('Catatan diperbarui!');
      return data;
    } catch (err) {
      toast.error('Gagal memperbarui catatan');
      throw err;
    }
  };

  const deleteNote = async (id: string) => {
    try {
      // Optimistic delete
      const prev = [...notes];
      setNotes(notes.filter(n => n.id !== id));
      
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);
        
      if (error) {
        setNotes(prev);
        throw error;
      }
      toast.success('Catatan dihapus');
    } catch (err) {
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
