-- Adiciona a coluna 'shift' (Turno) na tabela de tópicos
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS shift TEXT;

-- Adiciona a coluna 'front' (Especialidade) caso não exista
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS front TEXT;

-- Garante que a coluna 'tag' também exista
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS tag TEXT DEFAULT 'Nenhuma';

-- Adiciona coluna de auditoria faltante que pode causar erros em scripts de busca
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
