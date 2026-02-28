
import React, { useState, useEffect, useRef, useTransition } from 'react';
import { Animal, AnimalCategory, HazardRating, ConservationStatus } from '@/types';
import { X, Check, Camera, Sparkles, Loader2, Zap, Shield, History, Info, Globe, Skull, Users } from 'lucide-react';
import { getLatinName, getConservationStatus } from '@/src/services/geminiService';
import { useAppData } from '@/src/context/AppContext';
import { useAuth } from '@/src/context/AuthContext';

interface AnimalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Animal;
  locations?: string[]; 
}

const resizeImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 800, maxHeight = 800;
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          if (width / maxWidth > height / maxHeight) { height = Math.round((height * maxWidth) / width); width = maxWidth; } 
          else { width = Math.round((width * maxHeight) / height); height = maxHeight; }
        }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

const AnimalFormModal: React.FC<AnimalFormModalProps> = ({ isOpen, onClose, initialData, locations = [] }) => {
  const { addAnimal, updateAnimal } = useAppData();
  const { profile: currentUser } = useAuth();
  const [isAiPending, startAiTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const submitAction = async (form: FormData) => {
    if (!currentUser) return { success: false, message: 'Authentication error.' };
    
    const data = Object.fromEntries(form.entries());
    const animalData: any = {
        name: (data.name as string).trim(),
        species: (data.species as string).trim(),
        latin_name: data.latin_name as string,
        category: data.category as AnimalCategory,
        dob: data.is_dob_unknown === 'on' ? new Date() : new Date(data.dob as string),
        is_dob_unknown: data.is_dob_unknown === 'on',
        location: data.location as string,
        description: data.description as string,
        special_requirements: data.special_requirements as string,
        image_url: data.image_url as string,
        distribution_map_url: data.distribution_map_url as string,
        sex: data.sex as Animal['sex'],
        acquisition_date: new Date(data.acquisition_date as string),
        origin: data.origin as string,
        sire_id: data.sire_id as string,
        dam_id: data.dam_id as string,
        microchip_id: data.microchip_id as string,
        ring_number: data.ring_number as string,
        has_no_id: data.has_no_id === 'on',
        hazard_rating: data.hazard_rating as HazardRating,
        is_venomous: data.is_venomous === 'on',
        red_list_status: data.red_list_status as ConservationStatus,
        weight_unit: 'g',
        is_group_animal: data.is_group_animal === 'on',
        archived: false,
        is_quarantine: false,
        display_order: initialData?.display_order || 0,
    };

    if (initialData) {
      await updateAnimal({ ...initialData, ...animalData });
    } else {
      await addAnimal(animalData);
    }
    
    onClose();
    return { success: true, message: 'Record Authorized.' };
  };

  const [isPending, startTransition] = React.useTransition();
  const [state, setState] = useState<{ success: boolean, message?: string } | null>(null);

  const formAction = (formData: FormData) => {
    startTransition(async () => {
      const result = await submitAction(formData);
      setState(result);
    });
  };

  const [imageUrl, setImageUrl] = useState(initialData?.image_url || '');
  const [distroUrl, setDistroUrl] = useState(initialData?.distribution_map_url || '');
  const [latinName, setLatinName] = useState(initialData?.latin_name || '');
  const [redList, setRedList] = useState(initialData?.red_list_status || ConservationStatus.NE);
  const [category, setCategory] = useState<AnimalCategory>(initialData?.category || AnimalCategory.OWLS);
  const [hazardRating, setHazardRating] = useState<HazardRating>(initialData?.hazard_rating || HazardRating.LOW);
  const [isVenomous, setIsVenomous] = useState<boolean>(initialData?.is_venomous || false);

  useEffect(() => {
    if (isOpen) {
      setImageUrl(initialData?.image_url || `https://picsum.photos/seed/${Date.now()}/400/400`);
      setDistroUrl(initialData?.distribution_map_url || '');
      setLatinName(initialData?.latin_name || '');
      setRedList(initialData?.red_list_status || ConservationStatus.NE);
      setCategory(initialData?.category || AnimalCategory.OWLS);
      setHazardRating(initialData?.hazard_rating || HazardRating.LOW);
      setIsVenomous(initialData?.is_venomous || false);
      formRef.current?.reset();
    }
  }, [isOpen, initialData]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'image_url' | 'distribution_map_url') => {
    const file = e.target.files?.[0];
    if (file) {
      const resized = await resizeImage(file);
      if (field === 'image_url') setImageUrl(resized);
      else setDistroUrl(resized);
    }
  };

  const handleAutoFill = () => {
    const species = formRef.current?.elements.namedItem('species') as HTMLInputElement;
    if (!species?.value) return;
    startAiTransition(async () => {
        const [latin, status] = await Promise.all([getLatinName(species.value), getConservationStatus(species.value)]);
        if (latin) setLatinName(latin);
        if (status) setRedList(status);
    });
  };

  if (!isOpen) return null;

  const inputClass = "w-full px-4 py-2.5 bg-[#f3f6f9] border border-[#e1e8ef] rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:border-emerald-500 transition-all placeholder-slate-300";
  const labelClass = "block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 tracking-widest";
  const isBird = category === AnimalCategory.OWLS || category === AnimalCategory.RAPTORS;
  
  return (
    <div className="fixed inset-0 bg-slate-900/0 flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-start shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">{initialData ? 'Edit' : 'Add'} Animal Record</h2>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">ZLA 1981 SECTION 9 STATUTORY REGISTRY</p>
                </div>
                <button type="button" onClick={onClose} className="text-slate-300 hover:text-slate-900"><X size={32} /></button>
            </div>
            
            <form ref={formRef} action={formAction} className="flex-1 overflow-y-auto p-8 space-y-12 bg-white">
                <input type="hidden" name="image_url" value={imageUrl} />
                <input type="hidden" name="distribution_map_url" value={distroUrl} />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    <div className="lg:col-span-4 grid grid-cols-2 gap-4 h-fit">
                        <section><h3 className="text-[9px] font-black text-slate-400 uppercase mb-3">PROFILE PHOTO</h3><div className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200"><img src={imageUrl} alt="Subject" className="w-full h-full object-cover"/><label className="absolute inset-0 bg-black/5 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer"><div className="bg-white/90 p-3 rounded-full shadow-lg"><Camera size={20} /></div><input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'image_url')} className="hidden" /></label></div></section>
                        <section className="bg-[#f9fbff] rounded-2xl p-4 border border-[#e8f0fe] flex flex-col"><h3 className="text-[9px] font-black text-slate-400 uppercase mb-3 flex items-center gap-1.5"><Globe size={12}/> RANGE MAP</h3><div className="relative group flex-1 rounded-lg overflow-hidden border border-[#d0e1fd] bg-white"><img src={distroUrl} alt="Range Map" className="w-full h-full object-cover"/><label className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 cursor-pointer flex items-center justify-center"><span className="bg-white text-slate-900 px-2 py-1 rounded text-[8px] font-black uppercase shadow-lg">Upload</span><input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'distribution_map_url')} className="hidden" /></label></div></section>
                    </div>

                    <div className="lg:col-span-8 space-y-12">
                        <section className="space-y-6">
                            <h3 className="text-[11px] font-black text-[#10b981] uppercase tracking-[0.2em] flex items-center gap-2 pb-3 border-b border-[#f0fdf4]"><Info size={16}/> IDENTIFICATION & TAXONOMY</h3>
                            
                            <div className="grid md:grid-cols-12 gap-6">
                                <div className="md:col-span-5"><label className={labelClass}>SUBJECT NAME * <input name="name" required defaultValue={initialData?.name} className={inputClass} /></label></div>
                                <div className="md:col-span-4"><label className={labelClass}>SECTION * <select name="category" value={category || AnimalCategory.OWLS} onChange={(e) => setCategory(e.target.value as AnimalCategory)} className={inputClass}>
                                  {(Object.values(AnimalCategory) as string[]).map(cat => <option key={String(cat)}>{cat}</option>)}
                                </select></label></div>
                                <div className="md:col-span-3"><label className={labelClass}>LOCATION * <input name="location" list="location-list" required defaultValue={initialData?.location} className={inputClass} /></label><datalist id="location-list">
                                    {(locations as string[]).map(loc => <option key={String(loc)} value={loc} />)}
                                  </datalist></div>
                            </div>

                            {category === AnimalCategory.MAMMALS && (
                                <div className="md:col-span-12 bg-amber-50 p-3 rounded-xl border border-amber-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                    <div className="p-2 bg-white rounded-lg border border-amber-100 text-amber-600 shadow-sm"><Users size={16}/></div>
                                    <label className="flex items-center gap-3 cursor-pointer flex-1 group">
                                        <input type="checkbox" name="is_group_animal" defaultChecked={initialData?.is_group_animal} className="w-5 h-5 accent-amber-600 rounded focus:ring-amber-500 transition-all"/>
                                        <div>
                                            <span className="text-[10px] font-black text-amber-900 uppercase tracking-widest block group-hover:text-amber-700 transition-colors">Group / Mob Designation</span>
                                            <span className="text-[9px] font-bold text-amber-700/60 block">Classify this record as a collective group (e.g. Meerkat Mob)</span>
                                        </div>
                                    </label>
                                </div>
                            )}

                            <div className="grid md:grid-cols-12 gap-6"><div className="md:col-span-7"><label className={labelClass}>COMMON SPECIES *</label><div className="flex gap-2"><input name="species" required defaultValue={initialData?.species} className={inputClass} /><button type="button" onClick={handleAutoFill} disabled={isAiPending} className="px-4 bg-[#0f172a] text-white rounded-lg hover:bg-black disabled:opacity-50">{isAiPending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={18} />}</button></div></div><div className="md:col-span-5"><label className={labelClass}>SCIENTIFIC NAME <input name="latin_name" value={latinName} onChange={e => setLatinName(e.target.value)} className={`${inputClass} italic`} /></label></div></div><div className="grid md:grid-cols-12 gap-6"><div className="md:col-span-4"><label className={labelClass}>SEX <select name="sex" defaultValue={initialData?.sex} className={inputClass}><option>Male</option><option>Female</option><option>Unknown</option></select></label></div><div className="md:col-span-4"><div className="flex justify-between items-center mb-1.5 px-1"><label className="text-10px font-black text-slate-400 uppercase">DATE OF BIRTH</label><div className="flex items-center gap-2"><input type="checkbox" name="is_dob_unknown" defaultChecked={initialData?.is_dob_unknown}/><span className="text-[9px] font-black text-slate-400 uppercase">UNKNOWN</span></div></div><input type="date" name="dob" defaultValue={initialData?.dob ? new Date(initialData.dob).toISOString().split('T')[0] : ''} className={inputClass} /></div><div className="md:col-span-4"><label className={labelClass}>IUCN STATUS <select name="red_list_status" value={redList || ConservationStatus.LC} onChange={e => setRedList(e.target.value as ConservationStatus)} className={inputClass}>
                           {(Object.values(ConservationStatus) as string[]).map(s => <option key={String(s)}>{s}</option>)}
                         </select></label></div></div>
                        </section>

                        <section className="bg-slate-50/50 rounded-2xl p-6 border-2 border-slate-100">
                            <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2 mb-6">
                                <History size={16} /> Statutory Acquisition & Pedigree
                            </h3>
                            
                            <div className="grid md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className={labelClass}>Date of Arrival *</label>
                                    <input type="date" name="acquisition_date" required defaultValue={initialData?.acquisition_date ? new Date(initialData.acquisition_date).toISOString().split('T')[0] : ''} className={inputClass} />
                                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-1.5">Date acquired by Kent Owl Academy</p>
                                </div>
                                <div>
                                    <label className={labelClass}>Source / Origin *</label>
                                    <input name="origin" required defaultValue={initialData?.origin} className={inputClass} placeholder="e.g. International Centre for Birds of Prey" />
                                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-1.5">Mandatory for movement audit trail</p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelClass}>Sire (Father)</label>
                                    <div className="relative">
                                        <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input name="sire_id" defaultValue={initialData?.sire_id} className={`${inputClass} pl-9`} placeholder="Ancestry ID or Name" />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Dam (Mother)</label>
                                    <div className="relative">
                                        <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input name="dam_id" defaultValue={initialData?.dam_id} className={`${inputClass} pl-9`} placeholder="Ancestry ID or Name" />
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-6"><h3 className="text-[11px] font-black text-[#f59e0b] uppercase tracking-[0.2em] flex items-center gap-2 pb-3 border-b border-[#fffbeb]"><Zap size={16}/> MARKERS & BIOMETRICS</h3><div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"><div className="lg:col-span-2"><div className="flex justify-between items-center mb-1.5 px-1"><label className="text-[10px] font-black text-slate-400 uppercase">IDENTIFICATION</label><div className="flex items-center gap-2"><input type="checkbox" name="has_no_id" defaultChecked={initialData?.has_no_id}/><span className="text-[9px] font-black text-slate-400 uppercase">NO ID</span></div></div><div className={`grid ${isBird ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}><input name="microchip_id" defaultValue={initialData?.microchip_id} className={`${inputClass} font-mono`} placeholder="Microchip..." />{isBird && <input name="ring_number" defaultValue={initialData?.ring_number} className={`${inputClass} font-mono`} placeholder="Ring..." />}</div></div><div><label className={labelClass}>HAZARD CLASS <select name="hazard_rating" value={hazardRating || HazardRating.NONE} onChange={e => setHazardRating(e.target.value as HazardRating)} className={inputClass}>
                           {(Object.values(HazardRating) as string[]).map(h => <option key={String(h)}>{h}</option>)}
                         </select></label></div><div className="flex flex-col justify-end pb-1.5"><label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2 rounded-lg border border-slate-100 hover:border-emerald-200 transition-all"><input type="checkbox" name="is_venomous" checked={isVenomous} onChange={e => setIsVenomous(e.target.checked)}/> <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1.5"><Skull size={10}/> VENOMOUS</span></label></div></div></section>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-8 pt-12 border-t border-slate-100 pb-4">
                    <div className="flex items-center gap-4 text-slate-400"><Shield size={24}/><p className="text-[10px] font-bold uppercase max-w-sm">I VERIFY THIS RECORD IS AN ACCURATE ENTRY INTO THE STATUTORY STOCK LEDGER.</p></div>
                    <div className="flex gap-4 w-full sm:w-auto">
                        <button type="button" onClick={onClose} className="flex-1 sm:flex-none px-8 py-4 bg-white text-slate-500 border border-slate-200 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50">Discard</button>
                        <button type="submit" disabled={isPending} className="flex-1 sm:flex-none px-12 py-4 bg-[#10b981] hover:bg-[#059669] text-white rounded-xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 disabled:opacity-50">
                            {isPending ? <Loader2 size={20} className="animate-spin"/> : <Check size={20} />}
                            {isPending ? 'Authorizing...' : 'Authorize'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>
  );
};

export default AnimalFormModal;
