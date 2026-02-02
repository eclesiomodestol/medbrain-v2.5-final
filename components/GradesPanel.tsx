
import React, { useState } from 'react';
import { Subject, Grade } from '../types';
import { Save, Calculator, TrendingUp, Info, GraduationCap, CheckCircle2, AlertCircle } from 'lucide-react';

interface GradesPanelProps {
  subjects: Subject[];
  grades: Grade[];
  onUpdate: (grade: Grade) => void;
}

// Configuração de Pesos para o 7º Semestre (Padrão Acadêmico)
const SPECIAL_SUBJECT_CONFIG: Record<string, { front: string; weight: number }[]> = {
  'cm3': [
    { front: 'Neurologia', weight: 1 },
    { front: 'Hematologia', weight: 1 },
    { front: 'Gastroenterologia', weight: 1 },
    { front: 'Nefrologia', weight: 1 },
    { front: 'Dermatologia', weight: 0.5 }
  ],
  'cc3': [
    { front: 'Ortopedia', weight: 1 },
    { front: 'Otorrinolaringologia', weight: 1 },
    { front: 'Oftalmologia', weight: 1 },
    { front: 'Urologia', weight: 1 }
  ]
};

export const GradesPanel: React.FC<GradesPanelProps> = ({ subjects, grades, onUpdate }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Grade | null>(null);

  const calculateWeightedAverages = (fronts: { weight: number; pr1: number | null; pr2: number | null }[]) => {
    if (!fronts || fronts.length === 0) return { pr1: 0, pr2: 0 };

    const totalWeight = fronts.reduce((acc, f) => acc + f.weight, 0);

    // Note: Treats null as 0, consistent with previous behavior
    const pr1Sum = fronts.reduce((acc, f) => acc + (f.pr1 || 0) * f.weight, 0);
    const pr1Avg = totalWeight > 0 ? pr1Sum / totalWeight : 0;

    const pr2Sum = fronts.reduce((acc, f) => acc + (f.pr2 || 0) * f.weight, 0);
    const pr2Avg = totalWeight > 0 ? pr2Sum / totalWeight : 0;

    return { pr1: pr1Avg, pr2: pr2Avg };
  };

  const calculateFinalAverage = (grade: Grade) => {
    if (SPECIAL_SUBJECT_CONFIG[grade.subjectId]) {
      const { pr1, pr2 } = calculateWeightedAverages(grade.frontGrades || []);
      return (pr1 + pr2) / 2;
    }
    return ((grade.pr1 || 0) + (grade.pr2 || 0)) / 2;
  };

  const startEdit = (subjectId: string) => {
    let existing = grades.find(g => g.subjectId === subjectId);
    if (!existing) {
      existing = {
        id: Math.random().toString(36).substr(2, 9),
        subjectId,
        userId: '',
        pr1: null,
        pr2: null,
        frontGrades: SPECIAL_SUBJECT_CONFIG[subjectId]?.map(f => ({
          frontName: f.front,
          weight: f.weight,
          pr1: null,
          pr2: null
        }))
      };
    }
    setFormData(JSON.parse(JSON.stringify(existing))); // Deep clone
    setEditingId(subjectId);
  };

  const handleSave = () => {
    if (formData) {
      // Recalculate weighted averages before saving to persist correct pr1/pr2 values
      if (SPECIAL_SUBJECT_CONFIG[formData.subjectId]) {
        const { pr1, pr2 } = calculateWeightedAverages(formData.frontGrades || []);
        formData.pr1 = pr1;
        formData.pr2 = pr2;
      }
      onUpdate(formData);
      setEditingId(null);
      setFormData(null);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="bg-[#0F172A] text-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden group">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-2xl">
                <Calculator className="text-white" size={28} />
              </div>
              <h2 className="text-3xl font-black tracking-tight uppercase">Minhas Notas</h2>
            </div>
            <p className="text-slate-400 font-medium max-w-lg">Lançamento de desempenho acadêmico com suporte a médias ponderadas e integração de frentes clínicas.</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/5 border border-white/10 p-6 rounded-[28px] text-center min-w-[140px]">
              <span className="block text-3xl font-black text-blue-500">{grades.length}</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Avaliações</span>
            </div>
            <div className="bg-blue-600 p-6 rounded-[28px] text-center shadow-xl shadow-blue-500/20 min-w-[140px]">
              <span className="block text-3xl font-black text-white">
                {grades.filter(g => calculateFinalAverage(g) >= 7).length}
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">Aprovações</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {subjects.map(subject => {
          const grade = grades.find(g => g.subjectId === subject.id);
          const isSpecial = !!SPECIAL_SUBJECT_CONFIG[subject.id];

          let displayPR1 = grade?.pr1 || 0;
          let displayPR2 = grade?.pr2 || 0;
          let finalAvg = 0;

          if (grade) {
            if (isSpecial) {
              // Determine values dynamically for display
              const { pr1, pr2 } = calculateWeightedAverages(grade.frontGrades || []);
              displayPR1 = pr1;
              displayPR2 = pr2;
              finalAvg = (pr1 + pr2) / 2;
            } else {
              finalAvg = ((grade.pr1 || 0) + (grade.pr2 || 0)) / 2;
            }
          }

          const isEditing = editingId === subject.id;

          return (
            <div key={subject.id} className="bg-white rounded-[40px] border shadow-sm p-8 hover:shadow-xl transition-all group overflow-hidden relative border-l-8 border-l-slate-100" style={{ borderLeftColor: isEditing ? '#3b82f6' : undefined }}>
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 leading-tight uppercase tracking-tight">{subject.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border">
                      {isSpecial ? 'Cálculo Ponderado' : 'Média Aritmética'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-4xl font-black ${finalAvg >= 7 ? 'text-emerald-500' : finalAvg >= 5 ? 'text-amber-500' : 'text-slate-200'}`}>
                    {finalAvg > 0 ? finalAvg.toFixed(2) : '--'}
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Média Final</span>
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  {isSpecial ? (
                    <div className="space-y-3">
                      {formData?.frontGrades?.map((f, idx) => (
                        <div key={f.frontName} className="grid grid-cols-12 gap-4 items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <div className="col-span-6">
                            <span className="text-[10px] font-black uppercase text-slate-500 block mb-1">{f.frontName}</span>
                            <span className="text-[9px] font-bold text-blue-500 uppercase">Peso {f.weight}</span>
                          </div>
                          <div className="col-span-3">
                            <input
                              type="number" step="0.1" placeholder="PR1"
                              className="w-full bg-white border rounded-xl p-2 text-center text-sm font-black outline-none focus:ring-2 focus:ring-blue-500"
                              value={f.pr1 ?? ''}
                              onChange={(e) => {
                                const newFronts = [...(formData.frontGrades || [])];
                                newFronts[idx].pr1 = e.target.value ? parseFloat(e.target.value) : null;
                                setFormData({ ...formData, frontGrades: newFronts });
                              }}
                            />
                          </div>
                          <div className="col-span-3">
                            <input
                              type="number" step="0.1" placeholder="PR2"
                              className="w-full bg-white border rounded-xl p-2 text-center text-sm font-black outline-none focus:ring-2 focus:ring-blue-500"
                              value={f.pr2 ?? ''}
                              onChange={(e) => {
                                const newFronts = [...(formData.frontGrades || [])];
                                newFronts[idx].pr2 = e.target.value ? parseFloat(e.target.value) : null;
                                setFormData({ ...formData, frontGrades: newFronts });
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nota PR1</label>
                        <input
                          type="number" step="0.1"
                          className="w-full bg-slate-50 border border-slate-200 p-5 rounded-3xl text-2xl font-black outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                          value={formData?.pr1 ?? ''}
                          onChange={(e) => setFormData({ ...formData!, pr1: e.target.value ? parseFloat(e.target.value) : null })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nota PR2</label>
                        <input
                          type="number" step="0.1"
                          className="w-full bg-slate-50 border border-slate-200 p-5 rounded-3xl text-2xl font-black outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                          value={formData?.pr2 ?? ''}
                          onChange={(e) => setFormData({ ...formData!, pr2: e.target.value ? parseFloat(e.target.value) : null })}
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button onClick={handleSave} className="flex-1 bg-[#0F172A] text-white py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
                      <Save size={18} /> Confirmar Lançamento
                    </button>
                    <button onClick={() => setEditingId(null)} className="px-6 bg-slate-100 text-slate-400 rounded-3xl hover:bg-rose-50 hover:text-rose-500 transition-all">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex gap-4">
                    <div className="flex-1 bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">PR1</span>
                      <span className="text-2xl font-black text-slate-900">{displayPR1 > 0 ? displayPR1.toFixed(1) : '--'}</span>
                    </div>
                    <div className="flex-1 bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">PR2</span>
                      <span className="text-2xl font-black text-slate-900">{displayPR2 > 0 ? displayPR2.toFixed(1) : '--'}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div className="flex items-center gap-2">
                        <GraduationCap size={16} className="text-slate-300" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Provisório</span>
                      </div>
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${finalAvg >= 7 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : finalAvg >= 5 ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                        {finalAvg >= 7 ? 'Aprovado' : finalAvg >= 5 ? 'Recuperação' : 'Insuficiente'}
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5">
                      <div
                        className={`h-full transition-all duration-1000 rounded-full ${finalAvg >= 7 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : finalAvg >= 5 ? 'bg-amber-500' : 'bg-slate-300'}`}
                        style={{ width: `${Math.min((finalAvg / 10) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <button
                    onClick={() => startEdit(subject.id)}
                    className="w-full py-5 border-2 border-slate-100 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-blue-600 hover:border-blue-600 hover:bg-blue-50 transition-all active:scale-95 flex items-center justify-center gap-3"
                  >
                    <TrendingUp size={16} /> Lançar Avaliações
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50/50 p-10 rounded-[40px] border border-blue-100 flex flex-col md:flex-row items-center gap-6">
        <div className="p-5 bg-white rounded-3xl shadow-sm border border-blue-100 text-blue-600">
          <Info size={32} />
        </div>
        <div className="space-y-2 text-center md:text-left">
          <h4 className="text-base font-black text-blue-900 uppercase tracking-tight">Regras de Cálculo Acadêmico</h4>
          <p className="text-xs text-blue-700 font-medium leading-relaxed max-w-2xl">
            A média final do semestre é calculada pela média aritmética entre PR1 e PR2. Para Clínica Médica (CM3) e Clínica Cirúrgica (CC3), as notas de PR1 e PR2 são resultados da média ponderada das frentes clínicas (Sum(Nota x Peso) / Sum(Pesos)).
          </p>
        </div>
      </div>
    </div>
  );
};
