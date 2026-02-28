
import React, { useState } from 'react';
import { ScheduleEntry, Period, Subject } from '../types';
import { Edit2, X, Plus, Trash2, Check, Download } from 'lucide-react';
import { generateSchedulePDF } from '../utils/pdfGenerator';

interface ScheduleProps {
  schedule: ScheduleEntry[];
  subjects: Subject[];
  onUpdate: (entry: ScheduleEntry) => void;
  onAdd: (entry: ScheduleEntry) => void;
  onDelete: (id: string) => void;
  onUpdateSubjectColor: (subjectId: string, color: string) => void;
}

const COLOR_OPTIONS = [
  { name: 'blue', class: 'bg-blue-500' },
  { name: 'indigo', class: 'bg-indigo-500' },
  { name: 'emerald', class: 'bg-emerald-500' },
  { name: 'amber', class: 'bg-amber-500' },
  { name: 'rose', class: 'bg-rose-500' },
  { name: 'slate', class: 'bg-slate-500' },
  { name: 'purple', class: 'bg-purple-500' },
  { name: 'cyan', class: 'bg-cyan-500' },
  { name: 'teal', class: 'bg-teal-500' },
  { name: 'orange', class: 'bg-orange-500' },
  { name: 'lime', class: 'bg-lime-500' },
  { name: 'pink', class: 'bg-pink-500' },
  { name: 'fuchsia', class: 'bg-fuchsia-500' },
  { name: 'sky', class: 'bg-sky-500' },
  { name: 'violet', class: 'bg-violet-500' },
];

