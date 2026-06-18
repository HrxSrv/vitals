import { Request, Response, NextFunction } from 'express';
import { biomarkerService, pickRangeForGender } from '../../services/biomarker.service';
import { biomarkerRepository, selectPrimary } from '../../repositories/biomarker.repository';
import profileRepository from '../../repositories/profile.repository';
import { GenderType } from '../../types/domain.types';

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

    // Fetch profile for gender-aware range selection
    const profile = await profileRepository.findById(profileId).catch(() => null);
    const gender = (profile?.gender === 'male' || profile?.gender === 'female')
      ? profile.gender as GenderType
      : undefined;

    // Get all biomarkers with definitions
    const biomarkers = await biomarkerRepository.findByProfileWithDefinitions(profileId);

    // Group by (nameNormalized, reportId) and pick the primary method variant per group.
    // Prevents a single CBC report with "RBC by impedance" + "RBC by histogram" from
    // counting as two separate readings for trend purposes.
    const reportGroups = new Map<string, typeof biomarkers>();
    for (const b of biomarkers) {
      const key = `${b.nameNormalized}::${b.reportId}`;
      if (!reportGroups.has(key)) reportGroups.set(key, []);
      reportGroups.get(key)!.push(b);
    }
    const deduplicated = [...reportGroups.values()].map(selectPrimary);

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
        // Use gender-specific range for the trend header display if available
        const displayRange = definition ? pickRangeForGender(definition, gender) : {};

        return {
          nameNormalized,
          displayName: definition?.displayName || latest.name,
          category: definition?.category || latest.category,
          unit: definition?.unit || latest.unit,
          refRangeLow:  displayRange.refRangeLow,
          refRangeHigh: displayRange.refRangeHigh,
          history: sorted.map((b) => ({
            date: b.reportDate ? b.reportDate.toISOString() : new Date().toISOString(),
            value: b.value,
            // Per-reading status: use per-lab range first, definition range as fallback
            status: biomarkerService.calculateStatus(
              b.value,
              {
                refRangeLow:  b.refRangeLow  ?? b.definition?.refRangeLow,
                refRangeHigh: b.refRangeHigh ?? b.definition?.refRangeHigh,
                refRangeLowM:  b.definition?.refRangeLowM,
                refRangeHighM: b.definition?.refRangeHighM,
                refRangeLowF:  b.definition?.refRangeLowF,
                refRangeHighF: b.definition?.refRangeHighF,
                criticalLow:  b.definition?.criticalLow,
                criticalHigh: b.definition?.criticalHigh,
              },
              gender,
            ),
          })),
        };
      });

    res.json({ trends });
  } catch (error) {
    next(error);
  }
}
