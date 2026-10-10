import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { supabase } from '@/lib/supabase';
import type { Account, Profile, Settings } from '@/lib/types';

type AuthValue = {
  session: Session | null;
  profile: Profile | null;
  account: Account | null;
  settings: Settings;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const DEFAULT_SETTINGS: Settings = {
  allowed_email_domains: ['ad.unsw.edu.au', 'student.unsw.edu.au'],
  require_phone: true,
  min_age: 18,
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [initialised, setInitialised] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const sessionRef = useRef<Session | null>(null);

  const loadUser = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null);
      setAccount(null);
      setLoadedFor(null);
      return;
    }
    const [p, a] = await Promise.all([
      supabase.from('profiles').select('id, first_name, suburb, sports, level').eq('id', s.user.id).maybeSingle(),
      supabase.from('accounts').select('user_id, strikes, status, suspended_until, is_moderator').eq('user_id', s.user.id).maybeSingle(),
    ]);
    if (sessionRef.current?.user.id !== s.user.id) return; // signed out or switched while loading
    setProfile((p.data as Profile | null) ?? null);
    setAccount((a.data as Account | null) ?? null);
    setLoadedFor(s.user.id);
  }, []);

  useEffect(() => {
    supabase
      .from('app_settings')
      .select('allowed_email_domains, require_phone, min_age')
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSettings(data as Settings);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      sessionRef.current = s;
      setSession(s);
      setInitialised(true);
      // Supabase advises against awaiting its own calls inside this callback.
      setTimeout(() => {
        void loadUser(s);
      }, 0);
    });

    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void loadUser(sessionRef.current);
    });

    return () => {
      sub.subscription.unsubscribe();
      appState.remove();
    };
  }, [loadUser]);

  const refresh = useCallback(() => loadUser(sessionRef.current), [loadUser]);
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const loading = !initialised || (!!session && loadedFor !== session.user.id);

  return (
    <AuthContext.Provider value={{ session, profile, account, settings, loading, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
