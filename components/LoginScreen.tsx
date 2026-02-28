import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/src/store/authStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);
  const { signInWithEmail } = useAuthStore();

  useEffect(() => {
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      setIsConfigured(false);
      setError('System Error: Supabase environment variables are missing. Please check your .env file.');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured) return;
    
    setError(null);
    setIsPending(true);

    console.log('[AUTH] Attempting sign-in for:', email);
    const { error: signInError } = await signInWithEmail(email, password);

    if (signInError) {
      console.error('[AUTH] Sign-in error:', signInError.message);
      setError(signInError.message || 'Invalid login credentials');
      setIsPending(false);
    } else {
      console.log('[AUTH] Sign-in successful for:', email);
      // The onAuthStateChange listener in AuthContext will handle the rest.
      // We don't set isPending to false here, because the global loading state will take over.
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 items-center justify-center relative overflow-hidden p-12 shadow-[inset_-10px_0_30px_rgba(0,0,0,0.4)]">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay pointer-events-none"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-emerald-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob"></div>
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-teal-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-30 animate-blob animation-delay-2000"></div>
        <div className="relative z-10 text-center flex flex-col items-center">
          <div className="w-48 h-48 mb-8 flex items-center justify-center drop-shadow-2xl hover:scale-105 transition-transform duration-500">
            <img src="/koa-logo.png" alt="KOA Manager Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-5xl font-extrabold text-white tracking-tight mb-6 drop-shadow-md">KOA Manager</h1>
          <p className="text-emerald-100/80 text-lg max-w-md leading-relaxed font-medium">
            Securely manage your collection, medical records, and daily site operations from one intelligent dashboard.
          </p>
        </div>
      </div>
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8 sm:p-12 md:p-20 lg:p-24 bg-white dark:bg-slate-900 transition-colors duration-300">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center lg:hidden mb-8 flex flex-col items-center">
             <img src="/koa-logo.png" alt="Logo" className="w-24 h-24 mb-4 object-contain" />
            <h2 className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-500 tracking-tight">KOA Manager</h2>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Welcome back</h2>
            <p className="text-slate-500 dark:text-slate-400">Please enter your credentials to access your account.</p>
          </div>
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-500/10 border-l-4 border-red-500 rounded-r-lg flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-sm text-red-700 dark:text-red-200 font-medium">{error}</p>
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-6 mt-8">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                required
                disabled={!isConfigured}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all shadow-sm disabled:opacity-50"
                placeholder="name@organization.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                disabled={!isConfigured}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all shadow-sm disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>
            <div className="pt-2 space-y-4">
              <button
                type="submit"
                disabled={isPending || !isConfigured}
                className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-900/20 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
              >
                {isPending ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                  'Secure Sign In'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}