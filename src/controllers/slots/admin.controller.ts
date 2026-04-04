import { Request, Response, NextFunction } from 'express';
import slotsRepository from '@repositories/slots.repository';

/**
 * PUT /api/slots/admin
 * Sets the remaining signup slot count (admin only)
 */
export async function setSlots(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { remaining } = req.body;

    if (
      remaining === undefined ||
      remaining === null ||
      !Number.isInteger(remaining) ||
      remaining < 0
    ) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'remaining must be a non-negative integer',
        },
      });
      return;
    }

    const updated = await slotsRepository.setRemaining(remaining, req.user!.id);
    res.json({ remaining: updated });
  } catch (error) {
    next(error);
  }
}
