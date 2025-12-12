import { Profile, supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthError, Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isOwner: (ownerId: string | null | undefined) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth event:', event);

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(newSession);
          setUser(newSession?.user ?? null);

          if (newSession?.user) {
            await ensureProfileExists(newSession.user);
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const initializeAuth = async () => {
    try {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error getting session:', error);
        clearLocalState();
        return;
      }

      if (currentSession?.user) {
        setSession(currentSession);
        setUser(currentSession.user);
        await ensureProfileExists(currentSession.user);
      } else {
        clearLocalState();
      }
    } catch (error) {
      console.error('Init auth error:', error);
      clearLocalState();
    } finally {
      setLoading(false);
    }
  };

  const clearLocalState = () => {
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const clearStorage = async () => {
    try {
      if (Platform.OS === 'web') {
        // En web, limpiar localStorage directamente
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('sb-'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log('Cleared localStorage keys:', keysToRemove);
      } else {
        // En mobile, usar AsyncStorage
        const keys = await AsyncStorage.getAllKeys();
        const supabaseKeys = keys.filter(key =>
          key.includes('supabase') || key.includes('sb-')
        );
        if (supabaseKeys.length > 0) {
          await AsyncStorage.multiRemove(supabaseKeys);
          console.log('Cleared AsyncStorage keys:', supabaseKeys);
        }
      }
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  };

  const ensureProfileExists = async (authUser: User) => {
    try {
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (existingProfile) {
        setProfile(existingProfile);
        return;
      }

      if (fetchError && fetchError.code === 'PGRST116') {
        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: authUser.id,
            username: authUser.email?.split('@')[0] || 'usuario',
            full_name: null,
            avatar_url: null,
          })
          .select()
          .single();

        if (!createError && createdProfile) {
          setProfile(createdProfile);
        }
      }
    } catch (error) {
      console.error('Error in ensureProfileExists:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await ensureProfileExists(user);
    }
  };

  const isOwner = (ownerId: string | null | undefined): boolean => {
    if (!user || !ownerId) return false;
    return user.id === ownerId;
  };

  const signIn = async (email: string, password: string): Promise<{ error: AuthError | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const signUp = async (email: string, password: string): Promise<{ error: AuthError | null; needsConfirmation: boolean }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        return { error, needsConfirmation: false };
      }

      if (data.user?.identities?.length === 0) {
        return {
          error: {
            message: 'Este email ya está registrado.',
            name: 'AuthApiError',
            status: 400
          } as AuthError,
          needsConfirmation: false
        };
      }

      const needsConfirmation = !!(data.user && !data.user.confirmed_at && !data.session);
      return { error: null, needsConfirmation };
    } catch (error) {
      return { error: error as AuthError, needsConfirmation: false };
    }
  };

  const signOut = async () => {
    console.log('=== SIGNING OUT ===');

    // 1. Limpiar estado local inmediatamente
    clearLocalState();
    setLoading(false);

    // 2. Limpiar storage
    await clearStorage();

    // 3. Cerrar sesión en Supabase (no esperar si falla)
    try {
      await supabase.auth.signOut({ scope: 'local' });
      console.log('Supabase signOut completed');
    } catch (error) {
      console.error('Supabase signOut error (ignored):', error);
    }

    console.log('=== SIGN OUT COMPLETE ===');
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        isOwner,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}