export const Schedule: React.FC<ScheduleProps> = ({ schedule, subjects, onUpdate, onAdd, onDelete, onUpdateSubjectColor }) => {
  const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
  const periods: Period[] = ['Manhã', 'Tarde', 'Noite'];

  const [editingCell, setEditingCell] = useState<{ day: string, period: Period } | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<ScheduleEntry>>({});

  const handleEditClick = (day: string, period: Period, entry?: ScheduleEntry) => {
    setEditingCell({ day, period });
    setEditFormData(entry || { id: Math.random().toString(36).substr(2, 9), day, period, subjectId: subjects[0].id, front: '' });
  };

  const handleSave = () => {
    if (editingCell && editFormData.id) {
      const existing = schedule.find(e => e.id === editFormData.id);
      if (existing) {
        onUpdate(editFormData as ScheduleEntry);
      } else {
        onAdd(editFormData as ScheduleEntry);
      }
      setEditingCell(null);
    }
  };

  const getEntries = (day: string, period: Period) => {
    return schedule.filter(s => s.day === day && s.period === period);
  };

  const getSubjectColorStyles = (id: string) => {
    const s = subjects.find(sub => sub.id === id);
    if (!s) return 'bg-slate-100 text-slate-600 border-slate-200';

    const colors: Record<string, string> = {
      blue: 'bg-blue-50 border-blue-200 text-blue-700',
      indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
      emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      amber: 'bg-amber-50 border-amber-200 text-amber-700',
      rose: 'bg-rose-50 border-rose-200 text-rose-700',
      slate: 'bg-slate-50 border-slate-200 text-slate-700',
      purple: 'bg-purple-50 border-purple-200 text-purple-700',
      cyan: 'bg-cyan-50 border-cyan-200 text-cyan-700',
      teal: 'bg-teal-50 border-teal-200 text-teal-700',
      orange: 'bg-orange-50 border-orange-200 text-orange-700',
      lime: 'bg-lime-50 border-lime-200 text-lime-700',
      pink: 'bg-pink-50 border-pink-200 text-pink-700',
      fuchsia: 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700',
      sky: 'bg-sky-50 border-sky-200 text-sky-700',
      violet: 'bg-violet-50 border-violet-200 text-violet-700',
    };
    return colors[s.color] || 'bg-slate-50 border-slate-200 text-slate-700';
  };

  const currentSubject = subjects.find(s => s.id === editFormData.subjectId);

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden relative">
      {editingCell && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-3xl border shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Editar {editingCell.day} - {editingCell.period}</h3>
              <button onClick={() => setEditingCell(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Disciplina</label>
                <select
                  className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  value={editFormData.subjectId}
                  onChange={(e) => setEditFormData({ ...editFormData, subjectId: e.target.value })}
                >
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {currentSubject && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Identidade Visual (Cor)</label>
                  <div className="flex items-center gap-3">
                    {COLOR_OPTIONS.map(color => (
                      <button
                        key={color.name}
                        onClick={() => onUpdateSubjectColor(currentSubject.id, color.name)}
                        className={`w-10 h-10 rounded-full ${color.class} transition-all flex items-center justify-center ${currentSubject.color === color.name ? 'ring-4 ring-offset-2 ring-blue-500 scale-110 shadow-lg' : 'opacity-60 hover:opacity-100'
                          }`}
                      >
                        {currentSubject.color === color.name && <Check size={18} className="text-white" />}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 italic">Isso alterará a cor da disciplina em todo o sistema.</p>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Frente / Subtópico</label>
                <input
                  type="text"
                  placeholder="Ex: Ortopedia, Neuro..."
                  className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  value={editFormData.front || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, front: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSave}
                  className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                >
                  Confirmar
                </button>
                {editFormData.id && (
                  <button
                    onClick={() => { onDelete(editFormData.id!); setEditingCell(null); }}
                    className="p-4 text-rose-500 bg-rose-50 rounded-2xl hover:bg-rose-100 transition-all"
                    title="Excluir"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center p-6 bg-slate-50/50">
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest">Matriz Semanal</h2>
        <button
          onClick={() => generateSchedulePDF(schedule, subjects)}
          className="flex items-center gap-2 bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-600 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95"
        >
          <Download size={16} />
          Exportar PDF
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-6 border-b border-slate-100">
            <div className="p-4 bg-slate-50/50 border-r border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center">Hora</div>
            {days.map(day => (
              <div key={day} className="p-4 bg-slate-50/50 border-r border-slate-100 text-[11px] font-black text-slate-900 text-center uppercase tracking-widest">
                {day}
              </div>
            ))}
          </div>

          {periods.map(period => (
            <div key={period} className="grid grid-cols-6 border-b border-slate-100 last:border-0 min-h-[160px]">
              <div className="p-4 border-r border-slate-100 bg-slate-50/30 flex flex-col items-center justify-center gap-1">
                <span className="font-black text-xs uppercase tracking-widest text-slate-900">{period}</span>
              </div>

              {days.map(day => {
                const entries = getEntries(day, period);
                return (
                  <div key={`${day}-${period}`} className="p-3 border-r border-slate-100 last:border-0 flex flex-col gap-2 bg-slate-50/10 group relative">
                    <div className="flex flex-col gap-2 h-full">
                      {entries.map((entry, idx) => {
                        const subject = subjects.find(s => s.id === entry.subjectId);
                        return (
                          <div
                            key={idx}
                            onClick={() => handleEditClick(day, period, entry)}
                            className={`p-3 rounded-xl border ${getSubjectColorStyles(entry.subjectId)} flex flex-col gap-1 shadow-sm cursor-pointer hover:scale-[1.02] hover:shadow-md transition-all relative overflow-hidden group/card min-h-[60px]`}
                          >
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onDelete(entry.id);
                                }}
                                className="p-1.5 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors shadow-sm cursor-pointer z-50 pointer-events-auto"
                                title="Remover"
                              >
                                <Trash2 size={12} strokeWidth={2.5} />
                              </button>
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60">
                              {entry.front || 'Tronco Comum'}
                            </span>
                            <span className="text-xs font-black leading-tight">
                              {subject?.name}
                            </span>
                          </div>
                        );
                      })}

                      <button
                        onClick={() => handleEditClick(day, period)}
                        className={`border-2 border-dashed border-slate-100 rounded-xl flex items-center justify-center text-[10px] text-slate-300 font-black uppercase tracking-widest hover:border-blue-200 hover:text-blue-400 hover:bg-blue-50/30 transition-all group/add ${entries.length === 0 ? 'h-full min-h-[100px]' : 'h-[40px] opacity-0 group-hover:opacity-100'}`}
                      >
                        <Plus size={16} className="mb-0.5 group-hover/add:scale-125 transition-transform" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
