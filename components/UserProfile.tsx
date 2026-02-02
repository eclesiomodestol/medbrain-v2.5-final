import React, { useState, useRef } from 'react';
import { User } from '../types';
import { Camera, Save, Lock, User as UserIcon, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../supabase';

interface UserProfileProps {
    currentUser: User;
    onUpdateUser: (userId: string, data: Partial<User>) => Promise<void>;
}

export const UserProfile: React.FC<UserProfileProps> = ({ currentUser, onUpdateUser }) => {
    const [name, setName] = useState(currentUser.name);
    const [password, setPassword] = useState(currentUser.password);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [avatar, setAvatar] = useState(currentUser.avatar || '');

    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatar(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        setMessage(null);
        setIsSaving(true);

        try {
            const updates: Partial<User> = {
                name,
                avatar
            };

            if (newPassword) {
                if (newPassword !== confirmPassword) {
                    setMessage({ type: 'error', text: 'As senhas não coincidem.' });
                    setIsSaving(false);
                    return;
                }
                updates.password = newPassword;
            }

            await onUpdateUser(currentUser.id, updates);
            setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Erro ao atualizar perfil.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in pb-20">

            {/* Header */}
            <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 flex items-center gap-6">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-50 bg-slate-100">
                        {avatar ? (
                            <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <UserIcon size={40} />
                            </div>
                        )}
                    </div>
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="text-white" size={24} />
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Meu Perfil</h1>
                    <p className="text-slate-500 font-medium">Gerencie suas informações pessoais e segurança.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Personal Info */}
                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <UserIcon size={20} />
                        </div>
                        <h2 className="text-lg font-black uppercase tracking-widest text-slate-700">Informações Pessoais</h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nome Completo</label>
                            <input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-700"
                                placeholder="Seu nome"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email (Login)</label>
                            <input
                                value={currentUser.username}
                                disabled
                                className="w-full p-4 bg-slate-100 border border-slate-200 rounded-xl outline-none font-bold text-slate-500 cursor-not-allowed"
                            />
                        </div>
                    </div>
                </div>

                {/* Security */}
                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                            <Lock size={20} />
                        </div>
                        <h2 className="text-lg font-black uppercase tracking-widest text-slate-700">Segurança</h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nova Senha</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-700"
                                placeholder="Deixe em branco para manter"
                            />
                        </div>
                        {newPassword && (
                            <div className="animate-in slide-in-from-top-2">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Confirmar Senha</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    className={`w-full p-4 bg-slate-50 border rounded-xl outline-none font-bold text-slate-700 ${confirmPassword && newPassword !== confirmPassword ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-blue-500'}`}
                                    placeholder="Repita a nova senha"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
                {message && (
                    <div className={`px-6 py-3 rounded-2xl flex items-center gap-2 text-xs font-black uppercase tracking-widest ${message.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        {message.text}
                    </div>
                )}
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="ml-auto px-10 py-5 bg-[#0F172A] text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-70 flex items-center gap-3"
                >
                    {isSaving ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                    Salvar Alterações
                </button>
            </div>
        </div>
    );
};
