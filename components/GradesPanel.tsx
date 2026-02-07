
import React, { useState } from 'react';
import { Subject, Grade } from '../types';
import { Save, Calculator, TrendingUp, Info, GraduationCap, CheckCircle2, AlertCircle } from 'lucide-react';

interface GradesPanelProps {
  subjects: Subject[];
  grades: Grade[];
  onUpdate: (grade: Grade) => void;
}

// Configuração de Componentes por Disciplina
const SPECIAL_SUBJECT_CONFIG: Record<string, {
  components: { name: string; maxPR1: number; maxPR2: number }[];
  bonusPR1?: { name: string; max: number };
  bonusPR2?: { name: string; max: number };
}> = {
  'cm3': {
    components: [
      { name: 'Hematologia', maxPR1: 3.0, maxPR2: 3.17 },
      { name: 'Neurologia', maxPR1: 3.0, maxPR2: 3.17 },
      { name: 'Dermatologia', maxPR1: 3.0, maxPR2: 3.16 }
    ],
    bonusPR1: { name: 'Teste de Progresso', max: 1.0 },
    bonusPR2: { name: 'Projeto Integrador', max: 0.5 }
  },
  'cc3': {
    components: [
      { name: 'Otorrino', maxPR1: 3.0, maxPR2: 3.17 },
      { name: 'Ortopedia', maxPR1: 3.0, maxPR2: 3.17 },
      { name: 'Oftalmologia', maxPR1: 3.0, maxPR2: 3.16 }
    ],
    bonusPR1: { name: 'Teste de Progresso', max: 1.0 },
    bonusPR2: { name: 'Projeto Integrador', max: 0.5 }
  }
};

