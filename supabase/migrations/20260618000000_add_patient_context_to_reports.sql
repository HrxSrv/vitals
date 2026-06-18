-- Add patient identity columns for cross-report person validation
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS patient_name TEXT,
  ADD COLUMN IF NOT EXISTS patient_dob DATE;

-- Extend processing_status enum to include person_mismatch
ALTER TABLE reports
  DROP CONSTRAINT IF EXISTS reports_processing_status_check;

ALTER TABLE reports
  ADD CONSTRAINT reports_processing_status_check
  CHECK (processing_status IN ('pending', 'processing', 'done', 'failed', 'person_mismatch'));
