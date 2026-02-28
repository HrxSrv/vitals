-- Make biomarker_definitions foreign key optional
-- This allows storing biomarkers even if they're not in the reference table
-- The system can still use the reference table for known biomarkers

-- Drop the existing foreign key constraint
ALTER TABLE biomarkers 
DROP CONSTRAINT IF EXISTS biomarkers_name_normalized_fkey;

-- Add it back as optional (no constraint, just an index for performance)
-- This allows unknown biomarkers to be stored
CREATE INDEX IF NOT EXISTS idx_biomarkers_name_normalized ON biomarkers(name_normalized);

-- Add a comment explaining the change
COMMENT ON COLUMN biomarkers.name_normalized IS 'Normalized biomarker name. May reference biomarker_definitions but not required for unknown biomarkers.';
