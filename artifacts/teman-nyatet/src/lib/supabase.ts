import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[TemanNyatet] Missing Supabase environment variables. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.',
  );
}

// Use placeholder values when credentials are absent so the client initialises
// without throwing. All API calls will fail gracefully until real credentials
// are provided.
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);

// Auth helpers
export const signOut = async () => {
  await supabase.auth.signOut();
};

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) return null;
  return session;
};
