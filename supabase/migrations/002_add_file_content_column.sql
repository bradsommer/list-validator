-- Migration: Add file_content column to upload_sessions for original file download
-- The original uploaded file is stored as base64-encoded text so users can
-- re-download it within the 15-day retention window.

ALTER TABLE upload_sessions ADD COLUMN IF NOT EXISTS file_content TEXT;
ALTER TABLE upload_sessions ADD COLUMN IF NOT EXISTS file_type VARCHAR(100);
ALTER TABLE upload_sessions ADD COLUMN IF NOT EXISTS file_size INTEGER;
