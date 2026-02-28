import { supabaseAdmin } from '../services/supabase.service';
import { LHMDocument, LHMHistory } from '../types/domain.types';
import { TablesInsert, TablesUpdate } from '../types/database.types';
import { HttpError } from '../utils/httpError';
import { logger } from '../utils/logger';

/**
 * LHM Repository
 * Handles all database operations for Living Health Markdown documents
 * Manages LHM documents and their version history
 */
export class LHMRepository {
  /**
   * Create a new LHM document for a profile
   * This is typically called when a profile is first created
   */
  async create(data: {
    profileId: string;
    userId: string;
    markdown: string;
    lastReportDate?: Date;
    tokensApprox?: number;
  }): Promise<LHMDocument> {
    try {
      const insertData: TablesInsert<'user_health_markdown'> = {
        profile_id: data.profileId,
        user_id: data.userId,
        markdown: data.markdown,
        version: 1,
        last_report_date: data.lastReportDate?.toISOString().split('T')[0] || null,
        tokens_approx: data.tokensApprox || null,
      };

      const { data: lhm, error } = await supabaseAdmin
        .from('user_health_markdown')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        logger.error('Failed to create LHM:', error);
        throw new HttpError(500, `Failed to create LHM: ${error.message}`, 'DATABASE_ERROR');
      }

      logger.info(`LHM created for profile ${data.profileId}`);
      return this.mapToLHMDocument(lhm);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      logger.error('Unexpected error creating LHM:', error);
      throw new HttpError(500, 'Failed to create LHM', 'DATABASE_ERROR');
    }
  }

  /**
   * Find LHM document by profile ID
   */
  async findByProfileId(profileId: string): Promise<LHMDocument | null> {
    try {
      const { data: lhm, error } = await supabaseAdmin
        .from('user_health_markdown')
        .select('*')
        .eq('profile_id', profileId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        logger.error('Failed to fetch LHM:', error);
        throw new HttpError(500, `Failed to fetch LHM: ${error.message}`, 'DATABASE_ERROR');
      }

      return this.mapToLHMDocument(lhm);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      logger.error('Unexpected error fetching LHM:', error);
      throw new HttpError(500, 'Failed to fetch LHM', 'DATABASE_ERROR');
    }
  }

  /**
   * Update LHM document with new content
   * Automatically increments version and updates timestamp
   * Archives the previous version to lhm_history table
   */
  async update(
    profileId: string,
    data: {
      markdown: string;
      lastReportDate?: Date;
      tokensApprox?: number;
    }
  ): Promise<LHMDocument> {
    try {
      // First, get the current LHM to archive it
      const currentLHM = await this.findByProfileId(profileId);
      
      if (!currentLHM) {
        throw new HttpError(404, 'LHM not found for profile', 'NOT_FOUND');
      }

      // Archive the current version to history
      await this.archiveVersion(currentLHM);

      // Update with new content and increment version
      const updateData: TablesUpdate<'user_health_markdown'> = {
        markdown: data.markdown,
        version: currentLHM.version + 1,
        last_updated_at: new Date().toISOString(),
        last_report_date: data.lastReportDate?.toISOString().split('T')[0] || currentLHM.lastReportDate?.toISOString().split('T')[0] || null,
        tokens_approx: data.tokensApprox || null,
      };

      const { data: updatedLHM, error } = await supabaseAdmin
        .from('user_health_markdown')
        .update(updateData)
        .eq('profile_id', profileId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update LHM:', error);
        throw new HttpError(500, `Failed to update LHM: ${error.message}`, 'DATABASE_ERROR');
      }

      logger.info(`LHM updated for profile ${profileId}, version ${currentLHM.version} -> ${currentLHM.version + 1}`);
      return this.mapToLHMDocument(updatedLHM);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      logger.error('Unexpected error updating LHM:', error);
      throw new HttpError(500, 'Failed to update LHM', 'DATABASE_ERROR');
    }
  }

  /**
   * Archive a version of LHM to history table
   * Called automatically during updates
   */
  private async archiveVersion(lhm: LHMDocument): Promise<void> {
    try {
      const historyData: TablesInsert<'lhm_history'> = {
        profile_id: lhm.profileId,
        markdown: lhm.markdown,
        version: lhm.version,
      };

      const { error } = await supabaseAdmin
        .from('lhm_history')
        .insert(historyData);

      if (error) {
        logger.error('Failed to archive LHM version:', error);
        throw new HttpError(500, `Failed to archive LHM version: ${error.message}`, 'DATABASE_ERROR');
      }

      logger.info(`LHM version ${lhm.version} archived for profile ${lhm.profileId}`);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      logger.error('Unexpected error archiving LHM version:', error);
      throw new HttpError(500, 'Failed to archive LHM version', 'DATABASE_ERROR');
    }
  }

  /**
   * Get version history for a profile
   * Returns all archived versions ordered by version descending
   */
  async getHistory(profileId: string, limit?: number): Promise<LHMHistory[]> {
    try {
      let query = supabaseAdmin
        .from('lhm_history')
        .select('*')
        .eq('profile_id', profileId)
        .order('version', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data: history, error } = await query;

      if (error) {
        logger.error('Failed to fetch LHM history:', error);
        throw new HttpError(500, `Failed to fetch LHM history: ${error.message}`, 'DATABASE_ERROR');
      }

      return history.map(this.mapToLHMHistory);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      logger.error('Unexpected error fetching LHM history:', error);
      throw new HttpError(500, 'Failed to fetch LHM history', 'DATABASE_ERROR');
    }
  }

  /**
   * Get a specific version from history
   */
  async getVersion(profileId: string, version: number): Promise<LHMHistory | null> {
    try {
      const { data: history, error } = await supabaseAdmin
        .from('lhm_history')
        .select('*')
        .eq('profile_id', profileId)
        .eq('version', version)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        logger.error('Failed to fetch LHM version:', error);
        throw new HttpError(500, `Failed to fetch LHM version: ${error.message}`, 'DATABASE_ERROR');
      }

      return this.mapToLHMHistory(history);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      logger.error('Unexpected error fetching LHM version:', error);
      throw new HttpError(500, 'Failed to fetch LHM version', 'DATABASE_ERROR');
    }
  }

  /**
   * Delete LHM document and all its history
   * This is typically called when a profile is deleted (cascade delete)
   */
  async delete(profileId: string): Promise<void> {
    try {
      // Delete history first
      await supabaseAdmin
        .from('lhm_history')
        .delete()
        .eq('profile_id', profileId);

      // Delete current LHM
      const { error } = await supabaseAdmin
        .from('user_health_markdown')
        .delete()
        .eq('profile_id', profileId);

      if (error) {
        logger.error('Failed to delete LHM:', error);
        throw new HttpError(500, `Failed to delete LHM: ${error.message}`, 'DATABASE_ERROR');
      }

      logger.info(`LHM deleted for profile ${profileId}`);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      logger.error('Unexpected error deleting LHM:', error);
      throw new HttpError(500, 'Failed to delete LHM', 'DATABASE_ERROR');
    }
  }

  /**
   * Check if LHM exists for a profile
   */
  async exists(profileId: string): Promise<boolean> {
    try {
      const { count, error } = await supabaseAdmin
        .from('user_health_markdown')
        .select('profile_id', { count: 'exact', head: true })
        .eq('profile_id', profileId);

      if (error) {
        logger.error('Failed to check LHM existence:', error);
        throw new HttpError(500, `Failed to check LHM existence: ${error.message}`, 'DATABASE_ERROR');
      }

      return (count || 0) > 0;
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      logger.error('Unexpected error checking LHM existence:', error);
      throw new HttpError(500, 'Failed to check LHM existence', 'DATABASE_ERROR');
    }
  }

  /**
   * Map database row to LHMDocument domain type
   */
  private mapToLHMDocument(row: any): LHMDocument {
    return {
      profileId: row.profile_id,
      userId: row.user_id,
      markdown: row.markdown,
      version: row.version,
      lastUpdatedAt: new Date(row.last_updated_at),
      lastReportDate: row.last_report_date ? new Date(row.last_report_date) : undefined,
      tokensApprox: row.tokens_approx || undefined,
    };
  }

  /**
   * Map database row to LHMHistory domain type
   */
  private mapToLHMHistory(row: any): LHMHistory {
    return {
      id: row.id,
      profileId: row.profile_id,
      markdown: row.markdown,
      version: row.version,
      createdAt: new Date(row.created_at),
    };
  }
}

// Export singleton instance
export const lhmRepository = new LHMRepository();
