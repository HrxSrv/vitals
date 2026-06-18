import { getSupabaseClient } from '../utils/supabase';
import { Biomarker, BiomarkerDefinition, BiomarkerWithDefinition } from '../types/domain.types';
import { logger } from '../utils/logger';

// Keywords that indicate a measurement-method variant, not the primary result
// (e.g. "RBC by impedance" vs plain "RBC").
const METHOD_QUALIFIER_RE =
  /\b(by|using|via|impedance|histogram|laser|optical|flow|coulter|cytometry)\b/i;

/**
 * When one report contains multiple rows for the same nameNormalized
 * (e.g. "RBC by impedance" and "RBC by histogram"), pick the primary result:
 * 1. Prefer the name with no method qualifier
 * 2. Prefer the entry that carries a reference range
 * 3. Stable tiebreak: first in array (insertion/fetch order)
 */
export function selectPrimary(candidates: BiomarkerWithDefinition[]): BiomarkerWithDefinition {
  if (candidates.length === 1) return candidates[0];
  return [...candidates].sort((a, b) => {
    const aQ = METHOD_QUALIFIER_RE.test(a.name) ? 1 : 0;
    const bQ = METHOD_QUALIFIER_RE.test(b.name) ? 1 : 0;
    if (aQ !== bQ) return aQ - bQ;
    const aR = a.definition?.refRangeLow != null || a.definition?.refRangeHigh != null ? 0 : 1;
    const bR = b.definition?.refRangeLow != null || b.definition?.refRangeHigh != null ? 0 : 1;
    return aR - bR;
  })[0];
}

const supabase = getSupabaseClient();

export interface CreateBiomarkerData {
  reportId: string;
  userId: string;
  profileId: string;
  name: string;
  nameNormalized: string;
  category?: string;
  value: number;
  unit: string;
  reportDate?: Date;
  refRangeLow?: number;
  refRangeHigh?: number;
}

