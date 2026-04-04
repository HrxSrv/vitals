import { Request, Response, NextFunction } from 'express';
import { biomarkerService } from '../../services/biomarker.service';
import { biomarkerRepository } from '../../repositories/biomarker.repository';

/**
 * GET /api/biomarkers/trends?profileId=xxx
 * Get biomarker trends for a profile (only biomarkers with 2+ data points)
 */
export async function getBiomarkerTrends(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { profileId } = req.query;

    if (!profileId || typeof profileId !== 'string') {
      res.status(400).json({ error: 'profileId is required' });
      return;
    }

    // Get all biomarkers with definitions
    const biomarkers = await biomarkerRepository.findByProfileWithDefinitions(profileId);

    // Deduplicate: keep only one entry per (nameNormalized, reportId).
    // A single CBC report can produce multiple sub-measurements that normalize
    // to the same name (e.g. RBC by impedance + RBC by histogram both → rbc),
    // which would create fake "multiple readings" from a single upload.
    const seen = new Set<string>();
    const deduplicated = biomarkers.filter((b) => {
      const key = `${b.nameNormalized}::${b.reportId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Group by nameNormalized and filter those with 2+ readings
    const biomarkerGroups = deduplicated.reduce<Record<string, typeof deduplicated>>((acc, b) => {
      if (!acc[b.nameNormalized]) acc[b.nameNormalized] = [];
      acc[b.nameNormalized].push(b);
      return acc;
    }, {});

    // Build trend data for biomarkers with 2+ readings
    const trends = Object.entries(biomarkerGroups)
      .filter(([_, group]) => group.length >= 2)
      .map(([nameNormalized, group]) => {
        // Sort by date ascending
        const sorted = group.sort((a, b) => {
          const dateA = a.reportDate ? new Date(a.reportDate).getTime() : 0;
          const dateB = b.reportDate ? new Date(b.reportDate).getTime() : 0;
          return dateA - dateB;
        });

        const latest = sorted[sorted.length - 1];
        const definition = latest.definition;

        return {
          nameNormalized,
          displayName: definition?.displayName || latest.name,
          category: definition?.category || latest.category,
          unit: definition?.unit || latest.unit,
          refRangeLow: definition?.refRangeLow,
          refRangeHigh: definition?.refRangeHigh,
          history: sorted.map((b) => ({
            date: b.reportDate ? b.reportDate.toISOString() : new Date().toISOString(),
            value: b.value,
            status: biomarkerService.calculateStatus(b.value, b.definition || undefined),
          })),
        };
      });

    res.json({ trends });
  } catch (error) {
    next(error);
  }
}
