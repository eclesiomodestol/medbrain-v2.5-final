
import React from 'react';
import { User, Subject } from '../types';
import { UserCheck, UserX, Shield, Check, Info, LogIn, RotateCcw, Trash2 } from 'lucide-react';

interface UserManagementProps {
  users: User[];
  subjects: Subject[];
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
  onImpersonate?: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onResetPassword: (userId: string) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ users, subjects, onUpdateUser, onImpersonate, onDeleteUser, onResetPassword }) => {
  const toggleSubject = (user: User, subjectId: string) => {
    let current = user.accessibleSubjects === 'all' ? subjects.map(s => s.id) : user.accessibleSubjects;

    if (current.includes(subjectId)) {
      current = current.filter(id => id !== subjectId);
    } else {
      current = [...current, subjectId];
    }

    onUpdateUser(user.id, { accessibleSubjects: current });
  };

  const setAccessAll = (user: User) => {
    onUpdateUser(user.id, { accessibleSubjects: 'all' });
  };

  const getSubjectLabel = (subject: Subject) => {
    if (subject.id === 'cm3') return 'CMIII';
    if (subject.id === 'cc3') return 'CCIII';
    if (subject.id === 'sc') return 'PEDIATRIA';
    return subject.name.split(' ')[0].toUpperCase();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-[#0F172A] tracking-tight">Gerenciamento de Usuários</h2>
          <p className="text-slate-500 font-medium">Aprove acessos e defina permissões por disciplina.</p>
        </div>
        <div className="p-5 bg-blue-50 rounded-3xl text-blue-600">
          <Shield size={32} />
        </div>
      </div>

      <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50/50 border-b border-slate-100">
            <tr>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuário</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Acesso por Disciplina</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50/30 transition-colors">
                <td className="px-8 py-6">
                  <div className="flex flex-col">
                    <span className="text-base font-bold text-slate-900">{user.name}</span>
                    <span className="text-xs text-slate-400 font-medium">{user.email}</span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className={`text-[10px] font-black px-3 py-1.5 rounded-full border uppercase tracking-widest ${user.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      user.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        'bg-rose-50 text-rose-600 border-rose-100'
                    }`}>
                    {user.status === 'active' ? 'Ativo' : user.status === 'pending' ? 'Pendente' : 'Bloqueado'}
                  </span>
                </td>
                <td className="px-8 py-6">
                  {user.role === 'admin' ? (
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-md">Controle Total</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setAccessAll(user)}
                        className={`text-[9px] font-black px-2 py-1 rounded-md border transition-all ${user.accessibleSubjects === 'all' ? 'bg-[#0F172A] text-white border-[#0F172A]' : 'bg-white text-slate-400 hover:border-slate-300'}`}
                      >
                        TODAS
                      </button>
                      {subjects.map(sub => {
                        const hasAccess = user.accessibleSubjects === 'all' || user.accessibleSubjects.includes(sub.id);
                        return (
                          <button
                            key={sub.id}
                            onClick={() => toggleSubject(user, sub.id)}
                            className={`text-[9px] font-black px-2 py-1 rounded-md border transition-all ${hasAccess ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-slate-300 border-slate-100'
                              }`}
                          >
                            {getSubjectLabel(sub)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {user.role !== 'admin' && user.status === 'active' && onImpersonate && (
                      <button
                        onClick={() => onImpersonate(user)}
                        className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                        title="Ver como este usuário"
                      >
                        <LogIn size={18} />
                      </button>
                    )}
                    {user.status !== 'active' && (
                      <button
                        onClick={() => onUpdateUser(user.id, { status: 'active' })}
                        className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                        title="Aprovar Usuário"
                      >
                        <UserCheck size={18} />
                      </button>
                    )}
                    {user.status === 'active' && user.role !== 'admin' && (
                      <button
                        onClick={() => onUpdateUser(user.id, { status: 'blocked' })}
                        className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-95"
                        title="Bloquear Usuário"
                      >
                        <UserX size={18} />
                      </button>
                    )}
                    {user.role !== 'admin' && (
                      <>
                        <button
                          onClick={() => onResetPassword(user.id)}
                          className="p-3 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-600 hover:text-white transition-all shadow-sm active:scale-95"
                          title="Redefinir Senha (12345)"
                        >
                          <RotateCcw size={18} />
                        </button>
                        <button
                          onClick={() => onDeleteUser(user.id)}
                          className="p-3 bg-rose-50 text-rose-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-95 group/del"
                          title="Excluir Usuário Permanentemente"
                        >
                          <Trash2 size={18} className="group-hover/del:animate-bounce" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-8 bg-blue-50/50 rounded-[40px] border border-blue-100 flex gap-4">
        <div className="p-3 bg-blue-100 rounded-2xl text-blue-600 shrink-0 h-fit">
          <Info size={20} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-blue-900 leading-relaxed uppercase tracking-tight">Dica de Administrador</p>
          <p className="text-xs text-blue-600 font-medium leading-relaxed">
            Use o ícone de <b>Login (Seta na Caixa)</b> ao lado de usuários ativos para testar instantaneamente a visão de aluno deles, sem precisar sair da conta.
          </p>
        </div>
      </div>
    </div>
  );
};
