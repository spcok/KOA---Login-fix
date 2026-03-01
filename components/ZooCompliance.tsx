
import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  AlertCircle, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Info,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  BookOpen,
  Users,
  Stethoscope,
  Home,
  Lock,
  Plus
} from 'lucide-react';
import { useAppData } from '@/src/context/AppContext';
import { LogType } from '@/types';
import ComplianceLogModal from './ComplianceLogModal';

interface ComplianceItem {
  id: string;
  title: string;
  description: string;
  status: 'compliant' | 'non-compliant' | 'pending' | 'n/a';
  lastChecked: string;
  category: string;
}

const ZooCompliance: React.FC = () => {
  const { orgProfile, log_entries } = useAppData();
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Conservation');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  const complianceData: ComplianceItem[] = [
    // Section 1: Conservation, Education, and Research
    { id: '1.1', category: 'Conservation', title: 'Conservation Participation', description: 'Participation in research from which conservation benefits accrue to species of wild animals.', status: 'compliant', lastChecked: '2025-02-15' },
    { id: '1.2', category: 'Conservation', title: 'Education Strategy', description: 'Provision of information to the public about the species of wild animals and their natural habitats.', status: 'compliant', lastChecked: '2025-02-15' },
    { id: '1.3', category: 'Conservation', title: 'Species Information', description: 'Information about the species exhibited must be displayed.', status: 'compliant', lastChecked: '2025-02-15' },
    
    // Section 2: Animal Management
    { id: '2.1', category: 'Animal Welfare', title: 'Dietary Requirements', description: 'Animals must be provided with food and water which is suitable for their species.', status: 'compliant', lastChecked: '2025-02-20' },
    { id: '2.2', category: 'Animal Welfare', title: 'Veterinary Care', description: 'A programme of preventative and curative veterinary care and nutrition.', status: 'compliant', lastChecked: '2025-02-20' },
    { id: '2.3', category: 'Animal Welfare', title: 'Housing Standards', description: 'Accommodating animals under conditions which aim to satisfy their biological and conservation requirements.', status: 'pending', lastChecked: '2025-01-10' },
    
    // Section 3: Public Safety
    { id: '3.1', category: 'Public Safety', title: 'Escape Prevention', description: 'Preventing the escape of animals and measures to be taken in the event of any escape.', status: 'compliant', lastChecked: '2025-02-25' },
    { id: '3.2', category: 'Public Safety', title: 'Public Protection', description: 'Protecting the public from fire and other hazards.', status: 'compliant', lastChecked: '2025-02-25' },
    
    // Section 4: Records
    { id: '4.1', category: 'Records', title: 'Animal Records', description: 'Keeping up-to-date records of the zoo\'s collection.', status: 'compliant', lastChecked: '2025-02-28' },
    { id: '4.2', category: 'Records', title: 'Staff Training Records', description: 'Records of staff training and competency.', status: 'non-compliant', lastChecked: '2024-12-01' },
  ];

  const categories = Array.from(new Set(complianceData.map(item => item.category)));

  // Calculate stats
  const stats = useMemo(() => {
    const total = complianceData.length;
    const compliant = complianceData.filter(i => i.status === 'compliant').length;
    const pending = complianceData.filter(i => i.status === 'pending').length;
    const nonCompliant = complianceData.filter(i => i.status === 'non-compliant').length;
    
    const conservationLogs = (log_entries || []).filter(l => l.log_type === LogType.CONSERVATION);
    const educationLogs = (log_entries || []).filter(l => l.log_type === LogType.EDUCATION);
    
    return {
      overallPercentage: Math.round((compliant / total) * 100),
      pendingCount: pending,
      criticalCount: nonCompliant,
      conservationCount: conservationLogs.length,
      educationCount: educationLogs.length,
      conservationProgress: Math.min(100, (conservationLogs.length / 5) * 100), // Target 5
      educationProgress: Math.min(100, (educationLogs.length / 10) * 100), // Target 10
    };
  }, [complianceData, log_entries]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'non-compliant': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      case 'pending': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Conservation': return <BookOpen size={18} />;
      case 'Animal Welfare': return <Stethoscope size={18} />;
      case 'Public Safety': return <Lock size={18} />;
      case 'Records': return <FileText size={18} />;
      default: return <ShieldCheck size={18} />;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="text-emerald-600" />
            Zoo Licensing Act 1981 Compliance
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Monitoring adherence to the Secretary of State's Standards of Modern Zoo Practice (SSSMZP).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current License Status</p>
            <div className="flex items-center gap-2 justify-end">
              <span className="text-sm font-bold text-emerald-600">
                {orgProfile?.licence_expiry_date && new Date(orgProfile.licence_expiry_date) > new Date() ? 'Active (Full License)' : 'Action Required'}
              </span>
              <div className={`w-2 h-2 rounded-full ${orgProfile?.licence_expiry_date && new Date(orgProfile.licence_expiry_date) > new Date() ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
            </div>
          </div>
          <div className="h-10 w-[1px] bg-slate-200 mx-2"></div>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Next Inspection</p>
            <p className="text-sm font-bold text-slate-700">
              {orgProfile?.next_inspection_date ? new Date(orgProfile.next_inspection_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Overall Compliance', value: `${stats.overallPercentage}%`, icon: ShieldCheck, color: 'text-emerald-600' },
          { label: 'Pending Actions', value: stats.pendingCount.toString(), icon: Clock, color: 'text-amber-600' },
          { label: 'Critical Issues', value: stats.criticalCount.toString(), icon: AlertCircle, color: 'text-rose-600' },
          { label: 'Last Inspection', value: 'Pass', icon: CheckCircle2, color: 'text-blue-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <stat.icon className={stat.color} size={20} />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Live</span>
            </div>
            <p className="text-2xl font-black text-slate-900">{stat.value}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance Checklist */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Compliance Checklist</h2>
            <button className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              <ExternalLink size={14} />
              View SSSMZP Full Text
            </button>
          </div>

          {categories.map(category => (
            <div key={category} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <button 
                onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                    {getCategoryIcon(category)}
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-slate-800">{category}</h3>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                      {complianceData.filter(i => i.category === category).length} Standards
                    </p>
                  </div>
                </div>
                {expandedCategory === category ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
              </button>

              {expandedCategory === category && (
                <div className="border-t border-slate-100 divide-y divide-slate-100">
                  {complianceData.filter(item => item.category === category).map(item => (
                    <div key={item.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                              {item.id}
                            </span>
                            <h4 className="font-bold text-slate-800 text-sm">{item.title}</h4>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {item.description}
                          </p>
                          <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              <Calendar size={12} />
                              Last Checked: {item.lastChecked}
                            </div>
                            <button className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest hover:underline">
                              Update Record
                            </button>
                          </div>
                        </div>
                        <div className={`px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${getStatusColor(item.status)}`}>
                          {item.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* License Info */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FileText size={18} className="text-emerald-600" />
              License Details
            </h3>
            <div className="space-y-4">
              <div className="pb-4 border-b border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">License Number</p>
                <p className="text-sm font-bold text-slate-700">{orgProfile?.licence_number || 'Not Set'}</p>
              </div>
              <div className="pb-4 border-b border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Local Authority</p>
                <p className="text-sm font-bold text-slate-700">{orgProfile?.local_authority || 'Not Set'}</p>
              </div>
              <div className="pb-4 border-b border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Expiry Date</p>
                <p className="text-sm font-bold text-slate-700">
                  {orgProfile?.licence_expiry_date ? new Date(orgProfile.licence_expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not Set'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Secretary of State Standards</p>
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 p-2 rounded-lg">
                  <Info size={14} />
                  Compliant with 2024 Revision
                </div>
              </div>
            </div>
          </div>

          {/* Conservation Impact */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl shadow-slate-200">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Users size={18} className="text-emerald-400" />
              Conservation & Education
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              The Act requires zoos to contribute to conservation and public education.
            </p>
            <div className="space-y-3">
              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Education Programs</span>
                  <span className="text-xs font-bold text-emerald-400">{stats.educationCount} Active</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${stats.educationProgress}%` }}></div>
                </div>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Research Projects</span>
                  <span className="text-xs font-bold text-emerald-400">{stats.conservationCount} Active</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${stats.conservationProgress}%` }}></div>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsLogModalOpen(true)}
              className="w-full mt-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              Log New Activity
            </button>
          </div>
        </div>
      </div>

      <ComplianceLogModal 
        isOpen={isLogModalOpen} 
        onClose={() => setIsLogModalOpen(false)} 
      />
    </div>
  );
};

export default ZooCompliance;
