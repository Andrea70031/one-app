import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type OneProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
};

type AuthContextValue = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: OneProfile | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<'signed_in' | 'confirmation_required'>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadProfile(user: User | null): Promise<OneProfile | null> {
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,full_name')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw error;
  if (data) return data as OneProfile;
  return { id: user.id, email: user.email ?? null, full_name: null };
}

export function OneAuthProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<OneProfile | null>(null);

  const hydrate = async (nextSession: Session | null) => {
    setSession(nextSession);
    try {
      setProfile(await loadProfile(nextSession?.user ?? null));
    } catch {
      setProfile(nextSession?.user
        ? { id: nextSession.user.id, email: nextSession.user.email ?? null, full_name: null }
        : null);
    }
  };

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      await hydrate(data.session);
      if (mounted) setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      hydrate(nextSession).finally(() => mounted && setLoading(false));
    });

    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
      appState.remove();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    loading,
    session,
    user: session?.user ?? null,
    profile,
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    },
    async signUp(email, password, fullName) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: fullName?.trim() ? { data: { full_name: fullName.trim() } } : undefined,
      });
      if (error) throw error;
      return data.session ? 'signed_in' : 'confirmation_required';
    },
    async sendPasswordReset(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
    },
    async signOut() {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    async refreshProfile() {
      setProfile(await loadProfile(session?.user ?? null));
    },
  }), [loading, profile, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useOneAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useOneAuth deve essere usato dentro OneAuthProvider');
  return value;
}