export class BiomarkerRepository {
  /**
   * Create a new biomarker record
   */
  async create(data: CreateBiomarkerData): Promise<Biomarker> {
    logger.debug('Creating biomarker', { data });

    const { data: biomarker, error } = await supabase
      .from('biomarkers')
      .insert({
        report_id: data.reportId,
        user_id: data.userId,
        profile_id: data.profileId,
        name: data.name,
        name_normalized: data.nameNormalized,
        category: data.category,
        value: data.value,
        unit: data.unit,
        report_date: data.reportDate?.toISOString().split('T')[0],
        ref_range_low: data.refRangeLow ?? null,
        ref_range_high: data.refRangeHigh ?? null,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create biomarker', { error, data });
      throw new Error(`Failed to create biomarker: ${error.message}`);
    }

    return this.mapToDomain(biomarker);
  }

  /**
   * Create multiple biomarkers in batch
   */
  async createBatch(biomarkers: CreateBiomarkerData[]): Promise<Biomarker[]> {
    logger.debug('Creating biomarkers in batch', {
      count: biomarkers.length,
    });

    const { data, error } = await supabase
      .from('biomarkers')
      .insert(
        biomarkers.map((b) => ({
          report_id: b.reportId,
          user_id: b.userId,
          profile_id: b.profileId,
          name: b.name,
          name_normalized: b.nameNormalized,
          category: b.category,
          value: b.value,
          unit: b.unit ?? '',
          report_date: b.reportDate?.toISOString().split('T')[0],
          ref_range_low: b.refRangeLow ?? null,
          ref_range_high: b.refRangeHigh ?? null,
        }))
      )
      .select();

    if (error) {
      logger.error('Failed to create biomarkers in batch', { error });
      throw new Error(`Failed to create biomarkers: ${error.message}`);
    }

    return data.map(this.mapToDomain);
  }

  /**
   * Get all biomarkers for a profile
   */
  async findByProfile(profileId: string): Promise<Biomarker[]> {
    logger.debug('Finding biomarkers by profile', { profileId });

    const { data, error } = await supabase
      .from('biomarkers')
      .select('*')
      .eq('profile_id', profileId)
      .order('report_date', { ascending: false });

    if (error) {
      logger.error('Failed to find biomarkers by profile', {
        error,
        profileId,
      });
      throw new Error(`Failed to find biomarkers: ${error.message}`);
    }

    return data.map(this.mapToDomain);
  }

  /**
   * Get biomarkers for a profile within a date range
   */
  async findByProfileAndDateRange(
    profileId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Biomarker[]> {
    logger.debug('Finding biomarkers by profile and date range', {
      profileId,
      startDate,
      endDate,
    });

    const { data, error } = await supabase
      .from('biomarkers')
      .select('*')
      .eq('profile_id', profileId)
      .gte('report_date', startDate.toISOString().split('T')[0])
      .lte('report_date', endDate.toISOString().split('T')[0])
      .order('report_date', { ascending: true });

    if (error) {
      logger.error('Failed to find biomarkers by date range', {
        error,
        profileId,
      });
      throw new Error(`Failed to find biomarkers: ${error.message}`);
    }

    return data.map(this.mapToDomain);
  }

  /**
   * Get biomarkers for a specific report
   */
  async findByReport(reportId: string): Promise<Biomarker[]> {
    logger.debug('Finding biomarkers by report', { reportId });

    const { data, error } = await supabase
      .from('biomarkers')
      .select('*')
      .eq('report_id', reportId)
      .order('name_normalized', { ascending: true });

    if (error) {
      logger.error('Failed to find biomarkers by report', { error, reportId });
      throw new Error(`Failed to find biomarkers: ${error.message}`);
    }

    return data.map(this.mapToDomain);
  }

  /**
   * Get biomarkers for a specific report with definitions
   */
  async findByReportWithDefinitions(reportId: string): Promise<BiomarkerWithDefinition[]> {
    logger.debug('Finding biomarkers by report with definitions', { reportId });

    // Use raw SQL query since we removed the foreign key relationship
    const { data, error } = await supabase.rpc('get_biomarkers_by_report', {
      p_report_id: reportId,
    });

    if (error) {
      logger.error('Failed to find biomarkers by report with definitions', { error, reportId });
      throw new Error(`Failed to find biomarkers: ${error.message}`);
    }

    return data.map((row: any) => ({
      id: row.id,
      reportId: row.report_id,
      userId: row.user_id,
      profileId: row.profile_id,
      name: row.name,
      nameNormalized: row.name_normalized,
      category: row.category,
      value: row.value,
      unit: row.unit,
      reportDate: row.report_date ? new Date(row.report_date) : undefined,
      createdAt: new Date(row.created_at),
      definition: row.def_name_normalized
        ? {
            nameNormalized: row.def_name_normalized,
            displayName: row.def_display_name,
            category: row.def_category,
            unit: row.def_unit,
            // Prefer per-row ref ranges (unit-aligned) over definition ranges.
            // When per-row ranges exist, ignore definition criticals — they may
            // be in a different unit scale than the biomarker value.
            refRangeLow:  row.ref_range_low  ?? row.def_ref_range_low,
            refRangeHigh: row.ref_range_high ?? row.def_ref_range_high,
            refRangeLowM:  row.def_ref_range_low_m  != null ? parseFloat(row.def_ref_range_low_m)  : undefined,
            refRangeHighM: row.def_ref_range_high_m != null ? parseFloat(row.def_ref_range_high_m) : undefined,
            refRangeLowF:  row.def_ref_range_low_f  != null ? parseFloat(row.def_ref_range_low_f)  : undefined,
            refRangeHighF: row.def_ref_range_high_f != null ? parseFloat(row.def_ref_range_high_f) : undefined,
            criticalLow:  row.ref_range_low != null ? undefined : row.def_critical_low,
            criticalHigh: row.ref_range_low != null ? undefined : row.def_critical_high,
            description: row.def_description,
            rangeSource: row.def_range_source ?? undefined,
          }
        : undefined,
    }));
  }

  /**
   * Get biomarkers with their definitions joined
   */
  async findByProfileWithDefinitions(profileId: string): Promise<BiomarkerWithDefinition[]> {
    logger.debug('Finding biomarkers with definitions', { profileId });

    // Use raw SQL query since we removed the foreign key relationship
    const { data, error } = await supabase.rpc('get_biomarkers_with_definitions', {
      p_profile_id: profileId,
    });

    if (error) {
      logger.error('Failed to find biomarkers with definitions', {
        error,
        profileId,
      });
      throw new Error(`Failed to find biomarkers: ${error.message}`);
    }

    return data.map((row: any) => ({
      id: row.id,
      reportId: row.report_id,
      userId: row.user_id,
      profileId: row.profile_id,
      name: row.name,
      nameNormalized: row.name_normalized,
      category: row.category,
      value: row.value,
      unit: row.unit,
      reportDate: row.report_date ? new Date(row.report_date) : undefined,
      createdAt: new Date(row.created_at),
      definition: row.def_name_normalized
        ? {
            nameNormalized: row.def_name_normalized,
            displayName: row.def_display_name,
            category: row.def_category,
            unit: row.def_unit,
            refRangeLow:  row.ref_range_low  ?? row.def_ref_range_low,
            refRangeHigh: row.ref_range_high ?? row.def_ref_range_high,
            refRangeLowM:  row.def_ref_range_low_m  != null ? parseFloat(row.def_ref_range_low_m)  : undefined,
            refRangeHighM: row.def_ref_range_high_m != null ? parseFloat(row.def_ref_range_high_m) : undefined,
            refRangeLowF:  row.def_ref_range_low_f  != null ? parseFloat(row.def_ref_range_low_f)  : undefined,
            refRangeHighF: row.def_ref_range_high_f != null ? parseFloat(row.def_ref_range_high_f) : undefined,
            criticalLow:  row.ref_range_low != null ? undefined : row.def_critical_low,
            criticalHigh: row.ref_range_low != null ? undefined : row.def_critical_high,
            description: row.def_description,
            rangeSource: row.def_range_source ?? undefined,
          }
        : undefined,
    }));
  }

  /**
   * Get latest biomarkers for a profile (one per biomarker type)
   */
  async findLatestByProfile(profileId: string): Promise<BiomarkerWithDefinition[]> {
    logger.debug('Finding latest biomarkers by profile', { profileId });

    // Get all biomarkers with definitions
    const biomarkers = await this.findByProfileWithDefinitions(profileId);

    // Step 1: Group by (nameNormalized, reportId) and pick the primary method variant
    // per group so the dashboard shows one representative value per biomarker per report.
    const reportGroups = new Map<string, BiomarkerWithDefinition[]>();
    for (const b of biomarkers) {
      const key = `${b.nameNormalized}::${b.reportId}`;
      if (!reportGroups.has(key)) reportGroups.set(key, []);
      reportGroups.get(key)!.push(b);
    }
    const deduplicated = [...reportGroups.values()].map(selectPrimary);

    // Step 2: Group by normalized name and keep only the latest across reports
    const latestMap = new Map<string, BiomarkerWithDefinition>();

    for (const biomarker of deduplicated) {
      const existing = latestMap.get(biomarker.nameNormalized);

      if (
        !existing ||
        (biomarker.reportDate && existing.reportDate && biomarker.reportDate > existing.reportDate)
      ) {
        latestMap.set(biomarker.nameNormalized, biomarker);
      }
    }

    return Array.from(latestMap.values());
  }

  /**
   * Get historical values for a specific biomarker
   */
  async findHistoricalValues(
    profileId: string,
    nameNormalized: string
  ): Promise<BiomarkerWithDefinition[]> {
    logger.debug('Finding historical biomarker values', {
      profileId,
      nameNormalized,
    });

    const { data, error } = await supabase
      .from('biomarkers')
      .select(
        `
        *,
        biomarker_definitions (
          name_normalized,
          display_name,
          category,
          unit,
          ref_range_low,
          ref_range_high,
          ref_range_low_m,
          ref_range_high_m,
          ref_range_low_f,
          ref_range_high_f,
          critical_low,
          critical_high,
          description,
          range_source
        )
      `
      )
      .eq('profile_id', profileId)
      .eq('name_normalized', nameNormalized)
      .order('report_date', { ascending: true });

    if (error) {
      logger.error('Failed to find historical biomarker values', {
        error,
        profileId,
        nameNormalized,
      });
      throw new Error(`Failed to find biomarker history: ${error.message}`);
    }

    const mapped = data.map((row: Record<string, any>) => ({
      ...this.mapToDomain(row),
      definition: row.biomarker_definitions
        ? this.mapDefinitionToDomain(row.biomarker_definitions)
        : undefined,
    }));

    // Dedup by reportId: when one report has multiple method-variant rows for the
    // same nameNormalized, keep only the primary one so each report contributes
    // exactly one data point to the trend chart.
    const byReport = new Map<string, BiomarkerWithDefinition[]>();
    for (const b of mapped) {
      if (!byReport.has(b.reportId)) byReport.set(b.reportId, []);
      byReport.get(b.reportId)!.push(b);
    }
    const deduped = [...byReport.values()].map(selectPrimary);
    // Re-sort ascending by date (grouping breaks original order).
    return deduped.sort((a, b) => {
      const dA = a.reportDate ? a.reportDate.getTime() : 0;
      const dB = b.reportDate ? b.reportDate.getTime() : 0;
      return dA - dB;
    });
  }

  /**
   * Delete all biomarkers for a report
   */
  async deleteByReport(reportId: string): Promise<void> {
    logger.debug('Deleting biomarkers by report', { reportId });

    const { error } = await supabase.from('biomarkers').delete().eq('report_id', reportId);

    if (error) {
      logger.error('Failed to delete biomarkers', { error, reportId });
      throw new Error(`Failed to delete biomarkers: ${error.message}`);
    }
  }

  /**
   * Delete all biomarkers for a profile
   */
  async deleteByProfile(profileId: string): Promise<void> {
    logger.debug('Deleting biomarkers by profile', { profileId });

    const { error } = await supabase.from('biomarkers').delete().eq('profile_id', profileId);

    if (error) {
      logger.error('Failed to delete biomarkers', { error, profileId });
      throw new Error(`Failed to delete biomarkers: ${error.message}`);
    }
  }

  /**
   * Upsert a biomarker definition (insert or update on conflict)
   */
  async upsertDefinition(data: {
    nameNormalized: string;
    displayName: string;
    category: string;
    unit: string;
    refRangeLow?: number;
    refRangeHigh?: number;
  }): Promise<void> {
    const { error } = await supabase
      .from('biomarker_definitions')
      .upsert(
        {
          name_normalized: data.nameNormalized,
          display_name: data.displayName,
          category: data.category,
          unit: data.unit,
          ref_range_low: data.refRangeLow ?? null,
          ref_range_high: data.refRangeHigh ?? null,
        },
        { onConflict: 'name_normalized', ignoreDuplicates: false }
      );

    if (error) {
      logger.error('Failed to upsert biomarker definition', { error, data });
      throw new Error(`Failed to upsert biomarker definition: ${error.message}`);
    }
  }

  /**
   * Get all biomarker definitions
   */
  async getAllDefinitions(): Promise<BiomarkerDefinition[]> {
    logger.debug('Getting all biomarker definitions');

    const { data, error } = await supabase
      .from('biomarker_definitions')
      .select('*')
      .order('category', { ascending: true });

    if (error) {
      logger.error('Failed to get biomarker definitions', { error });
      throw new Error(`Failed to get biomarker definitions: ${error.message}`);
    }

    return data.map(this.mapDefinitionToDomain);
  }

  /**
   * Get a specific biomarker definition
   */
  async getDefinition(nameNormalized: string): Promise<BiomarkerDefinition | null> {
    logger.debug('Getting biomarker definition', { nameNormalized });

    const { data, error } = await supabase
      .from('biomarker_definitions')
      .select('*')
      .eq('name_normalized', nameNormalized)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      logger.error('Failed to get biomarker definition', {
        error,
        nameNormalized,
      });
      throw new Error(`Failed to get biomarker definition: ${error.message}`);
    }

    return this.mapDefinitionToDomain(data);
  }

  /**
   * Map database row to domain Biomarker
   */
  private mapToDomain(row: Record<string, any>): Biomarker {
    return {
      id: row.id,
      reportId: row.report_id,
      userId: row.user_id,
      profileId: row.profile_id,
      name: row.name,
      nameNormalized: row.name_normalized,
      category: row.category,
      value: parseFloat(row.value),
      unit: row.unit,
      refRangeLow: row.ref_range_low != null ? parseFloat(row.ref_range_low) : undefined,
      refRangeHigh: row.ref_range_high != null ? parseFloat(row.ref_range_high) : undefined,
      reportDate: row.report_date ? new Date(row.report_date) : undefined,
      createdAt: new Date(row.created_at),
    };
  }

  /**
   * Map database row to domain BiomarkerDefinition
   */
  private mapDefinitionToDomain(row: Record<string, any>): BiomarkerDefinition {
    return {
      nameNormalized: row.name_normalized,
      displayName: row.display_name,
      category: row.category,
      unit: row.unit,
      refRangeLow:  row.ref_range_low   != null ? parseFloat(row.ref_range_low)   : undefined,
      refRangeHigh: row.ref_range_high  != null ? parseFloat(row.ref_range_high)  : undefined,
      refRangeLowM:  row.ref_range_low_m  != null ? parseFloat(row.ref_range_low_m)  : undefined,
      refRangeHighM: row.ref_range_high_m != null ? parseFloat(row.ref_range_high_m) : undefined,
      refRangeLowF:  row.ref_range_low_f  != null ? parseFloat(row.ref_range_low_f)  : undefined,
      refRangeHighF: row.ref_range_high_f != null ? parseFloat(row.ref_range_high_f) : undefined,
      criticalLow:  row.critical_low  != null ? parseFloat(row.critical_low)  : undefined,
      criticalHigh: row.critical_high != null ? parseFloat(row.critical_high) : undefined,
      description: row.description,
      rangeSource: row.range_source ?? undefined,
    };
  }
}

// Export singleton instance
export const biomarkerRepository = new BiomarkerRepository();
