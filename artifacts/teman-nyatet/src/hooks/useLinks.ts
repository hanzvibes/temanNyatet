import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet, apiPost, apiDelete, SpreadsheetApiError } from '@/lib/apiClient';
import type { Link, LinkInsert } from '@/lib/database.types';
import { toast } from 'sonner';

function dispatchSheetError(code: string): void {
  window.dispatchEvent(
    new CustomEvent('teman-nyatet:spreadsheet-error', { detail: { code } }),
  );
}

const POLL_INTERVAL_MS = 15000;
const REFETCH_EVENT = 'teman-nyatet:refetch:links';

export function useLinks(userId?: string) {
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const firstLoad = useRef(true);

  const fetchLinks = useCallback(async () => {
    if (!userId) return;
    if (firstLoad.current) setLoading(true);
    try {
      const data = await apiGet<Link[]>('/links');
      setLinks((data || []).slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setError(null);
    } catch (err) {
      if (err instanceof SpreadsheetApiError) { dispatchSheetError(err.code); return; }
      setError(err as Error);
      if (firstLoad.current) toast.error('Gagal mengambil link');
    } finally {
      setLoading(false);
      firstLoad.current = false;
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    firstLoad.current = true;
    fetchLinks();
    const interval = setInterval(fetchLinks, POLL_INTERVAL_MS);
    const onExternalChange = () => fetchLinks();
    window.addEventListener(REFETCH_EVENT, onExternalChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener(REFETCH_EVENT, onExternalChange);
    };
  }, [userId, fetchLinks]);

  const createLink = async (link: Omit<LinkInsert, 'user_id'>) => {
    if (!userId) return;
    try {
      const data = await apiPost<Link>('/links', link);
      setLinks(prev => [data, ...prev]);
      toast.success('Link disimpan!');
      window.dispatchEvent(new CustomEvent(REFETCH_EVENT));
      return data;
    } catch (err) {
      toast.error('Gagal menyimpan link');
      throw err;
    }
  };

  const deleteLink = async (id: string) => {
    const prev = [...links];
    setLinks(links.filter(l => l.id !== id));
    try {
      await apiDelete(`/links/${id}`);
      toast.success('Link dihapus');
    } catch (err) {
      setLinks(prev);
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
