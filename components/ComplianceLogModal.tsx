
import React, { useState } from 'react';
import { X, Check, Loader2, BookOpen, Users } from 'lucide-react';
import { LogType } from '@/types';
import { useAppData } from '@/src/context/AppContext';
import { SYSTEM_ANIMAL_ID } from '@/constants';

interface ComplianceLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ComplianceLogModal: React.FC<ComplianceLogModalProps> = ({ isOpen, onClose }) => {
  const { addLogEntry } = useAppData();
  const [isPending, startTransition] = React.useTransition();
  
  const [type, setType] = useState<LogType.CONSERVATION | LogType.EDUCATION>(LogType.CONSERVATION);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await addLogEntry(SYSTEM_ANIMAL_ID, {
          log_date: new Date(date),
          log_type: type as any,
          value: title,
          notes: description,
        });
        onClose();
      } catch (error) {
        console.error("Failed to log compliance activity", error);
        alert("Failed to save record.");
      }
    });
  };

  const inputClass = "w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 font-bold placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none focus:border-emerald-500 transition-all uppercase tracking-wider";
  const labelClass = "block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden border-2 border-slate-200">
        <div className="p-8 border-b-2 border-slate-100 flex justify-between items-center shrink-0 bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">Log Statutory Activity</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Zoo Licensing Act 1981 Compliance</p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-900 p-2 bg-white rounded-xl shadow-sm border border-slate-200 transition-all"><X size={24}/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="flex gap-4">
            <button 
              type="button" 
              onClick={() => setType(LogType.CONSERVATION)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-2 ${type === LogType.CONSERVATION ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}
            >
              <BookOpen size={16} /> Conservation
            </button>
            <button 
              type="button" 
              onClick={() => setType(LogType.EDUCATION)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-2 ${type === LogType.EDUCATION ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}
            >
              <Users size={16} /> Education
            </button>
          </div>

          <div>
            <label className={labelClass}>Activity Date</label>
            <input type="date" required value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Activity Title / Name</label>
            <input 
              type="text" 
              required 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              className={inputClass} 
              placeholder="e.g. School Visit: Barn Owl Talk"
            />
          </div>

          <div>
            <label className={labelClass}>Description & Impact</label>
            <textarea 
              rows={4} 
              required
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              className={`${inputClass} normal-case h-32 resize-none font-semibold text-slate-700`} 
              placeholder="Describe the activity and how it meets the statutory requirements..."
            />
          </div>

          <div className="flex gap-4 pt-4 border-t-2 border-slate-100">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-3 text-slate-500 bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">Cancel</button>
            <button type="submit" disabled={isPending} className="flex-[2] px-8 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3">
              {isPending ? <Loader2 className="animate-spin" size={18}/> : <Check size={18}/>}
              Authorise & Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ComplianceLogModal;
