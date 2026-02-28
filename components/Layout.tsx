
import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, ClipboardList, ListTodo, Map,
  ArrowLeftRight, ShieldAlert, AlertTriangle, Stethoscope, Heart, Wrench,
  AlertOctagon, Clock, Settings as SettingsIcon, LogOut, Menu, Power,
  ChevronLeft, ChevronRight,
  HelpCircle, FileText, Calendar, ClipboardCheck, Wifi, WifiOff
} from 'lucide-react';
import { UserPermissions } from '@/types';
import { useAuth } from '@/src/context/AuthContext';
import { useAppData } from '@/src/context/AppContext';
import { supabase } from '@/src/services/supabaseClient';

// Import individual components
import Dashboard from './Dashboard';
import DailyLog from './DailyLog';
import Tasks from './Tasks';
import Health from './Health';
import Movements from './Movements';
import SiteMaintenance from './SiteMaintenance';
import Reports from './Reports';
import Settings from './Settings';
import Incidents from './Incidents';
import FirstAid from './FirstAid';
import SafetyDrills from './SafetyDrills';
import TimeSheets from './TimeSheets';
import HolidayRegistry from './HolidayRegistry';
import MissingRecords from './MissingRecords';
import DailyRounds from './DailyRounds';
import FlightRecords from './FlightRecords';

interface LayoutProps {
  activeView: string;
  onNavigate: (view: string) => void;
  fontScale: number;
  setFontScale: (scale: number) => void;
}

