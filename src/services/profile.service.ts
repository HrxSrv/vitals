import { ProfileRepository } from '../repositories/profile.repository';
import { lhmRepository } from '../repositories/lhm.repository';
import { Profile } from '../types/domain.types';
import { HttpError } from '../utils/httpError';
import { LHM_SKELETON_TEMPLATE } from '../constants/lhm-templates';
import { logger } from '../utils/logger';

/**
 * Profile Service
 * Business logic for profile management
 */
export class ProfileService {
  constructor(private repository: ProfileRepository) {}

  /**
   * Get all profiles for a user
   */
  async getProfiles(userId: string): Promise<Profile[]> {
    return this.repository.findByUserId(userId);
  }

  /**
   * Get a specific profile by ID
   * Ensures the profile belongs to the requesting user
   */
  async getProfileById(userId: string, profileId: string): Promise<Profile> {
    const profile = await this.repository.findById(profileId);

    if (!profile) {
      throw new HttpError(404, 'Profile not found', 'NOT_FOUND');
    }

    // Authorization check: ensure profile belongs to user
    if (profile.userId !== userId) {
      throw new HttpError(403, 'Access denied to this profile', 'FORBIDDEN');
    }

    return profile;
  }

  /**
   * Create a new profile
   * Auto-creates default profile on first profile creation
   * Initializes skeleton LHM for the profile
   */
  async createProfile(
    userId: string,
    data: {
      name: string;
      relationship: string;
      dob?: string | null;
      gender?: string | null;
    }
  ): Promise<Profile> {
    // Check if this is the user's first profile
    const hasExistingProfiles = await this.repository.hasProfiles(userId);
    const isDefault = !hasExistingProfiles;

    // Create the profile
    const profile = await this.repository.create(userId, {
      ...data,
      isDefault,
    });

    // Initialize skeleton LHM for the new profile
    await this.initializeSkeletonLHM(profile);

    return profile;
  }

  /**
   * Update a profile
   * Ensures the profile belongs to the requesting user
   */
  async updateProfile(
    userId: string,
    profileId: string,
    data: {
      name?: string;
      relationship?: string;
      dob?: string | null;
      gender?: string | null;
    }
  ): Promise<Profile> {
    // First verify ownership
    await this.getProfileById(userId, profileId);

    // Update the profile
    return this.repository.update(profileId, data);
  }

  /**
   * Delete a profile
   * Ensures the profile belongs to the requesting user
   * Cascade deletes all associated data (reports, biomarkers, LHM, embeddings)
   */
  async deleteProfile(userId: string, profileId: string): Promise<void> {
    // First verify ownership
    const profile = await this.getProfileById(userId, profileId);

    // Prevent deletion of the only profile
    const profiles = await this.repository.findByUserId(userId);
    if (profiles.length === 1) {
      throw new HttpError(
        400,
        'Cannot delete the only profile. Create another profile first.',
        'VALIDATION_ERROR'
      );
    }

    // If deleting the default profile, set another profile as default
    if (profile.isDefault && profiles.length > 1) {
      const otherProfile = profiles.find((p) => p.id !== profileId);
      if (otherProfile) {
        await this.repository.setAsDefault(userId, otherProfile.id);
      }
    }

    // Delete the profile (cascade will handle related data)
    await this.repository.delete(profileId);
  }

  /**
   * Set a profile as the default profile
   */
  async setDefaultProfile(userId: string, profileId: string): Promise<void> {
    // Verify ownership
    await this.getProfileById(userId, profileId);

    // Set as default
    await this.repository.setAsDefault(userId, profileId);
  }

  /**
   * Initialize skeleton LHM for a new profile
   * Creates the initial Living Health Markdown document following lhm.md structure
   */
  private async initializeSkeletonLHM(profile: Profile): Promise<void> {
    try {
      // Calculate age from DOB if available
      let age = 'N/A';
      if (profile.dob) {
        const today = new Date();
        const birthDate = new Date(profile.dob);
        let calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (
          monthDiff < 0 ||
          (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ) {
          calculatedAge--;
        }
        age = calculatedAge.toString();
      }

      // Generate skeleton LHM from template
      const markdown = LHM_SKELETON_TEMPLATE
        .replace(/{{name}}/g, profile.name)
        .replace(/{{age}}/g, age)
        .replace(/{{gender}}/g, profile.gender || 'N/A')
        .replace(/{{lastUpdated}}/g, new Date().toISOString().split('T')[0]);

      // Calculate approximate token count (rough estimate: 1 token ≈ 4 characters)
      const tokensApprox = Math.round(markdown.length / 4);

      // Create LHM document using repository
      await lhmRepository.create({
        profileId: profile.id,
        userId: profile.userId,
        markdown,
        tokensApprox,
      });

      logger.info(`Skeleton LHM initialized for profile ${profile.id} (${profile.name})`);
    } catch (error) {
      logger.error(`Failed to initialize skeleton LHM for profile ${profile.id}:`, error);
      // Don't throw - LHM initialization failure shouldn't block profile creation
      // It can be retried later or created when the first report is uploaded
    }
  }
}

// Export singleton instance
export default new ProfileService(
  new ProfileRepository()
);