export const GradesPanel: React.FC<GradesPanelProps> = ({ subjects, grades, onUpdate }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Grade | null>(null);

  // Novo sistema de cálculo baseado em componentes
  const calculateComponentGrades = (grade: Grade) => {
    const config = SPECIAL_SUBJECT_CONFIG[grade.subjectId];
    if (!config) {
      // Disciplinas simples: PR1 (9.0) + Teste Progresso (1.0) e PR2 (10.0)
      return {
        pr1: (grade.pr1 || 0) + (grade.sub || 0), // PR1 + Teste de Progresso
        pr2: (grade.pr2 || 0)
      };
    }

    // Disciplinas com componentes (CM3, CC3)
    const fronts = grade.frontGrades || [];

    // Calcular média dos componentes principais
    const pr1Components = fronts.slice(0, config.components.length);
    const pr1Sum = pr1Components.reduce((acc, f) => acc + (f.pr1 || 0), 0);
    const pr1Avg = pr1Components.length > 0 ? pr1Sum / pr1Components.length : 0;

    const pr2Components = fronts.slice(0, config.components.length);
    const pr2Sum = pr2Components.reduce((acc, f) => acc + (f.pr2 || 0), 0);
    const pr2Avg = pr2Components.length > 0 ? pr2Sum / pr2Components.length : 0;

    // Adicionar campos de bônus
    const bonusPR1 = fronts[config.components.length]?.pr1 || 0;
    const bonusPR2 = fronts[config.components.length]?.pr2 || 0;

    return {
      pr1: pr1Avg + bonusPR1,
      pr2: pr2Avg + bonusPR2
    };
  };

  const calculateFinalAverage = (grade: Grade) => {
    const { pr1, pr2 } = calculateComponentGrades(grade);
    return (pr1 + pr2) / 2;
  };

  const startEdit = (subjectId: string) => {
    let existing = grades.find(g => g.subjectId === subjectId);
    const config = SPECIAL_SUBJECT_CONFIG[subjectId];

    if (!existing) {
      const frontGrades = config ? [
        ...config.components.map(c => ({
          frontName: c.name,
          weight: 1,
          pr1: null,
          pr2: null
        })),
        // Adicionar campo de bônus PR1
        ...(config.bonusPR1 ? [{
          frontName: config.bonusPR1.name,
          weight: 0,
          pr1: null,
          pr2: null
        }] : [])
      ] : undefined;

      existing = {
        id: Math.random().toString(36).substr(2, 9),
        subjectId,
        userId: '',
        pr1: null,
        pr2: null,
        frontGrades
      };
    }
    setFormData(JSON.parse(JSON.stringify(existing))); // Deep clone
    setEditingId(subjectId);
  };

  const handleSave = () => {
    if (formData) {
      // Recalcular notas antes de salvar
      const { pr1, pr2 } = calculateComponentGrades(formData);
      formData.pr1 = pr1;
      formData.pr2 = pr2;

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
            const { pr1, pr2 } = calculateComponentGrades(grade);
            displayPR1 = pr1;
            displayPR2 = pr2;
            finalAvg = (pr1 + pr2) / 2;
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
                  {/* Indicador de Progresso para Aprovação */}
                  {(() => {
                    const currentGrades = calculateComponentGrades(formData!);
                    const currentTotal = currentGrades.pr1 + currentGrades.pr2; // Total de pontos (0-20)
                    const neededTotal = 14.0; // Total necessário para aprovação (média 7.0)
                    const neededForApproval = Math.max(0, neededTotal - currentTotal);
                    const progressPercent = Math.min((currentTotal / neededTotal) * 100, 100);
                    const currentAvg = currentTotal / 2;

                    return (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-3xl p-6 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600 rounded-xl">
                              <TrendingUp size={20} className="text-white" />
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-blue-900 uppercase tracking-tight">Progresso para Aprovação</h4>
                              <p className="text-[10px] text-blue-600 font-bold">Média necessária: 7.0</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-3xl font-black ${currentAvg >= 7 ? 'text-emerald-600' : currentAvg >= 5 ? 'text-amber-600' : 'text-slate-400'}`}>
                              {currentAvg > 0 ? currentAvg.toFixed(2) : '0.00'}
                            </div>
                            <span className="text-[9px] font-bold text-blue-600 uppercase">Média Atual</span>
                          </div>
                        </div>

                        {/* Barra de Progresso */}
                        <div className="space-y-2">
                          <div className="w-full h-4 bg-white rounded-full overflow-hidden border-2 border-blue-200">
                            <div
                              className={`h-full transition-all duration-500 ${currentAvg >= 7 ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : currentAvg >= 5 ? 'bg-gradient-to-r from-amber-500 to-amber-600' : 'bg-gradient-to-r from-blue-400 to-blue-500'}`}
                              style={{ width: `${progressPercent}%` }}
                            ></div>
                          </div>

                          {currentAvg < 7 ? (
                            <div className="flex items-center justify-between text-[10px] font-bold">
                              <span className="text-blue-700">
                                {neededForApproval > 0 ? `Faltam ${neededForApproval.toFixed(2)} pontos para aprovação` : 'Aprovado! 🎉'}
                              </span>
                              <span className="text-blue-500">{progressPercent.toFixed(0)}% completo</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-emerald-700 text-[10px] font-black">
                              <CheckCircle2 size={14} />
                              <span>APROVADO! Você atingiu a média necessária! 🎉</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {isSpecial ? (
                    <div className="space-y-4">
                      {/* Componentes Principais */}
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Componentes</h4>
                        {formData?.frontGrades?.slice(0, SPECIAL_SUBJECT_CONFIG[subject.id].components.length).map((f, idx) => {
                          const config = SPECIAL_SUBJECT_CONFIG[subject.id].components[idx];
                          return (
                            <div key={f.frontName} className="grid grid-cols-12 gap-4 items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                              <div className="col-span-6">
                                <span className="text-[10px] font-black uppercase text-slate-500 block mb-1">{f.frontName}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Média = 9.0 (PR1) / 9.5 (PR2)</span>
                              </div>
                              <div className="col-span-3">
                                <input
                                  type="number" step="0.01" placeholder={`Max ${config.maxPR1}`}
                                  max={config.maxPR1}
                                  className="w-full bg-white border rounded-xl p-2 text-center text-sm font-black outline-none focus:ring-2 focus:ring-blue-500"
                                  value={f.pr1 ?? ''}
                                  onChange={(e) => {
                                    const newFronts = [...(formData.frontGrades || [])];
                                    const val = e.target.value ? parseFloat(e.target.value) : null;
                                    newFronts[idx].pr1 = val !== null && val > config.maxPR1 ? config.maxPR1 : val;
                                    setFormData({ ...formData, frontGrades: newFronts });
                                  }}
                                />
                                <span className="text-[8px] text-slate-400 block text-center mt-1">Max: {config.maxPR1}</span>
                              </div>
                              <div className="col-span-3">
                                <input
                                  type="number" step="0.01" placeholder={`Max ${config.maxPR2}`}
                                  max={config.maxPR2}
                                  className="w-full bg-white border rounded-xl p-2 text-center text-sm font-black outline-none focus:ring-2 focus:ring-blue-500"
                                  value={f.pr2 ?? ''}
                                  onChange={(e) => {
                                    const newFronts = [...(formData.frontGrades || [])];
                                    const val = e.target.value ? parseFloat(e.target.value) : null;
                                    newFronts[idx].pr2 = val !== null && val > config.maxPR2 ? config.maxPR2 : val;
                                    setFormData({ ...formData, frontGrades: newFronts });
                                  }}
                                />
                                <span className="text-[8px] text-slate-400 block text-center mt-1">Max: {config.maxPR2}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Campos de Bônus */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Teste de Progresso (PR1) */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                            <span className="bg-emerald-100 px-2 py-0.5 rounded">Bônus PR1</span>
                            {SPECIAL_SUBJECT_CONFIG[subject.id].bonusPR1?.name}
                          </label>
                          <input
                            type="number" step="0.01"
                            max={SPECIAL_SUBJECT_CONFIG[subject.id].bonusPR1?.max}
                            className="w-full bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-xl font-black outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                            value={formData?.frontGrades?.[SPECIAL_SUBJECT_CONFIG[subject.id].components.length]?.pr1 ?? ''}
                            onChange={(e) => {
                              const newFronts = [...(formData.frontGrades || [])];
                              const val = e.target.value ? parseFloat(e.target.value) : null;
                              const max = SPECIAL_SUBJECT_CONFIG[subject.id].bonusPR1?.max || 1.0;
                              newFronts[SPECIAL_SUBJECT_CONFIG[subject.id].components.length].pr1 = val !== null && val > max ? max : val;
                              setFormData({ ...formData, frontGrades: newFronts });
                            }}
                          />
                          <span className="text-[9px] text-emerald-600 font-bold">Máximo: {SPECIAL_SUBJECT_CONFIG[subject.id].bonusPR1?.max}</span>
                        </div>

                        {/* Projeto Integrador (PR2) */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                            <span className="bg-blue-100 px-2 py-0.5 rounded">Bônus PR2</span>
                            {SPECIAL_SUBJECT_CONFIG[subject.id].bonusPR2?.name}
                          </label>
                          <input
                            type="number" step="0.01"
                            max={SPECIAL_SUBJECT_CONFIG[subject.id].bonusPR2?.max}
                            className="w-full bg-blue-50 border border-blue-200 p-4 rounded-2xl text-xl font-black outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                            value={formData?.frontGrades?.[SPECIAL_SUBJECT_CONFIG[subject.id].components.length]?.pr2 ?? ''}
                            onChange={(e) => {
                              const newFronts = [...(formData.frontGrades || [])];
                              const val = e.target.value ? parseFloat(e.target.value) : null;
                              const max = SPECIAL_SUBJECT_CONFIG[subject.id].bonusPR2?.max || 0.5;
                              newFronts[SPECIAL_SUBJECT_CONFIG[subject.id].components.length].pr2 = val !== null && val > max ? max : val;
                              setFormData({ ...formData, frontGrades: newFronts });
                            }}
                          />
                          <span className="text-[9px] text-blue-600 font-bold">Máximo: {SPECIAL_SUBJECT_CONFIG[subject.id].bonusPR2?.max}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* PR1: Nota (9.0) + Teste de Progresso (1.0) */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PR1 (Total: 10.0)</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Nota PR1</label>
                            <input
                              type="number" step="0.01" max={9.0}
                              className="w-full bg-slate-50 border border-slate-200 p-5 rounded-3xl text-2xl font-black outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                              value={formData?.pr1 ?? ''}
                              onChange={(e) => {
                                const val = e.target.value ? parseFloat(e.target.value) : null;
                                setFormData({ ...formData!, pr1: val !== null && val > 9.0 ? 9.0 : val });
                              }}
                            />
                            <span className="text-[9px] text-slate-500 font-bold">Máximo: 9.0</span>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                              <span className="bg-emerald-100 px-2 py-0.5 rounded">Bônus</span>
                              Teste de Progresso
                            </label>
                            <input
                              type="number" step="0.01" max={1.0}
                              className="w-full bg-emerald-50 border border-emerald-200 p-5 rounded-3xl text-2xl font-black outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                              value={formData?.sub ?? ''}
                              onChange={(e) => {
                                const val = e.target.value ? parseFloat(e.target.value) : null;
                                setFormData({ ...formData!, sub: val !== null && val > 1.0 ? 1.0 : val });
                              }}
                            />
                            <span className="text-[9px] text-emerald-600 font-bold">Máximo: 1.0</span>
                          </div>
                        </div>
                      </div>

                      {/* PR2: Nota simples (10.0) */}
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PR2 (Total: 10.0)</h4>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Nota PR2</label>
                          <input
                            type="number" step="0.01" max={10.0}
                            className="w-full bg-slate-50 border border-slate-200 p-5 rounded-3xl text-2xl font-black outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                            value={formData?.pr2 ?? ''}
                            onChange={(e) => {
                              const val = e.target.value ? parseFloat(e.target.value) : null;
                              setFormData({ ...formData!, pr2: val !== null && val > 10.0 ? 10.0 : val });
                            }}
                          />
                          <span className="text-[9px] text-slate-500 font-bold">Máximo: 10.0</span>
                        </div>
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
            <strong>CM3 e CC3:</strong> PR1 = Média(3 componentes) até 9.0 + Teste de Progresso até 1.0. PR2 = Média(3 componentes) até 9.5 + Projeto Integrador até 0.5.
            <strong> Outras disciplinas:</strong> PR1 = Nota até 9.0 + Teste de Progresso até 1.0. PR2 = Nota até 10.0.
            <strong>Média Final</strong> = (PR1 + PR2) / 2.
          </p>
        </div>
      </div>
    </div>
  );
};
