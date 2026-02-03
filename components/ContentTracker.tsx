import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Topic, ContentStatus, ExamTag, Subject, User, StudentProgress, Quiz } from '../types';
import { Paperclip, Search, ChevronDown, X, Plus, Loader2, FileText, Printer, ShieldCheck, Trash2, Sparkles, BrainCircuit, FileSearch, FileX, ExternalLink, AlertCircle, Download, Check, Edit2, Filter, ArrowUpDown } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { Watermark } from './Watermark';
import { formatLocalDate } from '../utils/dateUtils';

interface ContentTrackerProps {
  topics: Topic[];
  subjects: Subject[];
  quizzes: Quiz[];
  currentUser: User;
  studentProgress?: StudentProgress[];
  onUpdateStatus: (id: string, status: ContentStatus) => void;
  onUpdateTopic: (topic: Topic) => void; // General update for admin
  onUploadPDF_New: (id: string, file: File, summary: string) => Promise<void>;
  onDeletePDF: (id: string) => Promise<void>;
  onAddTopic: (topic: Topic) => void;
  onUploadPDF: (id: string, hasMedia: boolean, pdfUrl?: string, pdfSummary?: string) => void;
  onDeleteTopic?: (id: string) => void;
  onSaveQuiz: (quiz: Quiz) => Promise<void>;
}

const COLOR_MAP: Record<string, string> = {
  blue: '#3b82f6',
  indigo: '#6366f1',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  slate: '#64748b',
};

import { addWatermarkToPdf, generateSummaryPdf } from '../utils/pdfGenerator';

const SPECIALTY_MAP: Record<string, { specialties: string[], keywordMap: Record<string, string[]> }> = {
  cm3: {
    specialties: ['Neurologia', 'Hematologia', 'Dermatologia'],
    keywordMap: {
      'Neurologia': ['Ecefálico', 'Cefaleia', 'Enxaqueca', 'Neuro', 'AVC', 'AVE', 'Epilepsia', 'Meningite'],
      'Hematologia': ['Anemia', 'Pancitopenia', 'Hemato', 'Leucemia', 'Linfoma', 'Coagulação'],
      'Dermatologia': ['Micoses', 'Dermato', 'Pele', 'Psoríase', 'Eczema', 'Hanseníase']
    }
  },
  cc3: {
    specialties: ['Otorrino', 'Ortopedia', 'Oftalmo'],
    keywordMap: {
      'Otorrino': ['Otorrino', 'Sinusite', 'Rinite', 'Otite', 'Laringe', 'Amigdalite'],
      'Ortopedia': ['Fraturas', 'Ortopedia', 'Osso', 'Articulação', 'Coluna', 'Luxação'],
      'Oftalmo': ['Glaucoma', 'Catarata', 'Oftalmo', 'Olho', 'Retina', 'Conjuntivite']
    }
  }
};

const classifySpecialty = (title: string, subjectId: string): string | undefined => {
  const mapping = SPECIALTY_MAP[subjectId];
  if (!mapping) return undefined;

  const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const normalizedTitle = normalize(title);

  for (const [specialty, keywords] of Object.entries(mapping.keywordMap)) {
    if (keywords.some(k => normalizedTitle.includes(normalize(k)))) {
      return specialty;
    }
  }
  return undefined;
};

