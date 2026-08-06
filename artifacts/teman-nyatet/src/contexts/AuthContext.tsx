import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '@/lib/database.types';
import { prefetchNotes } from '@/hooks/useNotes';

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string, userEmail?: string): Promise<Profile | null> => {
    try {
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) {
        console.warn('[AuthContext] Could not fetch profile:', error.message);
        return null;
      }

      // If the trigger that auto-creates the profile row didn't run (or hasn't run
      // yet), create the row ourselves so the user can actually log in.
      if (!data && userEmail) {
        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert(
            { id: userId, email: userEmail, subscription_status: 'pending' },
            { onConflict: 'id', ignoreDuplicates: true },
          );
        if (upsertError) {
          console.warn('[AuthContext] Could not create missing profile:', upsertError.message);
          return null;
        }
        ({ data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle());
        if (error) {
          console.warn('[AuthContext] Could not refetch profile after creating it:', error.message);
          return null;
        }
      }

      setProfile(data);
      return data;
    } catch (err) {
      console.warn('[AuthContext] Profile fetch threw:', err);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id, user.email);
  };

  useEffect(() => {
    let isMounted = true;

    // On slow mobile networks (iPhone, 3G/4G) Supabase's session check or token
    // refresh can take longer than expected. This timeout prevents the app from
    // getting stuck on the loading spinner forever if something hangs.
    const maxWaitTimeout = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 8000);

    const initialize = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (session?.user) {
          // Reject any existing session whose email has not been verified.
          if (!session.user.email_confirmed_at) {
            console.warn('[AuthContext] Existing session has unverified email, signing out');
            await supabase.auth.signOut();
            if (!isMounted) return;
            setUser(null);
            setProfile(null);
          } else {
            setUser(session.user);
            // Start the protected notes request while the profile query is
            // still running. Catatan can then render from cache immediately
            // when the auth redirect finishes.
            void prefetchNotes(session.user.id).catch(() => undefined);
            await fetchProfile(session.user.id, session.user.email);
          }
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.warn('[AuthContext] Initialization error:', err);
        if (isMounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        clearTimeout(maxWaitTimeout);
        if (isMounted) setLoading(false);
      }
    };

    initialize();

    // Supabase holds an internal auth lock while this callback runs. Never
    // await another Supabase call directly inside it: doing so can deadlock
    // sign-in on slower browsers and leave the app on "Memuat…" forever.
    const processAuthStateChange = async (session: Session) => {
      if (!isMounted) return;

      if (session.user.email_confirmed_at) {
        setUser(session.user);
        setProfile(null);
        void prefetchNotes(session.user.id).catch(() => undefined);
        await fetchProfile(session.user.id, session.user.email);
      } else {
        console.warn('[AuthContext] Auth state changed to unverified email, signing out');
        await supabase.auth.signOut();
        if (!isMounted) return;
        setUser(null);
        setProfile(null);
      }
      if (isMounted) setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      // INITIAL_SESSION is handled by initialize() above. Token refreshes do
      // not require a profile refetch, so only process state transitions that
      // can change the authenticated user.
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return;

      if (!session?.user) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      // Defer all Supabase work until the auth callback has returned and
      // released Supabase's internal lock.
      window.setTimeout(() => {
        void processAuthStateChange(session).catch((err) => {
          console.warn('[AuthContext] Auth state processing error:', err);
          if (isMounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
        });
      }, 0);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