const Layout: React.FC<LayoutProps> = ({ activeView, onNavigate, fontScale, setFontScale }) => {
  const { profile: currentUser, signOut } = useAuth();
  const { activeShift, clockIn, clockOut, orgProfile } = useAppData();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isAdmin = currentUser?.role?.toUpperCase() === 'ADMIN';

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen();
    }
  };
  
  const handleLogout = async () => {
    await signOut();
  }

  const p: UserPermissions = {
    dashboard: true, dailyLog: true, tasks: true, medical: isAdmin,
    movements: isAdmin, safety: isAdmin, maintenance: true, settings: isAdmin,
    flightRecords: true, feedingSchedule: isAdmin, attendance: true,
    holidayApprover: isAdmin,
    attendanceManager: isAdmin, missingRecords: isAdmin,
    reports: isAdmin, rounds: true,
    ...(currentUser?.permissions || {})
  };

  const handleNavigate = (view: string) => {
    onNavigate(view);
    setIsMobileMenuOpen(false);
  };

  const NavItem = ({ view, icon: Icon, label, permission }: { view: string, icon: React.ElementType, label: string, permission: boolean }) => {
    if (!permission) return null;
    const isActive = activeView === view;
    return (
      <button
        onClick={() => handleNavigate(view)}
        title={isSidebarCollapsed ? label : ''}
        className={`flex items-center gap-3 px-4 py-2.5 transition-all duration-200 group relative w-full ${
          isActive
            ? 'bg-emerald-500/10 text-emerald-400 border-r-4 border-emerald-500'
            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-r-4 border-transparent'
        } ${isSidebarCollapsed ? 'justify-center px-0 border-r-0' : ''}`}
      >
        <Icon size={20} className={`transition-colors shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
        {!isSidebarCollapsed && <span className="whitespace-nowrap overflow-hidden text-sm font-medium">{label}</span>}
        {isSidebarCollapsed && isActive && <div className="absolute right-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-l"></div>}
      </button>
    );
  };

  const SectionHeader = ({ title }: { title: string }) => {
    if (isSidebarCollapsed) return <div className="h-4"></div>;
    return (
      <div className="px-6 pt-6 pb-2 text-left">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">{title}</p>
      </div>
    );
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard onSelectAnimal={() => {}} activeTab="Owls" setActiveTab={() => {}} viewDate={new Date().toISOString().split('T')[0]} setViewDate={() => {}} />;
      case 'daily':
        return <DailyLog activeCategory="Owls" setActiveCategory={() => {}} viewDate={new Date().toISOString().split('T')[0]} setViewDate={() => {}} />;
      case 'tasks':
        return <Tasks />;
      case 'medical':
        return <Health />;
      case 'movements':
        return <Movements />;
      case 'flight':
        return <FlightRecords />;
      case 'rounds':
        return <DailyRounds />;
      case 'maintenance':
        return <SiteMaintenance />;
      case 'incidents':
        return <Incidents />;
      case 'firstaid':
        return <FirstAid />;
      case 'drills':
        return <SafetyDrills />;
      case 'timesheets':
        return <TimeSheets />;
      case 'holidays':
        return <HolidayRegistry />;
      case 'reports':
        return <Reports />;
      case 'missing':
        return <MissingRecords />;
      case 'settings':
        return <Settings />;
      case 'help':
        return <HelpCenter />;
      default:
        return <Dashboard onSelectAnimal={() => {}} activeTab="Owls" setActiveTab={() => {}} viewDate={new Date().toISOString().split('T')[0]} setViewDate={() => {}} />;
    }
  };

  const sidebarContent = (
    <div className={`flex flex-col h-full bg-[#1c1c1e] text-slate-300 transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'} no-print shadow-xl md:shadow-none`}>
      <div className={`h-14 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between px-4'} border-b border-slate-800`}>
        {!isSidebarCollapsed && <span className="font-bold text-white tracking-tight">KOA Manager</span>}
        <img src={orgProfile?.logoUrl || '/koa-logo.png'} alt="Logo" className="w-8 h-8 object-contain rounded-lg bg-white/10" />
      </div>
      <div className={`px-4 py-2 border-b border-slate-800/50 flex items-center gap-2 ${!isOnline ? 'bg-rose-900/20' : 'bg-emerald-900/10'}`}>
        {isOnline ? <Wifi size={14} className="text-emerald-500" /> : <WifiOff size={14} className="text-rose-500" />}
        {!isSidebarCollapsed && (
          <span className={`text-[9px] font-black uppercase tracking-widest ${!isOnline ? 'text-rose-500' : 'text-emerald-500/70'}`}>
            {isOnline ? 'Online - Secure Sync' : 'Offline - Data Caching'}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        <SectionHeader title="Main Menu" />
        <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" permission={p.dashboard} />
        <NavItem view="daily" icon={ClipboardList} label="Daily Log" permission={p.dailyLog} />
        <NavItem view="tasks" icon={ListTodo} label="To-Do List" permission={p.tasks} />

        <SectionHeader title="Animal Care" />
        <NavItem view="medical" icon={Stethoscope} label="Medical Records" permission={p.medical} />
        <NavItem view="movements" icon={ArrowLeftRight} label="Movements" permission={p.movements} />
        <NavItem view="flight" icon={Map} label="Flight Records" permission={p.flightRecords} />
        <NavItem view="rounds" icon={ClipboardCheck} label="Daily Rounds" permission={p.rounds} />

        <SectionHeader title="Site & Safety" />
        <NavItem view="maintenance" icon={Wrench} label="Site Maintenance" permission={p.maintenance} />
        <NavItem view="incidents" icon={AlertTriangle} label="Incident Reports" permission={p.safety} />
        <NavItem view="firstaid" icon={Heart} label="First Aid Log" permission={p.safety} />
        <NavItem view="drills" icon={AlertOctagon} label="Safety Drills" permission={p.safety} />

        <SectionHeader title="Staff" />
        <NavItem view="timesheets" icon={Clock} label="Time Sheets" permission={p.attendance} />
        <NavItem view="holidays" icon={Calendar} label="Holiday Registry" permission={p.attendance} />

        <SectionHeader title="Compliance" />
        <NavItem view="reports" icon={FileText} label="Reports" permission={p.reports} />
        <NavItem view="missing" icon={ShieldAlert} label="Missing Records" permission={p.missingRecords} />

        <SectionHeader title="System" />
        <NavItem view="settings" icon={SettingsIcon} label="Settings" permission={p.settings || p.userManagement} />
        <NavItem view="help" icon={HelpCircle} label="Help & Support" permission={true} />
      </div>
      <div className="p-4 border-t border-slate-800/50 bg-[#18181a]">
        {!isSidebarCollapsed ? (
          <>
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center font-black text-xs text-white border border-slate-600 shrink-0">
                {currentUser?.initials || '--'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate text-left">{currentUser?.name || 'Unknown'}</p>
                <p className="text-[9px] font-black text-emerald-500 truncate uppercase tracking-widest text-left">{currentUser?.jobPosition || currentUser?.role || 'Guest'}</p>
              </div>
              <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 transition-colors"><LogOut size={16}/></button>
            </div>
            {activeShift ? (
              <button onClick={clockOut} className="w-full bg-amber-500/10 border border-amber-500/50 text-amber-500 rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-2 hover:bg-amber-500/20 transition-all">
                <Power size={14}/> CLOCK OUT
              </button>
            ) : (
              <button onClick={clockIn} className="w-full bg-emerald-600 text-white rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20">
                <Clock size={14}/> START SHIFT
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <button onClick={handleLogout} className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" title="Logout">
              <LogOut size={16}/>
            </button>
            {activeShift ? (
              <button onClick={clockOut} className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center hover:bg-amber-500/30 transition-colors" title="Clock Out">
                <Power size={16}/>
              </button>
            ) : (
              <button onClick={clockIn} className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-500 transition-colors" title="Clock In">
                <Clock size={16}/>
              </button>
            )}
          </div>
        )}
      </div>
      <button
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        className="w-full h-8 bg-[#151516] flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors border-t border-slate-800"
      >
        {isSidebarCollapsed ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
      </button>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f3f4f6] overflow-hidden font-sans selection:bg-emerald-500/30 selection:text-emerald-900">
      {isMobileMenuOpen && <div className="fixed inset-0 bg-black/60 z-[70] md:hidden no-print" onClick={() => setIsMobileMenuOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-[80] transform transition-all duration-300 ease-in-out md:static ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} no-print`}>
        {sidebarContent}
      </aside>
      <main className="flex-1 flex flex-col min-w-0 relative overflow-x-hidden print:overflow-visible">
        <header className="md:hidden h-14 bg-[#1c1c1e] border-b border-slate-800 flex items-center justify-between px-4 z-50 no-print shadow-md">
          <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-300 p-2 -ml-2 hover:bg-slate-800 rounded-lg transition-colors">
            <Menu size={24} />
          </button>
          <span className="text-sm font-bold text-white">KOA Manager</span>
          <div className="w-7 h-7 bg-slate-700 rounded-full flex items-center justify-center font-black text-[10px] text-white border border-slate-600">{currentUser?.initials || '--'}</div>
        </header>
        <div className="flex-1 overflow-y-auto bg-slate-200 print:bg-white print:overflow-visible safe-area-pb">
          {renderActiveView()}
        </div>
      </main>
    </div>
  );
};

export default Layout;

