
-- Fix Analytics Tables Schema Mismatch
-- The application uses text-based user IDs (e.g. "cmzdcwocz"),
-- but the analytics tables were likely created expecting UUIDs.
-- This migration changes the column type to TEXT to support any ID format.

BEGIN;

-- 1. Fix user_sessions
ALTER TABLE user_sessions 
  ALTER COLUMN user_id TYPE text USING user_id::text;

-- 2. Fix activity_logs
ALTER TABLE activity_logs 
  ALTER COLUMN user_id TYPE text USING user_id::text;

-- 3. Fix download_logs (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'download_logs') THEN
    ALTER TABLE download_logs ALTER COLUMN user_id TYPE text USING user_id::text;
  END IF;
END $$;

COMMIT;
