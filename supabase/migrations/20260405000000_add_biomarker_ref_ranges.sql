-- Add per-row reference ranges to biomarkers table.
-- These are unit-aligned at ingestion time, so they always match the row's value/unit.
-- The definition table's ref ranges remain as a fallback for older data.

ALTER TABLE biomarkers
  ADD COLUMN ref_range_low NUMERIC,
  ADD COLUMN ref_range_high NUMERIC;

COMMENT ON COLUMN biomarkers.ref_range_low IS 'Lower ref range bound, unit-aligned with the value column';
COMMENT ON COLUMN biomarkers.ref_range_high IS 'Upper ref range bound, unit-aligned with the value column';

-- Must drop first because the return type is changing (adding new columns)
DROP FUNCTION IF EXISTS get_biomarkers_with_definitions(UUID);
CREATE OR REPLACE FUNCTION get_biomarkers_with_definitions(p_profile_id UUID)
RETURNS TABLE (
  id UUID,
  report_id UUID,
  user_id UUID,
  profile_id UUID,
  name TEXT,
  name_normalized TEXT,
  category TEXT,
  value NUMERIC,
  unit TEXT,
  ref_range_low NUMERIC,
  ref_range_high NUMERIC,
  report_date DATE,
  created_at TIMESTAMPTZ,
  def_name_normalized TEXT,
  def_display_name TEXT,
  def_category TEXT,
  def_unit TEXT,
  def_ref_range_low NUMERIC,
  def_ref_range_high NUMERIC,
  def_critical_low NUMERIC,
  def_critical_high NUMERIC,
  def_description TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    b.id,
    b.report_id,
    b.user_id,
    b.profile_id,
    b.name,
    b.name_normalized,
    b.category,
    b.value,
    b.unit,
    b.ref_range_low,
    b.ref_range_high,
    b.report_date,
    b.created_at,
    bd.name_normalized as def_name_normalized,
    bd.display_name as def_display_name,
    bd.category as def_category,
    bd.unit as def_unit,
    bd.ref_range_low as def_ref_range_low,
    bd.ref_range_high as def_ref_range_high,
    bd.critical_low as def_critical_low,
    bd.critical_high as def_critical_high,
    bd.description as def_description
  FROM biomarkers b
  LEFT JOIN biomarker_definitions bd ON b.name_normalized = bd.name_normalized
  WHERE b.profile_id = p_profile_id
  ORDER BY b.report_date DESC NULLS LAST, b.created_at DESC;
$$;

-- Also update the per-report function
DROP FUNCTION IF EXISTS get_biomarkers_by_report(UUID);
CREATE OR REPLACE FUNCTION get_biomarkers_by_report(p_report_id UUID)
RETURNS TABLE (
  id UUID,
  report_id UUID,
  user_id UUID,
  profile_id UUID,
  name TEXT,
  name_normalized TEXT,
  category TEXT,
  value NUMERIC,
  unit TEXT,
  ref_range_low NUMERIC,
  ref_range_high NUMERIC,
  report_date DATE,
  created_at TIMESTAMPTZ,
  def_name_normalized TEXT,
  def_display_name TEXT,
  def_category TEXT,
  def_unit TEXT,
  def_ref_range_low NUMERIC,
  def_ref_range_high NUMERIC,
  def_critical_low NUMERIC,
  def_critical_high NUMERIC,
  def_description TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    b.id,
    b.report_id,
    b.user_id,
    b.profile_id,
    b.name,
    b.name_normalized,
    b.category,
    b.value,
    b.unit,
    b.ref_range_low,
    b.ref_range_high,
    b.report_date,
    b.created_at,
    bd.name_normalized as def_name_normalized,
    bd.display_name as def_display_name,
    bd.category as def_category,
    bd.unit as def_unit,
    bd.ref_range_low as def_ref_range_low,
    bd.ref_range_high as def_ref_range_high,
    bd.critical_low as def_critical_low,
    bd.critical_high as def_critical_high,
    bd.description as def_description
  FROM biomarkers b
  LEFT JOIN biomarker_definitions bd ON b.name_normalized = bd.name_normalized
  WHERE b.report_id = p_report_id
  ORDER BY b.name_normalized ASC;
$$;
