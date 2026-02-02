-- Add schedule column to internships table
ALTER TABLE public.internships ADD COLUMN IF NOT EXISTS schedule JSONB;
ALTER TABLE public.internships ADD COLUMN IF NOT EXISTS location TEXT;

-- Policy Update (ensure we can write to it)
-- (Existing policies likely cover 'all' operations, but good to be safe if RLS is strict on columns - PG usually isn't)
