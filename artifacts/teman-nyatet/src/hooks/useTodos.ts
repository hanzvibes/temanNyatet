import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Todo, TodoInsert, TodoUpdate } from '@/lib/database.types';
import { toast } from 'sonner';

export function useTodos(userId?: string) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTodos = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTodos(data || []);
    } catch (err) {
      setError(err as Error);
      toast.error('Gagal mengambil To-do');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, [userId]);

  const createTodo = async (todo: Omit<TodoInsert, 'user_id'>) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('todos')
        .insert({ ...todo, user_id: userId })
        .select()
        .single();
        
      if (error) throw error;
      setTodos([data, ...todos]);
      toast.success('To-do ditambahkan!');
      return data;
    } catch (err) {
      toast.error('Gagal menambah To-do');
      throw err;
    }
  };

  const updateTodo = async (id: string, updates: TodoUpdate) => {
    // Optimistic
    const prev = [...todos];
    setTodos(todos.map(t => t.id === id ? { ...t, ...updates } : t));

    try {
      const { data, error } = await supabase
        .from('todos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      // Optional: replace with server data
      setTodos(prev => prev.map(t => t.id === id ? data : t));
      return data;
    } catch (err) {
      setTodos(prev);
      toast.error('Gagal memperbarui To-do');
      throw err;
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      const prev = [...todos];
      setTodos(todos.filter(t => t.id !== id));
      
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id);
        
      if (error) {
        setTodos(prev);
        throw error;
      }
      toast.success('To-do dihapus');
    } catch (err) {
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
