import { Request, Response, NextFunction } from 'express';
import slotsRepository from '@repositories/slots.repository';

/**
 * GET /api/slots
 * Returns the current remaining signup slot count
 */
export async function getSlots(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const remaining = await slotsRepository.getRemaining();
    res.json({ remaining });
  } catch (error) {
    next(error);
  }
}
