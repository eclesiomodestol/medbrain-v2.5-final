
import React, { useState, useRef, useMemo } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { BrainCircuit, Sparkles, Loader2, CheckCircle2, XCircle, ChevronRight, RotateCcw, FileText, Send, Paperclip, FileCheck, X, History } from 'lucide-react';
import { Quiz, QuizQuestion, User } from '../types';

interface QuizGeneratorProps {
  onSaveQuiz: (quiz: Quiz) => Promise<void>;
  history: Quiz[];
  currentUser: User;
  quizzes: Quiz[];
}

export const QuizGenerator: React.FC<QuizGeneratorProps> = ({ onSaveQuiz, history, currentUser, quizzes = [] }) => {
  const [summary, setSummary] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [viewingHistory, setViewingHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = (error) => reject(error);
    });
  };

  // Calculate Daily Quizzes
  const dailyCount = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('pt-BR');
    return quizzes.filter(q => {
      const qDate = new Date(q.createdAt).toLocaleDateString('pt-BR');
      return q.userId === currentUser.id && qDate === todayStr;
    }).length;
  }, [quizzes, currentUser]);

  const remainingQuota = 5 - dailyCount;

  const generateQuiz = async () => {
    if (!summary.trim() && !attachedFile) return;

    if (dailyCount >= 5) {
      alert("🛑 Limite Diário Atingido!\n\nVocê já gerou 5 simulados hoje. Volte amanhã para continuar treinando! 🧠");
      return;
    }

    setIsGenerating(true);
    try {
      // Use process.env.GEMINI_API_KEY as defined in vite.config.ts
      const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY || '';
      const ai = new GoogleGenAI({ apiKey });
      const parts: any[] = [];
      let prompt = `Gere um simulado médico de 5 questões de múltipla escolha. 
                   Cada questão deve ter 4 opções e uma justificativa detalhada para a resposta correta (campo explanation).
                   Baseie o simulado no conteúdo fornecido abaixo. Linguagem: Português do Brasil.`;

      if (summary.trim()) prompt += `\n\nTexto do Resumo: "${summary}"`;
      parts.push({ text: prompt });

      if (attachedFile) {
        const base64Data = await fileToBase64(attachedFile);
        parts.push({ inlineData: { mimeType: 'application/pdf', data: base64Data } });
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctAnswerIndex: { type: Type.INTEGER },
                    explanation: { type: Type.STRING }
                  },
                  required: ["id", "question", "options", "correctAnswerIndex", "explanation"]
                }
              }
            },
            required: ["title", "questions"]
          }
        }
      });

      const quizData = JSON.parse(response.text);
      const newQuiz: Quiz = {
        ...quizData,
        id: Math.random().toString(36).substr(2, 9),
        userId: currentUser.id,
        createdAt: new Date().toISOString()
      };

      setCurrentQuiz(newQuiz);
      await onSaveQuiz(newQuiz);
      setUserAnswers({});
      setShowResults(false);
    } catch (error) {
      alert("Erro ao gerar simulado. Tente um arquivo menor ou texto mais curto.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswer = (questionId: string, optionIndex: number) => {
    if (showResults) return;
    setUserAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  if (viewingHistory) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in">
        <div className="flex justify-between items-center bg-white p-6 rounded-3xl border shadow-sm">
          <h2 className="text-xl font-black text-[#0F172A] uppercase tracking-tight flex items-center gap-3">
            <History className="text-blue-600" /> Histórico de Simulados
          </h2>
          <button onClick={() => setViewingHistory(false)} className="px-6 py-2 bg-slate-100 text-slate-500 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">
            Voltar
          </button>
        </div>
        <div className="space-y-4">
          {history.length > 0 ? (
            history.map((q) => (
              <div key={q.id} onClick={() => { setCurrentQuiz(q); setShowResults(true); setViewingHistory(false); }} className="bg-white p-6 rounded-3xl border border-slate-100 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer group flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{q.title}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(q.createdAt).toLocaleDateString('pt-BR')} • {q.questions.length} questões</p>
                  </div>
                </div>
                <ChevronRight className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-white rounded-[40px] border border-dashed text-slate-400">
              Nenhum simulado salvo anteriormente.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (currentQuiz) {
    let score = 0;
    currentQuiz.questions.forEach(q => { if (userAnswers[q.id] === q.correctAnswerIndex) score++; });

    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
        <div className="flex justify-between items-center bg-white p-6 rounded-3xl border shadow-sm">
          <div>
            <h2 className="text-2xl font-black text-[#0F172A] leading-tight">{currentQuiz.title}</h2>
            <p className="text-slate-500 text-sm">Simulado Estruturado por IA</p>
          </div>
          {showResults && (
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score</p>
                <p className="text-2xl font-black text-blue-600">{score} / {currentQuiz.questions.length}</p>
              </div>
              <button onClick={() => setCurrentQuiz(null)} className="p-4 bg-slate-50 text-slate-400 hover:bg-slate-100 rounded-2xl transition-all">
                <RotateCcw size={20} />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {currentQuiz.questions.map((q, idx) => (
            <div key={q.id} className={`bg-white p-8 rounded-[32px] border transition-all ${showResults ? (userAnswers[q.id] === q.correctAnswerIndex ? 'border-emerald-200 shadow-emerald-100/20' : 'border-rose-200 shadow-rose-100/20') : 'border-slate-100'}`}>
              <div className="flex items-start gap-4 mb-6">
                <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500 shrink-0">{idx + 1}</span>
                <p className="text-lg font-bold text-slate-800 leading-relaxed">{q.question}</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {q.options.map((opt, optIdx) => {
                  const isSelected = userAnswers[q.id] === optIdx;
                  const isCorrect = optIdx === q.correctAnswerIndex;
                  let style = "border-slate-100 hover:bg-slate-50";
                  if (isSelected) style = "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20";
                  if (showResults) {
                    if (isCorrect) style = "border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20";
                    else if (isSelected) style = "border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-500/20 opacity-80";
                    else style = "border-slate-50 opacity-40";
                  }
                  return (
                    <button key={optIdx} disabled={showResults} onClick={() => handleAnswer(q.id, optIdx)} className={`text-left p-5 rounded-2xl border-2 font-semibold text-sm transition-all flex items-center justify-between group ${style}`}>
                      <span className="flex-1">{opt}</span>
                      {showResults && isCorrect && <CheckCircle2 size={18} className="text-emerald-500" />}
                      {showResults && isSelected && !isCorrect && <XCircle size={18} className="text-rose-500" />}
                    </button>
                  );
                })}
              </div>
              {showResults && (
                <div className="mt-6 p-6 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">Base Científica</p>
                  <p className="text-sm font-medium leading-relaxed text-slate-700">{q.explanation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        {!showResults && (
          <div className="flex justify-center pt-8">
            <button onClick={() => setShowResults(true)} disabled={Object.keys(userAnswers).length < currentQuiz.questions.length} className="bg-blue-600 text-white px-12 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 transition-all disabled:opacity-50">
              Finalizar Atividade
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="relative z-10 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-blue-600 rounded-3xl shadow-lg shadow-blue-500/20 text-white"><BrainCircuit size={32} /></div>
              <div>
                <h2 className="text-3xl font-black text-[#0F172A] tracking-tight">IA Quiz Generator</h2>
                <p className="text-slate-500 font-medium">Extraia questões de alto nível dos seus estudos.</p>
              </div>
            </div>
            <button onClick={() => setViewingHistory(true)} className="p-4 bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-2xl transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest">
              <History size={18} /> Histórico
            </button>
          </div>
          <div className="grid grid-cols-1 gap-6">
            <textarea className="w-full h-48 p-8 rounded-3xl bg-slate-50 border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-medium text-slate-700 leading-relaxed transition-all resize-none" placeholder="Cole o resumo médico aqui..." value={summary} onChange={(e) => setSummary(e.target.value)} />
            <div className="flex flex-col gap-4">
              {!attachedFile ? (
                <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-blue-50/50 hover:border-blue-300 transition-all cursor-pointer group">
                  <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 group-hover:scale-110 transition-transform mb-4">
                    <Paperclip size={24} className="text-slate-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-600">Anexar material de apoio (PDF)</p>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 flex items-center justify-between animate-in zoom-in-95">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-xl text-white"><FileCheck size={24} /></div>
                    <span className="text-sm font-bold text-blue-900">{attachedFile.name}</span>
                  </div>
                  <button onClick={() => setAttachedFile(null)} className="p-3 bg-white text-rose-500 rounded-xl"><X size={20} /></button>
                </div>
              )}
              <input type="file" ref={fileInputRef} accept=".pdf" className="hidden" onChange={(e) => e.target.files && setAttachedFile(e.target.files[0])} />
            </div>
          </div>
          <button onClick={generateQuiz} disabled={isGenerating || (!summary.trim() && !attachedFile)} className="w-full bg-[#0F172A] text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-3">
            {isGenerating ? <><Loader2 size={18} className="animate-spin" /> Analisando Conteúdo...</> : <><Send size={18} /> Criar Simulado Personalizado</>}
          </button>
        </div>
      </div>
    </div>
  );
};
