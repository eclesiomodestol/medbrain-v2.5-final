
import React, { useState, useMemo, useEffect } from 'react';
import { Topic, Subject, StudentProgress, ScheduleEntry, User, Exam, Quiz, ContentStatus, ExamTag } from '../types';
import { Filter, ArrowRight, X, BookOpen } from 'lucide-react';
import { useActivityTracker } from '../hooks/useActivityTracker';
import { Watermark } from './Watermark';

interface DashboardProps {
  topics: Topic[];
  subjects: Subject[];
  studentProgress: StudentProgress[];
  schedule: ScheduleEntry[];
  exams: Exam[];
  quizzes: Quiz[];
  currentUser: User;
  setActiveTab: (tab: any) => void;
}

const COLOR_MAP: Record<string, string> = {
  blue: '#3b82f6',
  indigo: '#6366f1',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  slate: '#64748b',
};

interface Segment {
  subjectId: string;
  subjectName: string;
  count: number;
  percentage: number;
  color: string;
}

const MultiColorCircularMetric = ({
  value,
  segments,
  label,
  size = 150
}: {
  value: number | string;
  segments: Segment[];
  label: string;
  size?: number;
}) => {
  const [hoveredSegment, setHoveredSegment] = useState<Segment | null>(null);
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  let currentOffset = 0;

  return (
    <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col items-center text-center transition-all hover:shadow-md hover:border-blue-100 group">
      <div className="relative mb-4" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="#f1f5f9" strokeWidth={strokeWidth} fill="transparent" />
          {segments.map((segment) => {
            const segmentCircumference = (segment.percentage / 100) * circumference;
            const rotateOffset = (currentOffset / 100) * 360;
            currentOffset += segment.percentage;
            const isHovered = hoveredSegment?.subjectId === segment.subjectId;

            return (
              <circle
                key={segment.subjectId}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={segment.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                fill="transparent"
                strokeDasharray={`${segmentCircumference} ${circumference - segmentCircumference}`}
                strokeDashoffset={0}
                transform={`rotate(${rotateOffset} ${size / 2} ${size / 2})`}
                onMouseEnter={() => setHoveredSegment(segment)}
                onMouseLeave={() => setHoveredSegment(null)}
                className="transition-all duration-300 ease-out cursor-pointer"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4">
          {hoveredSegment ? (
            <div className="animate-in fade-in zoom-in-95 duration-200 text-center">
              <span className="text-2xl font-black text-slate-900 leading-none" style={{ color: hoveredSegment.color }}>
                {hoveredSegment.count}
              </span>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-tighter mt-1 leading-tight line-clamp-2">
                {hoveredSegment.subjectName}
              </p>
            </div>
          ) : (
            <div className="animate-in fade-in duration-200">
              <span className="text-3xl font-black text-slate-900 leading-none">{value}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total</span>
            </div>
          )}
        </div>
      </div>
      <p className="text-sm font-bold text-slate-700 leading-tight h-10 flex items-center px-2 transition-colors group-hover:text-blue-600">
        {label}
      </p>
      <div className="flex flex-wrap justify-center gap-1.5 mt-2">
        {segments.map(seg => (
          <div
            key={seg.subjectId}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${hoveredSegment?.subjectId === seg.subjectId ? 'scale-150 ring-2 ring-offset-1 ring-slate-200' : 'opacity-60'}`}
            style={{ backgroundColor: seg.color }}
            onMouseEnter={() => setHoveredSegment(seg)}
            onMouseLeave={() => setHoveredSegment(null)}
          />
        ))}
      </div>
    </div>
  );
};


export const Dashboard: React.FC<DashboardProps> = ({
  topics,
  subjects,
  studentProgress,
  schedule = [],
  exams = [],
  quizzes = [],
  currentUser,
  setActiveTab
}) => {
  const { trackPageView } = useActivityTracker('dashboard', currentUser?.id);
  const [showStudyPlan, setShowStudyPlan] = useState(false);
  // const [subjectFilter, setSubjectFilter] = useState<string>('all');
  // const [tagFilter, setTagFilter] = useState<ExamTag | 'all'>('all');
  const [viewingPdf, setViewingPdf] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    trackPageView();
  }, [trackPageView]);

  const latestSummaries = useMemo(() => {
    return topics
      .filter(t => t.hasMedia || t.pdfUrl)
      .sort((a, b) => {
        // Sort by createdAt descending (newest first)
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [topics]);

  const getDistribution = (topicList: Topic[]): Segment[] => {
    const totalCount = topicList.length;
    if (totalCount === 0) return [];
    const counts: Record<string, number> = {};
    topicList.forEach(t => { counts[t.subjectId] = (counts[t.subjectId] || 0) + 1; });
    return Object.entries(counts).map(([subId, count]) => {
      const sub = subjects.find(s => s.id === subId);
      return {
        subjectId: subId,
        subjectName: sub?.name || 'Desconhecido',
        count: count,
        percentage: (count / totalCount) * 100,
        color: COLOR_MAP[sub?.color || 'slate']
      };
    });
  };

  const metrics = useMemo(() => {
    // Helper to get effective status
    const getStatus = (t: Topic) => {
      if (currentUser?.role === 'admin') return t.status;
      const prog = studentProgress?.find(p => p.topic_id === t.id);
      return prog ? prog.status : ContentStatus.PENDENTE; // If no progress, assume Pendente for student
    };

    const totalTopics = topics;
    const classesGiven = topics.filter(t => getStatus(t) !== ContentStatus.PENDENTE);
    const pendingRevision = topics.filter(t => getStatus(t) === ContentStatus.PENDENTE);
    const revised = topics.filter(t => getStatus(t) === ContentStatus.REVISADO);
    const overallProgress = topics.length > 0 ? Math.round((revised.length / topics.length) * 100) : 0;
    return {
      total: { val: totalTopics.length, dist: getDistribution(totalTopics) },
      given: { val: classesGiven.length, dist: getDistribution(classesGiven) },
      pending: { val: pendingRevision.length, dist: getDistribution(pendingRevision) },
      revised: { val: revised.length, dist: getDistribution(revised) },
      overallProgress
    };
  }, [topics, subjects, studentProgress, currentUser]);

  // Determine Today's Classes based on TOPICS (ContentTracker)
  const todayClasses = useMemo(() => {
    const daysMap = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const now = new Date();
    const todayIndex = now.getDay();

    // Helper to format date consistent with how topics store it
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    // Helper to get day of week from date string (YYYY-MM-DD)
    const getDayOfWeekFromDateString = (dateStr: string) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      // Create date in local timezone to avoid UTC offset issues
      const date = new Date(year, month - 1, day);
      return date.getDay();
    };

    const getTopicsForDate = (dateStr: string) => {
      return topics
        .filter(t => t.date === dateStr)
        .sort((a, b) => {
          const shiftOrder: Record<string, number> = { 'MANHÃ': 1, 'TARDE': 2, 'NOITE': 3 };
          return (shiftOrder[a.shift || ''] || 99) - (shiftOrder[b.shift || ''] || 99);
        });
    };

    let targetDate = now;
    let targetDateStr = formatDate(targetDate);
    let classes = getTopicsForDate(targetDateStr);
    let label = `Conteúdos de Hoje (${daysMap[todayIndex]})`;

    if (classes.length === 0) {
      for (let i = 1; i <= 30; i++) {
        const nextDate = new Date();
        nextDate.setDate(now.getDate() + i);
        const nextDateStr = formatDate(nextDate);
        const nextTopics = getTopicsForDate(nextDateStr);

        if (nextTopics.length > 0) {
          classes = nextTopics;
          targetDate = nextDate;
          targetDateStr = nextDateStr;
          // Use the helper function to get correct day of week from the date string
          const dayOfWeek = getDayOfWeekFromDateString(nextDateStr);
          label = `Próximos Conteúdos (${daysMap[dayOfWeek]})`;
          break;
        }
      }
    }

    // Grouping classes by shift to avoid repetition in UI
    const grouped = classes.reduce((acc, topic) => {
      const shift = topic.shift || 'Sem turno';
      if (!acc[shift]) acc[shift] = [];
      acc[shift].push(topic);
      return acc;
    }, {} as Record<string, Topic[]>);

    return { grouped, label, date: targetDateStr, totalCount: classes.length };
  }, [topics]);

  return (
    <div className="space-y-8">
      {/* Today's Classes Card */}
      <div
        className="flex-1 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[32px] p-8 text-white relative overflow-hidden group shadow-2xl shadow-indigo-500/20"
      >
        <div className="absolute top-0 right-0 p-32 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h3 className="text-2xl font-black mb-1">{todayClasses.label}</h3>
            <p className="text-indigo-100 font-medium text-sm">
              {todayClasses.totalCount > 0
                ? `${todayClasses.totalCount} conteúdos registrados para ${todayClasses.date === new Date().toISOString().split('T')[0] ? 'hoje' : 'este dia'}.`
                : 'Nenhum conteúdo específico agendado para os próximos dias.'}
            </p>
          </div>
          <button
            onClick={() => setActiveTab('syllabus')}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all relative z-20"
          >
            Ver Ementa Completa
          </button>
        </div>

        {todayClasses.totalCount > 0 && (
          <div className="space-y-6 mt-8 relative z-10 font-[Inter]">
            {Object.entries(todayClasses.grouped).map(([shift, shiftTopics]) => (
              <div key={shift} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-[0.2em]">
                    {shift}
                  </div>
                  <div className="h-px bg-white/10 flex-1"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {shiftTopics.map(topic => {
                    const subject = subjects.find(s => s.id === topic.subjectId);
                    return (
                      <div key={topic.id} className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex items-center gap-4 hover:bg-white/20 transition-all">
                        <div className="w-2 h-10 rounded-full" style={{ backgroundColor: subject ? COLOR_MAP[subject.color] : '#cbd5e1' }}></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-lg leading-tight truncate">{subject?.name || 'Disciplina'}</p>
                          {topic.front && <p className="text-[11px] font-black uppercase tracking-widest text-indigo-100 mt-1 truncate">{topic.front}</p>}
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-widest mb-1">Assunto:</p>
                            <p className="text-sm font-medium text-white leading-tight line-clamp-2">{topic.title}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MultiColorCircularMetric value={metrics.total.val} segments={metrics.total.dist} label="Carga Total de Conteúdos" />
        <MultiColorCircularMetric value={metrics.given.val} segments={metrics.given.dist} label="Assuntos Abordados / Aulas" />
        <MultiColorCircularMetric value={metrics.pending.val} segments={metrics.pending.dist} label="Assuntos Pendentes (Vermelho)" />
        <MultiColorCircularMetric value={metrics.revised.val} segments={metrics.revised.dist} label="Assuntos Consolidados" />
      </div>

      <div className="bg-white p-8 rounded-3xl border shadow-sm">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Métrica de Retenção Semestral</h3>
            <p className="text-sm text-slate-500">Percentual de conteúdos completamente revisados em relação à grade.</p>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-4xl font-black text-blue-600 leading-none">{metrics.overallProgress}%</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Progresso Real</span>
          </div>
        </div>
        <div className="w-full h-5 bg-slate-100 rounded-full overflow-hidden p-1 shadow-inner">
          <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-1000 ease-out rounded-full shadow-[0_0_15px_rgba(37,99,235,0.4)]" style={{ width: `${metrics.overallProgress}%` }} />
        </div>
      </div>



      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl border shadow-sm p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Últimos Resumos Adicionados</h3>
              <p className="text-xs text-slate-400 mt-1">Materiais mais recentes com PDF/Mídia</p>
            </div>
            <button
              onClick={() => setActiveTab('syllabus')}
              className="group flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-600 hover:text-white transition-all"
            >
              Ver Todos <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="space-y-4">
            {latestSummaries.length > 0 ? (
              latestSummaries.map(topic => {
                const subject = subjects.find(s => s.id === topic.subjectId);
                return (
                  <div key={topic.id} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-sm transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-3 h-12 rounded-full shadow-sm" style={{ backgroundColor: COLOR_MAP[subject?.color || 'slate'] }}></div>
                      <div>
                        <p className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{topic.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{subject?.name}</span>
                          <span className="text-[10px] text-slate-300 font-black px-2 py-0.5 border rounded-md">RESUMO</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <button
                        onClick={() => {
                          if (topic.pdfUrl) {
                            setViewingPdf({ url: topic.pdfUrl, title: topic.title });
                          }
                        }}
                        className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-600 hover:text-white transition-all"
                      >
                        Ler Resumo
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-16 bg-slate-50/50 rounded-3xl border border-dashed">
                <p className="text-slate-400 font-medium text-sm italic">Nenhum resumo adicionado recentemente.</p>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-[#0F172A] text-white rounded-3xl shadow-xl p-8 flex flex-col gap-6">
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Distribuição Acadêmica</h3>
              <p className="text-slate-400 text-xs leading-relaxed">Carga de temas mapeados por disciplina no período.</p>
            </div>
            <div className="space-y-4">
              {subjects.map(s => {
                const count = topics.filter(t => t.subjectId === s.id).length;
                const percent = topics.length > 0 ? (count / topics.length) * 100 : 0;
                return (
                  <div key={s.id} className="space-y-1.5 group cursor-help">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-slate-300 uppercase tracking-widest group-hover:text-white transition-colors">{s.name}</span>
                      <span className="text-white">{count} temas</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full transition-all duration-700 group-hover:brightness-125" style={{ width: `${percent}%`, backgroundColor: COLOR_MAP[s.color] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <button onClick={() => setActiveTab('schedule')} className="w-full bg-white text-slate-900 border border-slate-200 hover:border-blue-600 hover:text-blue-600 py-4 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2">
            Ver Horário Acadêmico
          </button>
        </div>
      </div>


      {/* PDF Viewer Modal with Watermark */}
      {
        viewingPdf && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full h-full max-w-6xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col relative">
              <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-white z-20">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <BookOpen size={18} className="text-blue-600" />
                  {viewingPdf.title}
                </h3>
                <button
                  onClick={() => setViewingPdf(null)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 relative bg-slate-100 overflow-hidden">
                <iframe
                  src={viewingPdf.url}
                  className="w-full h-full"
                  title="PDF Viewer"
                />
                {currentUser && (
                  <div className="absolute inset-0 pointer-events-none z-10" style={{ pointerEvents: 'none' }}>
                    <Watermark user={currentUser} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }
    </div >

  );
};
