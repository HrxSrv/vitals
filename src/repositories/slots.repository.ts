import { supabaseAdmin } from '@services/supabase.service';
import { HttpError } from '@utils/httpError';

// supabaseAdmin is typed against the generated Database type which doesn't yet
// include the new slots / slot_audit_log tables. Cast to any for those queries
// until the types are regenerated after the migration is applied.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

/**
 * Slots Repository
 * Handles all database operations for the slots table
 */
export class SlotsRepository {
  /**
   * Get the remaining slot count
   */
  async getRemaining(): Promise<number> {
    const { data, error } = await db
      .from('slots')
      .select('remaining')
      .eq('id', 1)
      .single();

    if (error) {
      throw new HttpError(500, `Failed to fetch slots: ${error.message}`, 'DATABASE_ERROR');
    }

    return (data as { remaining: number }).remaining;
  }

  /**
   * Set the remaining slot count and insert an audit log entry
   */
  async setRemaining(value: number, changedBy: string): Promise<number> {
    // Get current value for audit log
    const { data: current, error: fetchError } = await db
      .from('slots')
      .select('remaining')
      .eq('id', 1)
      .single();

    if (fetchError) {
      throw new HttpError(500, `Failed to fetch slots: ${fetchError.message}`, 'DATABASE_ERROR');
    }

    const oldValue = (current as { remaining: number }).remaining;

    // Update the slots row
    const { data, error: updateError } = await db
      .from('slots')
      .update({ remaining: value, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select('remaining')
      .single();

    if (updateError) {
      throw new HttpError(500, `Failed to update slots: ${updateError.message}`, 'DATABASE_ERROR');
    }

    // Insert audit log entry
    const { error: auditError } = await db
      .from('slot_audit_log')
      .insert({ changed_by: changedBy, old_value: oldValue, new_value: value });

    if (auditError) {
      throw new HttpError(500, `Failed to insert audit log: ${auditError.message}`, 'DATABASE_ERROR');
    }

    return (data as { remaining: number }).remaining;
  }
}

export default new SlotsRepository();
