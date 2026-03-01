
import React, { useState, useEffect, useRef, useMemo, useTransition } from 'react';
import { 
  Animal, AnimalCategory, User, OrganisationProfile, Contact, UserRole, 
  GlobalDocument, Task, UserPermissions, SystemPreferences, LocalBackupEntry, LogType 
} from '@/types';
import { 
  Settings as SettingsIcon, Users, Database, MapPin, 
  Phone, Utensils, Building2, Upload, Download, 
  Trash2, Plus, X, AlertTriangle, FileText, CheckCircle2,
  RefreshCw, ChevronRight, Activity, ShieldCheck, AlertCircle, Globe, Edit2, 
  ServerCrash, Wrench, Search, Filter, Calendar, FileImage, Ticket, Loader2, HardDrive, Play, ShieldAlert,
  RotateCcw, History as HistoryIcon, PenTool, Check, Camera, ArrowRight, Save,
  BrainCircuit, Globe2, Dna, FileWarning, Gavel, Bug, XCircle, Terminal, UserCheck, Sparkles, Mail, ExternalLink,
  GraduationCap, Clock
} from 'lucide-react';
import { backupService } from '@/src/services/backupService';
import { dataService } from '@/src/services/dataService';
import { diagnosticsService, DiagnosticIssue } from '@/src/services/diagnosticsService';
import { batchGetSpeciesData, getLatinName } from '@/src/services/geminiService';
import { useAppData } from '@/src/context/AppContext';
import { useAuthStore } from '@/src/store/authStore';
import { migrateLegacyData } from '@/src/services/migrationService';
import { parseSmartCSV, parseCSVToAnimals } from '@/src/services/csvService';
import { formatWeightDisplay } from '@/src/services/weightUtils';
import { supabase } from '@/src/services/supabaseClient';

interface SettingsProps {
  onLaunchBenchmark?: () => void;
}

interface TestResult {
  id: string;
  name: string;
  category: 'Security' | 'Logic' | 'State' | 'Performance';
  status: 'pending' | 'running' | 'pass' | 'fail';
  message?: string;
  duration?: number;
  logs: string[];
}

const resizeImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxWidth = 800;
        const maxHeight = 800;
        if (width > maxWidth || height > maxHeight) {
          if (width / maxWidth > height / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL(file.type));
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const SignaturePad = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        if (value && value.startsWith('data:image')) {
            const img = new Image();
            img.onload = () => ctx.drawImage(img, 0, 0);
            img.src = value;
        }
    }, [value]);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true);
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        ctx.beginPath();
        const pos = getPos(e);
        ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    };

    const getPos = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        const dataUrl = canvasRef.current?.toDataURL();
        if (dataUrl) onChange(dataUrl);
    };

    const clear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            onChange('');
        }
    };

    return (
        <div className="space-y-2">
            <div className="border-2 border-slate-300 rounded-2xl bg-white overflow-hidden relative cursor-crosshair shadow-inner">
                <canvas 
                    ref={canvasRef} 
                    width={500} 
                    height={150} 
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-[150px] touch-none"
                />
                <button type="button" onClick={clear} className="absolute bottom-3 right-3 p-2 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-xl transition-all shadow-sm"><Trash2 size={16}/></button>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Digitally Authorise using Signature Above</p>
        </div>
    );
};

