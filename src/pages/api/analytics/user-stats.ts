import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../db/database.types';
import type { UserStatsResponse } from '../../../types';
import { AnalyticsService } from '../../../services/analyticsService';
import { extractToken, authenticateUser } from '../../../middleware/auth';
import { handleError } from '../../../utils/errorHandler';
import { logger } from '../../../utils/logger';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from "astro:env/client";

/**
 * GET /api/analytics/user-stats
 *
 * Retrieve activity statistics for the authenticated user
 *
 * @returns {UserStatsResponse} User statistics including:
 *   - total_projects: Total number of projects
 *   - draft_projects: Count of draft projects
 *   - verified_projects: Count of verified projects
 *   - total_reports_generated: Count of generated reports
 *   - total_reports_accepted: Count of accepted reports
 *   - personal_acceptance_rate: Acceptance rate percentage (0-100)
 *
 * @requires Authorization header with valid JWT Bearer token
 *
 * @throws {401} Unauthorized - Missing or invalid authentication
 * @throws {500} Internal Server Error - Database or server error
 */
export const GET: APIRoute = async ({ request }) => {
  try {
    // Extract and validate JWT token from Authorization header
    const token = extractToken(request);

    // Create Supabase client with environment variables and user token
    const supabase = createClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Authenticate user and get user ID
    const userId = await authenticateUser(token, supabase);

    // Log request for monitoring
    logger.info('User stats requested', { user_id: userId });

    // Initialize analytics service and fetch statistics
    const analyticsService = new AnalyticsService(supabase);
    const stats = await analyticsService.getUserStats(userId);

    // Log successful response
    logger.info('User stats retrieved successfully', {
      user_id: userId,
      total_projects: stats.total_projects,
    });

    // Return success response
    const response: UserStatsResponse = { data: stats };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    // Log error for debugging
    logger.error('Error in user-stats endpoint', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Handle and return appropriate error response
    return handleError(error);
  }
};
