import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/lib/database.types';

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        if (!session.user.email_confirmed_at) {
          console.warn('[AuthContext] Auth state changed to unverified email, signing out');
          await supabase.auth.signOut();
          if (!isMounted) return;
          setUser(null);
          setProfile(null);
        } else {
          setUser(session.user);
          await fetchProfile(session.user.id, session.user.email);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      if (isMounted) setLoading(false);
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
