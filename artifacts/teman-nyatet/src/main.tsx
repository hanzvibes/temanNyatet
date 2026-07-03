import { createRoot } from 'react-dom/client';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import { supabase } from '@/lib/supabase';
import App from './App';
import './index.css';

// Attach Supabase access token to all generated API hook requests.
// This enables the /api/subscription/status endpoint to verify the caller's
// identity without accepting arbitrary userIds from the query string.
setAuthTokenGetter(async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(<App />);
