import { supabaseAdmin } from '../services/supabase.service';
import { Profile } from '../types/domain.types';
import { TablesInsert, TablesUpdate } from '../types/database.types';
import { HttpError } from '../utils/httpError';

/**
 * Profile Repository
 * Handles all database operations for profiles
 */
export class ProfileRepository {
  /**
   * Find all profiles for a user
   */
  async findByUserId(userId: string): Promise<Profile[]> {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new HttpError(500, `Failed to fetch profiles: ${error.message}`, 'DATABASE_ERROR');
    }

    return this.mapToProfiles(data);
  }

  /**
   * Find a profile by ID
   */
  async findById(profileId: string): Promise<Profile | null> {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw new HttpError(500, `Failed to fetch profile: ${error.message}`, 'DATABASE_ERROR');
    }

    return this.mapToProfile(data);
  }

  /**
   * Create a new profile
   */
  async create(
    userId: string,
    data: {
      name: string;
      relationship: string;
      dob?: string | null;
      gender?: string | null;
      isDefault?: boolean;
    }
  ): Promise<Profile> {
    const insertData: TablesInsert<'profiles'> = {
      user_id: userId,
      name: data.name,
      relationship: data.relationship,
      dob: data.dob || null,
      gender: data.gender || null,
      is_default: data.isDefault || false,
    };

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw new HttpError(500, `Failed to create profile: ${error.message}`, 'DATABASE_ERROR');
    }

    return this.mapToProfile(profile);
  }

  /**
   * Update a profile
   */
  async update(
    profileId: string,
    data: {
      name?: string;
      relationship?: string;
      dob?: string | null;
      gender?: string | null;
    }
  ): Promise<Profile> {
    const updateData: TablesUpdate<'profiles'> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.relationship !== undefined)
      updateData.relationship = data.relationship;
    if (data.dob !== undefined) updateData.dob = data.dob;
    if (data.gender !== undefined) updateData.gender = data.gender;

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', profileId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new HttpError(404, 'Profile not found', 'NOT_FOUND');
      }
      throw new HttpError(500, `Failed to update profile: ${error.message}`, 'DATABASE_ERROR');
    }

    return this.mapToProfile(profile);
  }

  /**
   * Delete a profile and all associated data (cascade)
   * This will automatically delete:
   * - Reports (via FK cascade)
   * - Biomarkers (via FK cascade)
   * - LHM documents (via FK cascade)
   * - Report embeddings (via FK cascade)
   */
  async delete(profileId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', profileId);

    if (error) {
      throw new HttpError(500, `Failed to delete profile: ${error.message}`, 'DATABASE_ERROR');
    }
  }

  /**
   * Check if a user has any profiles
   */
  async hasProfiles(userId: string): Promise<boolean> {
    const { count, error } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      throw new HttpError(500, `Failed to check profiles: ${error.message}`, 'DATABASE_ERROR');
    }

    return (count || 0) > 0;
  }

  /**
   * Get the default profile for a user
   */
  async findDefaultProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new HttpError(500, `Failed to fetch default profile: ${error.message}`, 'DATABASE_ERROR');
    }

    return this.mapToProfile(data);
  }

  /**
   * Set a profile as the default profile for a user
   * Unsets any existing default profile
   */
  async setAsDefault(userId: string, profileId: string): Promise<void> {
    // First, unset all default profiles for this user
    await supabaseAdmin
      .from('profiles')
      .update({ is_default: false })
      .eq('user_id', userId)
      .eq('is_default', true);

    // Then set the specified profile as default
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ is_default: true })
      .eq('id', profileId)
      .eq('user_id', userId);

    if (error) {
      throw new HttpError(500, `Failed to set default profile: ${error.message}`, 'DATABASE_ERROR');
    }
  }

  /**
   * Map database row to Profile domain type
   */
  private mapToProfile(row: any): Profile {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      relationship: row.relationship,
      dob: row.dob ? new Date(row.dob) : undefined,
      gender: row.gender || undefined,
      isDefault: row.is_default || false,
      createdAt: new Date(row.created_at),
    };
  }

  /**
   * Map array of database rows to Profile domain types
   */
  private mapToProfiles(rows: any[]): Profile[] {
    return rows.map((row) => this.mapToProfile(row));
  }
}

export default new ProfileRepository();
