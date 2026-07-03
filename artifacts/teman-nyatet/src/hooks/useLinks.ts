import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Link, LinkInsert } from '@/lib/database.types';
import { toast } from 'sonner';

export function useLinks(userId?: string) {
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchLinks = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('links')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinks(data || []);
    } catch (err) {
      setError(err as Error);
      toast.error('Gagal mengambil link');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, [userId]);

  const createLink = async (link: Omit<LinkInsert, 'user_id'>) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('links')
        .insert({ ...link, user_id: userId })
        .select()
        .single();
        
      if (error) throw error;
      setLinks([data, ...links]);
      toast.success('Link disimpan!');
      return data;
    } catch (err) {
      toast.error('Gagal menyimpan link');
      throw err;
    }
  };

  const deleteLink = async (id: string) => {
    try {
      const prev = [...links];
      setLinks(links.filter(l => l.id !== id));
      
      const { error } = await supabase
        .from('links')
        .delete()
        .eq('id', id);
        
      if (error) {
        setLinks(prev);
        throw error;
      }
      toast.success('Link dihapus');
    } catch (err) {
      toast.error('Gagal menghapus link');
      throw err;
    }
  };

  return {
    links,
    loading,
    error,
    createLink,
    deleteLink,
    refetch: fetchLinks
  };
}
