-- Migration: Add avatar column to users table
-- Description: Adds a TEXT column to store user profile photos (Base64 or URL)
-- Date: 2026-02-02

-- Add avatar column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS avatar TEXT;

-- Add comment to the column
COMMENT ON COLUMN users.avatar IS 'User profile photo stored as Base64 string or URL';
