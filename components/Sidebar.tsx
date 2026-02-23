
import React from 'react';
import { LayoutDashboard, Calendar, BookOpen, GraduationCap, Settings, User, MapPin, BrainCircuit, Users, LogOut, FileSpreadsheet, BarChart3, Timer } from 'lucide-react';
import { User as UserType } from '../types';

import { useActivityTracker } from '../hooks/useActivityTracker';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  currentUser: UserType | null;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, currentUser, onLogout, isOpen, onClose }) => {
  const { trackButtonClick } = useActivityTracker('navigation', currentUser?.id);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'weekly-schedule', label: 'Cronograma da Semana', icon: Calendar },
    { id: 'schedule', label: 'Grade Curricular', icon: LayoutDashboard }, // using different icon or repurposed name
    { id: 'estagio', label: 'Estágios', icon: MapPin },
    { id: 'syllabus', label: 'Conteúdos', icon: BookOpen },
    { id: 'quiz', label: 'Simulados IA', icon: BrainCircuit },
    { id: 'exams', label: 'Calendário de Provas', icon: GraduationCap },
    { id: 'grades', label: 'Minhas Notas', icon: FileSpreadsheet },
    { id: 'study', label: 'Estudo Pomodoro', icon: Timer },
  ];

  if (currentUser?.role === 'admin') {
    menuItems.push({ id: 'admin', label: 'Analytics', icon: BarChart3 });
    menuItems.push({ id: 'users', label: 'Gerenciamento', icon: Users });
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[45] lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`fixed left-0 top-0 bottom-0 w-64 bg-[#0F172A] text-white flex flex-col z-50 transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-sm">MB</span>
            MedBrain <span className="text-blue-500">EM</span>
          </h1>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                onClose();
                trackButtonClick(item.id);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === item.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
            >
              <item.icon size={20} />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-800">
          <div
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer hover:bg-slate-800 transition-all group ${activeTab === 'profile' ? 'bg-slate-800' : ''}`}
          >
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-lg overflow-hidden">
              {currentUser?.avatar ? (
                <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                currentUser?.name?.charAt(0)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate group-hover:text-blue-400 transition-colors">{currentUser?.name || 'Visitante'}</p>
              <p className="text-[10px] uppercase font-black tracking-wider text-slate-500">Editar Perfil</p>
            </div>
            <LogOut
              size={18}
              className="text-slate-500 hover:text-rose-500 transition-colors cursor-pointer"
              onClick={(e) => { e.stopPropagation(); onLogout(); }}
            />
          </div>
        </div>
      </aside>
    </>
  );
};
