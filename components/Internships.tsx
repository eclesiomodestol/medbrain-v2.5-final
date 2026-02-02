
import React, { useState, useRef, useMemo } from 'react';
import { Internship } from '../types';
import { MapPin, Calendar, Clock, ChevronRight, Plus, X, Trash2, Bold, Italic, Underline, Building2, Map as MapIcon, Type, Check, Navigation, AlertCircle } from 'lucide-react';

interface InternshipsProps {
  internships: Internship[];
  onAdd: (internship: Internship) => void;
  onUpdate: (internship: Internship) => void;
  onDelete: (id: string) => void;
}

const RichTextEditor = ({ value, onChange, label }: { value: string, onChange: (html: string) => void, label: string }) => {
  const editorRef = useRef<HTMLDivElement>(null);

  const execCommand = (command: string) => {
    document.execCommand(command, false);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
      <div className="border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 transition-all bg-white">
        <div className="flex items-center gap-1 p-2 bg-slate-50 border-b border-slate-200">
          <button onClick={() => execCommand('bold')} className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-600" title="Negrito"><Bold size={16} /></button>
          <button onClick={() => execCommand('italic')} className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-600" title="Itálico"><Italic size={16} /></button>
          <button onClick={() => execCommand('underline')} className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-600" title="Sublinhado"><Underline size={16} /></button>
        </div>
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          dangerouslySetInnerHTML={{ __html: value }}
          className="p-4 min-h-[150px] outline-none text-sm text-slate-700 leading-relaxed"
        />
      </div>
    </div>
  );
};


