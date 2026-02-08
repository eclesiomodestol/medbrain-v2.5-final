import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Clock, TrendingUp, Calendar, Award, BarChart3, PieChart as PieChartIcon } from 'lucide-react';

interface DailyStudy {
    date: string;
    hours: number;
}

interface SubjectDistribution {
    subject_id: string;
    subject_name: string;
    hours: number;
    sessions: number;
    pomodoros: number;
}

interface StudyStats {
    todayHours: number;
    weekHours: number;
    monthHours: number;
    totalPomodoros: number;
    averageDaily: number;
    streak: number;
    lastWeekHours: number;
    lastMonthHours: number;
}

export const StudyReports: React.FC = () => {
    const [dailyData, setDailyData] = useState<DailyStudy[]>([]);
    const [subjectData, setSubjectData] = useState<SubjectDistribution[]>([]);
    const [stats, setStats] = useState<StudyStats>({
        todayHours: 0,
        weekHours: 0,
        monthHours: 0,
        totalPomodoros: 0,
        averageDaily: 0,
        streak: 0,
        lastWeekHours: 0,
        lastMonthHours: 0
    });
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'7d' | '30d'>('7d');

    useEffect(() => {
        fetchReports();
    }, [period]);

    const fetchReports = async () => {
        try {
            setLoading(true);

            // Set a timeout to prevent infinite loading
            const timeout = setTimeout(() => {
                console.error('Reports loading timeout');
                setLoading(false);
            }, 10000); // 10 seconds timeout

            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError) {
                console.error('Auth error:', authError);
                clearTimeout(timeout);
                setLoading(false);
                return;
            }

            if (!user) {
                console.error('No user found');
                clearTimeout(timeout);
                setLoading(false);
                return;
            }

            await Promise.all([
                fetchDailyData(user.id),
                fetchSubjectDistribution(user.id),
                fetchStats(user.id)
            ]);

            clearTimeout(timeout);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching reports:', error);
            setLoading(false);
        }
    };

    const fetchDailyData = async (userId: string) => {
        const days = period === '7d' ? 7 : 30;
        const { data } = await supabase
            .from('study_sessions')
            .select('started_at, duration_minutes')
            .eq('user_id', userId)
            .eq('status', 'completed')
            .gte('started_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
            .order('started_at');

        if (!data) return;

        // Group by date
        const grouped = data.reduce((acc: any, session) => {
            const date = new Date(session.started_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            if (!acc[date]) {
                acc[date] = 0;
            }
            acc[date] += (session.duration_minutes || 0) / 60;
            return acc;
        }, {});

        const dailyArray = Object.entries(grouped).map(([date, hours]) => ({
            date,
            hours: Number((hours as number).toFixed(2))
        }));

        setDailyData(dailyArray);
    };

    const fetchSubjectDistribution = async (userId: string) => {
        const { data } = await supabase
            .from('study_sessions')
            .select('subject_id, duration_minutes, pomodoros_completed')
            .eq('user_id', userId)
            .eq('status', 'completed')
            .gte('started_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        if (!data) return;

        // Group by subject
        const grouped = data.reduce((acc: any, session) => {
            const subject = session.subject_id;
            if (!acc[subject]) {
                acc[subject] = { hours: 0, sessions: 0, pomodoros: 0 };
            }
            acc[subject].hours += (session.duration_minutes || 0) / 60;
            acc[subject].sessions += 1;
            acc[subject].pomodoros += session.pomodoros_completed || 0;
            return acc;
        }, {});

        const subjectArray = Object.entries(grouped).map(([subject_id, stats]: [string, any]) => ({
            subject_id,
            subject_name: subject_id, // TODO: Get actual subject name
            hours: Number(stats.hours.toFixed(2)),
            sessions: stats.sessions,
            pomodoros: stats.pomodoros
        })).sort((a, b) => b.hours - a.hours);

        setSubjectData(subjectArray);
    };

    const fetchStats = async (userId: string) => {
        // Today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const { data: todayData } = await supabase
            .from('study_sessions')
            .select('duration_minutes')
            .eq('user_id', userId)
            .eq('status', 'completed')
            .gte('started_at', todayStart.toISOString());

        const todayHours = (todayData?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0) / 60;

        // This week
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const { data: weekData } = await supabase
            .from('study_sessions')
            .select('duration_minutes, pomodoros_completed')
            .eq('user_id', userId)
            .eq('status', 'completed')
            .gte('started_at', weekStart.toISOString());

        const weekHours = (weekData?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0) / 60;
        const totalPomodoros = weekData?.reduce((sum, s) => sum + (s.pomodoros_completed || 0), 0) || 0;

        // Last week
        const lastWeekStart = new Date(weekStart);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        const { data: lastWeekData } = await supabase
            .from('study_sessions')
            .select('duration_minutes')
            .eq('user_id', userId)
            .eq('status', 'completed')
            .gte('started_at', lastWeekStart.toISOString())
            .lt('started_at', weekStart.toISOString());

        const lastWeekHours = (lastWeekData?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0) / 60;

        // This month
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const { data: monthData } = await supabase
            .from('study_sessions')
            .select('duration_minutes')
            .eq('user_id', userId)
            .eq('status', 'completed')
            .gte('started_at', monthStart.toISOString());

        const monthHours = (monthData?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0) / 60;

        // Last month
        const lastMonthStart = new Date(monthStart);
        lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
        const { data: lastMonthData } = await supabase
            .from('study_sessions')
            .select('duration_minutes')
            .eq('user_id', userId)
            .eq('status', 'completed')
            .gte('started_at', lastMonthStart.toISOString())
            .lt('started_at', monthStart.toISOString());

        const lastMonthHours = (lastMonthData?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0) / 60;

        // Average daily (last 30 days)
        const averageDaily = monthHours / 30;

        setStats({
            todayHours: Number(todayHours.toFixed(2)),
            weekHours: Number(weekHours.toFixed(2)),
            monthHours: Number(monthHours.toFixed(2)),
            totalPomodoros,
            averageDaily: Number(averageDaily.toFixed(2)),
            streak: 0, // TODO: Calculate streak
            lastWeekHours: Number(lastWeekHours.toFixed(2)),
            lastMonthHours: Number(lastMonthHours.toFixed(2))
        });
    };

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600 font-medium">Carregando relatórios...</p>
                </div>
            </div>
        );
    }

    const weekComparison = stats.lastWeekHours > 0
        ? ((stats.weekHours - stats.lastWeekHours) / stats.lastWeekHours * 100).toFixed(1)
        : '0';

    const monthComparison = stats.lastMonthHours > 0
        ? ((stats.monthHours - stats.lastMonthHours) / stats.lastMonthHours * 100).toFixed(1)
        : '0';

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-[40px] p-8 text-white shadow-xl">
                <h1 className="text-5xl font-black uppercase tracking-tight mb-4">
                    🍅 Estude de Forma Inteligente
                </h1>
                <div className="space-y-3 text-blue-50 max-w-4xl">
                    <p className="text-lg font-medium leading-relaxed">
                        O <span className="font-black text-white">Método Pomodoro</span> é uma técnica de gerenciamento de tempo que divide seu estudo em intervalos focados de 25 minutos, separados por pausas curtas.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                            <div className="text-3xl mb-2">⏱️</div>
                            <h3 className="font-black text-sm uppercase mb-1">Como Funciona</h3>
                            <p className="text-sm opacity-90">25 min de estudo focado + 5 min de pausa. A cada 4 pomodoros, faça uma pausa longa de 15 minutos.</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                            <div className="text-3xl mb-2">📚</div>
                            <h3 className="font-black text-sm uppercase mb-1">No Nosso Sistema</h3>
                            <p className="text-sm opacity-90">Use o timer flutuante para estudar qualquer disciplina. Seus dados são salvos automaticamente no banco.</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                            <div className="text-3xl mb-2">📊</div>
                            <h3 className="font-black text-sm uppercase mb-1">Acompanhe Seu Progresso</h3>
                            <p className="text-sm opacity-90">Veja estatísticas detalhadas, gráficos de evolução e ranking de disciplinas mais estudadas.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={<Clock className="text-blue-600" size={24} />}
                    title="Hoje"
                    value={`${stats.todayHours}h`}
                    subtitle={`${stats.averageDaily.toFixed(1)}h média diária`}
                    color="blue"
                />
                <StatCard
                    icon={<Calendar className="text-emerald-600" size={24} />}
                    title="Esta Semana"
                    value={`${stats.weekHours}h`}
                    subtitle={`${weekComparison}% vs semana passada`}
                    color="emerald"
                    trend={Number(weekComparison)}
                />
                <StatCard
                    icon={<TrendingUp className="text-purple-600" size={24} />}
                    title="Este Mês"
                    value={`${stats.monthHours}h`}
                    subtitle={`${monthComparison}% vs mês passado`}
                    color="purple"
                    trend={Number(monthComparison)}
                />
                <StatCard
                    icon={<Award className="text-amber-600" size={24} />}
                    title="Pomodoros"
                    value={stats.totalPomodoros}
                    subtitle="Esta semana"
                    color="amber"
                />
            </div>

            {/* Period selector */}
            <div className="flex gap-2">
                <button
                    onClick={() => setPeriod('7d')}
                    className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${period === '7d'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                >
                    Últimos 7 dias
                </button>
                <button
                    onClick={() => setPeriod('30d')}
                    className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${period === '30d'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                >
                    Últimos 30 dias
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Evolution Chart */}
                <div className="bg-white rounded-[40px] border shadow-sm p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-blue-100 rounded-2xl">
                            <BarChart3 className="text-blue-600" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase">Evolução Diária</h2>
                            <p className="text-xs text-slate-600 font-medium">Horas estudadas por dia</p>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={dailyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '12px' }} />
                            <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#fff',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '12px',
                                    fontSize: '12px'
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="hours"
                                stroke="#3b82f6"
                                strokeWidth={3}
                                dot={{ fill: '#3b82f6', r: 5 }}
                                activeDot={{ r: 7 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Subject Distribution */}
                <div className="bg-white rounded-[40px] border shadow-sm p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-purple-100 rounded-2xl">
                            <PieChartIcon className="text-purple-600" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase">Por Disciplina</h2>
                            <p className="text-xs text-slate-600 font-medium">Últimos 30 dias</p>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={subjectData}
                                dataKey="hours"
                                nameKey="subject_name"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label
                            >
                                {subjectData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Subject Ranking */}
                <div className="bg-white rounded-[40px] border shadow-sm p-8 lg:col-span-2">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-emerald-100 rounded-2xl">
                            <Award className="text-emerald-600" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase">Ranking de Disciplinas</h2>
                            <p className="text-xs text-slate-600 font-medium">Últimos 30 dias</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {subjectData.map((subject, idx) => (
                            <div key={subject.subject_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white ${idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-orange-600' : 'bg-slate-300'
                                        }`}>
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{subject.subject_name}</p>
                                        <p className="text-xs text-slate-600">{subject.sessions} sessões • {subject.pomodoros} pomodoros</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black text-blue-600">{subject.hours}h</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

interface StatCardProps {
    icon: React.ReactNode;
    title: string;
    value: string | number;
    subtitle: string;
    color: 'blue' | 'emerald' | 'purple' | 'amber';
    trend?: number;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, subtitle, color, trend }) => {
    const colorClasses = {
        blue: 'from-blue-50 to-blue-100 border-blue-200',
        emerald: 'from-emerald-50 to-emerald-100 border-emerald-200',
        purple: 'from-purple-50 to-purple-100 border-purple-200',
        amber: 'from-amber-50 to-amber-100 border-amber-200'
    };

    return (
        <div className={`bg-gradient-to-br ${colorClasses[color]} border-2 rounded-3xl p-6 shadow-sm`}>
            <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white rounded-2xl shadow-sm">
                    {icon}
                </div>
                {trend !== undefined && (
                    <div className={`text-xs font-bold px-2 py-1 rounded-lg ${trend > 0 ? 'bg-emerald-500 text-white' : trend < 0 ? 'bg-rose-500 text-white' : 'bg-slate-300 text-slate-700'
                        }`}>
                        {trend > 0 ? '+' : ''}{trend}%
                    </div>
                )}
            </div>
            <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2">{title}</h3>
            <p className="text-4xl font-black text-slate-900 mb-1">{value}</p>
            <p className="text-xs text-slate-600 font-medium">{subtitle}</p>
        </div>
    );
};
