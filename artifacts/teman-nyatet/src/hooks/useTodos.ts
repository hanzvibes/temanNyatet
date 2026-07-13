import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/apiClient';
import type { Todo, TodoInsert, TodoUpdate } from '@/lib/database.types';
import { toast } from 'sonner';

const POLL_INTERVAL_MS = 15000;

export function useTodos(userId?: string) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const firstLoad = useRef(true);

  const fetchTodos = useCallback(async () => {
    if (!userId) return;
    if (firstLoad.current) setLoading(true);
    try {
      const data = await apiGet<Todo[]>('/todos');
      setTodos((data || []).slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setError(null);
    } catch (err) {
      setError(err as Error);
      if (firstLoad.current) toast.error('Gagal mengambil To-do');
    } finally {
      setLoading(false);
      firstLoad.current = false;
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    firstLoad.current = true;
    fetchTodos();
    const interval = setInterval(fetchTodos, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [userId, fetchTodos]);

  const createTodo = async (todo: Omit<TodoInsert, 'user_id'>) => {
    if (!userId) return;
    try {
      const data = await apiPost<Todo>('/todos', todo);
      setTodos(prev => [data, ...prev]);
      toast.success('To-do ditambahkan!');
      return data;
    } catch (err) {
      toast.error('Gagal menambah To-do');
      throw err;
    }
  };

  const updateTodo = async (id: string, updates: TodoUpdate) => {
    const prev = [...todos];
    setTodos(todos.map(t => t.id === id ? { ...t, ...updates } : t));
    try {
      const data = await apiPut<Todo>(`/todos/${id}`, updates);
      setTodos(curr => curr.map(t => t.id === id ? data : t));
      return data;
    } catch (err) {
      setTodos(prev);
      toast.error('Gagal memperbarui To-do');
      throw err;
    }
  };

  const deleteTodo = async (id: string) => {
    const prev = [...todos];
    setTodos(todos.filter(t => t.id !== id));
    try {
      await apiDelete(`/todos/${id}`);
      toast.success('To-do dihapus');
    } catch (err) {
      setTodos(prev);
      toast.error('Gagal menghapus To-do');
      throw err;
    }
  };

  return {
    todos,
    loading,
    error,
    createTodo,
    updateTodo,
    deleteTodo,
    refetch: fetchTodos
  };
}
