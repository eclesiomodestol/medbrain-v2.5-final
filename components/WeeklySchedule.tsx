import React, { useState, useMemo } from 'react';
import { Topic, ContentStatus, Subject, Internship, Exam, StudentProgress } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, CheckCircle2, Circle } from 'lucide-react';
import { formatLocalDate } from '../utils/dateUtils';

interface WeeklyScheduleProps {
    topics: Topic[];
    subjects: Subject[];
    exams: Exam[];
    internships: Internship[];
    studentProgress?: StudentProgress[];
    onUpdateStatus: (id: string, status: ContentStatus) => void;
    isAdmin: boolean;
}

const DAYS_OF_WEEK = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const SHIFTS = ['Manhã', 'Tarde', 'Noite'];

export const WeeklySchedule: React.FC<WeeklyScheduleProps> = ({
    topics,
    subjects,
    exams,
    internships,
    studentProgress,
    onUpdateStatus,
    isAdmin
}) => {
    const [currentDate, setCurrentDate] = useState(() => {
        const today = new Date();
        // Normalize to noon to avoid timezone shift issues on pure date calculations
        today.setHours(12, 0, 0, 0);
        return today;
    });

    const getDayOffset = (date: Date) => {
        // JS getDay(): Sunday = 0, Monday = 1... Saturday = 6
        // We want Monday = 0, ..., Sunday = 6
        const day = date.getDay();
        return day === 0 ? 6 : day - 1;
    };

    const getStartOfWeek = (date: Date) => {
        const d = new Date(date);
        d.setDate(d.getDate() - getDayOffset(d));
        return d;
    };

    const weekDates = useMemo(() => {
        const start = getStartOfWeek(currentDate);
        return DAYS_OF_WEEK.map((_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return d;
        });
    }, [currentDate]);

    const handlePrevWeek = () => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() - 7);
        setCurrentDate(d);
    };

    const handleNextWeek = () => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + 7);
        setCurrentDate(d);
    };

    const handleToday = () => {
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        setCurrentDate(today);
    };

    // Helper to get items for a specific date and shift
    const getItemsForSlot = (targetDate: Date, shift: string) => {
        const targetDateStr = targetDate.toISOString().split('T')[0];

        const slotTopics = topics.filter(t =>
            t.date === targetDateStr &&
            (t.shift || 'Manhã').toLowerCase() === shift.toLowerCase()
        );

        // Check internships (they might have packed schedules)
        const slotInternships: { i: Internship, hour: string }[] = [];
        internships.forEach(i => {
            let sched: any[] = [];
            if (i.evolutionModel && i.evolutionModel.startsWith('{"p":true')) {
                try {
                    const packed = JSON.parse(i.evolutionModel);
                    if (packed.s) sched = packed.s;
                } catch { }
            } else if (i.schedule && Array.isArray(i.schedule)) {
                sched = i.schedule;
            }

            sched.forEach(s => {
                if (s.date === targetDateStr) {
                    // Determine shift rudimentarily by hour (e.g. < 12 = Manhã, 12-18 = Tarde, >18 = Noite)
                    const hNumber = parseInt(s.hour.split(':')[0] || '12', 10);
                    let derivedShift = 'Tarde';
                    if (hNumber < 12) derivedShift = 'Manhã';
                    else if (hNumber >= 18) derivedShift = 'Noite';

                    if (derivedShift === shift) {
                        slotInternships.push({ i, hour: s.hour });
                    }
                }
            });
        });

        const slotExams = exams.filter(e => {
            // if exams have explicit shift, use it, else fallback logic
            if (e.date === targetDateStr && (e.shift || 'Manhã').toLowerCase() === shift.toLowerCase()) return true;
            return false;
        });

        return { slotTopics, slotInternships, slotExams };
    };

    const getEffectiveStatus = (topic: Topic) => {
        if (!isAdmin && studentProgress) {
            const progress = studentProgress.find(p => p.topic_id === topic.id);
            return progress ? progress.status : ContentStatus.PENDENTE;
        }
        return topic.status;
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-[32px] border shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-2">
                    <CalendarIcon className="text-blue-600" size={24} />
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">
                        {weekDates[0].toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handlePrevWeek} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-slate-600">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={handleToday} className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors font-bold text-xs uppercase tracking-widest text-slate-700">
                        Hoje
                    </button>
                    <button onClick={handleNextWeek} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-slate-600">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-[40px] border shadow-sm overflow-x-auto">
                <div className="min-w-[1000px]">
                    {/* Header Row */}
                    <div className="grid grid-cols-8 border-b bg-slate-50">
                        <div className="p-4 flex items-center justify-center border-r">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Turno</span>
                        </div>
                        {weekDates.map((date, i) => {
                            const todayStr = new Date().toISOString().split('T')[0];
                            const isToday = date.toISOString().split('T')[0] === todayStr;

                            return (
                                <div key={i} className={`p-4 text-center border-r ${isToday ? 'bg-blue-50/50' : ''}`}>
                                    <p className={`text-[10px] uppercase font-black tracking-widest mb-1 ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>
                                        {DAYS_OF_WEEK[i]}
                                    </p>
                                    <p className={`text-xl font-black ${isToday ? 'text-blue-600' : 'text-slate-800'}`}>
                                        {date.getDate().toString().padStart(2, '0')}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Time Slots */}
                    {SHIFTS.map((shift, shiftIdx) => (
                        <div key={shift} className="grid grid-cols-8 border-b last:border-0">
                            {/* Shift Label */}
                            <div className="p-4 flex flex-col items-center justify-center border-r bg-slate-50">
                                <p className="font-black text-slate-700 text-sm">{shift}</p>
                                <Clock size={16} className="text-slate-400 mt-2" />
                            </div>

                            {/* Days Columns */}
                            {weekDates.map((date, dayIdx) => {
                                const { slotTopics, slotInternships, slotExams } = getItemsForSlot(date, shift);
                                const isToday = date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];

                                return (
                                    <div key={dayIdx} className={`p-2 border-r last:border-0 min-h-[160px] flex flex-col gap-2 ${isToday ? 'bg-blue-50/20' : ''}`}>

                                        {/* Topics (Aulas) */}
                                        {slotTopics.map(topic => {
                                            const subject = subjects.find(s => s.id === topic.subjectId);
                                            const status = getEffectiveStatus(topic);
                                            const isGiven = status === ContentStatus.AULA_ASSISTIDA || status === ContentStatus.RESUMIDO || status === ContentStatus.REVISADO;

                                            return (
                                                <div key={topic.id} className={`p-3 rounded-2xl border transition-all ${isGiven ? 'bg-blue-50/50 border-blue-100' : 'bg-white border-slate-200'} shadow-sm`}>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 line-clamp-1">
                                                        {topic.front ? `${topic.front} (${subject?.name})` : subject?.name}
                                                    </p>
                                                    <p className={`text-sm font-bold leading-tight mb-3 break-words ${isGiven ? 'text-slate-700' : 'text-slate-900'}`}>
                                                        {topic.title}
                                                    </p>

                                                    <div className="flex bg-slate-100 rounded-lg p-1">
                                                        <button
                                                            onClick={() => onUpdateStatus(topic.id, ContentStatus.AULA_ASSISTIDA)}
                                                            className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-md transition-all text-[10px] font-bold uppercase tracking-wider ${isGiven ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'}`}
                                                        >
                                                            {isGiven ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                                                            Dada
                                                        </button>
                                                        <button
                                                            onClick={() => onUpdateStatus(topic.id, ContentStatus.PENDENTE)}
                                                            className={`flex-1 flex items-center justify-center py-1.5 px-2 rounded-md transition-all text-[10px] font-bold uppercase tracking-wider ${!isGiven ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'}`}
                                                        >
                                                            {status === ContentStatus.PENDENTE ? 'Pendente' : 'Não'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        })}

                                        {/* Internships (Práticas) */}
                                        {slotInternships.map((data, i) => (
                                            <div key={`${data.i.id}-${i}`} className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl shadow-sm">
                                                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                                                    <MapPin size={10} /> Prática • {data.hour}
                                                </p>
                                                <p className="text-xs font-bold text-indigo-900 leading-tight">
                                                    {data.i.title}
                                                </p>
                                                <p className="text-[10px] font-medium text-indigo-600 mt-1 line-clamp-1">{data.i.local}</p>
                                            </div>
                                        ))}

                                        {/* Exams (Provas) */}
                                        {slotExams.map(exam => {
                                            const subject = subjects.find(s => s.id === exam.subjectId);
                                            return (
                                                <div key={exam.id} className="p-3 bg-amber-50 border border-amber-200 rounded-2xl shadow-sm">
                                                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                                                        Prova Avaliativa
                                                    </p>
                                                    <p className="text-xs font-bold text-amber-900 leading-tight mb-1">
                                                        {exam.title}
                                                    </p>
                                                    <p className="text-[10px] font-medium text-amber-700">{subject?.name}</p>
                                                </div>
                                            )
                                        })}

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
