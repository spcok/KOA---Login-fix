import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import LoginScreen from './components/LoginScreen';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from './src/store/authStore';
import { AppProvider } from './src/context/AppContext';
import { syncAllTables } from './src/services/dataService';

// Initialize the store outside the React tree to avoid lifecycle race conditions
useAuthStore.getState().initialize();

const ProfileMissingScreen = ({ onSignOut }: { onSignOut: () => void }) => (
  <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-100 gap-4">
    <Loader2 className="animate-spin text-amber-600" size={48} />
    <p className="font-black text-slate-400 uppercase tracking-[0.2em] text-xs">Profile Not Found</p>
    <p className="text-slate-500 text-center max-w-sm">
      Your user account exists, but we couldn't find a corresponding staff profile. 
      Please contact your administrator to have one created.
    </p>
    <button onClick={onSignOut} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-all">
      Sign Out
    </button>
  </div>
);

const GlobalSpinner = () => (
  <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-100 gap-4">
    <Loader2 className="animate-spin text-emerald-600" size={48} />
    <p className="font-black text-slate-400 uppercase tracking-[0.2em] text-xs">Authorising Secure Environment...</p>
  </div>
);

function AppContent() {
  const { user, profile, isLoading, isInitialized, signOut } = useAuthStore();
  const [view, setView] = useState<string>('dashboard');
  const [fontScale, setFontScale] = useState(100);

  useEffect(() => {
    if (user && profile) {
      syncAllTables().catch(console.error);
    }
  }, [user, profile]);

  if (!isInitialized || isLoading) {
    return <GlobalSpinner />;
  }

  if (!user) return <LoginScreen />;
  if (user && !profile) return <ProfileMissingScreen onSignOut={signOut} />;

  return (
    <AppProvider>
      <Layout 
        activeView={view} 
        onNavigate={setView}
        fontScale={fontScale}
        setFontScale={setFontScale}
      />
    </AppProvider>
  );
}

function App() {
  return <AppContent />;
}

export default App;
