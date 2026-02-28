import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/src/services/supabaseClient';
import { User as AppUser } from '@/types';

interface AuthContextType {
  user: User | null;
  profile: AppUser | null;
  session: Session | null;
  isLoading: boolean;
  supabase: any;
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    console.log("[AUTH] Fetching profile for:", userId);
    try {
      const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
      if (error) throw error;
      console.log("[AUTH] Profile fetched successfully:", data);
      setProfile(data as AppUser);
    } catch (err) {
      console.error('[AUTH] Failed to fetch profile:', err);
      setProfile(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      console.log("[AUTH] 1. Initializing Auth check...");
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        console.log("[AUTH] 2. Session check complete. Session exists?", !!data.session);
        
        if (mounted && data.session?.user) {
          setSession(data.session);
          setUser(data.session.user);
          await fetchProfile(data.session.user.id);
        } else if (mounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error('[AUTH] Critical error during initialization:', err);
      } finally {
        console.log("[AUTH] 3. FINALLY BLOCK HIT. Turning off loading spinner.");
        if (mounted) setIsLoading(false);
      }
    };

    initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log(`[AUTH] Event Triggered: ${event}`);
      if (!mounted) return;
      setIsLoading(true);
      try {
        if (newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
          await fetchProfile(newSession.user.id);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, isLoading, supabase, signInWithEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};