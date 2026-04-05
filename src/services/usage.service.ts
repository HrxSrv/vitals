import { getSupabaseClient } from '../utils/supabase';
import { logger } from '../utils/logger';
import { HttpError } from '../utils/httpError';

const supabase = getSupabaseClient();

const FREE_MONTHLY_PAGE_LIMIT = parseInt(process.env.FREE_MONTHLY_PAGE_LIMIT ?? '50', 10);

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export class UsageService {
  /**
   * Get total pages used by a user in a given month.
   */
  async getUsage(userId: string, month?: string): Promise<number> {
    const m = month ?? currentMonth();

    const { data, error } = await supabase
      .from('usage')
      .select('pages')
      .eq('user_id', userId)
      .eq('month', m);

    if (error) {
      logger.error('Failed to query usage', { userId, month: m, error: error.message });
      throw new HttpError(500, 'Failed to check usage quota', 'USAGE_QUERY_ERROR');
    }

    const total = (data ?? []).reduce((sum, row) => sum + (row.pages ?? 0), 0);
    return total;
  }

  /**
   * Check if a user can process the given number of pages.
   * Throws 429 if the quota would be exceeded.
   */
  async checkQuota(userId: string, incomingPages: number): Promise<void> {
    const month = currentMonth();
    const used = await this.getUsage(userId, month);
    const remaining = FREE_MONTHLY_PAGE_LIMIT - used;

    logger.info('Usage quota check', {
      userId,
      month,
      used,
      incoming: incomingPages,
      limit: FREE_MONTHLY_PAGE_LIMIT,
      remaining,
    });

    if (used + incomingPages > FREE_MONTHLY_PAGE_LIMIT) {
      throw new HttpError(
        429,
        `Monthly page limit reached. You've used ${used} of ${FREE_MONTHLY_PAGE_LIMIT} pages this month. This report has ${incomingPages} pages.`,
        'QUOTA_EXCEEDED',
      );
    }
  }

  /**
   * Record usage after a report is successfully created.
   */
  async recordUsage(userId: string, reportId: string, pages: number): Promise<void> {
    const month = currentMonth();

    const { error } = await supabase
      .from('usage')
      .insert({
        user_id: userId,
        report_id: reportId,
        pages,
        month,
      });

    if (error) {
      logger.error('Failed to record usage', { userId, reportId, pages, month, error: error.message });
      // Don't throw — usage recording failure shouldn't block the upload
    } else {
      logger.info('Usage recorded', { userId, reportId, pages, month });
    }
  }

  /**
   * Get the monthly page limit.
   */
  getLimit(): number {
    return FREE_MONTHLY_PAGE_LIMIT;
  }
}

export const usageService = new UsageService();