const SafeViewer = ({ topic, user, type, onClose }: { topic: Topic, user: User, type: 'summary' | 'pdf', onClose: () => void }) => {
  const pdfUrlWithCache = topic.pdfUrl ? `${topic.pdfUrl}?t=${Date.now()}` : '';
  const isAdmin = user.role === 'admin';
  const [downloading, setDownloading] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      let pdfBytes: Uint8Array | null = null;
      let filename = `medbrain_${topic.id}.pdf`;

      if (type === 'summary' && topic.pdfSummary) {
        pdfBytes = await generateSummaryPdf(topic.title, topic.pdfSummary, user);
        filename = `resumo_${topic.title.substring(0, 10)}.pdf`;
      } else if (type === 'pdf' && topic.pdfUrl) {
        pdfBytes = await addWatermarkToPdf(topic.pdfUrl, user);
        filename = `documento_${topic.title.substring(0, 10)}.pdf`;
      }

      if (pdfBytes) {
        const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert('Erro ao gerar o documento.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao processar download.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0F172A]/98 backdrop-blur-3xl z-[200] flex flex-col items-center p-4 md:p-10 animate-in fade-in duration-300 print:p-0 print:bg-white print:static">
      <Watermark user={user} />

      <div className="w-full max-w-6xl flex justify-between items-center mb-8 print:hidden">
        <div className="flex items-center gap-5 text-white">
          <div className={`p-4 rounded-[28px] shadow-2xl ${type === 'summary' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
            {type === 'summary' ? <BrainCircuit size={28} /> : <FileText size={28} />}
          </div>
          <div>
            <h3 className="text-2xl font-black tracking-tight line-clamp-1">{topic.title}</h3>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              {type === 'summary' ? 'Análise Médica Estruturada MedBrain' : 'Documento Clínico Digital'} • {user.name}
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl transition-all flex items-center gap-2 font-bold text-xs uppercase tracking-widest disabled:opacity-50"
          >
            {downloading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
            {downloading ? 'Gerando...' : 'Baixar PDF'}
          </button>

          <button
            onClick={handlePrint}
            className="p-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all flex items-center gap-2 font-bold text-xs uppercase tracking-widest"
          >
            <Printer size={20} /> Imprimir / Copiar
          </button>

          {isAdmin && type === 'pdf' && topic.pdfUrl && (
            <a
              href={topic.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all flex items-center gap-2 font-bold text-xs uppercase tracking-widest"
            >
              <ExternalLink size={20} /> Ver Original (Admin)
            </a>
          )}

          <button onClick={onClose} className="p-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl transition-all shadow-xl active:scale-95">
            <X size={28} />
          </button>
        </div>
      </div>

      <div className="flex-1 w-full max-w-6xl bg-white rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col border border-white/10 print:shadow-none print:border-none print:w-full print:max-w-none print:rounded-none">
        <div className="flex-1 overflow-hidden relative z-10 flex flex-col bg-slate-50 print:bg-white print:overflow-visible">
          {type === 'summary' ? (
            <div className="flex-1 p-8 md:p-16 overflow-y-auto bg-white scroll-smooth print:overflow-visible print:h-auto">
              <div className="max-w-4xl mx-auto">
                {topic.pdfSummary ? (
                  <div className="prose prose-slate max-w-none text-slate-800 space-y-4">
                    {topic.pdfSummary.split('\n').map((line: string, i: number) => {
                      const trimmed = line.trim();
                      if (!trimmed) return <div key={i} className="h-6" />;

                      if (trimmed.startsWith('# ')) {
                        return (
                          <div key={i} className="mb-12 border-b-8 border-blue-600 pb-6 print:break-before-page">
                            <h1 className="text-5xl font-black text-[#0F172A] uppercase tracking-tighter leading-none">
                              {trimmed.replace('# ', '')}
                            </h1>
                          </div>
                        );
                      }

                      if (trimmed.startsWith('## ')) {
                        return (
                          <h2 key={i} className="text-2xl font-black text-blue-800 mt-14 mb-6 uppercase tracking-tight flex items-center gap-3">
                            <div className="w-2 h-8 bg-blue-600 rounded-full" />
                            {trimmed.replace('## ', '')}
                          </h2>
                        );
                      }

                      if (trimmed.startsWith('### ')) {
                        return (
                          <h3 key={i} className="text-xl font-bold text-slate-900 mt-10 mb-4 border-l-4 border-slate-200 pl-4">
                            {trimmed.replace('### ', '')}
                          </h3>
                        );
                      }

                      return (
                        <p key={i} className="text-lg leading-relaxed font-medium text-slate-700 text-justify">
                          {trimmed.split('**').map((part: string, index: number) =>
                            index % 2 === 1 ? <strong key={index} className="text-blue-900 font-black">{part}</strong> : part
                          )}
                        </p>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center text-slate-300">
                    <Loader2 size={56} className="animate-spin text-blue-500 mb-6" />
                    <p className="font-black uppercase tracking-[0.3em] text-[10px]">Consolidando evidências...</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 w-full h-full relative bg-slate-800 flex items-center justify-center print:bg-white">
              {topic.pdfUrl ? (
                <div className="relative w-full h-full group">
                  <iframe
                    src={`${pdfUrlWithCache}#toolbar=0&navpanes=0&scrollbar=0`}
                    className="w-full h-full border-none shadow-2xl"
                    title="PDF Viewer"
                  />
                  {/* Toolbar Blocker: A transparent div at the bottom to intercept clicks on the native floating toolbar */}
                  <div className="absolute bottom-0 left-0 right-0 h-16 z-50 bg-transparent" title="Download protegido" />

                  {/* Overlay specifically for the iframe to ensure watermark is visible on top even if iframe steals focus */}
                  <div className="absolute inset-0 pointer-events-none z-50">
                    {/* The main watermark handles this */}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6 text-white text-center p-10">
                  <div className="p-8 bg-white/5 rounded-full border border-white/10 mb-4">
                    <FileX size={80} className="text-rose-400" />
                  </div>
                  <h4 className="text-2xl font-black uppercase tracking-widest">Acesso Direto Necessário</h4>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="bg-[#0F172A] px-12 py-6 flex items-center justify-between border-t border-white/5 print:hidden">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Criptografia SSL Ativa • {user.name}</p>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Sessão Monitorada • MedBrain Engine</p>
          </div>
          <div className="flex gap-8">
            <ShieldCheck size={18} className="text-emerald-400" />
            <Printer size={18} className="text-slate-600" />
          </div>
        </div>
      </div>
    </div>
  );
};

const StatusDropdown = ({ currentStatus, onSelect }: { currentStatus: ContentStatus, onSelect: (status: ContentStatus) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getStatusStyle = (status: ContentStatus) => {
    switch (status) {
      case ContentStatus.PENDENTE: return 'bg-rose-50 text-rose-600 border-rose-100';
      case ContentStatus.AULA_ASSISTIDA: return 'bg-blue-50 text-blue-600 border-blue-100';
      case ContentStatus.RESUMIDO: return 'bg-purple-50 text-purple-600 border-purple-100';
      case ContentStatus.REVISADO: return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      default: return 'bg-slate-50';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-3 min-w-[160px] px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${getStatusStyle(currentStatus)}`}
      >
        {currentStatus}
        <ChevronDown size={14} className={isOpen ? 'rotate-180' : ''} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl border shadow-xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1">
          {Object.values(ContentStatus).map((status) => (
            <button
              key={status}
              onClick={() => { onSelect(status); setIsOpen(false); }}
              className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors"
            >
              {status}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const ContentTracker: React.FC<ContentTrackerProps> = ({
  topics,
  subjects,
  quizzes = [],
  currentUser,
  studentProgress,
  onUpdateStatus,
  onUpdateTopic,
  onUploadPDF_New,
  onDeletePDF,
  onAddTopic,
  onDeleteTopic,
  onSaveQuiz
}) => {
  const virtualSubjects = useMemo(() => {
    const list: { id: string, name: string, parentId: string, specialty?: string }[] = [];
    subjects.forEach(s => {
      const mapping = SPECIALTY_MAP[s.id];
      if (mapping) {
        mapping.specialties.forEach(spec => {
          list.push({ id: `${s.id}_${spec}`, name: `${spec} (${s.name})`, parentId: s.id, specialty: spec });
        });
      } else {
        list.push({ id: s.id, name: s.name, parentId: s.id });
      }
    });
    return list;
  }, [subjects]);

  const isAdmin = currentUser.role === 'admin';

  useEffect(() => {
    // Auto-classify topics that don't have a front set
    const needsClassification = topics.some(t => (t.subjectId === 'cm3' || t.subjectId === 'cc3') && !t.front);
    if (needsClassification && isAdmin) {
      topics.forEach(t => {
        if ((t.subjectId === 'cm3' || t.subjectId === 'cc3') && !t.front) {
          const specialty = classifySpecialty(t.title, t.subjectId);
          if (specialty) {
            onUpdateTopic({ ...t, front: specialty });
          }
        }
      });
    }
  }, [topics, isAdmin, onUpdateTopic]);
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<ExamTag[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<ContentStatus[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: 'date' | 'status' | 'subject' | 'title', direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'asc' });

  // Filter Dropdowns State
  const [showSubjectFilter, setShowSubjectFilter] = useState(false);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);

  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewerState, setViewerState] = useState<{ topic: Topic, type: 'summary' | 'pdf' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState<string | null>(null);

  // Admin Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Topic>>({});
  const [newTopicForm, setNewTopicForm] = useState<Partial<Topic>>({
    title: '', subjectId: subjects[0]?.id || '', date: '', tag: ExamTag.NONE
  });



  // Sort Handler
  const handleSort = (key: 'date' | 'status' | 'subject' | 'title') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredTopics = useMemo(() => {
    let result = topics.filter(t => {
      // Search
      const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase());

      // Subjects
      const matchesSubject = selectedSubjects.length === 0 || selectedSubjects.includes(t.subjectId);

      // Tags (PR1/PR2)
      const matchesTag = selectedTags.length === 0 || selectedTags.includes(t.tag);

      // Status (Personalized)
      let effectiveStatus = t.status;
      if (!isAdmin && studentProgress) {
        const prog = studentProgress.find(p => p.topic_id === t.id);
        effectiveStatus = prog ? prog.status : ContentStatus.PENDENTE;
      }
      const matchesStatus = selectedStatus.length === 0 || selectedStatus.includes(effectiveStatus);

      return matchesSearch && matchesSubject && matchesTag && matchesStatus;
    });

    // Sorting
    if (sortConfig) {
      result.sort((a, b) => {
        let valA: any = a[sortConfig.key as keyof Topic];
        let valB: any = b[sortConfig.key as keyof Topic];

        // Specific sort logic
        if (sortConfig.key === 'subject') {
          valA = subjects.find(s => s.id === a.subjectId)?.name || '';
          valB = subjects.find(s => s.id === b.subjectId)?.name || '';
        } else if (sortConfig.key === 'status') {
          // For student, sort by effective status
          if (!isAdmin && studentProgress) {
            const progA = studentProgress.find(p => p.topic_id === a.id);
            valA = progA ? progA.status : ContentStatus.PENDENTE;
            const progB = studentProgress.find(p => p.topic_id === b.id);
            valB = progB ? progB.status : ContentStatus.PENDENTE;
          }
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [topics, searchTerm, selectedSubjects, selectedTags, selectedStatus, sortConfig, subjects, studentProgress, isAdmin]);

  const triggerUpload = (topicId: string) => {
    setActiveTopicId(topicId);
    fileInputRef.current?.click();
  };

  const handleGenerateQuiz = async (topic: Topic) => {
    if (!(import.meta as any).env.VITE_GEMINI_API_KEY) {
      alert('Chave da API não configurada');
      return;
    }

    // Check Daily Limit (Max 5)
    const todayStr = new Date().toLocaleDateString('pt-BR');
    const todayQuizzes = quizzes.filter(q => {
      // Handle varying date formats if necessary, but assuming ISO or locale string
      // robust check: compare YYYY-MM-DD or Locale String
      const qDate = new Date(q.createdAt).toLocaleDateString('pt-BR');
      return q.userId === currentUser.id && qDate === todayStr;
    });

    if (todayQuizzes.length >= 5) {
      alert("🛑 Limite Diário Atingido!\n\nVocê só pode gerar 5 simulados por dia para garantir o uso consciente da IA.\nTente novamente amanhã!");
      return;
    }

    setIsGeneratingQuiz(topic.id);
    try {
      await onDeletePDF(topic.id);
    } catch (err: any) {
      alert(`Falha ao excluir: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDelete = async (topicId: string) => {
    // if (!window.confirm("Deseja EXCLUIR permanentemente este material e sua análise?")) return; // Moved to Global Modal
    setDeletingId(topicId);
    try {
      await onDeletePDF(topicId);
    } catch (err: any) {
      alert(`Falha ao excluir: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditClick = (topic: Topic) => {
    setEditingId(topic.id);
    setEditForm({ ...topic });
  };

  const handleSaveEdit = () => {
    if (editingId && editForm.title) {
      onUpdateTopic(editForm as Topic);
      setEditingId(null);
    }
  };

  const handleCreateTopic = () => {
    if (newTopicForm.title && newTopicForm.subjectId) {
      const virtualSub = virtualSubjects.find(vs => vs.id === newTopicForm.subjectId);
      const newTopic: Topic = {
        id: Math.random().toString(36).substr(2, 9), // Temp ID
        title: newTopicForm.title,
        subjectId: virtualSub?.parentId || newTopicForm.subjectId,
        front: virtualSub?.specialty || classifySpecialty(newTopicForm.title, virtualSub?.parentId || newTopicForm.subjectId),
        date: newTopicForm.date || new Date().toISOString().split('T')[0],
        tag: newTopicForm.tag || ExamTag.NONE,
        shift: (newTopicForm.shift as any) || undefined,
        status: ContentStatus.PENDENTE,
        hasMedia: false
      };
      onAddTopic(newTopic);
      setIsAdding(false);
      setNewTopicForm({ title: '', subjectId: subjects[0]?.id || '', date: '', tag: ExamTag.NONE, shift: '' as any });
    } else {
      alert("Preencha título e disciplina!");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0] && activeTopicId) {
      const file = e.target.files[0];
      setUploadingId(activeTopicId);

      try {
        // Use process.env.GEMINI_API_KEY as defined in vite.config.ts
        const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY || '';
        const ai = new GoogleGenAI({ apiKey });

        const reader = new FileReader();

        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });

        const base64Data = await base64Promise;

        // Retry logic for 503 errors
        let retries = 3;
        let response;

        while (retries > 0) {
          try {
            response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: [
                {
                  parts: [
                    { inlineData: { mimeType: 'application/pdf', data: base64Data } },
                    {
                      text: `Aja como um Preceptor Médico Acadêmico. Gere um resumo profundo ignorando saudações ou textos conversacionais.
              REGRAS:
              1. ZERO CONVERSA: Proibido 'Aqui está', 'Segue resumo'. Comece diretamente no título (#).
              2. HIERARQUIA:
                 - # TÍTULO (H1)
                 - Introdução (Densa e explicativa)
                 - ## Tópicos (Etiologia, Fisiopatologia, Diagnóstico, Conduta, etc - H2)
                 - ### Subtópicos (H3)
              3. PARÁGRAFOS: Desenvolva o conteúdo em texto corrido e técnico.
              4. LINGUAGEM: PT-BR.` }
                  ]
                }
              ]
            });
            break; // Success, exit retry loop
          } catch (err: any) {
            if (err.status === 503 && retries > 1) {
              console.log(`Erro 503 - Tentando novamente... (${4 - retries}/3)`);
              await new Promise(resolve => setTimeout(resolve, 2000 * (4 - retries))); // Exponential backoff
              retries--;
            } else {
              throw err; // Re-throw if not 503 or no retries left
            }
          }
        }

        // Extract text from response - SDK v1.39.0 format
        const aiText = response.text || '';
        await onUploadPDF_New(activeTopicId, file, aiText);
      } catch (err: any) {
        console.error('Gemini API Error:', err);
        alert(`Erro Crítico IA: ${JSON.stringify(err)}`);
      } finally {
        setUploadingId(null);
        setActiveTopicId(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-6">
      {viewerState && <SafeViewer topic={viewerState.topic} user={currentUser} type={viewerState.type} onClose={() => setViewerState(null)} />}
      <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" />

      <div className="bg-white p-6 rounded-[32px] border shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Pesquisar..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border bg-slate-50 focus:bg-white outline-none font-bold text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">

          {/* Subject Filter */}
          <div className="relative">
            <button
              onClick={() => { setShowSubjectFilter(!showSubjectFilter); setShowTagFilter(false); setShowStatusFilter(false); }}
              className={`h-10 px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${selectedSubjects.length > 0 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              <Filter size={14} /> Disciplina {selectedSubjects.length > 0 && `(${selectedSubjects.length})`}
            </button>
            {showSubjectFilter && (
              <div className="absolute top-12 left-0 w-64 bg-white rounded-xl shadow-xl border z-50 p-2 animate-in fade-in slide-in-from-top-2">
                {subjects.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      if (selectedSubjects.includes(s.id)) setSelectedSubjects(prev => prev.filter(id => id !== s.id));
                      else setSelectedSubjects(prev => [...prev, s.id]);
                    }}
                    className="flex items-center gap-3 w-full p-2 hover:bg-slate-50 rounded-lg transition-colors text-left"
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedSubjects.includes(s.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                      {selectedSubjects.includes(s.id) && <Check size={10} className="text-white" />}
                    </div>
                    <span className="text-xs font-bold text-slate-700">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tag Filter */}
          <div className="relative">
            <button
              onClick={() => { setShowTagFilter(!showTagFilter); setShowSubjectFilter(false); setShowStatusFilter(false); }}
              className={`h-10 px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${selectedTags.length > 0 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              Avaliação {selectedTags.length > 0 && `(${selectedTags.length})`}
            </button>
            {showTagFilter && (
              <div className="absolute top-12 left-0 w-48 bg-white rounded-xl shadow-xl border z-50 p-2 animate-in fade-in slide-in-from-top-2">
                {Object.values(ExamTag).map(tag => (
                  <button
                    key={tag}
                    onClick={() => {
                      if (selectedTags.includes(tag)) setSelectedTags(prev => prev.filter(t => t !== tag));
                      else setSelectedTags(prev => [...prev, tag]);
                    }}
                    className="flex items-center gap-3 w-full p-2 hover:bg-slate-50 rounded-lg transition-colors text-left"
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedTags.includes(tag) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                      {selectedTags.includes(tag) && <Check size={10} className="text-white" />}
                    </div>
                    <span className="text-xs font-bold text-slate-700">{tag}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status Filter */}
          <div className="relative">
            <button
              onClick={() => { setShowStatusFilter(!showStatusFilter); setShowTagFilter(false); setShowSubjectFilter(false); }}
              className={`h-10 px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${selectedStatus.length > 0 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              Status {selectedStatus.length > 0 && `(${selectedStatus.length})`}
            </button>
            {showStatusFilter && (
              <div className="absolute top-12 left-0 w-48 bg-white rounded-xl shadow-xl border z-50 p-2 animate-in fade-in slide-in-from-top-2">
                {Object.values(ContentStatus).map(status => (
                  <button
                    key={status}
                    onClick={() => {
                      if (selectedStatus.includes(status)) setSelectedStatus(prev => prev.filter(s => s !== status));
                      else setSelectedStatus(prev => [...prev, status]);
                    }}
                    className="flex items-center gap-3 w-full p-2 hover:bg-slate-50 rounded-lg transition-colors text-left"
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedStatus.includes(status) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                      {selectedStatus.includes(status) && <Check size={10} className="text-white" />}
                    </div>
                    <span className="text-xs font-bold text-slate-700">{status}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => window.print()}
            className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 active:scale-95 transition-all"
            title="Imprimir visualização atual"
          >
            <Printer size={16} />
          </button>
        </div>

        {/* Clear Filters */}
        {(selectedSubjects.length > 0 || selectedTags.length > 0 || selectedStatus.length > 0) && (
          <button
            onClick={() => { setSelectedSubjects([]); setSelectedTags([]); setSelectedStatus([]); }}
            className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline"
          >
            Limpar
          </button>
        )}

        {isAdmin && (
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg active:scale-95"
          >
            {isAdding ? <X size={18} /> : <Plus size={18} />}
            Novo Conteúdo
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-slate-900 p-6 rounded-[32px] shadow-2xl animate-in slide-in-from-top-4 text-white">
          <h3 className="text-lg font-black uppercase tracking-widest mb-6 flex items-center gap-2">
            <Sparkles className="text-blue-400" size={20} /> Novo Conteúdo
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-6">
            <input
              placeholder="Título do Conteúdo"
              className="col-span-12 md:col-span-8 lg:col-span-4 p-3 lg:p-4 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 font-bold outline-none focus:border-blue-500 transition-all shadow-inner text-sm lg:text-base"
              value={newTopicForm.title}
              onChange={e => setNewTopicForm({ ...newTopicForm, title: e.target.value })}
            />
            <select
              className="col-span-12 md:col-span-4 lg:col-span-2 p-3 lg:p-4 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold outline-none focus:border-blue-500 transition-all cursor-pointer text-sm lg:text-base"
              value={newTopicForm.subjectId}
              onChange={e => setNewTopicForm({ ...newTopicForm, subjectId: e.target.value })}
            >
              <option value="" disabled>Selecione a Disciplina</option>
              {virtualSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input
              type="date"
              className="col-span-12 md:col-span-4 lg:col-span-2 p-3 lg:p-4 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold outline-none focus:border-blue-500 transition-all text-sm lg:text-base"
              value={newTopicForm.date}
              onChange={e => setNewTopicForm({ ...newTopicForm, date: e.target.value })}
            />
            <select
              className="col-span-12 md:col-span-4 lg:col-span-2 p-3 lg:p-4 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold outline-none focus:border-blue-500 transition-all cursor-pointer text-sm lg:text-base"
              value={newTopicForm.shift || ''}
              onChange={e => setNewTopicForm({ ...newTopicForm, shift: e.target.value as any })}
            >
              <option value="">Turno</option>
              <option value="Manhã">Manhã</option>
              <option value="Tarde">Tarde</option>
              <option value="Noite">Noite</option>
            </select>
            <select
              className="col-span-12 md:col-span-4 lg:col-span-2 p-3 lg:p-4 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold outline-none focus:border-blue-500 transition-all cursor-pointer text-sm lg:text-base"
              value={newTopicForm.tag}
              onChange={e => setNewTopicForm({ ...newTopicForm, tag: e.target.value as ExamTag })}
            >
              <option value={ExamTag.NONE}>Vínculo Avaliação</option>
              <option value={ExamTag.PR1}>PR1</option>
              <option value={ExamTag.PR2}>PR2</option>
              <option value={ExamTag.SUB}>Segunda Chamada</option>
              <option value={ExamTag.FINAL}>Prova Final</option>
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setIsAdding(false)} className="px-6 py-3 rounded-xl hover:bg-white/10 font-bold text-xs uppercase tracking-widest">Cancelar</button>
            <button onClick={handleCreateTopic} className="px-8 py-3 bg-blue-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-500 shadow-lg shadow-blue-500/20">Criar Conteúdo</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden min-h-[400px]">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th onClick={() => handleSort('status')} className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[160px] cursor-pointer hover:text-blue-600 transition-colors select-none">
                <div className="flex items-center gap-1">Status {sortConfig?.key === 'status' && <ArrowUpDown size={10} className="text-blue-600" />}</div>
              </th>
              <th onClick={() => handleSort('date')} className="px-4 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 transition-colors select-none">
                <div className="flex items-center gap-1">Data {sortConfig?.key === 'date' && <ArrowUpDown size={10} className="text-blue-600" />}</div>
              </th>
              <th className="px-4 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Turno</th>
              <th className="px-4 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Aval.</th>
              <th onClick={() => handleSort('subject')} className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 transition-colors select-none">
                <div className="flex items-center gap-1">Conteúdo & Disciplina {sortConfig?.key === 'subject' && <ArrowUpDown size={10} className="text-blue-600" />}</div>
              </th>
              <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredTopics.map((topic) => {
              const subject = subjects.find(s => s.id === topic.subjectId);
              const isUploading = uploadingId === topic.id;
              const isDeleting = deletingId === topic.id;
              const isEditing = editingId === topic.id;

              // Determine Effective Status
              let effectiveStatus = topic.status; // Default to global
              if (!isAdmin && studentProgress) {
                const progress = studentProgress.find(p => p.topic_id === topic.id);
                if (progress) {
                  effectiveStatus = progress.status;
                } else {
                  effectiveStatus = ContentStatus.PENDENTE; // Default for student if untrained
                }
              }

              return (
                <tr key={topic.id} className={`hover:bg-slate-50/50 transition-colors group ${isEditing ? 'bg-blue-50/30' : ''}`}>
                  {/* Status Column - Always visible/editable depending on role logic handled in dropdown */}
                  <td className="px-6 py-6">
                    <StatusDropdown currentStatus={effectiveStatus} onSelect={(s) => onUpdateStatus(topic.id, s)} />
                  </td>

                  {/* Date Column */}
                  <td className="px-4 py-6">
                    {isEditing ? (
                      <input
                        type="date"
                        className="w-full text-xs font-bold bg-white border border-blue-200 rounded-lg p-2 outline-none"
                        value={editForm.date || ''}
                        onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                      />
                    ) : (
                      <span className="text-xs font-bold text-slate-600 block min-w-[80px]">
                        {formatLocalDate(topic.date)}
                      </span>
                    )}
                  </td>

                  {/* Shift Column */}
                  <td className="px-4 py-6">
                    {isEditing ? (
                      <select
                        className="w-full text-xs font-bold bg-white border border-blue-200 rounded-lg p-2 outline-none"
                        value={editForm.shift || ''}
                        onChange={e => setEditForm({ ...editForm, shift: e.target.value as any })}
                      >
                        <option value="">-</option>
                        <option value="Manhã">Manhã</option>
                        <option value="Tarde">Tarde</option>
                        <option value="Noite">Noite</option>
                      </select>
                    ) : (
                      <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-slate-50 rounded text-slate-500">
                        {topic.shift || '-'}
                      </span>
                    )}
                  </td>

                  {/* Evaluation Tag Column */}
                  <td className="px-4 py-6">
                    {isEditing ? (
                      <select
                        className="text-[10px] font-bold bg-white border border-blue-200 rounded-lg p-2 outline-none uppercase"
                        value={editForm.tag}
                        onChange={e => setEditForm({ ...editForm, tag: e.target.value as ExamTag })}
                      >
                        <option value={ExamTag.NONE}>Nenhuma</option>
                        <option value={ExamTag.PR1}>PR1</option>
                        <option value={ExamTag.PR2}>PR2</option>
                        <option value={ExamTag.SUB}>Segunda Chamada</option>
                        <option value={ExamTag.FINAL}>Prova Final</option>
                      </select>
                    ) : (
                      <span className={`inline-block px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${topic.tag === ExamTag.PR1 ? 'bg-amber-100 text-amber-700' :
                        topic.tag === ExamTag.PR2 ? 'bg-purple-100 text-purple-700' :
                          topic.tag === ExamTag.SUB ? 'bg-rose-100 text-rose-700' :
                            topic.tag === ExamTag.FINAL ? 'bg-indigo-100 text-indigo-700' :
                              'bg-slate-100 text-slate-400'
                        }`}>
                        {topic.tag || '-'}
                      </span>
                    )}
                  </td>

                  {/* Content & Subject Column */}
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: COLOR_MAP[subject?.color || 'slate'] }}></div>
                      <div className="flex-1">
                        {isEditing ? (
                          <div className="space-y-1">
                            <input
                              className="w-full text-sm font-bold text-slate-900 border-b border-blue-300 outline-none bg-transparent"
                              value={editForm.title}
                              onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                            />
                            <select
                              className="text-[10px] bg-transparent border-none text-slate-500 uppercase tracking-widest outline-none font-bold"
                              value={virtualSubjects.find(vs => vs.parentId === editForm.subjectId && vs.specialty === editForm.front)?.id || editForm.subjectId}
                              onChange={e => {
                                const vs = virtualSubjects.find(v => v.id === e.target.value);
                                setEditForm({ ...editForm, subjectId: vs?.parentId || e.target.value, front: vs?.specialty });
                              }}
                            >
                              {virtualSubjects.map(vs => (
                                <option key={vs.id} value={vs.id}>
                                  {vs.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <>
                            <p className="font-bold text-slate-900 line-clamp-1">{topic.title}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {topic.front ? `${topic.front} (${subject?.name})` : subject?.name}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Actions Column */}
                  <td className="px-6 py-6 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      {isEditing ? (
                        <>
                          <button onClick={handleSaveEdit} className="p-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 shadow-md transition-all"><Check size={18} /></button>
                          <div className="flex gap-2">
                            {isAdmin && onDeleteTopic && (
                              <button
                                onClick={() => {
                                  onDeleteTopic(topic.id);
                                  setEditingId(null);
                                }}
                                className="p-3 bg-rose-500 text-white rounded-xl hover:bg-rose-600 shadow-md transition-all"
                                title="Excluir Conteúdo"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                            <button onClick={() => setEditingId(null)} className="p-3 bg-slate-200 text-slate-600 rounded-xl hover:bg-slate-300 transition-all"><X size={18} /></button>
                          </div>
                        </>
                      ) : (
                        <>
                          {isAdmin && (
                            <button onClick={() => handleEditClick(topic)} className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all shadow-sm">
                              <Edit2 size={18} />
                            </button>
                          )}

                          {topic.hasMedia ? (
                            <>
                              <button onClick={() => setViewerState({ topic, type: 'summary' })} className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95">
                                <BrainCircuit size={18} />
                              </button>
                              <button onClick={() => setViewerState({ topic, type: 'pdf' })} className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-95">
                                <FileSearch size={18} />
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => handleDelete(topic.id)}
                                  disabled={isDeleting}
                                  className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                >
                                  {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                </button>
                              )}
                            </>
                          ) : (
                            isAdmin && (
                              <button
                                onClick={() => triggerUpload(topic.id)}
                                disabled={isUploading}
                                className="bg-slate-100 text-slate-400 hover:bg-blue-600 hover:text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm active:scale-95"
                              >
                                {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
                                {isUploading ? 'Processando...' : 'Anexar PDF'}
                              </button>
                            )
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
