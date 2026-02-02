-- Create table for tracking student progress per topic
create table if not exists public.student_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null, -- or public.users if using custom table
  topic_id uuid references public.topics(id) on delete cascade not null,
  status text not null check (status in ('Pendente', 'Aula Assistida', 'Resumido', 'Revisado')),
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, topic_id)
);

-- Enable RLS
alter table public.student_progress enable row level security;

-- Policies
create policy "Users can view their own progress"
  on public.student_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert/update their own progress"
  on public.student_progress for all
  using (auth.uid() = user_id);