export const Internships: React.FC<InternshipsProps> = ({ internships, onAdd, onUpdate, onDelete }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [local, setLocal] = useState('');
  const [location, setLocation] = useState(''); // Address
  const [evolutionModel, setEvolutionModel] = useState('');
  const [schedule, setSchedule] = useState<{ date: string; hour: string; status: 'present' | 'absent' | 'pending' }[]>([]);

  // Temp inputs for adding a date
  const [tempDate, setTempDate] = useState('');
  const [tempHour, setTempHour] = useState('');

  const resetForm = () => {
    setTitle('');
    setLocal('');
    setLocation('');
    setEvolutionModel('');
    setSchedule([]);
    setTempDate('');
    setTempHour('');
    setEditingId(null);
    setIsAdding(false);
  };

  const handleEdit = (internship: Internship) => {
    setTitle(internship.title);
    setLocal(internship.local);
    setLocation(internship.location || '');
    setEvolutionModel(internship.evolutionModel || '');

    // Parse schedule
    let parsedSchedule: typeof schedule = [];

    // Check Date column for JSON
    const dateRaw = (internship as any).date;

    if (internship.schedule && Array.isArray(internship.schedule)) {
      parsedSchedule = internship.schedule;
    } else if (dateRaw) {
      try {
        const parsed = JSON.parse(dateRaw);
        if (Array.isArray(parsed)) parsedSchedule = parsed;
        else throw new Error("Not array");
      } catch {
        if (dateRaw.includes('-') || dateRaw.includes('/')) {
          parsedSchedule = [{ date: dateRaw, hour: (internship as any).hour || '', status: 'pending' }];
        }
      }
    }
    setSchedule(parsedSchedule);

    setEditingId(internship.id);
    setIsAdding(true);
  };

  const handleAddDate = () => {
    if (tempDate && tempHour) {
      setSchedule([...schedule, { date: tempDate, hour: tempHour, status: 'pending' }]);
      setTempDate('');
    }
  };

  const handleRemoveDate = (index: number) => {
    setSchedule(schedule.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!title) {
      alert('Nome do estágio é obrigatório');
      return;
    }

    // Prepare schedule for storage (ensure it's valid)
    // If Supabase expects string for this column (since we are hijacking 'date' or using a new json col), handle it.
    // In types.ts we defined `schedule` as `InternshipDate[] | string`.

    const payload: Internship = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      title,
      local,
      location,
      evolutionModel,
      schedule: schedule,
      status: 'Em Andamento',
      // Legacy fields fill for compatibility
      // date: schedule[0]?.date || '',
      // hour: schedule[0]?.hour || ''
    } as any;

    if (editingId) {
      onUpdate(payload);
    } else {
      onAdd(payload);
    }
    resetForm();
  };

  // Helper Stats and Next Date
  // We need to calc this "globally" for the header block too, or just per item?
  // User asked for "O Sistema deverá dizer também Proxima data".
  // Let's find the absolute next date across ALL internships.
  const allFutureDates = internships.flatMap(i => {
    let sched: typeof schedule = [];

    // Unpack logic (duplicate of render loop, ideally refactor to helper)
    if (i.evolutionModel && i.evolutionModel.startsWith('{"p":true')) {
      try {
        const packed = JSON.parse(i.evolutionModel);
        if (packed.s) sched = packed.s;
      } catch { }
    } else if (i.schedule && Array.isArray(i.schedule)) {
      sched = i.schedule;
    } else {
      const dateRaw = (i as any).date;
      if (dateRaw && (dateRaw.includes('-') || dateRaw.includes('/'))) {
        sched = [{ date: dateRaw, hour: (i as any).hour || '', status: 'pending' }];
      }
    }

    return sched.map(s => ({
      ...s,
      title: i.title,
      local: i.local,
      location: i.location,
      dateObj: new Date(`${s.date}T${s.hour}`)
    }));
  }).filter(s => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return s.dateObj >= now;
  }).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  const nextInternship = allFutureDates[0]; // The very next one

  const calculateStats = (sched: typeof schedule) => {
    const total = sched.length;
    if (total === 0) return { percent: 0, next: null };

    const present = sched.filter(s => s.status === 'present').length;
    const percent = Math.round((present / total) * 100);

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const upcoming = sched
      .map(s => ({ ...s, dateObj: new Date(`${s.date}T${s.hour}`) }))
      .filter(s => s.dateObj >= now)
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    return { percent, next: upcoming[0] || null };
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">

      <div className="flex flex-col md:flex-row items-start justify-between gap-6">
        {/* Title removed per user request, but we keep the row for the Next Activity or Button if needed */}

        {nextInternship && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-500/20 w-full md:w-auto relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-700" />

            <div className="flex items-center gap-4 relative z-10">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                <Clock className="animate-pulse" size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Próxima Atividade</p>
                <h3 className="text-xl font-bold leading-none mb-1">{nextInternship.title}</h3>
                <p className="text-sm font-medium opacity-90">
                  {nextInternship.dateObj.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })} • {nextInternship.hour}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {!isAdding && (
        <div className="flex justify-end">
          <button
            onClick={() => { resetForm(); setIsAdding(true); }}
            className="bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center gap-2 shadow-lg hover:-translate-y-1 transition-all"
          >
            <Plus size={18} /> Novo Estágio
          </button>
        </div>
      )}

      {isAdding && (
        <div className="bg-white rounded-[32px] p-8 shadow-2xl border border-slate-100 mb-8 relative overflow-hidden animate-in slide-in-from-top-5">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-emerald-500" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Nome do Estágio</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ex: Otorrinolaringologia"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:font-normal"
                />
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Local (Nome)</label>
                <input
                  value={local}
                  onChange={e => setLocal(e.target.value)}
                  placeholder="Ex: Hospital das Clínicas"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:font-normal"
                />
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Endereço Completo (Para GPS)</label>
                <div className="flex gap-2">
                  <input
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="Ex: Rua Dr. Ovídio Pires, 123"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  />
                  {location && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-emerald-100 text-emerald-700 p-4 rounded-xl flex items-center justify-center hover:bg-emerald-200 transition-colors"
                      title="Testar Link"
                    >
                      <MapIcon size={20} />
                    </a>
                  )}
                </div>
              </div>
              <RichTextEditor
                label="Modelo de Evolução"
                value={evolutionModel}
                onChange={setEvolutionModel}
              />
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 h-fit">
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Calendar size={16} className="text-blue-500" /> Datas e Horários
              </h3>

              <div className="flex gap-2 mb-4">
                <input
                  type="date"
                  value={tempDate}
                  onChange={e => setTempDate(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <input
                  type="time"
                  value={tempHour}
                  onChange={e => setTempHour(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  onClick={handleAddDate}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {schedule.length === 0 && (
                  <p className="text-center text-slate-400 text-sm py-4 italic">Nenhuma data adicionada</p>
                )}
                {schedule.map((s, i) => (
                  <div key={i} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-sm">
                    <div className="flex items-center gap-3">
                      <div className={`
                                w-2 h-8 rounded-full 
                                ${s.status === 'present' ? 'bg-emerald-500' : s.status === 'absent' ? 'bg-rose-500' : 'bg-slate-300'}
                             `} />
                      <div>
                        <p className="font-bold text-slate-700">{new Date(s.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                        <p className="text-xs text-slate-400">{s.hour}</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => handleRemoveDate(i)} className="text-rose-400 hover:text-rose-600 p-2"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-50">
            <button onClick={resetForm} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors text-xs uppercase">Cancelar</button>
            <button
              onClick={handleSave}
              className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all text-xs uppercase tracking-widest"
            >
              {editingId ? 'Salvar Alterações' : 'Criar Estágio'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {internships.map(internship => {
          // Unpack Data Strategy
          let sched: typeof schedule = [];
          let loc = internship.location || '';
          let evo = internship.evolutionModel || '';

          // Check if evolutionModel holds packed data
          if (internship.evolutionModel && internship.evolutionModel.startsWith('{"p":true')) {
            try {
              const packed = JSON.parse(internship.evolutionModel);
              if (packed.s) sched = packed.s;
              if (packed.l) loc = packed.l;
              if (packed.em) evo = packed.em;
            } catch { }
          } else {
            // Fallback / standard
            if (internship.schedule && Array.isArray(internship.schedule)) {
              sched = internship.schedule;
            } else {
              // Try parsing date column as legacy fallback
              const dateRaw = (internship as any).date;
              if (dateRaw && (dateRaw.includes('-') || dateRaw.includes('/'))) {
                // Simple date check
                sched = [{ date: dateRaw, hour: (internship as any).hour || '', status: 'pending' }];
              }
            }
          }

          // Hydrate object for display
          const displayInternship = { ...internship, schedule: sched, location: loc, evolutionModel: evo };

          const { percent, next } = calculateStats(sched);

          const updateStatus = (index: number, newStatus: 'present' | 'absent' | 'pending') => {
            const newSched = [...sched];
            newSched[index] = { ...newSched[index], status: newStatus };

            // We must update the source internship with new schedule, so App.tsx can repack it
            // IMPORTANT: We need to pass the FULL structure so App.tsx packing works
            const updated: Internship = {
              ...internship,
              schedule: newSched,
              location: loc,
              evolutionModel: evo
            };
            onUpdate(updated);
          };

          return (
            <div key={internship.id} className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 hover:border-slate-300 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <button onClick={() => handleEdit(displayInternship)} className="p-2 bg-slate-100 hover:bg-white text-slate-600 rounded-lg shadow-sm"><Type size={16} /></button>
                <button onClick={() => onDelete(internship.id)} className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg shadow-sm"><Trash2 size={16} /></button>
              </div>

              <div className="mb-6">
                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 ${percent >= 75 ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                  {percent}% Presença
                </span>
                <h3 className="text-xl font-black text-slate-800 leading-tight mb-1">{displayInternship.title}</h3>
                <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                  <Building2 size={14} /> {displayInternship.local}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-slate-100 rounded-full mb-6 overflow-hidden">
                <div className={`h-full transition-all duration-1000 ease-out ${percent >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${percent}%` }} />
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 mb-4">
                {next ? (
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-white rounded-xl shadow-sm text-center min-w-[60px]">
                      <span className="block text-[10px] uppercase font-black text-slate-400">
                        {next.dateObj.toLocaleDateString('pt-BR', { month: 'short' })}
                      </span>
                      <span className="block text-xl font-black text-slate-800">
                        {next.dateObj.getDate()}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Próximo Plantão</p>
                      <p className="text-sm font-bold text-slate-600 capitalize">
                        {next.dateObj.toLocaleDateString('pt-BR', { weekday: 'long' })} • {next.hour}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-400 text-sm p-2 justify-center italic">
                    <Check size={16} /> Sem datas futuras
                  </div>
                )}
              </div>

              {loc && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors mb-6 pb-4 border-b border-dashed border-slate-200"
                  title="Ver no Google Maps"
                >
                  <MapIcon size={14} /> {loc}
                </a>
              )}

              <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                {sched.map((s, idx) => (

                  <div key={idx} className="flex items-center justify-between text-xs group/date">
                    <span className={`font-medium ${s.status === 'present' ? 'text-emerald-600' : s.status === 'absent' ? 'text-rose-600 decoration-line-through' : 'text-slate-600'}`}>
                      {new Date(s.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} • {s.hour}
                    </span>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 group-hover/date:opacity-100 transition-opacity">
                      <button
                        onClick={() => updateStatus(idx, 'present')}
                        title="Presente"
                        className={`p-1 rounded-md transition-all ${s.status === 'present' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-emerald-400 hover:bg-emerald-100'}`}
                      >
                        <Check size={12} strokeWidth={3} />
                      </button>

                      <button
                        onClick={() => updateStatus(idx, 'absent')}
                        title="Faltou"
                        className={`p-1 rounded-md transition-all ${s.status === 'absent' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-rose-400 hover:bg-rose-100'}`}
                      >
                        <X size={12} strokeWidth={3} />
                      </button>
                      <button
                        onClick={() => {
                          const newSched = sched.filter((_, i) => i !== idx);
                          const updated = { ...internship, schedule: newSched, location: loc, evolutionModel: evo };
                          onUpdate(updated);
                        }}
                        title="Remover Data"
                        className="p-1 rounded-md transition-all bg-slate-100 text-slate-400 hover:bg-rose-100 hover:text-rose-500"
                      >
                        <Trash2 size={12} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
        }
      </div>
    </div >
  );
};
