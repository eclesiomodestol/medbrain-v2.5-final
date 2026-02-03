
import React, { useState } from 'react';
import { User } from '../types';
import { Mail, Lock, LogIn, Sparkles, BrainCircuit, Loader2, Database, CheckCircle, UserPlus, ArrowLeft } from 'lucide-react';
import { supabase } from '../supabase';


interface LoginProps {
  onLogin: (user: User) => void;
  users: User[];
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Force cleanup of potential stale Supabase sessions that cause 400/406 errors
  React.useEffect(() => {
    const cleanStaleSession = async () => {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        // Ignore error if already signed out
      }
    };
    cleanStaleSession();
  }, []);

  const handleLogin = async () => {
    const { data: user, error: queryError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();

    if (queryError || !user) {
      setError('E-mail ou senha incorretos ou usuário não cadastrado.');
      return;
    }

    if (user.status === 'pending') {
      setError('Sua conta foi criada com sucesso! Aguarde a aprovação do administrador para acessar.');
      return;
    }

    if (user.status === 'blocked') {
      setError('Seu acesso foi bloqueado. Entre em contato com o suporte.');
      return;
    }

    onLogin(user as User);
  };

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    // Verificar se usuário já existe
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      setError('Este e-mail já está cadastrado no sistema.');
      return;
    }

    const newUser = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      email,
      password,
      role: 'student',
      status: 'pending',
      accessible_subjects: []
    };

    const { error: regError } = await supabase.from('users').insert(newUser);

    if (regError) {
      setError('Erro ao criar conta. Tente novamente mais tarde.');
    } else {
      setSuccess('Conta criada com sucesso! Solicite ao administrador a liberação do seu acesso.');
      setIsRegistering(false);
      setName('');
      // Limpar erro para mostrar apenas sucesso
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      if (isRegistering) {
        await handleRegister();
      } else {
        await handleLogin();
      }
    } catch (err) {
      setError('Erro de conexão com o banco de dados. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-[40px] shadow-2xl border border-white p-12 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex justify-center mb-8">
              <div className="w-20 h-20 bg-[#0F172A] rounded-3xl flex items-center justify-center text-white shadow-xl">
                <BrainCircuit size={40} />
              </div>
            </div>

            <div className="text-center mb-10">
              <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">
                MedBrain <span className="text-blue-600">EM</span>
              </h1>
              <p className="text-slate-400 font-medium mt-2">
                {isRegistering ? 'Crie sua conta acadêmica' : 'Seu Segundo Cérebro Acadêmico'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {isRegistering && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-semibold transition-all"
                      placeholder="Ex: João da Silva"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Acadêmico</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input
                    type="email"
                    required
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-semibold transition-all"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input
                    type="password"
                    required
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-semibold transition-all"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600 text-xs font-bold animate-in fade-in slide-in-from-top-2 flex items-center gap-2">
                  <CheckCircle size={14} /> {success}
                </div>
              )}

              <div className="pt-2 space-y-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-5 bg-[#0F172A] text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    isRegistering ? <>Criar Minha Conta <UserPlus size={18} /></> : <>Acessar Plataforma <LogIn size={18} /></>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setError('');
                    setSuccess('');
                  }}
                  className="w-full py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                >
                  {isRegistering ? <><ArrowLeft size={14} /> Já tenho uma conta</> : <>Ainda não tenho conta • Cadastrar</>}
                </button>
              </div>
            </form>


          </div>

          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-600/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-slate-400">
          <Sparkles size={14} className="text-blue-500" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em]">MedBrain Engine v2.5.0</p>
        </div>
      </div>
    </div>
  );
};
