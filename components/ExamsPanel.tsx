import React, { useState, useMemo } from 'react';
import { Topic, ContentStatus, Exam, ExamTag, Subject, StudentProgress, User, Quiz } from '../types';
import { Calendar, Clock, BookOpen, AlertCircle, CheckCircle2, MoreVertical, Plus, Calculator, X, Save, Sparkles, Edit2, Target, Trophy, Trash2 } from 'lucide-react';
import { StudyPlanModal } from './StudyPlanModal';
import { formatLocalDate } from '../utils/dateUtils';

interface ExamsPanelProps {
  topics: Topic[];
  exams: Exam[];
  subjects: Subject[];
  quizzes: Quiz[];
  studentProgress?: StudentProgress[];
  currentUser: User;
  onUpdateExam: (exam: Exam) => void;
  onDeleteExam: (examId: string) => void;
}

export const ExamsPanel: React.FC<ExamsPanelProps> = ({ topics, exams, subjects, quizzes = [], studentProgress = [], currentUser, onUpdateExam, onDeleteExam }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Exam>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [newExamForm, setNewExamForm] = useState<Partial<Exam>>({});
  const [filterTag, setFilterTag] = useState<ExamTag | 'all'>('all');
  const [focusedExam, setFocusedExam] = useState<Exam | null>(null);

  const getExamTag = (exam: Exam): ExamTag => {
    if (exam.associatedTag && exam.associatedTag !== ExamTag.NONE) return exam.associatedTag;
    if (exam.title.includes('PR1')) return ExamTag.PR1;
    if (exam.title.includes('PR2')) return ExamTag.PR2;
    if (exam.title.toLowerCase().includes('segunda') || exam.title.toLowerCase().includes('sub')) return ExamTag.SUB;
    if (exam.title.toLowerCase().includes('final')) return ExamTag.FINAL;
    return ExamTag.NONE;
  };

  const filteredExams = useMemo(() => {
    return exams
      .filter(e => {
        if (filterTag === 'all') return true;
        return getExamTag(e) === filterTag;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [exams, filterTag]);

  const calculateProgress = (subjectId: string, examTitle: string, associatedTag?: ExamTag) => {
    let targetTag = ExamTag.NONE;

    if (associatedTag && associatedTag !== ExamTag.NONE) {
      targetTag = associatedTag;
    } else {
      const isPR1 = examTitle.includes('PR1');
      targetTag = isPR1 ? ExamTag.PR1 : ExamTag.PR2;
    }

    const relevantTopics = topics.filter(t => t.subjectId === subjectId && t.tag === targetTag);
    if (relevantTopics.length === 0) return 0;

    // Use student progress if available, else fallback to topic status
    const revised = relevantTopics.filter(t => {
      if (currentUser?.role === 'admin') return t.status === ContentStatus.REVISADO;

      const prog = studentProgress?.find(p => p.topic_id === t.id);
      return prog ? prog.status === ContentStatus.REVISADO : false; // Default to false (Pendente) if not found
    }).length;

    return Math.round((revised / relevantTopics.length) * 100);
  };

  const handleEdit = (exam: Exam) => {
    setEditingId(exam.id);
    setEditFormData(exam);
  };

  const handleSave = () => {
    if (editingId && editFormData.id) {
      onUpdateExam(editFormData as Exam);
      setEditingId(null);
    }
  };


  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-white/50 p-2 rounded-2xl border border-white/60">
        <button
          onClick={() => setFilterTag('all')}
          className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${filterTag === 'all' ? 'bg-slate-900 text-white shadow-md' : 'bg-transparent text-slate-400 hover:bg-white hover:text-slate-600'}`}
        >
          Todas
        </button>
        <div className="w-px h-4 bg-slate-300 mx-2" />
        {[ExamTag.PR1, ExamTag.PR2, ExamTag.SUB, ExamTag.FINAL].map(tag => (
          <button
            key={tag}
            onClick={() => setFilterTag(tag)}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${filterTag === tag ? 'bg-blue-600 text-white shadow-md' : 'bg-transparent text-slate-400 hover:bg-white hover:text-slate-600'}`}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredExams.map((exam) => {
          const isEditing = editingId === exam.id;
          const progress = calculateProgress(exam.subjectId, exam.title, exam.associatedTag);
          const subject = subjects.find(s => s.id === exam.subjectId);

          return (
            <div key={exam.id} className="bg-white rounded-3xl border shadow-sm p-8 flex flex-col gap-6 group hover:shadow-xl transition-all relative">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  {isEditing ? (
                    <select
                      className="text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border bg-slate-50 text-slate-700 border-slate-300 outline-none"
                      value={editFormData.subjectId || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, subjectId: e.target.value })}
                    >
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border ${subject?.color === 'blue' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                      subject?.color === 'indigo' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                        subject?.color === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          subject?.color === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                            subject?.color === 'rose' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                              'bg-slate-50 text-slate-700 border-slate-100'
                      }`}>
                      {subject?.name}
                    </span>
                  )}
                  {isEditing ? (
                    <input
                      className="w-full text-xl font-black text-slate-900 border-b-2 border-blue-500 outline-none bg-transparent py-1"
                      value={editFormData.title}
                      onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    />
                  ) : (
                    <h3 className="text-xl font-black text-slate-900">{exam.title}</h3>
                  )}
                </div>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <button onClick={handleSave} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all"><Save size={18} /></button>
                      <button onClick={() => setEditingId(null)} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-all"><X size={18} /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEdit(exam)} className="p-2.5 text-slate-200 hover:text-blue-600 hover:bg-blue-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => onDeleteExam(exam.id)}
                        className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all active:scale-90 group/del"
                        title="Excluir Prova"
                      >
                        <Trash2 size={18} className="group-hover/del:rotate-12 transition-transform" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Target size={12} /> Cobertura {
                        exam.associatedTag && exam.associatedTag !== ExamTag.NONE
                          ? exam.associatedTag
                          : (exam.title.includes('PR1') ? 'PR1' : 'PR2')
                      }
                    </span>
                    <span className="text-3xl font-black text-slate-900">{progress}%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block font-black uppercase tracking-widest mb-1">Data & Horário</span>
                  {isEditing ? (
                    <div className="flex flex-col gap-2">
                      <input
                        type="date"
                        className="text-sm font-bold text-slate-700 border-b border-blue-500 outline-none bg-transparent"
                        value={editFormData.date}
                        onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                      />
                      <div className="flex gap-2">
                        <input
                          type="time"
                          className="w-20 text-xs font-bold text-slate-700 border-b border-blue-500 outline-none bg-transparent"
                          value={editFormData.time || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, time: e.target.value })}
                        />
                        <select
                          className="text-xs font-bold text-slate-700 border-b border-blue-500 outline-none bg-transparent"
                          value={editFormData.shift || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, shift: e.target.value })}
                        >
                          <option value="">Turno</option>
                          <option value="Manhã">Manhã</option>
                          <option value="Tarde">Tarde</option>
                          <option value="Noite">Noite</option>
                        </select>
                      </div>
                      <select
                        className="text-xs font-bold text-slate-700 border-b border-blue-500 outline-none bg-transparent mt-2"
                        value={editFormData.associatedTag || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, associatedTag: e.target.value as ExamTag })}
                      >
                        <option value="">Detecção automática pelo título</option>
                        <option value={ExamTag.PR1}>PR1</option>
                        <option value={ExamTag.PR2}>PR2</option>
                        <option value={ExamTag.SUB}>Segunda Chamada</option>
                        <option value={ExamTag.FINAL}>Prova Final</option>
                      </select>
                    </div>
                  ) : (
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-700 block">
                        {formatLocalDate(exam.date)}
                      </span>
                      {(exam.time || exam.shift) && (
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mt-1">
                          {exam.shift} {exam.time ? `• ${exam.time}` : ''}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden p-1 shadow-inner">
                  <div
                    className={`h-full transition-all duration-1000 ease-out bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.4)]`}
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>

                <div className="flex items-center gap-2 pt-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {progress === 100 ? (
                    <span className="flex items-center gap-1.5 text-emerald-500 animate-bounce">
                      <Trophy size={14} /> Meta Atingida!
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 italic">
                      <Calendar size={14} />
                      {exam.associatedTag && exam.associatedTag !== ExamTag.NONE
                        ? `Sincronizado via Tag Manual (${exam.associatedTag})`
                        : `Sincronizado com ${exam.title.includes('PR1') ? 'PR1' : exam.title.includes('PR2') ? 'PR2' : 'Nada'}`
                      }
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => setFocusedExam(exam)}
                className="w-full py-4 rounded-xl border-2 border-slate-100 font-bold text-xs uppercase tracking-widest text-slate-600 hover:border-slate-800 hover:text-slate-900 transition-all flex items-center justify-center gap-2"
              >
                <Calendar size={16} /> Plano de Estudo
              </button>
            </div>
          );
        })}

        {/* Add New Exam Card */}
        {isAdding ? (
          <div className="bg-white rounded-3xl border-2 border-blue-500 shadow-xl p-8 flex flex-col gap-6 animate-in zoom-in-95">
            <div className="flex justify-between items-start">
              <div className="space-y-2 flex-1">
                <span className="text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-100">
                  Nova Avaliação
                </span>
                <input
                  autoFocus
                  placeholder="Título (ex: PR1 Anatomia)"
                  className="w-full text-xl font-black text-slate-900 border-b-2 border-blue-500 outline-none bg-transparent py-1 placeholder:text-slate-300"
                  value={newExamForm.title || ''}
                  onChange={(e) => setNewExamForm({ ...newExamForm, title: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (!newExamForm.title || !newExamForm.date || !newExamForm.subjectId) {
                      alert("Preencha título, data e disciplina.");
                      return;
                    }
                    onUpdateExam({
                      id: `ex_${Date.now()}`,
                      title: newExamForm.title,
                      date: newExamForm.date,
                      subjectId: newExamForm.subjectId,
                      time: newExamForm.time,
                      shift: newExamForm.shift,
                      associatedTag: newExamForm.associatedTag,
                      // defaults

                    } as Exam);
                    setIsAdding(false);
                    setNewExamForm({});
                  }}
                  className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-md"
                >
                  <Save size={18} />
                </button>
                <button onClick={() => setIsAdding(false)} className="p-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 transition-all"><X size={18} /></button>
              </div>
            </div>

            <div className="space-y-4">
              <select
                className="w-full p-3 font-bold text-slate-700 bg-slate-50 border rounded-xl"
                value={newExamForm.subjectId || ''}
                onChange={(e) => setNewExamForm({ ...newExamForm, subjectId: e.target.value })}
              >
                <option value="">Selecione a Disciplina...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>

              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data & Horário</span>
                <input
                  type="date"
                  className="w-full p-3 font-bold text-slate-700 bg-slate-50 border rounded-xl"
                  value={newExamForm.date || ''}
                  onChange={(e) => setNewExamForm({ ...newExamForm, date: e.target.value })}
                />
                <div className="flex gap-2">
                  <input
                    type="time"
                    className="w-1/2 p-3 font-bold text-slate-700 bg-slate-50 border rounded-xl"
                    value={newExamForm.time || ''}
                    onChange={(e) => setNewExamForm({ ...newExamForm, time: e.target.value })}
                  />
                  <select
                    className="w-1/2 p-3 font-bold text-slate-700 bg-slate-50 border rounded-xl"
                    value={newExamForm.shift || ''}
                    onChange={(e) => setNewExamForm({ ...newExamForm, shift: e.target.value })}
                  >
                    <option value="">Turno</option>
                    <option value="Manhã">Manhã</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Noite">Noite</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TAG da Prova</span>
                <select
                  className="w-full p-3 font-bold text-slate-700 bg-slate-50 border rounded-xl"
                  value={newExamForm.associatedTag || ''}
                  onChange={(e) => setNewExamForm({ ...newExamForm, associatedTag: e.target.value as ExamTag })}
                >
                  <option value="">Detecção automática pelo título</option>
                  <option value={ExamTag.PR1}>PR1</option>
                  <option value={ExamTag.PR2}>PR2</option>
                  <option value={ExamTag.SUB}>Segunda Chamada</option>
                  <option value={ExamTag.FINAL}>Prova Final</option>
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div
            onClick={() => setIsAdding(true)}
            className="bg-slate-50 border-4 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-10 text-center text-slate-400 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-500 transition-all cursor-pointer group"
          >
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border-2 border-slate-100 shadow-sm mb-6 group-hover:scale-110 group-hover:rotate-12 transition-all">
              <Calendar size={32} />
            </div>
            <p className="font-black text-xs uppercase tracking-[0.2em]">Agendar Avaliação</p>
            <p className="text-[10px] mt-2 font-medium">Defina PR1 ou PR2 no título para vincular temas.</p>
          </div>
        )}
      </div>
      {focusedExam && (
        <StudyPlanModal
          onClose={() => setFocusedExam(null)}
          currentUser={currentUser}
          exams={exams}
          quizzes={quizzes}
          topics={topics}
          focusedExam={focusedExam}
        />
      )}
    </div>
  );
};
