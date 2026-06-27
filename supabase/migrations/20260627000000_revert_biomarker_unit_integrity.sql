-- Revert: biomarker unit-dimension integrity gate
-- ===============================================
--
-- Forward down-migration that reverses 20260620000000_biomarker_unit_integrity.sql.
-- That migration was already pushed to the cloud DB, so deleting its file from the
-- repo does NOT remove the live objects — this migration drops them explicitly.
--
-- Returns biomarkers.name_normalized to its pre-integrity state: no FK constraint
-- (that was already the case after 006_make_biomarker_fk_optional.sql), the
-- explanatory comment restored, and no write-boundary trigger or quarantine table.
--
-- Drop order respects dependencies: trigger -> trigger function -> helper
-- functions -> quarantine table. All guarded with IF EXISTS for idempotency.

-- ---------------------------------------------------------------------------
-- 1. Drop the NOT VALID FK added by the integrity migration
-- ---------------------------------------------------------------------------
-- Pre-integrity there was NO FK (006 dropped the original biomarkers_name_normalized_fkey
-- and kept only idx_biomarkers_name_normalized), so we just drop and do not re-add.
ALTER TABLE biomarkers
  DROP CONSTRAINT IF EXISTS fk_biomarkers_definition;

-- ---------------------------------------------------------------------------
-- 2. Drop the write-boundary trigger and its function
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_biomarker_unit_integrity ON biomarkers;
DROP FUNCTION IF EXISTS biomarker_enforce_unit_dimension();

-- ---------------------------------------------------------------------------
-- 3. Drop the unit-classification helper functions
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS biomarker_units_compatible(TEXT, TEXT);
DROP FUNCTION IF EXISTS biomarker_unit_dimension(TEXT);
DROP FUNCTION IF EXISTS biomarker_normalize_unit(TEXT);

-- ---------------------------------------------------------------------------
-- 4. Drop the quarantine table (CASCADE removes its RLS policies + indexes)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS biomarkers_unresolved CASCADE;

-- ---------------------------------------------------------------------------
-- 5. Restore the column comment to its post-006 value
-- ---------------------------------------------------------------------------
COMMENT ON COLUMN biomarkers.name_normalized IS
  'Normalized biomarker name. May reference biomarker_definitions but not required for unknown biomarkers.';
