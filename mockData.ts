
import { Subject, ScheduleEntry, Exam, Topic, ContentStatus, ExamTag, Internship, User } from './types';

export const subjects: Subject[] = [
  { id: 'cm3', name: 'Clínica Médica III', color: 'blue' },
  { id: 'cc3', name: 'Clínica Cirúrgica III', color: 'indigo' },
  { id: 'sc', name: 'Pediatria', color: 'emerald' },
  { id: 'iesc7', name: 'IESC VII', color: 'amber' },
  { id: 'hmp7', name: 'HMP VII', color: 'rose' },
  { id: 'metod', name: 'Metodologia', color: 'slate' }
];

export const initialUsers: User[] = [
  {
    id: 'u1',
    name: 'Eclésio Modesto',
    email: 'eclesiomodesto@gmail.com',
    password: 'eclesio123',
    role: 'admin',
    status: 'active',
    accessibleSubjects: 'all'
  },
  {
    id: 'u2',
    name: 'João Aluno',
    email: 'joao@estudante.com',
    password: '123',
    role: 'student',
    status: 'active',
    accessibleSubjects: ['cm3', 'sc']
  }
];

export const initialSchedule: ScheduleEntry[] = [
  { id: 's1', day: 'Segunda', period: 'Manhã', subjectId: 'cm3' },
  { id: 's2', day: 'Segunda', period: 'Tarde', subjectId: 'cm3' },
  { id: 's3', day: 'Terça', period: 'Manhã', subjectId: 'cc3', front: 'Ortopedia' },
  { id: 's4', day: 'Terça', period: 'Tarde', subjectId: 'cm3' },
  { id: 's5', day: 'Quarta', period: 'Manhã', subjectId: 'iesc7' },
  { id: 's6', day: 'Quarta', period: 'Tarde', subjectId: 'sc' },
  { id: 's7', day: 'Quinta', period: 'Manhã', subjectId: 'cc3', front: 'Otorrino' },
  { id: 's8', day: 'Quinta', period: 'Noite', subjectId: 'hmp7' },
  { id: 's9', day: 'Sexta', period: 'Manhã', subjectId: 'sc' },
  { id: 's10', day: 'Sexta', period: 'Tarde', subjectId: 'cc3', front: 'Oftalmo' },
  { id: 's11', day: 'Sexta', period: 'Tarde', subjectId: 'metod' }
];

export const initialExams: Exam[] = [
  { id: 'ex1', title: 'PR1 Clínica Médica III', date: '2024-04-08', subjectId: 'cm3' },
  { id: 'ex2', title: 'PR1 Clínica Cirúrgica III', date: '2024-04-12', subjectId: 'cc3' },
  { id: 'ex3', title: 'PR1 Pediatria', date: '2024-04-15', subjectId: 'sc' },
  { id: 'ex4', title: 'Avaliação IESC VII', date: '2024-04-20', subjectId: 'iesc7' }
];

export const initialTopics: Topic[] = [
  { id: 't1', subjectId: 'cm3', front: 'Neuro', title: 'Acidente Vascular Encefálico', date: '2024-03-01', status: ContentStatus.PENDENTE, tag: ExamTag.PR1, hasMedia: false },
  { id: 't2', subjectId: 'cm3', front: 'Neuro', title: 'Cefaleias e Enxaqueca', date: '2024-03-05', status: ContentStatus.PENDENTE, tag: ExamTag.PR1, hasMedia: false },
  { id: 't3', subjectId: 'cm3', front: 'Hemato', title: 'Anemias Microcíticas', date: '2024-03-07', status: ContentStatus.PENDENTE, tag: ExamTag.PR1, hasMedia: false },
  { id: 't4', subjectId: 'cc3', front: 'Ortopedia', title: 'Fraturas de Membros Superiores', date: '2024-03-02', status: ContentStatus.PENDENTE, tag: ExamTag.PR1, hasMedia: false },
  { id: 't5', subjectId: 'cc3', front: 'Oftalmo', title: 'Glaucoma e Catarata', date: '2024-03-04', status: ContentStatus.PENDENTE, tag: ExamTag.PR1, hasMedia: false },
  { id: 't6', subjectId: 'sc', title: 'Crescimento e Desenvolvimento', date: '2024-03-10', status: ContentStatus.PENDENTE, tag: ExamTag.PR1, hasMedia: false },
  { id: 't7', subjectId: 'iesc7', title: 'Gestão no SUS', date: '2024-03-12', status: ContentStatus.PENDENTE, tag: ExamTag.PR1, hasMedia: false },
  { id: 't8', subjectId: 'cm3', front: 'Dermato', title: 'Micoses Superficiais', date: '2024-05-10', status: ContentStatus.PENDENTE, tag: ExamTag.PR2, hasMedia: false }
];

export const initialInternships: Internship[] = [
  { 
    id: 'i1', 
    title: 'Hospital', 
    local: 'Hospital Universitário Getúlio Vargas', 
    date: '2024-03-25', 
    hour: '07:00', 
    location: 'Av. Apurinã, 4 - Centro', 
    evolutionModel: '<b>Identificação:</b> ...<br><i>HDA:</i> ...<br><u>Exame Físico:</u> ...',
    status: 'Em Andamento' 
  }
];
