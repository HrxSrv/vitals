import { getSupabaseClient } from '../utils/supabase';
import { Biomarker, BiomarkerDefinition, BiomarkerWithDefinition } from '../types/domain.types';
import { logger } from '../utils/logger';

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
          unit: b.unit,
          report_date: b.reportDate?.toISOString().split('T')[0],
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
   * Get biomarkers with their definitions joined
   */
  async findByProfileWithDefinitions(
    profileId: string
  ): Promise<BiomarkerWithDefinition[]> {
    logger.debug('Finding biomarkers with definitions', { profileId });

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
          critical_low,
          critical_high,
          description
        )
      `
      )
      .eq('profile_id', profileId)
      .order('report_date', { ascending: false });

    if (error) {
      logger.error('Failed to find biomarkers with definitions', {
        error,
        profileId,
      });
      throw new Error(`Failed to find biomarkers: ${error.message}`);
    }

    return data.map((row: Record<string, any>) => ({
      ...this.mapToDomain(row),
      definition: row.biomarker_definitions
        ? this.mapDefinitionToDomain(row.biomarker_definitions)
        : undefined,
    }));
  }

  /**
   * Get latest biomarkers for a profile (one per biomarker type)
   */
  async findLatestByProfile(
    profileId: string
  ): Promise<BiomarkerWithDefinition[]> {
    logger.debug('Finding latest biomarkers by profile', { profileId });

    // Get all biomarkers with definitions
    const biomarkers = await this.findByProfileWithDefinitions(profileId);

    // Group by normalized name and keep only the latest
    const latestMap = new Map<string, BiomarkerWithDefinition>();

    for (const biomarker of biomarkers) {
      const existing = latestMap.get(biomarker.nameNormalized);

      if (
        !existing ||
        (biomarker.reportDate &&
          existing.reportDate &&
          biomarker.reportDate > existing.reportDate)
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
          critical_low,
          critical_high,
          description
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

    return data.map((row: Record<string, any>) => ({
      ...this.mapToDomain(row),
      definition: row.biomarker_definitions
        ? this.mapDefinitionToDomain(row.biomarker_definitions)
        : undefined,
    }));
  }

  /**
   * Delete all biomarkers for a report
   */
  async deleteByReport(reportId: string): Promise<void> {
    logger.debug('Deleting biomarkers by report', { reportId });

    const { error } = await supabase
      .from('biomarkers')
      .delete()
      .eq('report_id', reportId);

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

    const { error } = await supabase
      .from('biomarkers')
      .delete()
      .eq('profile_id', profileId);

    if (error) {
      logger.error('Failed to delete biomarkers', { error, profileId });
      throw new Error(`Failed to delete biomarkers: ${error.message}`);
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
  async getDefinition(
    nameNormalized: string
  ): Promise<BiomarkerDefinition | null> {
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
      refRangeLow: row.ref_range_low ? parseFloat(row.ref_range_low) : undefined,
      refRangeHigh: row.ref_range_high ? parseFloat(row.ref_range_high) : undefined,
      criticalLow: row.critical_low ? parseFloat(row.critical_low) : undefined,
      criticalHigh: row.critical_high ? parseFloat(row.critical_high) : undefined,
      description: row.description,
    };
  }
}

// Export singleton instance
export const biomarkerRepository = new BiomarkerRepository();
