
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Schedule } from './components/Schedule';
import { WeeklySchedule } from './components/WeeklySchedule';
import { ContentTracker } from './components/ContentTracker';
import { ExamsPanel } from './components/ExamsPanel';
import { Internships } from './components/Internships';
import { QuizGenerator } from './components/QuizGenerator';
import { Login } from './components/Login';
import { UserManagement } from './components/UserManagement';
import { UserProfile } from './components/UserProfile';
import { GradesPanel } from './components/GradesPanel';
import { AdminPanel } from './components/AdminPanel';
import { PomodoroTimer } from './components/PomodoroTimer';
import { StudyReports } from './components/StudyReports';
import { PomodoroProvider } from './contexts/PomodoroContext';
import { useSessionManager } from './hooks/useSessionManager';
import { supabase } from './supabase';
import { Topic, ContentStatus, ExamTag, Subject, StudentProgress, User, Exam, Internship, Grade, ScheduleEntry, Quiz } from './types';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('medbrain_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [deletingItem, setDeletingItem] = useState<{ id: string, type: 'schedule' | 'internship' | 'topic' | 'pdf' | 'exam' | 'user' | 'subject' } | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'weekly-schedule' | 'schedule' | 'syllabus' | 'exams' | 'estagio' | 'quiz' | 'users' | 'grades' | 'profile' | 'admin' | 'study'>('dashboard');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [scheduleData, setScheduleData] = useState<ScheduleEntry[]>([]);
  const [examsData, setExamsData] = useState<Exam[]>([]);
  const [subjectsState, setSubjectsState] = useState<Subject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [quizHistory, setQuizHistory] = useState<Quiz[]>([]);
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);

  // Initialize session tracking
  useSessionManager(currentUser?.id);

  // Centralized Error Handler
  const handleSupabaseError = (err: any, context: string) => {
    console.error(`Erro em ${context}:`, err);

    if (err.name === 'TypeError' && err.message === 'Load failed') {
      alert(`🛑 Conexão Bloqueada (${context})!\n\nSeu navegador ou uma extensão (AdBlock, Privacy Badger, etc) está bloqueando a conexão com o banco de dados.\n\nSOLUÇÃO:\n1. Desative o AdBlock para este site.\n2. Verifique se seu Firewall permite conexões com supabase.co.\n3. Tente usar uma janela anônima.`);
    } else if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('Network request failed'))) {
      alert(`Erro de conexão em ${context}: Verifique sua internet.`);
    } else {
      alert(`Erro em ${context}: ${err.message || 'Erro desconhecido'}`);
    }
  };

  const fetchAllData = async () => {
    if (!currentUser) return;
    try {
      const promises = [
        supabase.from('subjects').select('*').eq('institution', currentUser.institution || 'FMJ IDOMED - Juazeiro do Norte'),
        supabase.from('topics').select('*').eq('institution', currentUser.institution || 'FMJ IDOMED - Juazeiro do Norte'),
        supabase.from('schedule').select('*').eq('institution', currentUser.institution || 'FMJ IDOMED - Juazeiro do Norte').or(`user_id.eq.${currentUser.id},user_id.is.null`).throwOnError(),
        supabase.from('exams').select('*').eq('institution', currentUser.institution || 'FMJ IDOMED - Juazeiro do Norte'),
        supabase.from('internships').select('id, title, local, location, evolution_model, status').eq('institution', currentUser.institution || 'FMJ IDOMED - Juazeiro do Norte'),
        supabase.from('users').select('*').eq('institution', currentUser.institution || 'FMJ IDOMED - Juazeiro do Norte'),
        supabase.from('grades').select('*').or(`user_id.eq.${currentUser.id},user_id.is.null`),
        supabase.from('quizzes').select('*').eq('institution', currentUser.institution || 'FMJ IDOMED - Juazeiro do Norte').or(`user_id.eq.${currentUser.id},user_id.is.null`).order('created_at', { ascending: false })
      ];

      // Fetch progress (only relevant for non-admins usually, but good to have)
      // If we are student, we need OUR progress.
      if (currentUser.role !== 'admin') {
        promises.push(supabase.from('student_progress').select('*').or(`user_id.eq.${currentUser.id},user_id.is.null`));
      }

      const results = await Promise.all(promises);

      const subjs = results[0].data;
      const tops = results[1].data;
      const sched = results[2].data;
      const exms = results[3].data;
      const ints = results[4].data;
      const usrs = results[5].data;
      const grds = results[6].data;
      const qzs = results[7].data;
      const prog = results[8]?.data;

      if (subjs) setSubjectsState(subjs);
      if (tops) {
        setTopics(tops.map(t => ({
          ...t,
          subjectId: t.subject_id,
          hasMedia: t.has_media,
          pdfUrl: t.pdf_url,
          pdfSummary: t.pdf_summary,
          createdAt: t.created_at
        })));
      }
      if (sched) setScheduleData(sched.map(s => ({ ...s, subjectId: s.subject_id })));
      if (exms) {
        setExamsData(exms.map(e => {
          let title = e.title;
          let time = '';
          let shift = '';
          let associatedTag = ExamTag.NONE;
          try {
            if (title && title.startsWith('{')) {
              const p = JSON.parse(title);
              title = p.text || title;
              time = p.time || '';
              shift = p.shift || '';
              associatedTag = p.associatedTag || ExamTag.NONE;
            }
          } catch (err) { /* fallback to raw title */ }
          return {
            ...e,
            subjectId: e.subject_id,
            title,
            time,
            shift,
            associatedTag
          };
        }));
      }
      if (ints) {
        setInternships(ints.map((i: any) => {
          const unpacked = {
            ...i,
            evolutionModel: i.evolution_model
          };

          if (i.evolution_model && typeof i.evolution_model === 'string' && i.evolution_model.startsWith('{"p":true')) {
            try {
              const p = JSON.parse(i.evolution_model);
              unpacked.schedule = p.s;
              unpacked.location = p.l;
              unpacked.uid = p.uid;
            } catch (e) { console.error("Error unpacking internship:", e); }
          }

          return unpacked as Internship;
        }));
      }

      if (usrs) {
        const mappedUsers = usrs.map(u => ({ ...u, accessibleSubjects: u.accessible_subjects || [] }));
        setUsers(mappedUsers);

        // Sync currentUser with latest DB data to ensure permissions/visibility are up to date
        const me = mappedUsers.find(u => u.id === currentUser.id);
        if (me) {
          // Compare to avoid unnecessary re-renders loop if relying on obj ref
          // But here we just update if deep check implies change, or just update localstorage
          if (JSON.stringify(me.accessibleSubjects) !== JSON.stringify(currentUser.accessibleSubjects) || me.role !== currentUser.role) {
            const updated = { ...currentUser, ...me };
            setCurrentUser(updated);
            localStorage.setItem('medbrain_user', JSON.stringify(updated));
          }
        }
      }

      if (grds) {
        setGrades(grds.map(g => ({
          ...g,
          subjectId: g.subject_id,
          userId: g.user_id,
          frontGrades: g.front_grades
        })));
      }
      if (qzs) {
        setQuizHistory(qzs.map(q => ({
          ...q,
          userId: q.user_id,
          createdAt: q.created_at
        })));
      }
      if (prog) {
        setStudentProgress(prog);
      }
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      alert(`Erro ao sincronizar dados: ${error.message || 'Erro desconhecido'}`);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [currentUser?.id, activeTab]);

  const handleLogout = () => {
    localStorage.removeItem('medbrain_user');
    setCurrentUser(null);
    setStudentProgress([]); // Clear progress to prevent leak to next user
    setGrades([]);
    setQuizHistory([]);
  };

  const handleLogin = (user: User) => {
    localStorage.setItem('medbrain_user', JSON.stringify(user));
    setCurrentUser(user);
  };


  // Define subspecialties mapping
  const SUBJECT_SUBSPECIALTIES: Record<string, string[]> = useMemo(() => ({
    'cm3': ['Neurologia', 'Hematologia', 'Dermatologia'],
    'cc3': ['Otorrino', 'Ortopedia', 'Oftalmo']
  }), []);

  const isAccessible = useCallback((subjectId: string, front?: string) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (currentUser.accessibleSubjects === 'all') return true;

    if (Array.isArray(currentUser.accessibleSubjects)) {
      // Check if user has full access to the subject
      if (currentUser.accessibleSubjects.includes(subjectId)) return true;

      // Check if user has access to the specific subspecialty
      if (front && currentUser.accessibleSubjects.includes(front)) return true;

      // Special case for Sidebar/Navigation visibility:
      // If we are just checking subject access (no front specified), 
      // allow if user has access to AT LEAST ONE subspecialty of this subject
      if (!front) {
        const subs = SUBJECT_SUBSPECIALTIES[subjectId];
        if (subs && subs.some(s => currentUser.accessibleSubjects.includes(s))) return true;
      }
    }

    return false;
  }, [currentUser, SUBJECT_SUBSPECIALTIES]);

  const filteredTopics = useMemo(() => topics.filter(t => isAccessible(t.subjectId, t.front)), [topics, isAccessible]);

  const uploadPDF = useCallback(async (topicId: string, file: File, summary: string) => {
    const fileName = `med_${topicId}_${Date.now()}.pdf`;
    try {
      const { error: storageError } = await supabase.storage
        .from('materials')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (storageError) throw storageError;

      const { data: { publicUrl } } = supabase.storage
        .from('materials')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('topics')
        .update({ has_media: true, pdf_url: publicUrl, pdf_summary: summary })
        .eq('id', topicId);

      if (dbError) throw dbError;

      setTopics(prev => prev.map(t =>
        t.id === topicId ? { ...t, hasMedia: true, pdfUrl: publicUrl, pdfSummary: summary } : t
      ));
    } catch (err: any) {
      handleSupabaseError(err, "Upload de PDF");
    }
  }, []);

  const deletePDF = useCallback(async (topicId: string) => {
    setDeletingItem({ id: topicId, type: 'pdf' });
  }, []);

  const handleDeleteTopic = useCallback(async (topicId: string) => {
    setDeletingItem({ id: topicId, type: 'topic' });
  }, []);

  const handleUpdateGrades = async (grade: Grade) => {
    try {
      const dbPayload = {
        id: grade.id,
        user_id: currentUser?.id,
        subject_id: grade.subjectId,
        pr1: grade.pr1,
        pr2: grade.pr2,
        sub: grade.sub,
        front_grades: grade.frontGrades
      };

      const { error } = await supabase.from('grades').upsert(dbPayload);
      if (error) throw error;

      setGrades(prev => {
        const index = prev.findIndex(g => g.id === grade.id);
        if (index >= 0) {
          const newGrades = [...prev];
          newGrades[index] = grade;
          return newGrades;
        }
        return [...prev, grade];
      });
    } catch (err: any) {
      handleSupabaseError(err, "Salvar Notas");
    }
  };

  const handleSaveQuiz = async (quiz: Quiz) => {
    try {
      const { error } = await supabase.from('quizzes').insert({
        id: quiz.id,
        user_id: currentUser?.id,
        title: quiz.title,
        questions: quiz.questions,
        created_at: quiz.createdAt,
        institution: currentUser?.institution || 'FMJ IDOMED - Juazeiro do Norte'
      });
      if (error) throw error;
      setQuizzes(prev => [...prev, quiz]);
      setQuizHistory(prev => [quiz, ...prev]);
    } catch (err: any) {
      handleSupabaseError(err, "Salvar Simulado");
    }
  };

  const handleAddSubject = async (subject: Subject) => {
    setSubjectsState(prev => [...prev, subject]);
    try {
      const { error } = await supabase.from('subjects').insert({
        id: subject.id,
        name: subject.name,
        color: subject.color,
        institution: currentUser?.institution || 'FMJ IDOMED - Juazeiro do Norte'
      });
      if (error) throw error;
    } catch (err: any) {
      setSubjectsState(prev => prev.filter(s => s.id !== subject.id));
      handleSupabaseError(err, "Adicionar Disciplina");
    }
  };

  const handleUpdateExam = async (exam: Exam) => {
    // Optimistic Update
    setExamsData(prev => {
      const idx = prev.findIndex(e => e.id === exam.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = exam;
        return copy;
      }
      return [...prev, exam];
    });

    try {
      // Pack Data into Title
      const packedTitle = JSON.stringify({
        text: exam.title,
        time: exam.time,
        shift: exam.shift,
        associatedTag: exam.associatedTag
      });

      const dbPayload = {
        id: exam.id,
        title: packedTitle,
        date: exam.date,
        subject_id: exam.subjectId,
        institution: currentUser.institution || 'FMJ IDOMED - Juazeiro do Norte',
        weight: exam.weight
      };

      const { error } = await supabase.from('exams').upsert(dbPayload);
      if (error) throw error;
    } catch (err: any) {
      handleSupabaseError(err, "Salvar Prova");
      // Rollback optional but skipping for simplicity
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      const { error } = await supabase.from('users').update({ password: '12345' }).eq('id', userId);
      if (error) throw error;
      alert("Senha redefinida para 12345 com sucesso!");
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, password: '12345' } : u));
    } catch (err: any) {
      handleSupabaseError(err, "Redefinir Senha");
    }
  };

  const handleDeleteExam = (examId: string) => {
    setDeletingItem({ id: examId, type: 'exam' });
  };

  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    try {
      // Map frontend camelCase to DB snake_case for specific fields if needed
      const dbUpdates: any = { ...updates };
      if (updates.accessibleSubjects) {
        dbUpdates.accessible_subjects = updates.accessibleSubjects;
        delete dbUpdates.accessibleSubjects;
      }

      // Update database
      const { error } = await supabase.from('users').update(dbUpdates).eq('id', userId);

      if (error) {
        throw error;
      }

      // Update local state
      const updatedUserFn = (u: User) => u.id === userId ? { ...u, ...updates } : u;

      setUsers(prev => prev.map(updatedUserFn));

      if (currentUser && currentUser.id === userId) {
        const updated = { ...currentUser, ...updates };
        setCurrentUser(updated);
        localStorage.setItem('medbrain_user', JSON.stringify(updated));
      }

    } catch (err: any) {
      handleSupabaseError(err, "Atualizar Perfil");
      // Rollback logic (simple refresh from session/storage if needed, or just let user retry)
    }
  };

  const handleUpdateContentStatus = async (topicId: string, status: ContentStatus) => {
    if (!currentUser) return;

    try {
      if (currentUser.role === 'admin') {
        await supabase.from('topics').update({ status }).eq('id', topicId);
        setTopics(prev => prev.map(t => t.id === topicId ? { ...t, status } : t));
      } else {
        // Student Progress
        const { error } = await supabase.from('student_progress').upsert({
          user_id: currentUser.id,
          topic_id: topicId,
          status: status,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,topic_id' });

        if (error) throw error;

        setStudentProgress(prev => {
          const idx = prev.findIndex(p => p.topic_id === topicId);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], status };
            return copy;
          }
          return [...prev, { id: 'temp_' + Date.now(), user_id: currentUser.id, topic_id: topicId, status, updated_at: new Date().toISOString() }];
        });
      }

    } catch (err: any) {
      handleSupabaseError(err, "Atualizar Status");
      // Rollback optimistic update
      setStudentProgress(prev => prev.filter(p => p.topic_id !== topicId)); // Simple rollback attempt or reload
    }
  };

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingItem || !currentUser) return;

    const { id, type } = deletingItem;
    setDeletingItem(null); // Close modal immediately

    console.log(`Attempting to delete ${type} item:`, id);

    if (deletingItem.type === 'topic') handleDeleteTopic(deletingItem.id);
    if (deletingItem.type === 'exam') handleDeleteExam(deletingItem.id);
    if (deletingItem.type === 'schedule') {
      const prev = [...scheduleData];
      setScheduleData(prevData => prevData.filter(s => s.id !== deletingItem.id));
      supabase.from('schedule').delete().eq('id', deletingItem.id).then(({ error }) => {
        if (error) { setScheduleData(prev); alert("Falha ao excluir."); }
      });
    }
    if (deletingItem.type === 'internship') {
      const prev = [...internships];
      setInternships(p => p.filter(i => i.id !== deletingItem.id));
      supabase.from('internships').delete().eq('id', deletingItem.id).then(({ error }) => {
        if (error) { setInternships(prev); alert("Falha ao excluir estágio."); }
      });
    }
    if (type === 'user') {
      const previousUsers = users;
      setUsers(prev => prev.filter(u => u.id !== id));
      try {
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) {
          setUsers(previousUsers);
          throw error;
        }
      } catch (err: any) {
        handleSupabaseError(err, "Excluir Usuário");
      }
    } else if (type === 'pdf') {
      const topic = topics.find(t => t.id === id);
      if (!topic || !topic.pdfUrl) return;

      try {
        const urlPath = new URL(topic.pdfUrl).pathname;
        const fileName = urlPath.split('/').pop();

        if (fileName) {
          await supabase.storage.from('materials').remove([fileName]);
        }

        const { error: dbError } = await supabase
          .from('topics')
          .update({ has_media: false, pdf_url: null, pdf_summary: null })
          .eq('id', id);

        if (dbError) throw dbError;

        setTopics(prev => prev.map(t =>
          t.id === id
            ? { ...t, hasMedia: false, pdfUrl: undefined, pdfSummary: undefined }
            : t
        ));
      } catch (err: any) {
        handleSupabaseError(err, "Remover Arquivo");
      }
    } else if (type === 'topic') {
      try {
        // 1. Get Topic Details for Storage Cleanup
        const topic = topics.find(t => t.id === id);

        // 2. Delete File from Storage if exists
        if (topic && topic.pdfUrl) {
          try {
            const urlPath = new URL(topic.pdfUrl).pathname;
            const fileName = urlPath.split('/').pop();
            if (fileName) {
              await supabase.storage.from('materials').remove([fileName]);
            }
          } catch (e) { console.error("Storage cleanup warn:", e); }
        }

        // 3. Delete Related Progress (Manual Cascade)
        await supabase.from('student_progress').delete().eq('topic_id', id);

        // 4. Delete the Topic
        const { error } = await supabase.from('topics').delete().eq('id', id);
        if (error) throw error;

        // 5. Update State
        setTopics(prev => prev.filter(t => t.id !== id));
        setStudentProgress(prev => prev.filter(p => p.topic_id !== id));

      } catch (err: any) {
        handleSupabaseError(err, "Excluir Conteúdo");
      }
    } else if (type === 'subject') {
      const previousSubjects = subjectsState;
      setSubjectsState(prev => prev.filter(s => s.id !== id));
      try {
        const { error } = await supabase.from('subjects').delete().eq('id', id);
        if (error) {
          setSubjectsState(previousSubjects);
          throw error;
        }
      } catch (err: any) {
        handleSupabaseError(err, "Excluir Disciplina");
      }
    }
  }, [deletingItem, currentUser, topics, scheduleData, internships, users, examsData, subjectsState]);

  if (!currentUser) return <Login onLogin={handleLogin} users={users} />;

  return (
    <PomodoroProvider currentUser={currentUser}>
      <div className="flex min-h-screen bg-[#F3F4F6]">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentUser={currentUser}
          onLogout={handleLogout}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Floating Pomodoro Timer */}
        <PomodoroTimer subjects={subjectsState} subspecialties={SUBJECT_SUBSPECIALTIES} />

        <main className="flex-1 p-4 lg:p-8 lg:ml-64 overflow-y-auto">
          <header className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
              >
                <Menu size={24} />
              </button>
              <div className="space-y-1">
                <h1 className="text-3xl font-black text-[#0F172A] tracking-tight capitalize">
                  {activeTab === 'exams' ? 'Calendário de Provas' : activeTab === 'syllabus' ? 'Ementa e Conteúdos' : activeTab === 'schedule' ? 'Horário Fixo' : activeTab === 'weekly-schedule' ? 'Cronograma da Semana' : activeTab.replace('-', ' ')}
                </h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  MedBrain Engine v2.5 • Ciclo Clínico (7º Semestre)
                </p>
              </div>
            </div>
          </header>

          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {activeTab === 'dashboard' && (
              <Dashboard
                topics={filteredTopics}
                subjects={subjectsState}
                studentProgress={studentProgress}
                schedule={scheduleData}
                exams={examsData}
                quizzes={quizzes}
                currentUser={currentUser}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === 'weekly-schedule' && (
              <WeeklySchedule
                topics={filteredTopics}
                subjects={subjectsState}
                exams={examsData}
                internships={internships}
                studentProgress={studentProgress}
                onUpdateStatus={handleUpdateContentStatus}
                isAdmin={currentUser.role === 'admin'}
              />
            )}

            {activeTab === 'syllabus' && (
              <ContentTracker
                topics={filteredTopics}
                subjects={subjectsState}
                quizzes={quizzes}
                currentUser={currentUser}
                studentProgress={studentProgress}
                onUpdateStatus={handleUpdateContentStatus}
                onUpdateTopic={async (updated) => {
                  setTopics(prev => prev.map(t => t.id === updated.id ? updated : t));
                  try {
                    const payload = {
                      title: updated.title,
                      subject_id: updated.subjectId,
                      date: updated.date,
                      shift: updated.shift,
                      tag: updated.tag,
                      front: updated.front
                    };

                    let { error } = await supabase.from('topics').update(payload).eq('id', updated.id);

                    // Fallback if column 'shift' doesn't exist yet
                    if (error && (error as any).code === '42703') {
                      const safePayload = { ...payload };
                      delete (safePayload as any).shift;
                      const { error: retryError } = await supabase.from('topics').update(safePayload).eq('id', updated.id);
                      if (retryError) {
                        alert(`Erro ao atualizar (retry): ${retryError.message}`);
                      }
                    } else if (error) {
                      alert(`Erro ao atualizar: ${error.message}`);
                    }
                  } catch (e: any) {
                    alert(`Erro inesperado na atualização: ${e.message}`);
                  }
                }}
                onUploadPDF_New={uploadPDF}
                onDeletePDF={deletePDF}
                onAddTopic={async (newTopic) => {
                  // Optimistic update
                  setTopics(prev => [...prev, newTopic]);

                  try {
                    const dbPayload = {
                      id: newTopic.id,
                      title: newTopic.title,
                      subject_id: newTopic.subjectId,
                      date: newTopic.date,
                      shift: newTopic.shift,
                      tag: newTopic.tag,
                      front: newTopic.front,
                      status: ContentStatus.PENDENTE,
                      has_media: false,
                      institution: currentUser.institution || 'FMJ IDOMED - Juazeiro do Norte'
                    };

                    console.log('Tentando inserir conteúdo:', dbPayload);

                    let { error } = await supabase.from('topics').insert(dbPayload);

                    // Fallback if column 'shift' doesn't exist yet
                    if (error && (error as any).code === '42703') {
                      console.log('Coluna shift não existe, tentando sem ela...');
                      const safePayload = { ...dbPayload };
                      delete (safePayload as any).shift;
                      const { error: retryError } = await supabase.from('topics').insert(safePayload);
                      if (retryError) {
                        console.error('Erro no retry:', retryError);
                        throw new Error(`Erro ao criar conteúdo (retry): ${retryError.message}`);
                      }
                    } else if (error) {
                      console.error('Erro ao inserir:', error);
                      throw error; // Throw the original error object, don't wrap it
                    }

                    console.log('Conteúdo criado com sucesso!');
                  } catch (e: any) {
                    console.error('Erro capturado:', e);
                    // Rollback optimistic update
                    setTopics(prev => prev.filter(t => t.id !== newTopic.id));

                    // User-friendly error message
                    if (e.name === 'TypeError' && e.message === 'Load failed') {
                      alert('🛑 Erro de Conexão Bloqueada!\n\nSeu navegador ou uma extensão (AdBlock, Privacy Badger, etc) está bloqueando a conexão com o banco de dados.\n\nSOLUÇÃO:\n1. Desative o AdBlock para este site.\n2. Verifique se seu Firewall permite conexões com supabase.co.\n3. Tente usar uma janela anônima.');
                    } else if (e.message && (e.message.includes('Failed to fetch') || e.message.includes('Network request failed'))) {
                      alert('Erro de conexão: Verifique sua internet e se o Supabase está acessível.');
                    } else {
                      alert(`Erro ao criar conteúdo: ${e.message || 'Erro desconhecido'}`);
                    }
                  }
                }}
                onBulkImport={async (newTopics) => {
                  // Optimistic update
                  setTopics(prev => [...prev, ...newTopics]);

                  try {
                    const dbPayloads = newTopics.map(topic => ({
                      id: topic.id,
                      title: topic.title,
                      subject_id: topic.subjectId,
                      date: topic.date,
                      shift: topic.shift,
                      tag: topic.tag,
                      front: topic.front,
                      status: ContentStatus.PENDENTE,
                      has_media: false,
                      institution: currentUser.institution || 'FMJ IDOMED - Juazeiro do Norte'
                    }));

                    console.log(`Tentando inserir ${dbPayloads.length} conteúdos em lote...`);

                    let { error } = await supabase.from('topics').insert(dbPayloads);

                    // Fallback if column 'shift' doesn't exist yet
                    if (error && (error as any).code === '42703') {
                      console.log('Coluna shift não existe, tentando sem ela...');
                      const safePayloads = dbPayloads.map(p => {
                        const safe = { ...p };
                        delete (safe as any).shift;
                        return safe;
                      }
                      );
                      const { error: retryError } = await supabase.from('topics').insert(safePayloads);
                      if (retryError) {
                        console.error('Erro no retry:', retryError);
                        throw new Error(`Erro ao importar conteúdos (retry): ${retryError.message}`);
                      }
                    } else if (error) {
                      console.error('Erro ao inserir em lote:', error);
                      throw new Error(`Erro ao importar conteúdos: ${error.message}`);
                    }

                    console.log(`${dbPayloads.length} conteúdos importados com sucesso!`);
                    alert(`✅ ${dbPayloads.length} conteúdos importados com sucesso!`);
                  } catch (e: any) {
                    console.error('Erro capturado:', e);
                    // Rollback optimistic update
                    const newIds = newTopics.map(t => t.id);
                    setTopics(prev => prev.filter(t => !newIds.includes(t.id)));

                    // User-friendly error message
                    if (e.message && e.message.includes('Failed to fetch')) {
                      alert('Erro de conexão: Verifique sua internet e se o Supabase está configurado corretamente.');
                    } else if (e.name === 'TypeError' && e.message.includes('Load failed')) {
                      alert('Erro de conexão com o banco de dados. Verifique:\n1. Conexão com internet\n2. Configuração do Supabase (supabase.ts)\n3. CORS no projeto Supabase');
                    } else {
                      alert(`Erro ao importar conteúdos: ${e.message || 'Erro desconhecido'}`);
                    }
                  }
                }}
                onUploadPDF={() => { }}
                onDeleteTopic={handleDeleteTopic}
                onSaveQuiz={handleSaveQuiz}
                onAddSubject={handleAddSubject}
              />
            )}
            {activeTab === 'schedule' && (
              <Schedule
                schedule={scheduleData}
                subjects={subjectsState}
                onUpdate={async (entry) => {
                  // Optimistic Update
                  const previousSchedule = [...scheduleData];
                  setScheduleData(prev => prev.map(s => s.id === entry.id ? entry : s));

                  try {
                    const { error } = await supabase.from('schedule').update({
                      day: entry.day,
                      period: entry.period,
                      subject_id: entry.subjectId,
                      front: entry.front,
                      user_id: currentUser?.id
                    }).eq('id', entry.id);

                    if (error) {
                      throw error;
                    }
                  } catch (err: any) {
                    // Rollback
                    setScheduleData(previousSchedule);
                    handleSupabaseError(err, "Atualizar Horário");
                  }
                }}
                onAdd={async (entry) => {
                  // Optimistic Update
                  setScheduleData(prev => [...prev, entry]);

                  try {
                    const { error } = await supabase.from('schedule').insert({
                      id: entry.id,
                      day: entry.day,
                      period: entry.period,
                      subject_id: entry.subjectId,
                      front: entry.front,
                      user_id: currentUser?.id,
                      institution: currentUser?.institution || 'FMJ IDOMED - Juazeiro do Norte'
                    });

                    if (error) {
                      throw error;
                    }
                  } catch (err: any) {
                    // Rollback
                    setScheduleData(prev => prev.filter(s => s.id !== entry.id));
                    handleSupabaseError(err, "Adicionar Horário");
                  }
                }}
                onDelete={(id) => setDeletingItem({ id, type: 'schedule' })}
                onUpdateSubjectColor={async (subjectId, color) => {
                  // Optimistic Update
                  setSubjectsState(prev => prev.map(s => s.id === subjectId ? { ...s, color } : s));

                  try {
                    const { error } = await supabase.from('subjects').update({ color }).eq('id', subjectId);

                    if (error) console.error("Erro ao atualizar cor:", error);
                  } catch (err) { console.error("Erro de rede:", err); }
                }}
              />
            )}
            {activeTab === 'exams' && (
              <ExamsPanel
                topics={filteredTopics}
                exams={examsData}
                subjects={subjectsState}
                quizzes={quizzes}
                studentProgress={studentProgress}
                currentUser={currentUser}
                onUpdateExam={handleUpdateExam}
                onDeleteExam={handleDeleteExam}
              />
            )}
            {activeTab === 'estagio' && (
              <Internships
                internships={internships.filter(i => {
                  // Client-side filtering strategy
                  // 1. Optimistic / Direct Ownership check
                  if ((i as any).uid === currentUser?.id) return true;
                  if ((i as any).user_id && (i as any).user_id === currentUser?.id) return true;

                  if (i.evolutionModel && i.evolutionModel.startsWith('{"p":true')) {
                    try {
                      const p = JSON.parse(i.evolutionModel);
                      return p.uid === currentUser?.id;
                    } catch { return false; }
                  }
                  // Legacy with no owner info: HIDE to prevent sharing.
                  return false;
                })}
                onAdd={async (internship) => {
                  // OPTIMISTIC UPDATE: Add to UI immediately
                  // We add the 'uid' to the local object so it passes the ownership filter
                  const optimisticInternship = { ...internship, uid: currentUser?.id };
                  setInternships(prev => [...prev, optimisticInternship]);

                  // DATA PACKING STRATEGY:
                  // Pack s (schedule), l (location), uid (userID) into evolution_model
                  const packedData = {
                    p: true, // flag
                    s: internship.schedule,
                    l: internship.location,
                    em: internship.evolutionModel,
                    uid: currentUser?.id // Store ownership here
                  };

                  const dbPayload = {
                    id: internship.id,
                    title: internship.title,
                    local: internship.local,
                    evolution_model: JSON.stringify(packedData),
                    status: internship.status,
                    institution: currentUser?.institution || 'FMJ IDOMED - Juazeiro do Norte'
                  };

                  try {
                    const { error, data } = await supabase.from('internships').insert(dbPayload).select();
                    if (error) {
                      console.error("❌ ERRO ao salvar estágio no banco:", error);
                      console.error("Payload que falhou:", dbPayload);
                      // ROLLBACK: Remove from UI since DB insert failed
                      setInternships(prev => prev.filter(i => i.id !== internship.id));
                      alert(`Erro ao salvar estágio: ${error.message}`);
                    } else {
                      console.log("✅ Estágio salvo com sucesso:", data);
                    }
                  } catch (err) {
                    console.error("❌ Erro de rede/Fetch ao salvar estágio:", err);
                    // ROLLBACK: Remove from UI since network failed
                    setInternships(prev => prev.filter(i => i.id !== internship.id));
                    alert('Erro de rede ao salvar estágio. Verifique sua conexão.');
                  }
                }}
                onUpdate={async (internship) => {
                  // OPTIMISTIC UPDATE
                  const optimisticInternship = { ...internship, uid: currentUser?.id };
                  setInternships(prev => prev.map(i => i.id === internship.id ? optimisticInternship : i));

                  const packedData = {
                    p: true,
                    s: internship.schedule,
                    l: internship.location,
                    em: internship.evolutionModel,
                    uid: currentUser?.id
                  };

                  const dbPayload = {
                    title: internship.title,
                    local: internship.local,
                    evolution_model: JSON.stringify(packedData),
                    status: internship.status
                  };

                  try {
                    const { error } = await supabase.from('internships').update(dbPayload).eq('id', internship.id);
                    if (error) {
                      console.error("Erro ao atualizar banco:", error);
                    }
                  } catch (err) {
                    console.error("Erro de rede ao atualizar:", err);
                  }
                }}
                onDelete={(id) => setDeletingItem({ id, type: 'internship' })}
              />
            )}
            {activeTab === 'quiz' && <QuizGenerator onSaveQuiz={handleSaveQuiz} history={quizHistory} currentUser={currentUser} quizzes={quizzes} />}
            {activeTab === 'profile' && (
              <UserProfile
                currentUser={currentUser}
                onUpdateUser={handleUpdateUser}
              />
            )}
            {activeTab === 'grades' && <GradesPanel subjects={subjectsState} grades={grades} exams={examsData} onUpdate={handleUpdateGrades} />}
            {activeTab === 'study' && <StudyReports currentUser={currentUser} />}
            {activeTab === 'admin' && currentUser?.role === 'admin' && <AdminPanel currentUser={currentUser} />}
            {activeTab === 'users' && (
              <UserManagement
                users={users}
                subjects={subjectsState}
                onUpdateUser={handleUpdateUser}
                onResetPassword={handleResetPassword}
                onDeleteUser={(id) => setDeletingItem({ id, type: 'user' })}
              />
            )}
          </div>
        </main>
        {/* Custom Delete Confirmation Modal */}
        {/* Custom Delete Confirmation Modal */}
        {deletingItem && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full animate-in zoom-in-95 duration-200">
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {deletingItem.type === 'schedule' ? 'Remover Horário?'
                  : deletingItem.type === 'internship' ? 'Remover Estágio?'
                    : deletingItem.type === 'topic' ? 'Remover Conteúdo?'
                      : deletingItem.type === 'exam' ? 'Excluir Prova?'
                        : deletingItem.type === 'user' ? 'Deletar Usuário?'
                          : 'Remover PDF?'}
              </h3>
              <p className="text-slate-500 mb-8">
                {deletingItem.type === 'schedule'
                  ? 'Tem certeza que deseja remover este item do seu horário? Esta ação não pode ser desfeita.'
                  : deletingItem.type === 'internship'
                    ? 'Tem certeza que deseja remover este estágio e todo seu histórico? Esta ação não pode ser desfeita.'
                    : deletingItem.type === 'topic'
                      ? 'Tem certeza que deseja excluir ESTE CONTEÚDO e todos os arquivos associados? Esta ação é irreversível.'
                      : deletingItem.type === 'exam'
                        ? 'Tem certeza que deseja excluir esta prova e todo o plano de estudo associado?'
                        : deletingItem.type === 'user'
                          ? 'Tem certeza que deseja DELETAR este usuário PERMANENTEMENTE? Ele perderá todo o acesso ao sistema.'
                          : 'Tem certeza que deseja remover O ARQUIVO PDF anexado a este conteúdo?'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingItem(null)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/20 transition-all"
                >
                  Sim, Remover
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PomodoroProvider>
  );
};

export default App;
