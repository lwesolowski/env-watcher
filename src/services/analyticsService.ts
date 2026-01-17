import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../db/database.types';
import type { UserStatsDTO } from '../types';
import { DatabaseError } from '../errors';

/**
 * Service for analytics operations
 * Handles data aggregation and statistics calculations
 */
export class AnalyticsService {
  constructor(private supabaseClient: SupabaseClient<Database>) {}

  /**
   * Get comprehensive activity statistics for a user
   * @param userId - UUID of the authenticated user
   * @returns UserStatsDTO with project counts, report counts, and acceptance rate
   * @throws DatabaseError if database operations fail
   */
  async getUserStats(userId: string): Promise<UserStatsDTO> {
    try {
      // Execute both queries in parallel for better performance
      const [projectStats, logStats] = await Promise.all([
        this.getProjectStats(userId),
        this.getAnalysisLogStats(userId),
      ]);

      // Calculate personal acceptance rate
      const personal_acceptance_rate =
        logStats.total_reports_generated > 0
          ? Math.round((logStats.total_reports_accepted / logStats.total_reports_generated) * 1000) / 10
          : 0;

      return {
        ...projectStats,
        ...logStats,
        personal_acceptance_rate,
      };
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError('Failed to retrieve user statistics');
    }
  }

  /**
   * Get project statistics for a user
   * Counts total, draft, and verified projects
   * @private
   */
  private async getProjectStats(userId: string): Promise<{
    total_projects: number;
    draft_projects: number;
    verified_projects: number;
  }> {
    const { data: projects, error } = await this.supabaseClient
      .from('projects')
      .select('status')
      .eq('user_id', userId);

    if (error) {
      throw new DatabaseError(`Failed to fetch project stats: ${error.message}`);
    }

    const total_projects = projects.length;
    const draft_projects = projects.filter((p) => p.status === 'draft').length;
    const verified_projects = projects.filter((p) => p.status === 'verified').length;

    return {
      total_projects,
      draft_projects,
      verified_projects,
    };
  }

  /**
   * Get analysis log statistics for a user
   * Counts generated and accepted reports
   * @private
   */
  private async getAnalysisLogStats(userId: string): Promise<{
    total_reports_generated: number;
    total_reports_accepted: number;
  }> {
    const { data: logs, error } = await this.supabaseClient
      .from('analysis_logs')
      .select('event_type')
      .eq('user_id', userId);

    if (error) {
      throw new DatabaseError(`Failed to fetch analysis log stats: ${error.message}`);
    }

    const total_reports_generated = logs.filter((l) => l.event_type === 'generated').length;
    const total_reports_accepted = logs.filter((l) => l.event_type === 'accepted').length;

    return {
      total_reports_generated,
      total_reports_accepted,
    };
  }
}
