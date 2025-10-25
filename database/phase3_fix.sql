-- Phase 3 Fix: Make user_id nullable (User auth is Phase 5)
-- Run this in Supabase SQL Editor

-- Fix active_sessions table
ALTER TABLE active_sessions 
ALTER COLUMN user_id DROP NOT NULL;

-- Fix session_frames table  
ALTER TABLE session_frames
ALTER COLUMN user_id DROP NOT NULL;

-- Fix danger_alerts table
ALTER TABLE danger_alerts
ALTER COLUMN user_id DROP NOT NULL;

-- Verify changes
SELECT 
    table_name,
    column_name,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('active_sessions', 'session_frames', 'danger_alerts')
AND column_name = 'user_id';

