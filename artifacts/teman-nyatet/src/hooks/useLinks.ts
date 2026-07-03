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
    if (!userId) return;

    fetchLinks();

    const channel = supabase
      .channel(`links:${userId}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'links', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLinks(prev => {
              if (prev.some(l => l.id === (payload.new as Link).id)) return prev;
              return [payload.new as Link, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            setLinks(prev =>
              prev.map(l => l.id === (payload.new as Link).id ? payload.new as Link : l)
            );
          } else if (payload.eventType === 'DELETE') {
            setLinks(prev => prev.filter(l => l.id !== (payload.old as { id: string }).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
      setLinks(prev => prev.some(l => l.id === data.id) ? prev : [data, ...prev]);
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
