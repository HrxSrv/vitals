import { Request, Response, NextFunction } from 'express';
import { usageService } from '../../services/usage.service';

/**
 * GET /api/dashboard/usage
 * Returns the current user's monthly page usage and limit.
 */
export async function getUsage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const used = await usageService.getUsage(userId, month);
    const limit = usageService.getLimit();

    res.json({ used, limit, month });
  } catch (error) {
    next(error);
  }
}
