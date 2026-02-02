import React, { useState } from 'react';
import { X, Sparkles, BrainCircuit, Calendar, BookOpen, Loader2, ArrowRight } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { User, Exam, Quiz, Topic } from '../types';
import Markdown from 'react-markdown';

interface StudyPlanModalProps {
    onClose: () => void;
    currentUser: User;
    exams: Exam[];
    quizzes: Quiz[];
    topics: Topic[];
    focusedExam?: Exam;
}

export const StudyPlanModal: React.FC<StudyPlanModalProps> = ({ onClose, currentUser, exams, quizzes, topics, focusedExam }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [studyPlan, setStudyPlan] = useState<string>('');

    const generatePlan = async () => {
        setIsGenerating(true);
        try {
            // Prepare Context
            const recentLowRestuls = quizzes
                .slice(0, 5)
                .map(q => `Simulado: ${q.title}`)
                .join(', ');

            let prompt = '';

            if (focusedExam) {
                // Focused Mode
                const relatedTopics = topics
                    .filter(t => t.subjectId === focusedExam.subjectId && t.status !== 'Revisado')
                    .map(t => t.title)
                    .join(', ');

                prompt = `Atue como um mentor expert. Crie um Roteiro de Estudos de Emergência focado EXCLUSIVAMENTE na prova: "${focusedExam.title}".
                
                Data da Prova: ${new Date(focusedExam.date || '').toLocaleDateString('pt-BR')}
                Aluno: ${currentUser.name}
                
                Tópicos Pendentes desta Matéria: ${relatedTopics || 'Revisão Geral da Disciplina'}
                Histórico Recente: ${recentLowRestuls}

                Gere um plano estruturado para estudar PARA ESTA PROVA até a data (ou nos próximos dias).
                Inclua:
                1. 🚨 **Tópicos Críticos**: O que é mais cobrado.
                2. ⏱️ **Cronograma Reverso**: O que estudar hoje, amanhã, etc.
                3. 🧠 **Estratégia de Prova**: Dicas específicas.
                
                Seja motivador!`;
            } else {
                // General Mode (Dashboard)
                const upcomingExams = exams
                    .filter(e => new Date(e.date || '') >= new Date())
                    .map(e => `${e.title} (${new Date(e.date || '').toLocaleDateString('pt-BR')})`)
                    .join(', ');

                const pendingTopics = topics
                    .filter(t => t.status === 'Pendente')
                    .slice(0, 10)
                    .map(t => t.title)
                    .join(', ');

                prompt = `Atue como um mentor expert em medicina. Crie um Plano de Estudos Intensivo e Personalizado para os próximos 3 dias.
          
          Dados do Aluno: ${currentUser.name}
          
          Contexto Acadêmico:
          - Próximas Provas (Prioridade Máxima): ${upcomingExams || 'Nenhuma prova imediata marcada.'}
          - Tópicos Pendentes (Foco): ${pendingTopics || 'Nenhum, revisão geral.'}
          - Histórico Recente: ${recentLowRestuls}
          
          Gere uma resposta estruturada em Markdown com:
          1. 🎯 **Foco Principal**: O que priorizar.
          2. 📅 **Cronograma de 3 Dias** (Manhã/Tarde/Noite): Ações concretas, pomodoro, e revisões ativas.
          3. 💡 **Dicas de Ouro**: Mnemônicos ou estratégias para os temas citados.
          
          Seja motivador, direto e use emojis. Formatação rica.`;
            }

            // EXACT MATCH WITH QuizGenerator.tsx
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY });

            // Note: QuizGenerator uses "parts" array in "contents" object.
            // But simple text generation can use contents: [{ role: 'user', parts: [{ text: prompt }] }] or similar.
            // QuizGenerator uses: contents: { parts } (for SDK @google/genai v0.0.x ?)
            // Let's copy the pattern.

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: { parts: [{ text: prompt }] } as any
                // Casting to any to avoid TS issues if local types differ, but matching runtime structure of functioning code.
            });

            setStudyPlan(response.text || '');
        } catch (error: any) {
            console.error("AI Error:", error);
            setStudyPlan(`Erro detalhado: ${error.message || 'Falha na conexão com Gemini'}. \n\nVerifique se a chave VITE_GEMINI_API_KEY está correta no arquivo .env`);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl text-white shadow-lg shadow-purple-200">
                            <BrainCircuit size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900">Mentoria IA</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                {focusedExam ? `Foco: ${focusedExam.title}` : 'Plano de Estudos Inteligente'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {!studyPlan ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center space-y-6">
                            {isGenerating ? (
                                <>
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
                                        <div className="p-4 bg-blue-50 text-blue-600 rounded-full relative">
                                            <Loader2 size={32} className="animate-spin" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-lg font-black text-slate-900">Analisando seu perfil...</h3>
                                        <p className="text-slate-500 font-medium">A IA está cruzando seus dados com o cronograma.</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="p-4 bg-slate-50 text-slate-400 rounded-3xl mb-2">
                                        <Sparkles size={32} />
                                    </div>
                                    <div className="space-y-2 max-w-xs mx-auto">
                                        <h3 className="text-lg font-black text-slate-900">Pronto para começar?</h3>
                                        <p className="text-slate-500 font-medium text-sm">
                                            Gere um plano de estudos personalizado baseado nas suas próximas provas e pendências.
                                        </p>
                                    </div>
                                    <button
                                        onClick={generatePlan}
                                        className="mt-4 px-8 py-3 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all flex items-center gap-2 shadow-xl hover:shadow-2xl hover:-translate-y-1"
                                    >
                                        <Sparkles size={18} className="text-yellow-400" />
                                        GERAR PLANO AGORA
                                    </button>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="prose prose-slate max-w-none">
                            <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100 mb-8">
                                <h3 className="text-purple-900 font-bold flex items-center gap-2 text-lg mb-4">
                                    <Sparkles size={20} /> Seu Plano Personalizado
                                </h3>
                                <div className="markdown-content text-sm text-slate-700 leading-relaxed font-medium">
                                    <Markdown>{studyPlan}</Markdown>
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setStudyPlan('')}
                                    className="px-6 py-3 bg-white text-slate-700 border border-slate-200 font-bold rounded-xl hover:bg-slate-50 transition-all"
                                >
                                    Gerar Novo
                                </button>
                                <button
                                    onClick={onClose}
                                    className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2"
                                >
                                    Começar a Estudar <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
