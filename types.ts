
export enum ContentStatus {
  PENDENTE = 'Pendente',
  AULA_ASSISTIDA = 'Aula Assistida',
  RESUMIDO = 'Resumido',
  REVISADO = 'Revisado'
}

export enum ExamTag {
  PR1 = 'PR1',
  PR2 = 'PR2',
  SUB = 'Segunda Chamada',
  FINAL = 'Final',
  NONE = 'Nenhuma'
}

export type Period = 'Manhã' | 'Tarde' | 'Noite';

export interface Topic {
  id: string;
  subjectId: string;
  front?: string;
  title: string;
  date: string;
  status: ContentStatus;
  tag: ExamTag;
  hasMedia: boolean;
  pdfUrl?: string;
  pdfSummary?: string;
  shift?: Period;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
}

export interface ScheduleEntry {
  id: string;
  day: string;
  period: Period;
  subjectId: string;
  front?: string;
  userId?: string;
}

export interface Exam {
  id: string;
  title: string;
  date: string;
  subjectId: string;
  time?: string;
  shift?: string;
  associatedTag?: ExamTag;
}

export interface Grade {
  id: string;
  subjectId: string;
  userId: string;
  pr1: number | null;
  pr2: number | null;
  sub?: number | null;
  frontGrades?: {
    frontName: string;
    pr1: number | null;
    pr2: number | null;
    weight: number;
  }[];
}


export interface InternshipDate {
  date: string;
  hour: string;
  status: 'present' | 'absent' | 'pending';
}

export interface Internship {
  id: string;
  title: string;
  local: string;
  // date: string; // Deprecated or kept for compat? Let's use it as a JSON string store for now if DB requires text.
  // Actually, better to add a new optional field and migrate.
  description?: string;
  schedule?: InternshipDate[] | string; // Supabase might return it as string if column type is text
  location: string;
  evolutionModel: string;
  status: 'Concluído' | 'Em Andamento' | 'Próximo';
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  userId: string;
  title: string;
  questions: QuizQuestion[];
  createdAt: string;
}

export type UserRole = 'admin' | 'student';
export type UserStatus = 'pending' | 'active' | 'blocked';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  status: UserStatus;
  accessibleSubjects: string[] | 'all';
}

export interface StudentProgress {
  id: string;
  user_id: string;
  topic_id: string;
  status: ContentStatus;
  updated_at: string;
}
