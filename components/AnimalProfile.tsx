
import React, { useState, useMemo } from 'react';
import { Animal, LogType, UserRole, LogEntry } from '@/types';
import { ChevronLeft, Scale, Utensils, Printer, Edit, Trash2, AlertTriangle, Plus, Filter, Activity, Archive, Skull, Truck } from 'lucide-react';
import { formatWeightDisplay } from '@/src/services/weightUtils';
import AddEntryModal from './AddEntryModal';
import SignGenerator from './SignGenerator';
import { useAppData } from '@/src/context/AppContext';
import { useAuthStore } from '@/src/store/authStore';
import { usePermissions } from '@/src/hooks/usePermissions';
import AnimalFormModal from './AnimalFormModal';
import { IUCNBadge } from './IUCNBadge';

interface AnimalProfileProps {
  animal: Animal;
  onBack: () => void;
}

const AnimalProfile: React.FC<AnimalProfileProps> = ({ animal, onBack }) => {
  const { profile: currentUser } = useAuthStore();
  const { isAdmin, isStaff } = usePermissions();
  const { 
    log_entries,
    addLogEntry,
    archiveAnimal,
    orgProfile, 
    foodOptions, 
    feedMethods, 
    eventTypes, 
    animals
  } = useAppData();
  
  const [activeTab, setActiveTab] = useState<'Overview' | 'Husbandry Logs' | 'Medical Records' | 'Species Info'>('Overview');
  const [logFilter, setLogFilter] = useState<LogType | 'ALL'>('ALL');
  
  const [isSignGeneratorOpen, setIsSignGeneratorOpen] = useState(false);
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archiveForm, setArchiveForm] = useState<{ reason: string, type: 'Disposition' | 'Death' }>({
    reason: '',
    type: 'Disposition'
  });
  const [entryType, setEntryType] = useState<LogType>(LogType.GENERAL);

  const handleArchive = async () => {
    if (!archiveForm.reason) return;
    try {
      await archiveAnimal(animal.id, archiveForm.reason, archiveForm.type);
      setIsArchiveModalOpen(false);
      onBack();
    } catch (err) {
      console.error("Failed to archive animal:", err);
    }
  };

  const age = useMemo(() => {
      if (!animal.dob) return 'Unknown';
      const diff = Date.now() - new Date(animal.dob).getTime();
      const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
      return `${years} years`;
  }, [animal.dob]);

  const animalLogs = useMemo(() => {
    return (log_entries || []).filter((log) => String(log.animal_id) === String(animal.id));
  }, [log_entries, animal.id]);

  const sortedLogs = useMemo(() => {
      return [...animalLogs].sort((a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime());
  }, [animalLogs]);

  const latestWeight = useMemo(() => sortedLogs.find(l => l.log_type === LogType.WEIGHT), [sortedLogs]);
  const lastFeed = useMemo(() => sortedLogs.find(l => l.log_type === LogType.FEED), [sortedLogs]);

  const filteredLogs = useMemo(() => {
      if (logFilter === 'ALL') return sortedLogs;
      return sortedLogs.filter(l => l.log_type === logFilter);
  }, [sortedLogs, logFilter]);

  const medicalLogs = useMemo(() => {
      return sortedLogs.filter(l => l.log_type === LogType.HEALTH);
  }, [sortedLogs]);

  const TabButton = ({ name, label }: { name: typeof activeTab, label: string }) => (
      <button 
        onClick={() => setActiveTab(name)}
        className={`px-4 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === name ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
      >
          {label}
      </button>
  );

  const FilterPill = ({ type, label }: { type: LogType | 'ALL', label: string }) => (
      <button
        onClick={() => setLogFilter(type)}
        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${logFilter === type ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'}`}
      >
          {label}
      </button>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 font-sans">
        {/* Navigation & Actions */}
        <div className="px-6 py-4 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-200/50">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold uppercase text-xs tracking-widest transition-colors">
                <ChevronLeft size={16} /> Back to Dashboard
            </button>
            <div className="flex gap-2">
                <button onClick={() => setIsSignGeneratorOpen(true)} className="p-2 text-slate-400 hover:text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm transition-all" title="Generate Signage">
                    <Printer size={16} />
                </button>
                <button onClick={() => setIsEditProfileOpen(true)} className="p-2 text-slate-400 hover:text-emerald-600 bg-white border border-slate-200 rounded-lg shadow-sm transition-all" title="Edit Profile">
                    <Edit size={16} />
                </button>
                {isStaff && (
                    <button onClick={() => setIsArchiveModalOpen(true)} className="p-2 text-slate-400 hover:text-rose-600 bg-white border border-slate-200 rounded-lg shadow-sm transition-all" title="Archive Subject (Disposition/Death)">
                        <Archive size={16} />
                    </button>
                )}
            </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
            {/* PROFILE HEADER */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white shadow-xl overflow-hidden shrink-0 bg-slate-200">
                    <img src={animal.image_url} alt={animal.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 text-center md:text-left space-y-2 pt-2">
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none">{animal.name}</h1>
                    <div className="flex flex-wrap justify-center md:justify-start items-baseline gap-3 text-slate-500">
                        <span className="text-xl font-bold uppercase tracking-wide">{animal.species}</span>
                        <span className="hidden md:inline w-px h-4 bg-slate-300"></span>
                        <span className="font-serif italic font-medium uppercase tracking-wider text-sm opacity-70">{animal.latin_name}</span>
                    </div>
                    
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-8 mt-4 text-xs font-bold text-slate-600 uppercase tracking-widest">
                        <div className="flex items-center gap-1.5"><span className="text-slate-400">Sex:</span> {animal.sex}</div>
                        <div className="flex items-center gap-1.5"><span className="text-slate-400">Age:</span> {age}</div>
                        <div className="flex items-center gap-1.5"><span className="text-slate-400">Enclosure:</span> {animal.location}</div>
                        {animal.ring_number && <div className="flex items-center gap-1.5"><span className="text-slate-400">Ring:</span> {animal.ring_number}</div>}
                        <div className="flex items-center gap-2">
                            <span className="text-slate-400">Conservation:</span> 
                            <span className={`px-2 py-0.5 rounded text-white text-[10px] ${animal.red_list_status === 'LC' ? 'bg-emerald-600' : 'bg-amber-500'}`}>{animal.red_list_status || 'NE'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* TABS NAVIGATION */}
            <div className="border-b-2 border-slate-200 flex gap-4 overflow-x-auto">
                <TabButton name="Overview" label="Overview" />
                <TabButton name="Husbandry Logs" label="Husbandry Logs" />
                <TabButton name="Medical Records" label="Medical Records" />
                <TabButton name="Species Info" label="Species Info" />
            </div>

            {/* TAB CONTENT: OVERVIEW */}
            {activeTab === 'Overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-2 duration-300">
                    {/* LEFT COLUMN: MASTER FILE */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-[1.5rem] p-8 shadow-sm border border-slate-200/60 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-[#10b981]"></div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-1.5"><Filter className="rotate-90 text-slate-400" size={20}/></div>
                                <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">Subject Master File</h3>
                            </div>

                            <div className="space-y-8">
                                <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Subject Description</h4>
                                    <p className="text-sm font-medium text-slate-700 leading-relaxed max-w-2xl">{animal.description || "No physical description available."}</p>
                                </div>

                                <div className="bg-amber-50 border border-amber-100 rounded-xl p-6 relative">
                                    <div className="absolute top-4 right-4 text-amber-200"><AlertTriangle size={24}/></div>
                                    <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <AlertTriangle size={12}/> Critical Husbandry Notes
                                    </h4>
                                    {animal.critical_husbandry_notes && animal.critical_husbandry_notes.length > 0 ? (
                                        <ul className="space-y-2">
                                            {(animal.critical_husbandry_notes || []).map((note, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-xs font-bold text-slate-700">
                                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                                                    {note}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-xs font-bold text-amber-800/50 italic">No critical notes flagged for this subject.</p>
                                    )}
                                </div>

                                <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Registry & Statutory Metadata</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
                                        <div><p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Scientific Name</p><p className="text-xs font-black text-slate-800 italic">{animal.latin_name || '-'}</p></div>
                                        <div><p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Microchip</p><p className="text-xs font-black text-slate-800 font-mono">{animal.microchip_id || '-'}</p></div>
                                        <div><p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Ring Number</p><p className="text-xs font-black text-slate-800 font-mono">{animal.ring_number || '-'}</p></div>
                                        <div><p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Conservation</p><p className="text-xs font-black text-slate-800">{animal.red_list_status}</p></div>
                                        
                                        <div><p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Arrival Date</p><p className="text-xs font-black text-slate-800">{animal.acquisition_date ? new Date(animal.acquisition_date).toLocaleDateString() : '-'}</p></div>
                                        <div><p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Subject Origin</p><p className="text-xs font-black text-slate-800">{animal.origin || 'Unknown'}</p></div>
                                        <div><p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Hazard Class</p><p className="text-xs font-black text-slate-800 uppercase">{animal.hazard_rating}</p></div>
                                        <div><p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Toxicity</p><p className="text-xs font-black text-slate-800">{animal.is_venomous ? 'Venomous' : 'Non-Venomous'}</p></div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Floating Badge */}
                            <div className="absolute top-8 right-8 hidden md:block">
                                <IUCNBadge status={animal.red_list_status} size="lg"/>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: LIVE STATUS */}
                    <div className="lg:col-span-1 space-y-6">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Live Status</h3>
                        
                        <div className="bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                                <Scale size={24} />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Latest Weight</p>
                                <p className="text-2xl font-black text-slate-900 tracking-tight">
                                    {latestWeight?.weight_grams ? formatWeightDisplay(latestWeight.weight_grams, animal.weight_unit) : (latestWeight?.value || 'N/A')}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                                <Utensils size={24} />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Last Feed</p>
                                <p className="text-lg font-black text-slate-900 leading-tight">
                                    {lastFeed?.value || 'No recent feed'}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-sm">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Target Ranges</h4>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Flying Weight</span>
                                    <span className="text-xs font-black text-slate-900">{animal.flying_weight_g ? formatWeightDisplay(animal.flying_weight_g, animal.weight_unit) : '--'}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Min Night Temp</span>
                                    <span className="text-xs font-black text-slate-900">{animal.target_night_temp_c ? `${animal.target_night_temp_c}°C` : '--'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: HUSBANDRY LOGS */}
            {activeTab === 'Husbandry Logs' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex flex-wrap gap-2">
                            <FilterPill type="ALL" label="ALL" />
                            <FilterPill type={LogType.FEED} label="FEED" />
                            <FilterPill type={LogType.WEIGHT} label="WEIGHT" />
                            <FilterPill type={LogType.FLIGHT} label="FLIGHT" />
                            <FilterPill type={LogType.TRAINING} label="TRAINING" />
                            <FilterPill type={LogType.TEMPERATURE} label="TEMPERATURE" />
                        </div>
                        <button 
                            onClick={() => { setEntryType(LogType.GENERAL); setIsAddEntryOpen(true); }}
                            className="bg-[#10b981] hover:bg-emerald-600 text-white px-6 py-2.5 rounded-lg shadow-lg shadow-emerald-900/10 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95"
                        >
                            <Plus size={16} strokeWidth={3} /> Add Husbandry Log
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-white border-b-2 border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Value</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/3">Notes</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Auth & Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-xs font-bold text-slate-700">{new Date(log.log_date).toLocaleDateString('en-GB')}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${
                                                    log.log_type === LogType.WEIGHT ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                    log.log_type === LogType.FEED ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                    'bg-slate-100 text-slate-600 border-slate-200'
                                                }`}>
                                                    {log.log_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-black text-slate-800">
                                                    {log.log_type === LogType.WEIGHT && log.weight_grams ? formatWeightDisplay(log.weight_grams, animal.weight_unit) : log.value}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs font-medium text-slate-500 italic">{log.notes || '-'}</p>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{log.user_initials}</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredLogs.length === 0 && (
                                        <tr><td colSpan={5} className="px-6 py-16 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">No Logs Found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: MEDICAL RECORDS */}
            {activeTab === 'Medical Records' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex justify-end">
                        <button 
                            onClick={() => { setEntryType(LogType.HEALTH); setIsAddEntryOpen(true); }}
                            className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-lg shadow-lg shadow-rose-900/10 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95"
                        >
                            <Plus size={16} strokeWidth={3} /> Add Clinical Record
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-white border-b-2 border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Details</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Auth</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {medicalLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-xs font-bold text-slate-700">{new Date(log.log_date).toLocaleDateString('en-GB')}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border bg-rose-50 text-rose-700 border-rose-100">
                                                    {log.health_record_type || 'General'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-black text-slate-800 mb-1">{log.value}</p>
                                                <p className="text-xs font-medium text-slate-500 italic">{log.notes || '-'}</p>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{log.user_initials}</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {medicalLogs.length === 0 && (
                                        <tr><td colSpan={4} className="px-6 py-16 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">No Clinical Records Found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: SPECIES INFO */}
            {activeTab === 'Species Info' && (
                <div className="py-20 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 border-dashed">
                    <Activity size={48} className="mx-auto mb-4 opacity-20"/>
                    <p className="text-xs font-black uppercase tracking-widest">Module Active - Data Pending</p>
                </div>
            )}
        </div>

        {/* MODALS */}
        {isSignGeneratorOpen && (
            <SignGenerator 
                animal={animal}
                orgProfile={orgProfile || null}
                onClose={() => setIsSignGeneratorOpen(false)}
            />
        )}

        {isEditProfileOpen && (
            <AnimalFormModal
                isOpen={isEditProfileOpen}
                onClose={() => setIsEditProfileOpen(false)}
                initialData={animal}
            />
        )}

        {isAddEntryOpen && (
            <AddEntryModal 
                isOpen={isAddEntryOpen}
                onClose={() => setIsAddEntryOpen(false)}
                animal={animal}
                initialType={entryType}
                foodOptions={foodOptions}
                feedMethods={feedMethods[animal.category] || []}
                eventTypes={eventTypes}
                allAnimals={animals}
            />
        )}

        {/* ARCHIVE MODAL */}
        {isArchiveModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                    <div className="p-8 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                                <Archive size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Archive Subject</h3>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Formal Disposition Registry</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Archive Type</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => setArchiveForm(prev => ({ ...prev, type: 'Disposition' }))}
                                        className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${archiveForm.type === 'Disposition' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-400'}`}
                                    >
                                        <Truck size={16} />
                                        <span className="text-xs font-black uppercase tracking-widest">Disposition</span>
                                    </button>
                                    <button 
                                        onClick={() => setArchiveForm(prev => ({ ...prev, type: 'Death' }))}
                                        className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${archiveForm.type === 'Death' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-100 text-slate-400'}`}
                                    >
                                        <Skull size={16} />
                                        <span className="text-xs font-black uppercase tracking-widest">Death</span>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Reason / Details</label>
                                <textarea 
                                    value={archiveForm.reason}
                                    onChange={(e) => setArchiveForm(prev => ({ ...prev, reason: e.target.value }))}
                                    placeholder={archiveForm.type === 'Death' ? "Cause of death, circumstances, disposal method..." : "Transfer destination, loan details, sale information..."}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-medium focus:border-emerald-500 transition-all outline-none min-h-[120px]"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button 
                                onClick={() => setIsArchiveModalOpen(false)}
                                className="flex-1 py-4 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleArchive}
                                disabled={!archiveForm.reason}
                                className="flex-1 bg-slate-900 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50"
                            >
                                Commit to Archive
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default AnimalProfile;
