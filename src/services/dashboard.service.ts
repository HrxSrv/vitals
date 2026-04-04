import { lhmService } from './lhm.service';
import { biomarkerService } from './biomarker.service';
import profileRepository from '../repositories/profile.repository';
import { reportRepository } from '../repositories/report.repository';
import { logger } from '../utils/logger';
import { HttpError } from '../utils/httpError';
import { getCached, cache } from '../utils/cache';
import {
  LHMDocument,
  BiomarkerDefinition,
  BiomarkerStatusType,
  Profile,
} from '../types/domain.types';

export interface BiomarkerWithStatus {
  biomarker: {
    id: string;
    reportId: string;
    userId: string;
    profileId: string;
    name: string;
    nameNormalized: string;
    category?: string;
    value: number;
    unit: string;
    reportDate?: Date;
    createdAt: Date;
  };
  definition?: BiomarkerDefinition;
  status: BiomarkerStatusType;
}

export interface DashboardSummary {
  totalReports: number;
  latestReportDate: string | null;
  biomarkerCount: number;
}

export interface DashboardData {
  profile: Profile;
  summary: DashboardSummary;
  latestBiomarkers: BiomarkerWithStatus[];
  lhm: LHMDocument | null;
}

/**
 * Dashboard Service
 * Provides aggregated health data for dashboard display
 * Combines LHM, latest biomarkers, and metadata
 */
export class DashboardService {
  /**
   * Get dashboard data for a profile
   * Returns LHM, latest biomarkers with status, and metadata
   * Cached for 10 minutes for performance
   *
   * @param userId - User ID (for authorization)
   * @param profileId - Profile ID
   * @returns Dashboard data
   */
  async getDashboard(userId: string, profileId: string): Promise<DashboardData> {
    try {
      logger.info('Fetching dashboard data', { userId, profileId });

      // Use cache with 10-minute TTL
      const cacheKey = `dashboard:${profileId}`;

      return await getCached(
        cacheKey,
        async () => {
          // Fetch profile and verify ownership
          const profile = await profileRepository.findById(profileId);

          if (!profile) {
            throw new HttpError(404, 'Profile not found', 'NOT_FOUND');
          }

          if (profile.userId !== userId) {
            throw new HttpError(403, 'Access denied to this profile', 'FORBIDDEN');
          }

          // Fetch LHM document — optional, dashboard works without it
          let lhm = null;
          try {
            lhm = await lhmService.getLHM(profileId);
          } catch (lhmError) {
            // LHM missing for this profile — try to initialize a skeleton
            try {
              await lhmService.initializeSkeletonForProfile(profile);
              lhm = await lhmService.getLHM(profileId);
            } catch {
              // Still failed — proceed without LHM, frontend handles null
              logger.warn('LHM unavailable for profile, proceeding without it', { profileId });
            }
          }

          // Fetch latest biomarkers with definitions
          const latestBiomarkers = await biomarkerService.getLatestBiomarkers(profileId);

          logger.debug('Raw biomarkers from service', {
            count: latestBiomarkers.length,
            sample: latestBiomarkers[0],
          });

          // Calculate status for each biomarker and structure for frontend
          const biomarkersWithStatus = latestBiomarkers.map((biomarker) => ({
            biomarker: {
              id: biomarker.id,
              reportId: biomarker.reportId,
              userId: biomarker.userId,
              profileId: biomarker.profileId,
              name: biomarker.name,
              nameNormalized: biomarker.nameNormalized,
              category: biomarker.category || biomarker.definition?.category || 'Other',
              value: biomarker.value,
              unit: biomarker.unit,
              reportDate: biomarker.reportDate,
              createdAt: biomarker.createdAt,
            },
            definition: biomarker.definition,
            status: biomarkerService.calculateStatus(biomarker.value, biomarker.definition),
          }));

          logger.debug('Structured biomarkers for frontend', {
            count: biomarkersWithStatus.length,
            sample: biomarkersWithStatus[0],
          });

          // Calculate days since last report
          let daysSinceLastReport: number | undefined;
          if (lhm?.lastReportDate) {
            const now = new Date();
            const lastReport = new Date(lhm.lastReportDate);
            const diffTime = Math.abs(now.getTime() - lastReport.getTime());
            daysSinceLastReport = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          }

          // Get total report count
          const totalReports = await reportRepository.countByProfile(profileId);

          // Get latest report date
          const latestReportDate =
            biomarkersWithStatus.length > 0 && biomarkersWithStatus[0].biomarker.reportDate
              ? biomarkersWithStatus[0].biomarker.reportDate.toISOString().split('T')[0]
              : null;

          logger.info('Dashboard data fetched successfully', {
            profileId,
            biomarkerCount: biomarkersWithStatus.length,
            daysSinceLastReport,
            totalReports,
          });

          return {
            profile,
            summary: {
              totalReports,
              latestReportDate,
              biomarkerCount: biomarkersWithStatus.length,
            },
            latestBiomarkers: biomarkersWithStatus,
            lhm,
          };
        },
        600 // 10 minutes cache
      );
    } catch (error) {
      logger.error('Failed to fetch dashboard data', {
        userId,
        profileId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Invalidate dashboard cache for a profile
   * Should be called when profile data changes (new report, etc.)
   *
   * @param profileId - Profile ID
   */
  invalidateCache(profileId: string): void {
    const cacheKey = `dashboard:${profileId}`;
    cache.delete(cacheKey);
    logger.debug('Dashboard cache invalidated', { profileId });
  }

  /**
   * Get dashboard data for all profiles of a user
   * Useful for family-wide overview
   *
   * @param userId - User ID
   * @returns Array of dashboard data for each profile
   */
  async getAllDashboards(userId: string): Promise<DashboardData[]> {
    try {
      logger.info('Fetching all dashboards for user', { userId });

      // Get all profiles for user
      const profiles = await profileRepository.findByUserId(userId);

      // Fetch dashboard data for each profile
      const dashboards = await Promise.all(
        profiles.map((profile) => this.getDashboard(userId, profile.id))
      );

      logger.info('All dashboards fetched successfully', {
        userId,
        profileCount: profiles.length,
      });

      return dashboards;
    } catch (error) {
      logger.error('Failed to fetch all dashboards', {
        userId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }
}

// Export singleton instance
export const dashboardService = new DashboardService();
