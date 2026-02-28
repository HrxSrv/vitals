import { getSupabaseClient } from '../utils/supabase';
import { ReportEmbedding } from '../types/domain.types';
import { logger } from '../utils/logger';

const supabase = getSupabaseClient();

export interface CreateEmbeddingData {
  reportId: string;
  userId: string;
  profileId: string;
  chunkText: string;
  embedding: number[];
}

export interface SimilaritySearchResult extends ReportEmbedding {
  similarity: number;
}

export class EmbeddingRepository {
  /**
   * Create a new embedding record
   */
  async create(data: CreateEmbeddingData): Promise<ReportEmbedding> {
    logger.debug('Creating embedding', {
      reportId: data.reportId,
      profileId: data.profileId,
      chunkLength: data.chunkText.length,
    });

    const { data: embedding, error } = await supabase
      .from('report_embeddings')
      .insert({
        report_id: data.reportId,
        user_id: data.userId,
        profile_id: data.profileId,
        chunk_text: data.chunkText,
        embedding: JSON.stringify(data.embedding),
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create embedding', { error, data });
      throw new Error(`Failed to create embedding: ${error.message}`);
    }

    return this.mapToDomain(embedding);
  }

  /**
   * Create multiple embeddings in batch
   */
  async createBatch(embeddings: CreateEmbeddingData[]): Promise<ReportEmbedding[]> {
    logger.debug('Creating embeddings in batch', {
      count: embeddings.length,
    });

    const { data, error } = await supabase
      .from('report_embeddings')
      .insert(
        embeddings.map((e) => ({
          report_id: e.reportId,
          user_id: e.userId,
          profile_id: e.profileId,
          chunk_text: e.chunkText,
          embedding: JSON.stringify(e.embedding),
        }))
      )
      .select();

    if (error) {
      logger.error('Failed to create embeddings in batch', { error });
      throw new Error(`Failed to create embeddings: ${error.message}`);
    }

    return data.map(this.mapToDomain);
  }

  /**
   * Perform vector similarity search for a profile
   * Uses cosine similarity to find the most relevant chunks
   */
  async similaritySearch(
    profileId: string,
    queryEmbedding: number[],
    limit: number = 5,
    similarityThreshold: number = 0.7
  ): Promise<SimilaritySearchResult[]> {
    logger.debug('Performing similarity search', {
      profileId,
      limit,
      similarityThreshold,
    });

    // Use pgvector's cosine similarity operator (<=>)
    // Lower distance = higher similarity
    // We convert distance to similarity: similarity = 1 - distance
    const { data, error } = await supabase.rpc('search_embeddings', {
      query_embedding: JSON.stringify(queryEmbedding),
      query_profile_id: profileId,
      match_threshold: 1 - similarityThreshold, // Convert similarity to distance
      match_count: limit,
    });

    if (error) {
      logger.error('Failed to perform similarity search', {
        error,
        profileId,
      });
      throw new Error(`Failed to search embeddings: ${error.message}`);
    }

    return data.map((row: Record<string, any>) => ({
      ...this.mapToDomain(row),
      similarity: 1 - row.distance, // Convert distance back to similarity
    }));
  }

  /**
   * Get all embeddings for a specific report
   */
  async findByReport(reportId: string): Promise<ReportEmbedding[]> {
    logger.debug('Finding embeddings by report', { reportId });

    const { data, error } = await supabase
      .from('report_embeddings')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Failed to find embeddings by report', { error, reportId });
      throw new Error(`Failed to find embeddings: ${error.message}`);
    }

    return data.map(this.mapToDomain);
  }

  /**
   * Get all embeddings for a specific profile
   */
  async findByProfile(profileId: string): Promise<ReportEmbedding[]> {
    logger.debug('Finding embeddings by profile', { profileId });

    const { data, error } = await supabase
      .from('report_embeddings')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to find embeddings by profile', {
        error,
        profileId,
      });
      throw new Error(`Failed to find embeddings: ${error.message}`);
    }

    return data.map(this.mapToDomain);
  }

  /**
   * Delete all embeddings for a report
   */
  async deleteByReport(reportId: string): Promise<void> {
    logger.debug('Deleting embeddings by report', { reportId });

    const { error } = await supabase
      .from('report_embeddings')
      .delete()
      .eq('report_id', reportId);

    if (error) {
      logger.error('Failed to delete embeddings', { error, reportId });
      throw new Error(`Failed to delete embeddings: ${error.message}`);
    }
  }

  /**
   * Delete all embeddings for a profile
   */
  async deleteByProfile(profileId: string): Promise<void> {
    logger.debug('Deleting embeddings by profile', { profileId });

    const { error } = await supabase
      .from('report_embeddings')
      .delete()
      .eq('profile_id', profileId);

    if (error) {
      logger.error('Failed to delete embeddings', { error, profileId });
      throw new Error(`Failed to delete embeddings: ${error.message}`);
    }
  }

  /**
   * Count embeddings for a report
   */
  async countByReport(reportId: string): Promise<number> {
    logger.debug('Counting embeddings by report', { reportId });

    const { count, error } = await supabase
      .from('report_embeddings')
      .select('*', { count: 'exact', head: true })
      .eq('report_id', reportId);

    if (error) {
      logger.error('Failed to count embeddings', { error, reportId });
      throw new Error(`Failed to count embeddings: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Count embeddings for a profile
   */
  async countByProfile(profileId: string): Promise<number> {
    logger.debug('Counting embeddings by profile', { profileId });

    const { count, error } = await supabase
      .from('report_embeddings')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId);

    if (error) {
      logger.error('Failed to count embeddings', { error, profileId });
      throw new Error(`Failed to count embeddings: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Map database row to domain ReportEmbedding
   */
  private mapToDomain(row: Record<string, any>): ReportEmbedding {
    return {
      id: row.id,
      reportId: row.report_id,
      userId: row.user_id,
      profileId: row.profile_id,
      chunkText: row.chunk_text,
      embedding: typeof row.embedding === 'string' 
        ? JSON.parse(row.embedding) 
        : row.embedding,
      createdAt: new Date(row.created_at),
    };
  }
}

// Export singleton instance
export const embeddingRepository = new EmbeddingRepository();