const Settings: React.FC<SettingsProps> = ({ onLaunchBenchmark }) => {
  const { profile: currentUser } = useAuthStore();
  // supabase is imported directly if needed, but let's check if it's imported.
  const {
    animals, updateAnimal, foodOptions, updateFoodOptions,
    feedMethods, updateFeedMethods, eventTypes, updateEventTypes,
    users, updateUsers, addUser, deleteUser,
    locations, updateLocations, contacts, updateContacts,
    orgProfile, updateOrgProfile, tasks, log_entries,
    staff_training, addStaffTraining, updateStaffTraining, deleteStaffTraining
  } = useAppData();

  const [activeTab, setActiveTab] = useState<'org' | 'users' | 'training' | 'directory' | 'lists' | 'documents' | 'diagnostics' | 'intelligence' | 'system'>('org');
  const [isPending, startTransition] = useTransition();
  const [listSection, setListSection] = useState<AnimalCategory>(AnimalCategory.OWLS);
  
  const [orgForm, setOrgForm] = useState<OrganisationProfile>({
      id: '', 
      name: '', 
      address: '', 
      licence_number: '', 
      licence_expiry_date: undefined,
      local_authority: '',
      last_inspection_date: undefined,
      next_inspection_date: undefined,
      contact_email: '', 
      contact_phone: '', 
      logo_url: '', 
      website_url: '', 
      adoption_url: ''
  } as OrganisationProfile);

  // User Management State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState<Partial<User>>({});
  
  // Document Management State
  const [localDocuments, setLocalDocuments] = useState<GlobalDocument[]>([]);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docForm, setDocForm] = useState<Partial<GlobalDocument>>({ category: 'Licensing' });

  // Contact Management State
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactForm, setContactForm] = useState<Contact>({ id: '', name: '', role: '', phone: '', email: '' });

  // Staff Training State
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<any>(null);
  const [trainingForm, setTrainingForm] = useState<any>({
    user_id: '',
    training_name: '',
    completion_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    status: 'Completed',
    notes: ''
  });

  // Diagnostics State
  const [diagnosticIssues, setDiagnosticIssues] = useState<DiagnosticIssue[]>([]);
  
  const [isProcessingBackup, setIsProcessingBackup] = useState(false);

  const [migrationStatus, setMigrationStatus] = useState<{ count: number, type: 'animal' | 'log' } | null>(null);

  // Remediation Modal State
  const [remediationIssue, setRemediationIssue] = useState<DiagnosticIssue | null>(null);
  const [fixForm, setFixForm] = useState<any>({});
  const [isFixing, startFixTransition] = useTransition();

  // IUCN Scan State
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  // Diagnostic Test State
  const [isTestsRunning, setIsTestsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [activeTestLogId, setActiveTestLogId] = useState<string | null>(null);
  const testScrollRef = useRef<HTMLDivElement>(null);

  const storageStats = useMemo(() => {
      const totalAnimals = animals.length;
      const totalLogs = (log_entries || []).length;
      const dbSizeEst = JSON.stringify(animals).length + JSON.stringify(tasks).length + JSON.stringify(users).length + JSON.stringify(log_entries || []).length;
      const dbSizeMB = (dbSizeEst / (1024 * 1024)).toFixed(2);
      return { totalAnimals, totalLogs, dbSizeMB };
  }, [animals, tasks, users, log_entries]);

  useEffect(() => {
      if (orgProfile) {
          setOrgForm({
              id: orgProfile.id || '',
              name: orgProfile.name || '',
              address: orgProfile.address || '',
              licence_number: orgProfile.licence_number || '',
              licence_expiry_date: orgProfile.licence_expiry_date,
              local_authority: orgProfile.local_authority || '',
              last_inspection_date: orgProfile.last_inspection_date,
              next_inspection_date: orgProfile.next_inspection_date,
              contact_email: orgProfile.contact_email || '',
              contact_phone: orgProfile.contact_phone || '',
              logo_url: orgProfile.logo_url || '',
              website_url: orgProfile.website_url || '',
              adoption_url: orgProfile.adoption_url || ''
          } as OrganisationProfile);
      }
  }, [orgProfile]);

  useEffect(() => {
      if (activeTab === 'diagnostics') {
          handleRunAudit();
      }
      
      
  }, [activeTab]);

  // Pre-fill remediation form when issue selected
  useEffect(() => {
      if (remediationIssue && remediationIssue.subjectId) {
          const animal = (animals || []).find(a => a.id === remediationIssue.subjectId);
          if (animal) {
              if (remediationIssue.id.includes('comp_tax')) {
                  setFixForm({ latin_name: animal.latin_name || '', species: animal.species });
              } else if (remediationIssue.id.includes('comp_id')) {
                  setFixForm({ ring_number: animal.ring_number || '', microchip_id: animal.microchip_id || '', has_no_id: animal.has_no_id || false });
              } else if (remediationIssue.id.includes('comp_orig')) {
                  setFixForm({ acquisition_date: animal.acquisition_date || '', origin: animal.origin || '' });
              }
          }
      } else if (remediationIssue && remediationIssue.id === 'sec_no_admin') {
          setFixForm({ newAdminId: '' });
      }
  }, [remediationIssue, animals]);

  const handleRunAudit = () => {
      startTransition(() => {
          const issues = diagnosticsService.runFullAudit(animals, tasks, users);
          setDiagnosticIssues(issues);
      });
  };

  const handleApplyFix = async () => {
      if (!remediationIssue) return;
      const animal = (animals || []).find(a => a.id === remediationIssue.subjectId);
      
      startFixTransition(async () => {
          if (remediationIssue.id.includes('comp_tax') && animal) {
              await updateAnimal({ ...animal, latin_name: fixForm.latin_name });
          } else if (remediationIssue.id.includes('comp_id') && animal) {
              await updateAnimal({ ...animal, ring_number: fixForm.ring_number, microchip_id: fixForm.microchip_id, has_no_id: fixForm.has_no_id });
          } else if (remediationIssue.id.includes('comp_orig') && animal) {
              await updateAnimal({ ...animal, acquisition_date: fixForm.acquisition_date, origin: fixForm.origin });
          } else if (remediationIssue.id === 'sec_no_admin' && fixForm.newAdminId) {
              const targetUser = (users || []).find(u => u.id === fixForm.newAdminId);
              if (targetUser) {
                  const updatedUsers = users.map(u => u.id === targetUser.id ? { ...u, role: UserRole.ADMIN } : u);
                  updateUsers(updatedUsers);
              }
          }
          setRemediationIssue(null);
          handleRunAudit();
      });
  };

  const handleAiLatinName = async () => {
      if (!fixForm.species) return;
      const latin = await getLatinName(fixForm.species);
      if (latin) setFixForm(prev => ({ ...prev, latin_name: latin }));
  };

  // --- CONTACTS HANDLERS ---
  const handleSaveContact = () => {
      if (!contactForm.name || !contactForm.role) return;
      const newContact = { ...contactForm, id: contactForm.id || `contact_${Date.now()}` };
      const newContacts = contactForm.id 
          ? contacts.map(c => c.id === newContact.id ? newContact : c)
          : [...contacts, newContact];
      updateContacts(newContacts);
      setIsContactModalOpen(false);
  };

  // --- TRAINING HANDLERS ---
  const handleSaveTraining = async () => {
      if (!trainingForm.user_id || !trainingForm.training_name) return;
      
      const data = {
          ...trainingForm,
          completion_date: new Date(trainingForm.completion_date),
          expiry_date: trainingForm.expiry_date ? new Date(trainingForm.expiry_date) : undefined
      };

      if (editingTraining) {
          await updateStaffTraining({ ...data, id: editingTraining.id });
      } else {
          await addStaffTraining(data);
      }
      setIsTrainingModalOpen(false);
      setEditingTraining(null);
  };

  const handleDeleteTraining = async (id: string) => {
      if (window.confirm('Delete this training record?')) {
          await deleteStaffTraining(id);
      }
  };

  const handleDeleteContact = (id: string) => {
      if(window.confirm('Are you sure you want to delete this contact?')) {
          updateContacts(contacts.filter(c => c.id !== id));
      }
  };

  const handleSaveUser = () => {
      if (!userForm.name || !userForm.initials) return;
      const newUser: User = {
          id: userForm.id || `user_${Date.now()}`,
          name: userForm.name,
          initials: userForm.initials,
          role: userForm.role || UserRole.VOLUNTEER,
          pin: userForm.pin || '0000',
          active: userForm.active !== undefined ? userForm.active : true,
          job_position: userForm.job_position,
          permissions: userForm.permissions!,
          signature_image_url: userForm.signature_image_url
      } as User;
      const updatedUsers = userForm.id 
          ? users.map(u => u.id === newUser.id ? newUser : u)
          : [...users, newUser];
      updateUsers(updatedUsers);
      setIsUserModalOpen(false);
  };

  const togglePermission = (key: keyof UserPermissions) => {
      setUserForm(prev => {
          const currentPerms = prev.permissions || {} as UserPermissions;
          return {
              ...prev,
              permissions: {
                  ...currentPerms,
                  [key]: !currentPerms[key]
              }
          };
      });
  };

  // --- DOCUMENTS HANDLERS ---
  const handleDocFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
              setDocForm(prev => ({...prev, file_url: evt.target?.result as string, name: file.name}));
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSaveDocument = async () => {
      if(!docForm.name || !docForm.file_url) return;
      const newDoc = { 
          ...docForm, 
          id: docForm.id || `doc_${Date.now()}`,
          upload_date: new Date()
      } as GlobalDocument;
      
      
      setLocalDocuments(prev => {
          const exists = prev.find(d => d.id === newDoc.id);
          if(exists) return prev.map(d => d.id === newDoc.id ? newDoc : d);
          return [newDoc, ...prev];
      });
      setIsDocModalOpen(false);
  };

  const handleDeleteDocument = async (id: string) => {
      if(window.confirm('Delete document permanently?')) {
          
          setLocalDocuments(prev => prev.filter(d => d.id !== id));
      }
  };

  // --- DIAGNOSTIC TEST RUNNER ---
  const createTest = (id: string, name: string, category: TestResult['category']): TestResult => ({
    id, name, category, status: 'pending', logs: []
  });

  const logTest = (testId: string, message: string, data?: any) => {
    const timestamp = new Date().toLocaleTimeString().split(' ')[0];
    const logLine = `[${timestamp}] ${message} ${data ? JSON.stringify(data) : ''}`;
    setTestResults(prev => prev.map(r => r.id === testId ? { ...r, logs: [...r.logs, logLine] } : r));
  };

  const assert = (condition: boolean, msg: string, testId: string) => {
    if (!condition) {
        logTest(testId, `❌ ASSERTION FAILED: ${msg}`);
        throw new Error(msg);
    }
    logTest(testId, `✅ PASS: ${msg}`);
  };

  const runInputSanitization = async (testId: string) => {
    logTest(testId, "Starting Input Vector Analysis...");
    const xssVector = "<script>alert('pwned')</script>";
    const safeCsv = `Date,Name,Notes\n2024-01-01,Bird,${xssVector}`;
    logTest(testId, "Injecting XSS into CSV Parser...", xssVector);
    const parsed = parseSmartCSV(safeCsv, []);
    const note = parsed[0]?.logs[0]?.notes;
    assert(parsed.length > 0, "Parser survived malicious input", testId);
    assert(typeof note === 'string', "Data type integrity maintained", testId);
    assert(note === xssVector, "Content preserved without execution", testId);
    return "Security boundaries intact.";
  };

  const runLogicStressTest = async (testId: string) => {
    const ITERATIONS = 50;
    logTest(testId, `Starting CPU Stress Test: ${ITERATIONS} cycles...`);
    const start = performance.now();
    const heavyCSV = `Date,Name,Weight,Notes\n${Array(100).fill("2024-01-01,StressTest,500,Repeated line for load").join('\n')}`;
    for (let i = 0; i < ITERATIONS; i++) {
        formatWeightDisplay(Math.random() * 10000, 'lbs_oz');
        parseCSVToAnimals(heavyCSV);
        if (i % 10 === 0) logTest(testId, `Cycle ${i}/${ITERATIONS} complete...`);
    }
    const duration = performance.now() - start;
    const avg = duration / ITERATIONS;
    logTest(testId, `Total Duration: ${duration.toFixed(2)}ms, Avg per Cycle: ${avg.toFixed(2)}ms`);
    assert(avg < 50, "Performance within acceptable bounds (<50ms/op)", testId);
    return `Passed. Avg Load: ${avg.toFixed(2)}ms`;
  };

  const runStateAudit = async (testId: string) => {
    logTest(testId, `Auditing Live State...`);
    if (animals.length === 0) return "No data to audit.";
    const ids = new Set();
    const duplicates = animals.filter(a => ids.has(a.id) || !ids.add(a.id));
    if (duplicates.length > 0) throw new Error(`State Integrity Failure: ${duplicates.length} Duplicate IDs`);
    logTest(testId, "ID Uniqueness Verified.");
    const issues = diagnosticsService.runFullAudit(animals, tasks, users);
    let errors = 0;
    issues.forEach(issue => {
        logTest(testId, `${issue.severity === 'Critical' ? 'CRITICAL' : 'WARN'}: ${issue.message}`);
        if(issue.severity === 'Critical') errors++;
    });
    return `Audit Complete. ${errors} Critical Errors.`;
  };

  const runDiagnosticSuite = async () => {
    setIsTestsRunning(true);
    setActiveTestLogId(null);
    const suite = [
        createTest('sec_01', 'Input Sanitization & XSS', 'Security'),
        createTest('perf_01', 'Logic Stress Test (50x)', 'Performance'),
        createTest('state_01', 'Live Schema Validation', 'State'),
    ];
    setTestResults(suite);
    const runners = { 'sec_01': runInputSanitization, 'perf_01': runLogicStressTest, 'state_01': runStateAudit };

    for (const test of suite) {
        setTestResults(prev => prev.map(r => r.id === test.id ? { ...r, status: 'running' } : r));
        setActiveTestLogId(test.id);
        try {
            const start = performance.now();
            const msg = await runners[test.id as keyof typeof runners](test.id);
            const end = performance.now();
            setTestResults(prev => prev.map(r => r.id === test.id ? { ...r, status: 'pass', message: msg, duration: end - start } : r));
        } catch (e: any) {
            logTest(test.id, `FATAL ERROR: ${e.message}`);
            setTestResults(prev => prev.map(r => r.id === test.id ? { ...r, status: 'fail', message: e.message } : r));
        }
    }
    setIsTestsRunning(false);
  };

  // --- END DIAGNOSTICS ---

  const handleRunIUCNScan = async () => {
      if (isScanning) return;
      setIsScanning(true);
      setScanProgress(0);
      const batchSize = 5;
      const total = animals.length;
      const updates: Animal[] = [];
      for (let i = 0; i < total; i += batchSize) {
          const chunk = animals.slice(i, i + batchSize);
          const speciesList = chunk.map(a => a.species);
          try {
              const results = await batchGetSpeciesData(speciesList);
              chunk.forEach(animal => {
                  const data = results[animal.species];
                  if (data && (data.latin || data.status)) {
                      updates.push({
                          ...animal,
                          latin_name: data.latin || animal.latin_name,
                          red_list_status: data.status || animal.red_list_status
                      });
                  }
              });
          } catch (e) { console.error("Scan error", e); }
          setScanProgress(Math.min(100, Math.round(((i + batchSize) / total) * 100)));
          await new Promise(resolve => setTimeout(resolve, 500));
      }
      if (updates.length > 0) {
          for (const updated of updates) await updateAnimal(updated);
          alert(`Scan Complete. Updated ${updates.length} records.`);
      } else {
          alert("Scan Complete. No new data found.");
      }
      setIsScanning(false);
      setScanProgress(0);
  };

  const handleOrgSave = () => {
      updateOrgProfile(orgForm);
      alert('Organisation profile updated.');
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          try {
              const resized = await resizeImage(file);
              setOrgForm(prev => ({ ...prev, logo_url: resized }));
          } catch (err) { console.error(err); }
      }
  };

  const handleAddList = (type: 'food' | 'method' | 'location' | 'events', value: string) => {
      if (!value.trim()) return;
      const val = value.trim();
      if (type === 'food') {
          const current = foodOptions[listSection] || [];
          if (!current.includes(val)) updateFoodOptions({ ...foodOptions, [listSection]: [...current, val] });
      } else if (type === 'method') {
          const current = feedMethods[listSection] || [];
          if (!current.includes(val)) updateFeedMethods({ ...feedMethods, [listSection]: [...current, val] });
      } else if (type === 'location') {
          if (!locations.includes(val)) updateLocations([...locations, val]);
      } else if (type === 'events') {
          if (!eventTypes.includes(val)) updateEventTypes([...eventTypes, val]);
      }
  };

  const handleRemoveList = (type: 'food' | 'method' | 'location' | 'events', value: string) => {
      if (type === 'food') {
          const current = foodOptions[listSection] || [];
          updateFoodOptions({ ...foodOptions, [listSection]: current.filter(i => i !== value) });
      } else if (type === 'method') {
          const current = feedMethods[listSection] || [];
          updateFeedMethods({ ...feedMethods, [listSection]: current.filter(i => i !== value) });
      } else if (type === 'location') {
          updateLocations(locations.filter(i => i !== value));
      } else if (type === 'events') {
          updateEventTypes(eventTypes.filter(i => i !== value));
      }
  };

  

  

  

  const handleExportData = async () => {
      await backupService.exportDatabase();
  };

  const handleMigration = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const jsonData = JSON.parse(event.target?.result as string);
              if (currentUser?.id) {
                  const { animalCount, logCount } = await migrateLegacyData(currentUser.id, jsonData);
                  setMigrationStatus({ count: animalCount, type: 'animal' });
                  setTimeout(() => setMigrationStatus({ count: logCount, type: 'log' }), 3000);
              }
          } catch (error) {
              console.error("Migration failed", error);
              alert("Migration failed. Check console for details.");
          }
      };
      reader.readAsText(file);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
          if (window.confirm("WARNING: Importing a database will overwrite all current data. This cannot be undone. Continue?")) {
              setIsProcessingBackup(true);
              const content = event.target?.result as string;
              const success = await backupService.importDatabase(content);
              if (success) { alert("Database imported successfully. System will reload."); window.location.reload(); } else { alert("Import failed. Invalid file format."); }
              setIsProcessingBackup(false);
          }
      };
      reader.readAsText(file);
  };

  const groupedAuditIssues = useMemo(() => {
      const groups = new Map<string, DiagnosticIssue[]>();
      const system: DiagnosticIssue[] = [];
      diagnosticIssues.forEach(issue => {
          if (issue.subjectId) {
              const current = groups.get(issue.subjectId) || [];
              groups.set(issue.subjectId, [...current, issue]);
          } else { system.push(issue); }
      });
      const sortedIds = Array.from(groups.keys()).sort((a, b) => {
          const issuesA = groups.get(a)!;
          const issuesB = groups.get(b)!;
          return issuesB.filter(i => i.severity === 'Critical').length - issuesA.filter(i => i.severity === 'Critical').length;
      });
      return { system, sortedIds, groups };
  }, [diagnosticIssues]);

  const auditScore = useMemo(() => {
      if (diagnosticIssues.length === 0) return 100;
      const criticals = diagnosticIssues.filter(i => i.severity === 'Critical').length;
      const warnings = diagnosticIssues.filter(i => i.severity === 'Warning').length;
      return Math.max(0, 100 - (criticals * 15) - (warnings * 5));
  }, [diagnosticIssues]);

  const inputClass = "w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:border-emerald-500 transition-all placeholder-slate-300 uppercase tracking-widest";
  const activeTestLogs = (testResults || []).find(r => r.id === activeTestLogId)?.logs || [];

  const permissionGroups = [
    {
        title: "Core Operations",
        items: [
            { key: 'dashboard', label: 'Dashboard' },
            { key: 'dailyLog', label: 'Daily Logs' },
            { key: 'rounds', label: 'Daily Rounds' },
            { key: 'tasks', label: 'Tasks' },
        ]
    },
    {
        title: "Animal Management",
        items: [
            { key: 'medical', label: 'Medical Records' },
            { key: 'feedingSchedule', label: 'Feeding Sched.' },
            { key: 'flightRecords', label: 'Flight Logs' },
            { key: 'movements', label: 'Stock Movements' },
        ]
    },
    {
        title: "Site Management",
        items: [
            { key: 'safety', label: 'Health & Safety' },
            { key: 'maintenance', label: 'Maintenance' },
            { key: 'reports', label: 'Reports' },
            { key: 'missingRecords', label: 'Data Audits' },
        ]
    },
    {
        title: "HR & System",
        items: [
            { key: 'attendance', label: 'View Timesheets' },
            { key: 'attendanceManager', label: 'Manage Time' },
            { key: 'holidayApprover', label: 'Approve Leave' },
            { key: 'settings', label: 'System Settings' },
        ]
    }
  ];

  return (
    <div className="flex h-full max-h-[calc(100vh-4rem)] overflow-hidden bg-white animate-in fade-in duration-500">
        
        {/* SIDEBAR NAVIGATION */}
        <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
            <div className="p-6 border-b border-slate-200">
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                    <SettingsIcon size={24} className="text-slate-600" /> Settings
                </h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">System Configuration</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {[
                    { id: 'org', label: 'Organisation', icon: Building2 },
                    { id: 'users', label: 'Access Control', icon: Users },
                    { id: 'training', label: 'Staff Training', icon: GraduationCap },
                    { id: 'directory', label: 'Directory', icon: Phone },
                    { id: 'lists', label: 'Operational Lists', icon: Utensils },
                    { id: 'documents', label: 'Statutory Files', icon: FileText },
                    { id: 'diagnostics', label: 'Statutory Audit', icon: ShieldCheck },
                    { id: 'intelligence', label: 'Data Intelligence', icon: BrainCircuit },
                    { id: 'system', label: 'System Health', icon: Activity },
                ].filter(item => {
                    const role = currentUser?.role?.toUpperCase();
                    if ((item.id === 'directory' || item.id === 'org') && (role === 'KEEPER' || role === 'SENIOR KEEPER')) {
                        return false;
                    }
                    if (item.id === 'system' && currentUser?.role?.toUpperCase() !== 'ADMIN') {
                        return false;
                    }
                    return true;
                }).map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id as any)}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${
                            activeTab === item.id ? 'bg-slate-900 text-white shadow-lg' : 'bg-transparent text-slate-500 hover:bg-slate-100'
                        }`}
                    >
                        <item.icon size={18} />
                        <span className="text-xs font-bold uppercase tracking-wide">{item.label}</span>
                        {activeTab === item.id && <ChevronRight size={14} className="ml-auto text-emerald-400"/>}
                    </button>
                ))}
            </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 overflow-auto p-8 bg-slate-100/50">
            
            {activeTab === 'org' && (
                <div className="max-w-4xl space-y-8 animate-in slide-in-from-right-4 duration-300">
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight border-b-2 border-slate-200 pb-2">Institution Profile</h3>
                    <div className="bg-white p-8 rounded-3xl border-2 border-slate-200 shadow-sm space-y-8">
                        <div className="flex items-center gap-8">
                            <div className="w-32 h-32 bg-slate-50 rounded-2xl border-4 border-dashed border-slate-200 flex items-center justify-center relative group overflow-hidden shadow-inner">
                                {orgForm.logo_url ? <img src={orgForm.logo_url} className="w-full h-full object-contain p-2" /> : <Upload size={32} className="text-slate-300" />}
                                <label className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer">
                                    <Camera size={20} className="text-white mb-1"/>
                                    <span className="text-[8px] font-black text-white uppercase">Replace</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                </label>
                            </div>
                            <div className="flex-1 space-y-4">
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Academy Name</label><input type="text" value={orgForm.name} onChange={e => setOrgForm({...orgForm, name: e.target.value})} className={inputClass}/></div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Zoo Licence Number</label><input type="text" value={orgForm.licence_number} onChange={e => setOrgForm({...orgForm, licence_number: e.target.value})} className={inputClass}/></div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Licence Expiry</label><input type="date" value={orgForm.licence_expiry_date ? new Date(orgForm.licence_expiry_date).toISOString().split('T')[0] : ''} onChange={e => setOrgForm({...orgForm, licence_expiry_date: e.target.value ? new Date(e.target.value) : undefined})} className={inputClass}/></div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Local Authority</label><input type="text" value={orgForm.local_authority} onChange={e => setOrgForm({...orgForm, local_authority: e.target.value})} className={inputClass}/></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Last Inspection</label><input type="date" value={orgForm.last_inspection_date ? new Date(orgForm.last_inspection_date).toISOString().split('T')[0] : ''} onChange={e => setOrgForm({...orgForm, last_inspection_date: e.target.value ? new Date(e.target.value) : undefined})} className={inputClass}/></div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Next Inspection</label><input type="date" value={orgForm.next_inspection_date ? new Date(orgForm.next_inspection_date).toISOString().split('T')[0] : ''} onChange={e => setOrgForm({...orgForm, next_inspection_date: e.target.value ? new Date(e.target.value) : undefined})} className={inputClass}/></div>
                            </div>
                            <div className="col-span-2"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Headquarters Address</label><textarea value={orgForm.address} onChange={e => setOrgForm({...orgForm, address: e.target.value})} className={`${inputClass} h-20 resize-none font-medium normal-case`}/></div>
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Professional Email</label><input type="email" value={orgForm.contact_email} onChange={e => setOrgForm({...orgForm, contact_email: e.target.value})} className={`${inputClass} normal-case`}/></div>
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Academy Phone</label><input type="text" value={orgForm.contact_phone} onChange={e => setOrgForm({...orgForm, contact_phone: e.target.value})} className={inputClass}/></div>
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Official Website</label><input type="url" value={orgForm.website_url} onChange={e => setOrgForm({...orgForm, website_url: e.target.value})} className={`${inputClass} normal-case`}/></div>
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Adoption Portal</label><input type="url" value={orgForm.adoption_url} onChange={e => setOrgForm({...orgForm, adoption_url: e.target.value})} className={`${inputClass} normal-case`}/></div>
                        </div>
                        <div className="pt-6 border-t border-slate-100 flex justify-end">
                            <button onClick={handleOrgSave} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-xl active:scale-95 flex items-center gap-2"><Check size={18}/> Save Institution Profile</button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'users' && (
                <div className="max-w-6xl space-y-8 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex justify-between items-center border-b-2 border-slate-200 pb-2">
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Personnel Registry</h3>
                        <button onClick={() => { setEditingUser(null); setUserForm({ role: UserRole.VOLUNTEER, permissions: {} as any }); setIsUserModalOpen(true); }} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-md">
                            <Plus size={14}/> Authorise Staff Member
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {(users || []).map(user => (
                            <div key={user.id} onClick={() => { setEditingUser(user); setUserForm(user); setIsUserModalOpen(true); }} className="bg-white p-6 rounded-2xl border-2 border-slate-200 hover:border-emerald-500 hover:shadow-xl transition-all cursor-pointer group">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md ${user.role === 'Admin' ? 'bg-slate-900' : 'bg-emerald-600'}`}>
                                        {user.initials}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-slate-900 text-sm uppercase tracking-tight truncate">{user.name}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user.job_position || user.role}</p>
                                    </div>
                                    {user.active ? <ShieldCheck size={18} className="text-emerald-500"/> : <X size={18} className="text-rose-400"/>}
                                </div>
                                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                        <PenTool size={12}/> {user.signature_image_url ? 'Signed' : 'No Sig'}
                                    </div>
                                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">Manage Profile <ChevronRight size={10}/></span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* STAFF TRAINING TAB */}
            {activeTab === 'training' && (
                <div className="max-w-6xl space-y-8 animate-in slide-in-from-right-4 duration-300 pb-24">
                    <div className="flex justify-between items-center border-b-2 border-slate-200 pb-2">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                                <GraduationCap size={20} className="text-emerald-600"/> Staff Training Registry
                            </h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Professional Development & Statutory Certifications</p>
                        </div>
                        <button onClick={() => { 
                            setEditingTraining(null); 
                            setTrainingForm({
                                user_id: '',
                                training_name: '',
                                completion_date: new Date().toISOString().split('T')[0],
                                expiry_date: '',
                                status: 'Completed',
                                notes: ''
                            }); 
                            setIsTrainingModalOpen(true); 
                        }} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-md">
                            <Plus size={14}/> Log Training Record
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Staff Member</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Training Name</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Expiry</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {staff_training.map(training => {
                                    const user = users.find(u => u.id === training.user_id);
                                    const isExpired = training.expiry_date && new Date(training.expiry_date) < new Date();
                                    
                                    return (
                                        <tr key={training.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-600">
                                                        {user?.initials || '??'}
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-900">{user?.name || 'Unknown Staff'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-700">{training.training_name}</td>
                                            <td className="px-6 py-4 text-xs font-medium text-slate-500">
                                                {new Date(training.completion_date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-xs font-medium text-slate-500">
                                                {training.expiry_date ? new Date(training.expiry_date).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest ${
                                                    isExpired ? 'bg-rose-100 text-rose-600' : 
                                                    training.status === 'Completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                                                }`}>
                                                    {isExpired ? 'Expired' : training.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                <button onClick={() => {
                                                    setEditingTraining(training);
                                                    setTrainingForm({
                                                        ...training,
                                                        completion_date: new Date(training.completion_date).toISOString().split('T')[0],
                                                        expiry_date: training.expiry_date ? new Date(training.expiry_date).toISOString().split('T')[0] : ''
                                                    });
                                                    setIsTrainingModalOpen(true);
                                                }} className="p-2 text-slate-400 hover:text-emerald-600 bg-white border border-slate-200 rounded-lg shadow-sm transition-colors"><Edit2 size={14}/></button>
                                                <button onClick={() => handleDeleteTraining(training.id)} className="p-2 text-slate-400 hover:text-rose-600 bg-white border border-slate-200 rounded-lg shadow-sm transition-colors"><Trash2 size={14}/></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {staff_training.length === 0 && (
                                    <tr><td colSpan={6} className="px-6 py-12 text-center text-xs font-black text-slate-300 uppercase tracking-widest">No Training Records Found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* DIRECTORY TAB */}
            {activeTab === 'directory' && (
                <div className="max-w-6xl space-y-8 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex justify-between items-center border-b-2 border-slate-200 pb-2">
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">External Directory</h3>
                        <button onClick={() => { setContactForm({ id: '', name: '', role: '', phone: '', email: '' }); setIsContactModalOpen(true); }} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-md">
                            <Plus size={14}/> Add Contact
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {contacts.map(contact => (
                            <div key={contact.id} className="bg-white p-6 rounded-2xl border-2 border-slate-200 hover:border-emerald-500 transition-all shadow-sm">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="font-black text-slate-900 uppercase tracking-tight text-sm">{contact.name}</h4>
                                        <span className="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded text-slate-500 uppercase tracking-widest">{contact.role}</span>
                                    </div>
                                    <button onClick={() => handleDeleteContact(contact.id)} className="text-slate-300 hover:text-rose-500"><Trash2 size={16}/></button>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
                                        <Phone size={14} className="text-emerald-500"/> {contact.phone}
                                    </div>
                                    {contact.email && (
                                        <div className="flex items-center gap-3 text-xs font-medium text-slate-600 truncate">
                                            <Mail size={14} className="text-emerald-500"/> {contact.email}
                                        </div>
                                    )}
                                    {contact.address && (
                                        <div className="flex items-start gap-3 text-xs font-medium text-slate-600 mt-2 pt-2 border-t border-slate-100">
                                            <MapPin size={14} className="text-emerald-500 shrink-0 mt-0.5"/> 
                                            <span className="leading-snug">{contact.address}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {contacts.length === 0 && (
                            <div className="col-span-full py-12 text-center text-slate-400 bg-white border-2 border-dashed border-slate-200 rounded-2xl">
                                <Phone size={32} className="mx-auto mb-2 opacity-20"/>
                                <p className="text-xs font-black uppercase tracking-widest">Directory Empty</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* STATUTORY FILES TAB */}
            {activeTab === 'documents' && (
                <div className="max-w-6xl space-y-8 animate-in slide-in-from-right-4 duration-300 pb-24">
                    <div className="flex justify-between items-center border-b-2 border-slate-200 pb-2">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                                <FileText size={20} className="text-emerald-600"/> Statutory Files
                            </h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Licensing, Insurance & Safety Documentation</p>
                        </div>
                        <button onClick={() => { setDocForm({ category: 'Licensing' }); setIsDocModalOpen(true); }} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-md">
                            <Upload size={14}/> Upload Document
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Document Name</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Category</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Upload Date</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {localDocuments.map(doc => (
                                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FileText size={16}/></div>
                                                <span className="text-sm font-bold text-slate-900">{doc.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded text-slate-600 uppercase tracking-widest">{doc.category}</span>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-medium text-slate-500">
                                            {new Date(doc.upload_date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                            <a href={doc.file_url} download={doc.name} className="p-2 text-slate-400 hover:text-emerald-600 bg-white border border-slate-200 rounded-lg shadow-sm transition-colors"><Download size={14}/></a>
                                            <button onClick={() => handleDeleteDocument(doc.id)} className="p-2 text-slate-400 hover:text-rose-600 bg-white border border-slate-200 rounded-lg shadow-sm transition-colors"><Trash2 size={14}/></button>
                                        </td>
                                    </tr>
                                ))}
                                {localDocuments.length === 0 && (
                                    <tr><td colSpan={4} className="px-6 py-12 text-center text-xs font-black text-slate-300 uppercase tracking-widest">No Documents on File</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* OPERATIONAL LISTS TAB */}
            {activeTab === 'lists' && (
                <div className="max-w-4xl space-y-8 animate-in slide-in-from-right-4 duration-300 pb-24">
                    <div className="border-b-2 border-slate-200 pb-6">
                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                            <Utensils size={28} className="text-orange-500" /> Operational Registries
                        </h3>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Manage Dropdown Options & Standard Lists</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* EVENT TYPES */}
                        <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-200 shadow-sm flex flex-col h-[500px]">
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Ticket size={16} className="text-purple-600"/> Event Classifications
                            </h4>
                            <div className="flex gap-2 mb-4">
                                <input 
                                    type="text" 
                                    placeholder="New Event Type..." 
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddList('events', (e.target as HTMLInputElement).value); }}
                                    className={inputClass}
                                    id="newEventInput"
                                />
                                <button onClick={() => {
                                    const input = document.getElementById('newEventInput') as HTMLInputElement;
                                    handleAddList('events', input.value);
                                    input.value = '';
                                }} className="bg-slate-900 text-white p-3 rounded-xl hover:bg-black transition-colors"><Plus size={18}/></button>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                                {eventTypes.map(item => (
                                    <div key={item} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-purple-200 transition-colors">
                                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{item}</span>
                                        <button onClick={() => handleRemoveList('events', item)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* FOOD OPTIONS */}
                        <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-200 shadow-sm flex flex-col h-[500px]">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                    <Utensils size={16} className="text-orange-500"/> Diet Inventory
                                </h4>
                                <select 
                                    value={listSection} 
                                    onChange={(e) => setListSection(e.target.value as AnimalCategory)}
                                    className="text-[10px] font-bold bg-slate-100 border-none rounded-lg py-1 pl-2 pr-6 uppercase tracking-widest focus:ring-0 cursor-pointer"
                                >
                                    {Object.values(AnimalCategory).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-2 mb-4">
                                <input 
                                    type="text" 
                                    placeholder="New Food Item..." 
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddList('food', (e.target as HTMLInputElement).value); }}
                                    className={inputClass}
                                    id="newFoodInput"
                                />
                                <button onClick={() => {
                                    const input = document.getElementById('newFoodInput') as HTMLInputElement;
                                    handleAddList('food', input.value);
                                    input.value = '';
                                }} className="bg-slate-900 text-white p-3 rounded-xl hover:bg-black transition-colors"><Plus size={18}/></button>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                                {(foodOptions[listSection] || []).map(item => (
                                    <div key={item} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-orange-200 transition-colors">
                                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{item}</span>
                                        <button onClick={() => handleRemoveList('food', item)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* FEED METHODS */}
                        <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-200 shadow-sm flex flex-col h-[500px]">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                    <Activity size={16} className="text-blue-500"/> Feed Methods
                                </h4>
                                <select 
                                    value={listSection} 
                                    onChange={(e) => setListSection(e.target.value as AnimalCategory)}
                                    className="text-[10px] font-bold bg-slate-100 border-none rounded-lg py-1 pl-2 pr-6 uppercase tracking-widest focus:ring-0 cursor-pointer"
                                >
                                    {Object.values(AnimalCategory).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-2 mb-4">
                                <input 
                                    type="text" 
                                    placeholder="New Method..." 
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddList('method', (e.target as HTMLInputElement).value); }}
                                    className={inputClass}
                                    id="newMethodInput"
                                />
                                <button onClick={() => {
                                    const input = document.getElementById('newMethodInput') as HTMLInputElement;
                                    handleAddList('method', input.value);
                                    input.value = '';
                                }} className="bg-slate-900 text-white p-3 rounded-xl hover:bg-black transition-colors"><Plus size={18}/></button>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                                {(feedMethods[listSection] || []).map(item => (
                                    <div key={item} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-blue-200 transition-colors">
                                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{item}</span>
                                        <button onClick={() => handleRemoveList('method', item)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* LOCATIONS */}
                        <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-200 shadow-sm flex flex-col h-[500px]">
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <MapPin size={16} className="text-emerald-500"/> Site Locations
                            </h4>
                            <div className="flex gap-2 mb-4">
                                <input 
                                    type="text" 
                                    placeholder="New Location..." 
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddList('location', (e.target as HTMLInputElement).value); }}
                                    className={inputClass}
                                    id="newLocationInput"
                                />
                                <button onClick={() => {
                                    const input = document.getElementById('newLocationInput') as HTMLInputElement;
                                    handleAddList('location', input.value);
                                    input.value = '';
                                }} className="bg-slate-900 text-white p-3 rounded-xl hover:bg-black transition-colors"><Plus size={18}/></button>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                                {locations.map(item => (
                                    <div key={item} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-emerald-200 transition-colors">
                                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{item}</span>
                                        <button onClick={() => handleRemoveList('location', item)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* DIAGNOSTICS TAB */}
            {activeTab === 'diagnostics' && (
                <div className="max-w-6xl space-y-8 animate-in slide-in-from-right-4 duration-300 pb-24">
                    {/* ... (Existing Diagnostics Content) ... */}
                    <div className="flex justify-between items-center border-b-2 border-slate-200 pb-6">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                                <Gavel size={28} className="text-slate-800" /> Compliance Dashboard
                            </h3>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Zoo Licensing Act 1981 • Statutory Audit</p>
                        </div>
                        <button onClick={handleRunAudit} disabled={isPending} className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3 hover:bg-black transition-all shadow-xl shadow-slate-900/20 active:scale-95">
                            {isPending ? <Loader2 size={18} className="animate-spin"/> : <RefreshCw size={18}/>} Run Diagnostics
                        </button>
                    </div>
                    {/* ... (Rest of Diagnostics Tab - omitted for brevity but preserved in output) ... */}
                    <div className={`rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 border-4 ${auditScore === 100 ? 'bg-emerald-600 border-emerald-500' : auditScore > 70 ? 'bg-amber-500 border-amber-400' : 'bg-rose-600 border-rose-500'}`}>
                        {/* ... Score card content ... */}
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <ShieldCheck size={300} />
                        </div>
                        <div className="relative z-10 flex items-center gap-8">
                            <div className="relative w-32 h-32 flex items-center justify-center">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                    <path className="text-black/20" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                    <path className="text-white drop-shadow-md transition-all duration-1000 ease-out" strokeDasharray={`${auditScore}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                </svg>
                                <span className="absolute text-3xl font-black">{auditScore}%</span>
                            </div>
                            <div>
                                <h2 className="text-3xl font-black uppercase tracking-tight mb-2">
                                    {auditScore === 100 ? 'Fully Compliant' : auditScore > 70 ? 'Action Required' : 'Critical Failure'}
                                </h2>
                                <p className="text-sm font-bold uppercase tracking-widest opacity-80 max-w-md leading-relaxed">
                                    {auditScore === 100 ? 'All statutory registers satisfy the requirements of the Secretary of State\'s Standards.' : 'Gaps detected in statutory records. Immediate remediation required to satisfy license conditions.'}
                                </p>
                            </div>
                        </div>
                    </div>
                    {/* ... Issues Grid ... */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {groupedAuditIssues.system.map(issue => (
                            <div key={issue.id} className="p-4 bg-white rounded-xl shadow-sm border-l-4 border-rose-500">
                                <p className="font-bold text-slate-800">{issue.message}</p>
                                <button onClick={() => setRemediationIssue(issue)} className="text-xs text-emerald-600 font-bold mt-2 hover:underline">Fix Issue</button>
                            </div>
                        ))}
                    </div>

                    {/* Animal Issues */}
                    <div className="space-y-6">
                        {groupedAuditIssues.sortedIds.map(animalId => {
                            const issues = groupedAuditIssues.groups.get(animalId);
                            const animal = animals.find(a => a.id === animalId);
                            if (!issues || !animal) return null;

                            return (
                                <div key={animalId} className="bg-white rounded-2xl border-2 border-slate-200 p-6 shadow-sm animate-in slide-in-from-bottom-2">
                                    <div className="flex items-center gap-4 mb-4 border-b border-slate-100 pb-3">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden">
                                            <img src={animal.image_url} alt="" className="w-full h-full object-cover"/>
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-900 text-sm uppercase">{animal.name}</h4>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{animal.species}</p>
                                        </div>
                                        <div className="ml-auto flex gap-2">
                                            {issues.some(i => i.severity === 'Critical') && <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-lg text-[9px] font-black uppercase">Critical</span>}
                                            {issues.some(i => i.severity === 'Warning') && <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-[9px] font-black uppercase">Warning</span>}
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {issues.map(issue => (
                                            <div key={issue.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                {issue.severity === 'Critical' ? <XCircle size={16} className="text-rose-500 mt-0.5"/> : <AlertCircle size={16} className="text-amber-500 mt-0.5"/>}
                                                <div className="flex-1">
                                                    <p className="text-xs font-bold text-slate-700">{issue.message}</p>
                                                    <p className="text-[10px] text-slate-500 mt-1">{issue.remediation}</p>
                                                    {issue.category === 'Compliance' && (
                                                        <button onClick={() => setRemediationIssue(issue)} className="text-[10px] font-black text-emerald-600 uppercase mt-2 hover:underline flex items-center gap-1">
                                                            <Wrench size={10}/> Auto-Remediate
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {activeTab === 'intelligence' && (
                <div className="max-w-6xl space-y-8 animate-in slide-in-from-right-4 duration-300 pb-24">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-2 border-slate-200 pb-6">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                                <BrainCircuit size={28} className="text-purple-600" /> Species Intelligence
                            </h3>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Automated Taxonomy & Conservation Status Sync</p>
                        </div>
                    </div>
                    {/* Action Area with Progress Indicator */}
                    <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-200 shadow-sm flex flex-col items-center text-center space-y-6">
                        <div className="p-4 bg-purple-50 text-purple-600 rounded-full mb-2">
                            <Globe2 size={48} />
                        </div>
                        <div>
                            <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Global IUCN Database Sync</h4>
                            <p className="text-sm font-medium text-slate-500 max-w-lg mx-auto">
                                Scan your entire animal collection against the IUCN Red List database to automatically update conservation status and scientific taxonomy.
                            </p>
                        </div>

                        {/* Progress Indicator */}
                        {isScanning ? (
                            <div className="w-full max-w-md space-y-2">
                                <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    <span>Analyzing Collection...</span>
                                    <span>{scanProgress}%</span>
                                </div>
                                <div className="h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                    <div 
                                        className="h-full bg-purple-600 transition-all duration-300 ease-out flex items-center justify-center"
                                        style={{ width: `${scanProgress}%` }}
                                    >
                                        <div className="w-full h-full opacity-20 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress-bar-stripes_1s_linear_infinite]"></div>
                                    </div>
                                </div>
                                <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest animate-pulse">
                                    AI Processing Active - Do not close tab
                                </p>
                            </div>
                        ) : (
                            <button 
                                onClick={handleRunIUCNScan} 
                                className="bg-purple-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-purple-700 transition-all shadow-xl active:scale-95 flex items-center gap-3"
                            >
                                <RefreshCw size={18} /> Run Auto-Discovery
                            </button>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'system' && (
                <div className="max-w-6xl space-y-8 animate-in slide-in-from-right-4 duration-300 pb-24">
                    <div className="border-b-2 border-slate-200 pb-6">
                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                            <Activity size={28} className="text-emerald-600" /> System Health & Data
                        </h3>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Database Management & Diagnostics</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Storage Stats */}
                        <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-200 shadow-sm space-y-6">
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <Database size={16} className="text-blue-500"/> Database Statistics
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Animals</p>
                                    <p className="text-2xl font-black text-slate-900">{storageStats.totalAnimals}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Logs</p>
                                    <p className="text-2xl font-black text-slate-900">{storageStats.totalLogs}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 col-span-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estimated Size</p>
                                    <p className="text-2xl font-black text-slate-900">{storageStats.dbSizeMB} MB</p>
                                </div>
                            </div>
                        </div>

                        {/* Data Management */}
                        <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-200 shadow-sm space-y-6">
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <HardDrive size={16} className="text-emerald-500"/> Data Management
                            </h4>
                            <div className="space-y-4">
                                <button onClick={handleExportData} className="w-full bg-slate-900 text-white px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all shadow-md">
                                    <Download size={16}/> Export Full Database
                                </button>
                                
                                <div className="relative">
                                    <input type="file" id="import-db" className="hidden" accept=".json" onChange={handleFileImport} disabled={isProcessingBackup} />
                                    <label htmlFor="import-db" className={`w-full bg-rose-50 text-rose-600 border-2 border-rose-200 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-rose-100 transition-all cursor-pointer ${isProcessingBackup ? 'opacity-50 pointer-events-none' : ''}`}>
                                        {isProcessingBackup ? <Loader2 size={16} className="animate-spin"/> : <Upload size={16}/>} Import & Overwrite Database
                                    </label>
                                </div>

                                <div className="relative pt-4 border-t border-slate-100">
                                    <input type="file" id="migrate-db" className="hidden" accept=".json" onChange={handleMigration} />
                                    <label htmlFor="migrate-db" className="w-full bg-amber-50 text-amber-600 border-2 border-amber-200 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-amber-100 transition-all cursor-pointer">
                                        <RotateCcw size={16}/> Migrate Legacy Data
                                    </label>
                                    {migrationStatus && (
                                        <p className="text-center text-[10px] font-bold text-amber-600 mt-2 uppercase">
                                            Migrated {migrationStatus.count} {migrationStatus.type}s
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Diagnostic Tests */}
                        <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-200 shadow-sm col-span-1 lg:col-span-2 space-y-6">
                            <div className="flex justify-between items-center">
                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                    <Terminal size={16} className="text-slate-700"/> System Diagnostics
                                </h4>
                                <button onClick={runDiagnosticSuite} disabled={isTestsRunning} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-md disabled:opacity-50">
                                    {isTestsRunning ? <Loader2 size={14} className="animate-spin"/> : <Play size={14}/>} Run Suite
                                </button>
                            </div>

                            {testResults.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="col-span-1 space-y-2">
                                        {testResults.map(test => (
                                            <button 
                                                key={test.id}
                                                onClick={() => setActiveTestLogId(test.id)}
                                                className={`w-full text-left p-3 rounded-xl border-2 transition-all flex items-center justify-between ${activeTestLogId === test.id ? 'border-slate-900 bg-slate-50' : 'border-slate-100 hover:border-slate-300'}`}
                                            >
                                                <div>
                                                    <p className="text-xs font-bold text-slate-900">{test.name}</p>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{test.category}</p>
                                                </div>
                                                {test.status === 'running' && <Loader2 size={14} className="text-blue-500 animate-spin"/>}
                                                {test.status === 'pass' && <CheckCircle2 size={14} className="text-emerald-500"/>}
                                                {test.status === 'fail' && <XCircle size={14} className="text-rose-500"/>}
                                                {test.status === 'pending' && <Clock size={14} className="text-slate-300"/>}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="col-span-2 bg-slate-900 rounded-xl p-4 font-mono text-xs text-emerald-400 h-64 overflow-y-auto" ref={testScrollRef}>
                                        {activeTestLogId ? (
                                            activeTestLogs.map((log, i) => (
                                                <div key={i} className="mb-1">{log}</div>
                                            ))
                                        ) : (
                                            <div className="text-slate-500 flex h-full items-center justify-center">Select a test to view logs</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            
        </div>

        {isUserModalOpen && (
            <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
                    <div className="p-8 border-b-2 border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{editingUser ? 'Authorisation Registry' : 'New Staff Authorisation'}</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Credentials & Identity Registry</p>
                        </div>
                        <button onClick={() => setIsUserModalOpen(false)} className="text-slate-300 hover:text-slate-900"><X size={32}/></button>
                    </div>
                    <div className="p-8 space-y-8 max-h-[80vh] overflow-y-auto scrollbar-hide">
                        <div className="grid grid-cols-2 gap-6">
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 text-slate-900">Full Legal Name</label>
                            <input type="text" value={userForm.name || ''} onChange={e => setUserForm({...userForm, name: e.target.value})} className={`${inputClass} normal-case font-semibold`} /></div>
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 text-slate-900">Job Position</label>
                            <input type="text" value={userForm.job_position || ''} onChange={e => setUserForm({...userForm, job_position: e.target.value})} className={`${inputClass} normal-case font-semibold`} /></div>
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 text-slate-900">Initials (3 Max)</label>
                            <input type="text" maxLength={3} value={userForm.initials || ''} onChange={e => setUserForm({...userForm, initials: e.target.value.toUpperCase()})} className={inputClass}/></div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 text-slate-900">Security PIN</label>
                            <input type="password" maxLength={4} value={userForm.pin || ''} onChange={e => setUserForm({...userForm, pin: e.target.value})} className={inputClass}/></div>
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 text-slate-900">Academy Role</label>
                            <select value={userForm.role || UserRole.VOLUNTEER} onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})} className={inputClass}><option value={UserRole.VOLUNTEER}>Volunteer</option><option value={UserRole.STAFF}>Staff</option><option value={UserRole.KEEPER}>Keeper</option><option value={UserRole.SENIOR_KEEPER}>Senior Keeper</option><option value={UserRole.ADMIN}>Admin</option><option value={UserRole.VETERINARIAN}>Veterinarian</option><option value={UserRole.DIRECTOR}>Director</option></select></div>
                        </div>

                        {/* Access Control Section */}
                        <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2 flex items-center gap-2">
                                <ShieldCheck size={14}/> Access Control
                            </h4>
                            
                            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Account Status</span>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${userForm.active !== false ? 'text-emerald-600' : 'text-rose-500'}`}>{userForm.active !== false ? 'Active' : 'Suspended'}</span>
                                    <div className={`w-12 h-6 rounded-full p-1 transition-colors ${userForm.active !== false ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${userForm.active !== false ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </div>
                                    <input type="checkbox" className="hidden" checked={userForm.active !== false} onChange={e => setUserForm({...userForm, active: e.target.checked})}/>
                                </label>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Granular Privileges</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-64 overflow-y-auto pr-2 bg-slate-100/50 p-4 rounded-xl border border-slate-200">
                                    {[
                                        {
                                            title: "Core Modules",
                                            items: [
                                                { key: 'dashboard', label: 'Dashboard' },
                                                { key: 'dailyLog', label: 'Daily Logs' },
                                                { key: 'tasks', label: 'Tasks' },
                                                { key: 'rounds', label: 'Daily Rounds' },
                                            ]
                                        },
                                        {
                                            title: "Animal & Medical",
                                            items: [
                                                { key: 'medical', label: 'Medical Records' },
                                                { key: 'movements', label: 'Stock Movements' },
                                                { key: 'flightRecords', label: 'Flight Logs' },
                                                { key: 'feedingSchedule', label: 'Feeding Sched.' },
                                                { key: 'animalManagement', label: 'Animal Mgmt' },
                                            ]
                                        },
                                        {
                                            title: "HR & Admin",
                                            items: [
                                                { key: 'attendance', label: 'View Timesheets' },
                                                { key: 'attendanceManager', label: 'Manage Time' },
                                                { key: 'holidayApprover', label: 'Approve Leave' },
                                                { key: 'userManagement', label: 'User Mgmt' },
                                            ]
                                        },
                                        {
                                            title: "Site & System",
                                            items: [
                                                { key: 'safety', label: 'Health & Safety' },
                                                { key: 'maintenance', label: 'Maintenance' },
                                                { key: 'settings', label: 'System Settings' },
                                                { key: 'missingRecords', label: 'Data Audits' },
                                                { key: 'reports', label: 'Reports' },
                                                { key: 'documentManagement', label: 'Document Mgmt' },
                                            ]
                                        }
                                    ].map(group => (
                                        <div key={group.title} className="space-y-2">
                                            <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1 mb-2">{group.title}</h5>
                                            <div className="space-y-2">
                                                {group.items.map(({ key, label }) => (
                                                    <label key={key} className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${userForm?.permissions?.[key as keyof UserPermissions] ?? false ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                                                        <div className={`w-3 h-3 rounded border flex items-center justify-center ${userForm?.permissions?.[key as keyof UserPermissions] ?? false ? 'border-white bg-transparent' : 'border-slate-300 bg-slate-100'}`}>
                                                            {(userForm?.permissions?.[key as keyof UserPermissions] ?? false) && <Check size={8} />}
                                                        </div>
                                                        <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
                                                        <input 
                                                            type="checkbox" 
                                                            className="hidden" 
                                                            checked={userForm?.permissions?.[key as keyof UserPermissions] ?? false}
                                                            onChange={() => togglePermission(key as keyof UserPermissions)}
                                                        />
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 text-slate-900">Authorised Digital Signature</label>
                            <SignaturePad value={userForm.signature_image_url || ''} onChange={(v) => setUserForm({...userForm, signature_image_url: v})}/>
                        </div>
                        <div className="pt-4">
                            <button onClick={handleSaveUser} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-black transition-all shadow-xl active:scale-95">Commit to Personnel Ledger</button>
                            <button onClick={async () => {
                                if (!supabase) return;
                                try {
                                    // @ts-ignore - WebAuthn might not be in all types yet
                                    const { options } = await supabase.auth.generateAuthenticationOptions();
                                    // @ts-ignore
                                    await supabase.auth.signInWithWebAuthn(options);
                                    alert('Device enrolled for biometric login!');
                                } catch (error) {
                                    console.error('WebAuthn enrollment error:', error);
                                    alert('Failed to enroll device. See console for details.');
                                }
                            }} className="w-full mt-4 bg-emerald-600 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest">Enroll Device for Biometric Login</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Contact Modal */}
        {isContactModalOpen && (
            <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-900">New Contact</h3>
                        <button onClick={() => setIsContactModalOpen(false)}><X size={20}/></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <input placeholder="Name" value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})} className={inputClass} />
                        <input placeholder="Role" value={contactForm.role} onChange={e => setContactForm({...contactForm, role: e.target.value})} className={inputClass} />
                        <input placeholder="Phone" value={contactForm.phone} onChange={e => setContactForm({...contactForm, phone: e.target.value})} className={inputClass} />
                        <input placeholder="Email" value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})} className={inputClass} />
                        <input placeholder="Address" value={contactForm.address} onChange={e => setContactForm({...contactForm, address: e.target.value})} className={inputClass} />
                        <button onClick={handleSaveContact} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold">Save Contact</button>
                    </div>
                </div>
            </div>
        )}

        {/* Document Modal */}
        {isDocModalOpen && (
            <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-900">Upload Document</h3>
                        <button onClick={() => setIsDocModalOpen(false)}><X size={20}/></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <select value={docForm.category} onChange={e => setDocForm({...docForm, category: e.target.value as any})} className={inputClass}>
                            <option value="Licensing">Licensing</option>
                            <option value="Insurance">Insurance</option>
                            <option value="Safety">Safety</option>
                            <option value="Protocol">Protocol</option>
                        </select>
                        <input type="file" onChange={handleDocFileUpload} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100"/>
                        <button onClick={handleSaveDocument} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold">Upload File</button>
                    </div>
                </div>
            </div>
        )}

        {/* Remediation Modal */}
        {remediationIssue && (
            <div className="fixed inset-0 bg-slate-900/80 z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 border-2 border-slate-200">
                    <div className="p-6 border-b-2 border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                                <Wrench size={20} className="text-emerald-600"/> Compliance Remediation
                            </h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Correction for: {remediationIssue.id}</p>
                        </div>
                        <button onClick={() => setRemediationIssue(null)} className="text-slate-300 hover:text-slate-900"><X size={24}/></button>
                    </div>
                    
                    <div className="p-6 space-y-6">
                        <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
                            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18}/>
                            <div>
                                <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">Issue Detected</p>
                                <p className="text-sm text-amber-900 font-medium">{remediationIssue.message}</p>
                            </div>
                        </div>

                        {/* TAXONOMY FORM */}
                        {remediationIssue.id.includes('comp_tax') && (
                            <div className="space-y-4">
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Species Common Name</label><input type="text" value={fixForm.species || ''} onChange={e => setFixForm({...fixForm, species: e.target.value})} className={inputClass}/></div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Scientific Latin Name</label>
                                    <div className="flex gap-2">
                                        <input type="text" value={fixForm.latin_name || ''} onChange={e => setFixForm({...fixForm, latin_name: e.target.value})} className={`${inputClass} italic font-serif`} placeholder="e.g. Tyto alba"/>
                                        <button type="button" onClick={handleAiLatinName} className="bg-slate-900 text-white px-4 rounded-xl flex items-center gap-2 hover:bg-black transition-all shadow-md"><Sparkles size={16}/></button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ID FORM */}
                        {remediationIssue.id.includes('comp_id') && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Ring Number</label><input type="text" value={fixForm.ring_number || ''} onChange={e => setFixForm({...fixForm, ring_number: e.target.value})} className={`${inputClass} font-mono`} placeholder="Optional"/></div>
                                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Microchip</label><input type="text" value={fixForm.microchip_id || ''} onChange={e => setFixForm({...fixForm, microchip_id: e.target.value})} className={`${inputClass} font-mono`} placeholder="Optional"/></div>
                                </div>
                                <label className="flex items-center gap-3 p-3 border-2 border-slate-100 rounded-xl bg-slate-50 cursor-pointer hover:border-slate-200">
                                    <input type="checkbox" checked={fixForm.has_no_id || false} onChange={e => setFixForm({...fixForm, has_no_id: e.target.checked})} className="w-5 h-5 accent-emerald-600"/>
                                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Confirm Subject Has No ID</span>
                                </label>
                            </div>
                        )}

                        {/* ORIGIN FORM */}
                        {remediationIssue.id.includes('comp_orig') && (
                            <div className="space-y-4">
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Arrival Date</label><input type="date" value={fixForm.acquisition_date || ''} onChange={e => setFixForm({...fixForm, acquisition_date: e.target.value})} className={inputClass}/></div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Origin Source</label><input type="text" value={fixForm.origin || ''} onChange={e => setFixForm({...fixForm, origin: e.target.value})} className={inputClass} placeholder="e.g. Captive Bred - UK"/></div>
                            </div>
                        )}

                        {/* ADMIN FIX */}
                        {remediationIssue.id === 'sec_no_admin' && (
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Promote User to Admin</label>
                                <select value={fixForm.newAdminId || ''} onChange={e => setFixForm({...fixForm, newAdminId: e.target.value})} className={inputClass}>
                                    <option value="">Select User...</option>
                                    {(users || []).filter(u => u.active).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>
                        )}

                        <button 
                            onClick={handleApplyFix} 
                            disabled={isFixing}
                            className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-emerald-700 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                        >
                            {isFixing ? <Loader2 size={18} className="animate-spin"/> : <CheckCircle2 size={18}/>}
                            Apply Correction
                        </button>
                    </div>
                </div>
            </div>
        )}
        {/* Training Modal */}
        {isTrainingModalOpen && (
            <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95">
                    <div className="p-8 border-b-2 border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{editingTraining ? 'Update Training Record' : 'Log Training Record'}</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Professional Development Registry</p>
                        </div>
                        <button onClick={() => setIsTrainingModalOpen(false)} className="text-slate-300 hover:text-slate-900"><X size={32}/></button>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 text-slate-900">Staff Member</label>
                                <select 
                                    value={trainingForm.user_id} 
                                    onChange={e => setTrainingForm({...trainingForm, user_id: e.target.value})} 
                                    className={inputClass}
                                >
                                    <option value="">Select Staff Member...</option>
                                    {(users || []).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 text-slate-900">Training Name</label>
                                <input 
                                    type="text" 
                                    value={trainingForm.training_name} 
                                    onChange={e => setTrainingForm({...trainingForm, training_name: e.target.value})} 
                                    className={inputClass} 
                                    placeholder="e.g. First Aid, Fire Safety, Animal Handling"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 text-slate-900">Completion Date</label>
                                    <input 
                                        type="date" 
                                        value={trainingForm.completion_date} 
                                        onChange={e => setTrainingForm({...trainingForm, completion_date: e.target.value})} 
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 text-slate-900">Expiry Date (Optional)</label>
                                    <input 
                                        type="date" 
                                        value={trainingForm.expiry_date} 
                                        onChange={e => setTrainingForm({...trainingForm, expiry_date: e.target.value})} 
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 text-slate-900">Status</label>
                                <select 
                                    value={trainingForm.status} 
                                    onChange={e => setTrainingForm({...trainingForm, status: e.target.value})} 
                                    className={inputClass}
                                >
                                    <option value="Completed">Completed</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Planned">Planned</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 text-slate-900">Notes</label>
                                <textarea 
                                    value={trainingForm.notes} 
                                    onChange={e => setTrainingForm({...trainingForm, notes: e.target.value})} 
                                    className={`${inputClass} h-24 resize-none font-medium normal-case`}
                                    placeholder="Additional details..."
                                />
                            </div>
                        </div>
                        <button onClick={handleSaveTraining} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-black transition-all shadow-xl active:scale-95">
                            {editingTraining ? 'Update Record' : 'Commit to Registry'}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Settings;
