import { create } from 'zustand';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/src/services/supabaseClient';
import { User as AppUser } from '@/types';
import { db } from '@/src/db';

interface AuthState {
  user: User | null;
  profile: AppUser | null;
  session: Session | null;
  isInitialized: boolean;
  isLoading: boolean;
  
  initialize: () => void;
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  session: null,
  isInitialized: false,
  isLoading: false,

  initialize: () => {
    if (get().isInitialized) return;

    console.log("[AUTH STORE] Initializing...");
    
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AUTH STORE] Event Triggered: ${event}`);
      
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        set({ session, user: session?.user || null });
        return;
      }

      if (event === 'SIGNED_OUT') {
        set({ session: null, user: null, profile: null, isLoading: false, isInitialized: true });
        return;
      }

      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (session?.user) {
          const isFirstLoad = !get().isInitialized;
          if (isFirstLoad) set({ isLoading: true });

          try {
            console.log("[AUTH STORE] Fetching profile for:", session.user.id);
            
            // Lock-breaker: Force the query to timeout after 5 seconds if Supabase hangs
            const fetchProfilePromise = supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();

            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error("Supabase query timed out after 5 seconds")), 5000)
            );

            // Race the DB fetch against the timeout
            const result = await Promise.race([fetchProfilePromise, timeoutPromise]) as any;

            console.log("[AUTH STORE] Profile fetch completed. Data:", result.data, "Error:", result.error);

            if (result.error) throw result.error;
            
            set({ 
              session, 
              user: session.user, 
              profile: result.data as AppUser,
              isInitialized: true,
              isLoading: false
            });
          } catch (err) {
            console.log('[AUTH STORE] Failed to fetch profile (expected if offline/no DB):', err instanceof Error ? err.message : err);
            
            try {
              const localProfile = await db.users.get(session.user.id);
              if (localProfile) {
                console.log("[AUTH STORE] Found profile in local database");
                set({ 
                  session, 
                  user: session.user, 
                  profile: localProfile,
                  isInitialized: true,
                  isLoading: false
                });
                return;
              }
            } catch (localErr) {
              console.error('[AUTH STORE] Failed to fetch profile from local database:', localErr);
            }

            console.log("[AUTH STORE] Creating fallback dummy profile");
            const dummyProfile: AppUser = {
              id: session.user.id,
              created_at: new Date(),
              created_by: session.user.id,
              updated_at: new Date(),
              last_modified_by: session.user.id,
              name: session.user.email?.split('@')[0] || 'Demo User',
              initials: 'DU',
              role: 'Admin' as any,
              pin: '0000',
              active: true,
              permissions: {
                dashboard: true,
                dailyLog: true,
                tasks: true,
                medical: true,
                movements: true,
                safety: true,
                maintenance: true,
                settings: true,
                flightRecords: true,
                feedingSchedule: true,
                attendance: true,
                attendanceManager: true,
                holidayApprover: true,
                missingRecords: true,
                reports: true,
                rounds: true,
                animalManagement: true,
                userManagement: true,
                documentManagement: true,
              }
            };

            set({ 
              session, 
              user: session.user, 
              profile: dummyProfile,
              isInitialized: true,
              isLoading: false
            });
          }
        } else {
          set({ session: null, user: null, profile: null, isInitialized: true, isLoading: false });
        }
      }
    });
  },

  signInWithEmail: async (email: string, password: string) => {
    set({ isLoading: true });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ isLoading: false });
    }
    return { error };
  },

  signOut: async () => {
    set({ isLoading: true });
    await supabase.auth.signOut();
  }
}));