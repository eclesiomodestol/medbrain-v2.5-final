import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import {
    Users, Activity, Download, Smartphone, AlertTriangle,
    TrendingUp, BarChart3, PieChart, Clock
} from 'lucide-react';

interface AnalyticsStats {
    totalUsers: number;
    activeNow: number;
    activeToday: number;
    activeWeek: number;
    totalSessions: number;
    uniqueDevices: number;
    totalDownloads: number;
    concurrentAccess: number;
}

interface ModuleUsage {
    module: string;
    total_actions: number;
    unique_users: number;
}

interface DownloadStats {
    file_type: string;
    total_downloads: number;
    unique_users: number;
}

interface DeviceStats {
    browser: string;
    count: number;
}

interface ConcurrentSession {
    user_email: string;
    session_count: number;
    devices: string[];
}

export const AdminPanel: React.FC = () => {
    const [stats, setStats] = useState<AnalyticsStats>({
        totalUsers: 0,
        activeNow: 0,
        activeToday: 0,
        activeWeek: 0,
        totalSessions: 0,
        uniqueDevices: 0,
        totalDownloads: 0,
        concurrentAccess: 0
    });

    const [moduleUsage, setModuleUsage] = useState<ModuleUsage[]>([]);
    const [downloadStats, setDownloadStats] = useState<DownloadStats[]>([]);
    const [deviceStats, setDeviceStats] = useState<DeviceStats[]>([]);
    const [concurrentSessions, setConcurrentSessions] = useState<ConcurrentSession[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
        // Atualiza a cada 30 segundos
        const interval = setInterval(fetchAnalytics, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchAnalytics = async () => {
        try {
            await Promise.all([
                fetchGeneralStats(),
                fetchModuleUsage(),
                fetchDownloadStats(),
                fetchDeviceStats(),
                fetchConcurrentSessions()
            ]);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching analytics:', error);
            setLoading(false);
        }
    };

    const fetchGeneralStats = async () => {
        // Total de usuários (usar tabela users pública em vez de auth.users)
        const { count: totalUsers } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

        // Usuários ativos agora (últimos 5 minutos)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { count: activeNow } = await supabase
            .from('user_sessions')
            .select('user_id', { count: 'exact', head: true })
            .eq('is_active', true)
            .gte('last_activity', fiveMinutesAgo);

        // Usuários ativos hoje
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const { count: activeToday } = await supabase
            .from('user_sessions')
            .select('user_id', { count: 'exact', head: true })
            .gte('started_at', todayStart.toISOString());

        // Usuários ativos na semana
        const { count: activeWeek } = await supabase
            .from('user_sessions')
            .select('user_id', { count: 'exact', head: true })
            .gte('started_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

        // Total de sessões
        const { count: totalSessions } = await supabase
            .from('user_sessions')
            .select('*', { count: 'exact', head: true });

        // Dispositivos únicos
        const { data: devices } = await supabase
            .from('user_sessions')
            .select('device_fingerprint');
        const uniqueDevices = new Set(devices?.map(d => d.device_fingerprint)).size;

        // Total de downloads
        const { count: totalDownloads } = await supabase
            .from('download_logs')
            .select('*', { count: 'exact', head: true });

        // Acessos simultâneos
        const { data: concurrent } = await supabase
            .from('user_sessions')
            .select('user_id')
            .eq('is_active', true);

        const userCounts = concurrent?.reduce((acc: any, session) => {
            acc[session.user_id] = (acc[session.user_id] || 0) + 1;
            return acc;
        }, {});
        const concurrentAccess = Object.values(userCounts || {}).filter((count: any) => count > 1).length;

        setStats({
            totalUsers: totalUsers || 0,
            activeNow: activeNow || 0,
            activeToday: activeToday || 0,
            activeWeek: activeWeek || 0,
            totalSessions: totalSessions || 0,
            uniqueDevices,
            totalDownloads: totalDownloads || 0,
            concurrentAccess
        });
    };

    const fetchModuleUsage = async () => {
        const { data } = await supabase
            .from('activity_logs')
            .select('module, user_id')
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

        if (!data) return;

        const moduleMap = data.reduce((acc: any, log) => {
            if (!acc[log.module]) {
                acc[log.module] = { users: new Set(), count: 0 };
            }
            acc[log.module].users.add(log.user_id);
            acc[log.module].count++;
            return acc;
        }, {});

        const usage = Object.entries(moduleMap).map(([module, stats]: [string, any]) => ({
            module,
            total_actions: stats.count,
            unique_users: stats.users.size
        })).sort((a, b) => b.total_actions - a.total_actions);

        setModuleUsage(usage);
    };

    const fetchDownloadStats = async () => {
        const { data } = await supabase
            .from('download_logs')
            .select('file_type, user_id')
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        if (!data) return;

        const downloadMap = data.reduce((acc: any, log) => {
            if (!acc[log.file_type]) {
                acc[log.file_type] = { users: new Set(), count: 0 };
            }
            acc[log.file_type].users.add(log.user_id);
            acc[log.file_type].count++;
            return acc;
        }, {});

        const downloads = Object.entries(downloadMap).map(([file_type, stats]: [string, any]) => ({
            file_type,
            total_downloads: stats.count,
            unique_users: stats.users.size
        }));

        setDownloadStats(downloads);
    };

    const fetchDeviceStats = async () => {
        const { data } = await supabase
            .from('user_sessions')
            .select('device_info');

        if (!data) return;

        const browserMap = data.reduce((acc: any, session) => {
            const browser = session.device_info?.browser || 'Unknown';
            acc[browser] = (acc[browser] || 0) + 1;
            return acc;
        }, {});

        const devices = Object.entries(browserMap).map(([browser, count]) => ({
            browser,
            count: count as number
        })).sort((a, b) => b.count - a.count);

        setDeviceStats(devices);
    };

    const fetchConcurrentSessions = async () => {
        const { data: sessions } = await supabase
            .from('user_sessions')
            .select('user_id, device_info')
            .eq('is_active', true);

        if (!sessions) return;

        const userSessions = sessions.reduce((acc: any, session) => {
            if (!acc[session.user_id]) {
                acc[session.user_id] = [];
            }
            acc[session.user_id].push(session.device_info?.browser || 'Unknown');
            return acc;
        }, {});

        const concurrent = Object.entries(userSessions)
            .filter(([_, devices]: [string, any]) => devices.length > 1)
            .map(([user_id, devices]: [string, any]) => ({
                user_email: user_id, // Idealmente buscar email do usuário
                session_count: devices.length,
                devices
            }));

        setConcurrentSessions(concurrent);
    };

    const getModuleIcon = (module: string) => {
        switch (module.toLowerCase()) {
            case 'dashboard': return '📊';
            case 'grades': return '📝';
            case 'exams': return '📅';
            case 'content': return '📚';
            case 'internships': return '🏥';
            default: return '📌';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600 font-medium">Carregando analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight">Painel de Analytics</h1>
                    <p className="text-sm text-slate-600 font-medium mt-1">Monitoramento em tempo real do sistema</p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-bold text-emerald-700 uppercase">Ao Vivo</span>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={<Users className="text-blue-600" size={24} />}
                    title="Usuários Ativos Agora"
                    value={stats.activeNow}
                    subtitle={`${stats.totalUsers} total`}
                    color="blue"
                />
                <StatCard
                    icon={<Activity className="text-emerald-600" size={24} />}
                    title="Ativos Hoje"
                    value={stats.activeToday}
                    subtitle={`${stats.activeWeek} esta semana`}
                    color="emerald"
                />
                <StatCard
                    icon={<Download className="text-purple-600" size={24} />}
                    title="Total de Downloads"
                    value={stats.totalDownloads}
                    subtitle="Últimos 30 dias"
                    color="purple"
                />
                <StatCard
                    icon={<Smartphone className="text-amber-600" size={24} />}
                    title="Dispositivos Únicos"
                    value={stats.uniqueDevices}
                    subtitle={`${stats.totalSessions} sessões`}
                    color="amber"
                />
            </div>

            {/* Concurrent Access Alert */}
            {stats.concurrentAccess > 0 && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-6 flex items-center gap-4">
                    <div className="p-3 bg-amber-100 rounded-2xl">
                        <AlertTriangle className="text-amber-600" size={24} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-amber-900 uppercase">Acessos Simultâneos Detectados</h3>
                        <p className="text-xs text-amber-700 font-medium">
                            {stats.concurrentAccess} usuário(s) com múltiplas sessões ativas
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Module Usage */}
                <div className="bg-white rounded-[40px] border shadow-sm p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-blue-100 rounded-2xl">
                            <BarChart3 className="text-blue-600" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase">Ferramentas Mais Usadas</h2>
                            <p className="text-xs text-slate-600 font-medium">Últimos 7 dias</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {moduleUsage.slice(0, 5).map((module, idx) => (
                            <div key={module.module} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{getModuleIcon(module.module)}</span>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 capitalize">{module.module}</p>
                                        <p className="text-xs text-slate-600">{module.unique_users} usuários</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-blue-600">{module.total_actions}</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">Ações</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Downloads */}
                <div className="bg-white rounded-[40px] border shadow-sm p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-purple-100 rounded-2xl">
                            <Download className="text-purple-600" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase">Downloads por Tipo</h2>
                            <p className="text-xs text-slate-600 font-medium">Últimos 30 dias</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {downloadStats.map((download) => (
                            <div key={download.file_type} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                <div>
                                    <p className="text-sm font-bold text-slate-900 uppercase">{download.file_type}</p>
                                    <p className="text-xs text-slate-600">{download.unique_users} usuários</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-purple-600">{download.total_downloads}</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">Total</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Device Stats */}
                <div className="bg-white rounded-[40px] border shadow-sm p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-amber-100 rounded-2xl">
                            <Smartphone className="text-amber-600" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase">Dispositivos</h2>
                            <p className="text-xs text-slate-600 font-medium">Por navegador</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {deviceStats.slice(0, 5).map((device) => (
                            <div key={device.browser} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                <p className="text-sm font-bold text-slate-900">{device.browser}</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-amber-500"
                                            style={{ width: `${(device.count / deviceStats[0].count) * 100}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-sm font-black text-amber-600 w-12 text-right">{device.count}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Concurrent Sessions */}
                <div className="bg-white rounded-[40px] border shadow-sm p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-red-100 rounded-2xl">
                            <AlertTriangle className="text-red-600" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase">Acessos Simultâneos</h2>
                            <p className="text-xs text-slate-600 font-medium">Sessões ativas agora</p>
                        </div>
                    </div>
                    {concurrentSessions.length > 0 ? (
                        <div className="space-y-3">
                            {concurrentSessions.map((session, idx) => (
                                <div key={idx} className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                                    <p className="text-sm font-bold text-red-900 mb-2">Usuário: {session.user_email.substring(0, 8)}...</p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {session.devices.map((device, i) => (
                                            <span key={i} className="text-xs bg-white px-2 py-1 rounded font-medium text-red-700">
                                                {device}
                                            </span>
                                        ))}
                                    </div>
                                    <p className="text-xs text-red-600 font-bold mt-2">{session.session_count} sessões ativas</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-sm text-slate-500 font-medium">Nenhum acesso simultâneo detectado</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface StatCardProps {
    icon: React.ReactNode;
    title: string;
    value: number;
    subtitle: string;
    color: 'blue' | 'emerald' | 'purple' | 'amber';
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, subtitle, color }) => {
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
            </div>
            <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2">{title}</h3>
            <p className="text-4xl font-black text-slate-900 mb-1">{value}</p>
            <p className="text-xs text-slate-600 font-medium">{subtitle}</p>
        </div>
    );
};
