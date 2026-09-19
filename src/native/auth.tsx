import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, AppState, Linking } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { AUTH_REDIRECT, parseAuthLink } from './authLinks';
import { setNotificationUser } from './notifications';

export type OneProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
};

type AuthContextValue = {
  loading: boolean;
  passwordRecovery: boolean;
  updatePassword: (password: string) => Promise<void>;
  session: Session | null;
  user: User | null;
  profile: OneProfile | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<'signed_in' | 'confirmation_required'>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
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
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [profile, setProfile] = useState<OneProfile | null>(null);

  useEffect(() => {
    let mounted = true;
    let revision = 0;
    let eventReceived = false;
    let lastLink = '';
    const hydrate = (nextSession: Session | null) => {
      const current = ++revision;
      if (!mounted) return;
      setSession(nextSession);
      setProfile(nextSession?.user ? { id: nextSession.user.id, email: nextSession.user.email ?? null, full_name: null } : null);
      setLoading(false);
      setNotificationUser(nextSession?.user.id ?? null);
      if (!nextSession) setPasswordRecovery(false);
      // Run database work outside the Supabase auth lock.
      setTimeout(() => {
        if (!mounted || current !== revision) return;
        loadProfile(nextSession?.user ?? null).then(next => {
          if (mounted && current === revision) setProfile(next);
        }).catch(() => undefined);
      }, 0);
    };
    const { data: authListener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      eventReceived = true;
      if (event === 'PASSWORD_RECOVERY' && mounted) setPasswordRecovery(true);
      hydrate(nextSession);
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted || eventReceived) return;
      hydrate(error ? null : data.session);
    }).catch(() => { if (mounted && !eventReceived) hydrate(null); });
    const startupTimer = setTimeout(() => { if (mounted) setLoading(false); }, 12000);
    const handleLink = async (url: string) => {
      if (!mounted || url === lastLink) return;
      try {
        const tokens = parseAuthLink(url);
        if (!tokens) return;
        lastLink = url;
        // Hide the main app while establishing a recovery session.
        if (tokens.recovery) setPasswordRecovery(true);
        const { error } = await supabase.auth.setSession(tokens);
        if (error) throw error;
      } catch {
        lastLink = '';
        if (mounted) {
          setPasswordRecovery(false);
          Alert.alert('Link non valido', 'Il link è scaduto o non è utilizzabile. Richiedi una nuova email.');
        }
      }
    };
    const linkListener = Linking.addEventListener('url', ({ url }) => { void handleLink(url); });
    Linking.getInitialURL().then(url => { if (url) void handleLink(url); }).catch(() => undefined);
    if (AppState.currentState === 'active') supabase.auth.startAutoRefresh();
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    return () => {
      mounted = false;
      revision++;
      clearTimeout(startupTimer);
      authListener.subscription.unsubscribe();
      linkListener.remove();
      appState.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    loading,
    passwordRecovery,
    async updatePassword(password) {
      if (password.length < 8) throw new Error('Usa almeno 8 caratteri.');
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPasswordRecovery(false);
    },
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
        options: { emailRedirectTo: AUTH_REDIRECT, data: { full_name: fullName?.trim() || '' } },
      });
      if (error) throw error;
      return data.session ? 'signed_in' : 'confirmation_required';
    },
    async sendPasswordReset(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: AUTH_REDIRECT });
      if (error) throw error;
    },
    async signOut() {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
    },
    async deleteAccount() {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: { confirm: 'DELETE' },
      });
      if (error) throw new Error(error.message || 'Eliminazione account non disponibile.');
      if (!data?.ok) throw new Error(data?.error || 'Eliminazione account non completata.');
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      setSession(null);
      setProfile(null);
    },
    async refreshProfile() {
      setProfile(await loadProfile(session?.user ?? null));
    },
  }), [loading, passwordRecovery, profile, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useOneAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useOneAuth deve essere usato dentro OneAuthProvider');
  return value;
}
