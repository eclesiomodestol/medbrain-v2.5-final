
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Schedule } from './components/Schedule';
import { ContentTracker } from './components/ContentTracker';
import { ExamsPanel } from './components/ExamsPanel';
import { Internships } from './components/Internships';
import { QuizGenerator } from './components/QuizGenerator';
import { Login } from './components/Login';
import { UserManagement } from './components/UserManagement';
import { UserProfile } from './components/UserProfile';
import { GradesPanel } from './components/GradesPanel';
import { supabase } from './supabase';
import { Topic, ContentStatus, ExamTag, Subject, StudentProgress, User, Exam, Internship, Grade, ScheduleEntry, Quiz } from './types';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('medbrain_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [deletingItem, setDeletingItem] = useState<{ id: string, type: 'schedule' | 'internship' | 'topic' | 'pdf' | 'exam' | 'user' } | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'schedule' | 'syllabus' | 'exams' | 'estagio' | 'quiz' | 'users' | 'grades' | 'profile'>('dashboard');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [scheduleData, setScheduleData] = useState<ScheduleEntry[]>([]);
  const [examsData, setExamsData] = useState<Exam[]>([]);
  const [subjectsState, setSubjectsState] = useState<Subject[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [quizHistory, setQuizHistory] = useState<Quiz[]>([]);
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);

  const fetchAllData = async () => {
    if (!currentUser) return;
    try {
      const promises = [
        supabase.from('subjects').select('*'),
        supabase.from('topics').select('*'),
        supabase.from('schedule').select('*').or(`user_id.eq.${currentUser.id},user_id.is.null`).throwOnError(),
        supabase.from('exams').select('*'),
        supabase.from('internships').select('*'),
        supabase.from('users').select('*'),
        supabase.from('grades').select('*').or(`user_id.eq.${currentUser.id},user_id.is.null`),
        supabase.from('quizzes').select('*').or(`user_id.eq.${currentUser.id},user_id.is.null`).order('created_at', { ascending: false })
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
          pdfSummary: t.pdf_summary
        })));
      }
      if (sched) setScheduleData(sched.map(s => ({ ...s, subjectId: s.subject_id })));
      if (exms) {
        setExamsData(exms.map(e => {
          let title = e.title;
          let time = '';
          let shift = '';
          try {
            if (title && title.startsWith('{')) {
              const p = JSON.parse(title);
              title = p.text || title;
              time = p.time || '';
              shift = p.shift || '';
            }
          } catch (err) { /* fallback to raw title */ }
          return {
            ...e,
            subjectId: e.subject_id,
            title,
            time,
            shift
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
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
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

  const isAccessible = useCallback((subjectId: string) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (currentUser.accessibleSubjects === 'all') return true;
    return Array.isArray(currentUser.accessibleSubjects) && currentUser.accessibleSubjects.includes(subjectId);
  }, [currentUser]);

  const filteredTopics = useMemo(() => topics.filter(t => isAccessible(t.subjectId)), [topics, isAccessible]);

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
      alert(`Erro no upload: ${err.message}`);
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
      alert(`Erro ao salvar notas: ${err.message}`);
    }
  };

  const handleSaveQuiz = async (quiz: Quiz) => {
    try {
      const dbPayload = {
        id: quiz.id,
        user_id: currentUser?.id,
        title: quiz.title,
        questions: quiz.questions,
        created_at: quiz.createdAt
      };

      const { error } = await supabase.from('quizzes').insert(dbPayload);
      if (error) throw error;

      setQuizHistory(prev => [quiz, ...prev]);
    } catch (err: any) {
      console.error("Erro ao salvar simulado:", err);
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
        shift: exam.shift
      });

      const dbPayload = {
        id: exam.id,
        title: packedTitle,
        date: exam.date,
        subject_id: exam.subjectId
      };

      const { error } = await supabase.from('exams').upsert(dbPayload);
      if (error) throw error;
    } catch (err: any) {
      console.error("Erro ao salvar prova:", err);
      alert("Erro ao salvar prova. Verifique sua conexão.");
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
      console.error("Erro ao redefinir senha:", err);
      alert("Erro ao redefinir senha.");
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
      alert(`Falha ao atualizar dados no servidor: ${err.message}`);
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
      console.error("Error updating status:", err);
    }
  };

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingItem || !currentUser) return;

    const { id, type } = deletingItem;
    setDeletingItem(null); // Close modal immediately

    console.log(`Attempting to delete ${type} item:`, id);

    if (type === 'schedule') {
      // Optimistic Delete Schedule
      setScheduleData(prev => prev.filter(s => s.id !== id));

      try {
        const { error, count } = await supabase.from('schedule').delete({ count: 'exact' }).eq('id', id);

        if (error) {
          console.error("Erro ao remover horário:", error);
          alert("Erro ao remover: " + error.message);
          // Rollback
          const { data: rollbackData } = await supabase.from('schedule').select('*').eq('user_id', currentUser.id);
          setScheduleData(rollbackData || []);
          return;
        }

        // Re-fetch data
        const { data: scheduleData, error: scheduleError } = await supabase.from('schedule').select('*').eq('user_id', currentUser.id);
        if (scheduleError) console.error("Erro ao carregar horário:", scheduleError);
        else setScheduleData(scheduleData || []);

        // Refresh dependent data
        const { data: quizzesData, error: quizzesError } = await supabase.from('quizzes').select('*');
        if (quizzesError) console.error("Erro ao carregar quizzes:", quizzesError);
        else setQuizzes(quizzesData || []);

      } catch (err) {
        console.error("Erro de rede:", err);
      }
    } else if (type === 'internship') {
      // Optimistic Delete Internship
      setInternships(prev => prev.filter(i => i.id !== id));

      try {
        const { error } = await supabase.from('internships').delete().eq('id', id);
        if (error) {
          console.error("Erro ao deletar do banco:", error);
          alert("Erro ao remover estágio: " + error.message);
          // Re-fetch
          const { data } = await supabase.from('internships').select('*');
          if (data) setInternships(data);
        }
      } catch (err) {
        console.error("Erro de rede ao deletar:", err);
      }
    } else if (type === 'exam') {
      const previousExams = examsData;
      setExamsData(prev => prev.filter(e => e.id !== id));
      try {
        const { error } = await supabase.from('exams').delete().eq('id', id);
        if (error) {
          setExamsData(previousExams);
          throw error;
        }
      } catch (err: any) {
        console.error("Erro ao excluir prova:", err);
        alert("Erro ao excluir prova.");
      }
    } else if (type === 'user') {
      const previousUsers = users;
      setUsers(prev => prev.filter(u => u.id !== id));
      try {
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) {
          setUsers(previousUsers);
          throw error;
        }
      } catch (err: any) {
        console.error("Erro ao excluir usuário:", err);
        alert("Erro ao excluir usuário.");
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
        alert(`Falha ao remover arquivo: ${err.message}`);
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
        console.error("Delete detailed error:", err);
        alert(`Erro ao excluir conteúdo: ${err.message || 'Erro de conexão/permissão'}`);
      }
    }
  }, [deletingItem, currentUser, topics]);

  if (!currentUser) return <Login onLogin={handleLogin} users={users} />;

  return (
    <div className="flex min-h-screen">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} currentUser={currentUser} onLogout={handleLogout} />
      <main className="flex-1 p-8 ml-64 overflow-y-auto bg-[#F3F4F6]">
        <header className="mb-8 flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-[#0F172A] tracking-tight capitalize">
              {activeTab === 'exams' ? 'Calendário de Provas' : activeTab === 'syllabus' ? 'Ementa e Conteúdos' : activeTab === 'schedule' ? 'Horário Acadêmico' : activeTab.replace('-', ' ')}
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              MedBrain Engine v2.5 • Ciclo Clínico (7º Semestre)
            </p>
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
                await supabase.from('topics').update({
                  title: updated.title,
                  subject_id: updated.subjectId,
                  date: updated.date,
                  shift: updated.shift,
                  tag: updated.tag,
                  front: updated.front
                }).eq('id', updated.id);
              }}
              onUploadPDF_New={uploadPDF}
              onDeletePDF={deletePDF}
              onAddTopic={async (newTopic) => {
                setTopics(prev => [...prev, newTopic]);
                try {
                  const dbPayload = {
                    id: newTopic.id, // Assuming ID is generated safely or we let DB gen it (but we passed it here)
                    title: newTopic.title,
                    subject_id: newTopic.subjectId,
                    date: newTopic.date,
                    shift: newTopic.shift,
                    tag: newTopic.tag,
                    front: newTopic.front,
                    status: ContentStatus.PENDENTE,
                    has_media: false
                  };
                  const { error } = await supabase.from('topics').insert(dbPayload);
                  if (error) console.error("Unset error:", error);
                } catch (e) { console.error(e); }
              }}
              onUploadPDF={() => { }}
              onDeleteTopic={handleDeleteTopic}
              onSaveQuiz={handleSaveQuiz}
            />
          )}
          {activeTab === 'schedule' && (
            <Schedule
              schedule={scheduleData}
              subjects={subjectsState}
              onUpdate={async (entry) => {
                // Optimistic Update
                setScheduleData(prev => prev.map(s => s.id === entry.id ? entry : s));

                try {
                  const { error } = await supabase.from('schedule').update({
                    day: entry.day,
                    period: entry.period,
                    subject_id: entry.subjectId,
                    front: entry.front,
                    user_id: currentUser?.id
                  }).eq('id', entry.id);

                  if (error) console.error("Erro ao atualizar horário:", error);
                } catch (err) { console.error("Erro de rede:", err); }
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
                    user_id: currentUser?.id
                  });

                  if (error) console.error("Erro ao adicionar horário:", error);
                } catch (err) { console.error("Erro de rede:", err); }
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
                  // user_id: currentUser?.id, // Column removed from DB insert
                  title: internship.title,
                  local: internship.local,
                  evolution_model: JSON.stringify(packedData),
                  // Fallback columns for sorting/query (if they exist)
                  date: internship.schedule && internship.schedule.length > 0 ? (internship.schedule[0] as any).date : undefined,
                  hour: internship.schedule && internship.schedule.length > 0 ? (internship.schedule[0] as any).hour : undefined,
                  status: internship.status
                };

                try {
                  const { error } = await supabase.from('internships').insert(dbPayload);
                  if (error) {
                    console.error("Erro ao salvar no banco (Offline?):", error);
                    // Optional: Show toast "Salvo apenas localmente"
                  }
                } catch (err) {
                  console.error("Erro de rede/Fetch:", err);
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
                  date: internship.schedule && internship.schedule.length > 0 ? (internship.schedule[0] as any).date : undefined,
                  hour: internship.schedule && internship.schedule.length > 0 ? (internship.schedule[0] as any).hour : undefined,
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
          {activeTab === 'grades' && <GradesPanel subjects={subjectsState} grades={grades} onUpdate={handleUpdateGrades} />}
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
  );
};

export default App;
