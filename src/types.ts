import type { Database } from './db/database.types';

// ============================================================================
// Database Entity Type Aliases
// ============================================================================

/**
 * Project entity from database (Row type)
 */
export type ProjectEntity = Database['public']['Tables']['projects']['Row'];

/**
 * Report entity from database (Row type)
 */
export type ReportEntity = Database['public']['Tables']['reports']['Row'];

/**
 * Analysis log entity from database (Row type)
 */
export type AnalysisLogEntity = Database['public']['Tables']['analysis_logs']['Row'];

// ============================================================================
// Enums
// ============================================================================

/**
 * Project status enum: draft | verified
 * - draft: Initial state or after configuration changes
 * - verified: After user accepts report
 */
export type StatusEnum = Database['public']['Enums']['status_enum'];

/**
 * Analysis event type enum: generated | accepted
 * - generated: Report generation completed
 * - accepted: User accepted report and marked project as verified
 */
export type AnalysisEventEnum = Database['public']['Enums']['analysis_event_enum'];

// ============================================================================
// DTOs (Data Transfer Objects) - Response Types
// ============================================================================

/**
 * Project DTO for API responses
 * Represents complete project data returned by API
 */
export type ProjectDTO = ProjectEntity;

/**
 * Report DTO for API responses
 * Represents complete report data returned by API
 */
export type ReportDTO = ReportEntity;

/**
 * Demo project DTO with additional is_demo flag
 * Used for GET /api/projects/demo endpoint
 */
export type DemoProjectDTO = Omit<ProjectDTO, 'id' | 'user_id'> & {
  id: 'demo';
  user_id?: string;
  is_demo: true;
};

/**
 * Pagination metadata for list responses
 */
export type PaginationDTO = {
  total: number;
  limit: number;
  offset: number;
  has_more?: boolean;
};

/**
 * Acceptance rate analytics DTO
 * Used for GET /api/analytics/acceptance-rate endpoint
 */
export type AcceptanceRateDTO = {
  acceptance_rate: number;
  generated_count: number;
  accepted_count: number;
  period: {
    start: string; // ISO8601 timestamp
    end: string; // ISO8601 timestamp
  };
};

/**
 * User activity statistics DTO
 * Used for GET /api/analytics/user-stats endpoint
 */
export type UserStatsDTO = {
  total_projects: number;
  draft_projects: number;
  verified_projects: number;
  total_reports_generated: number;
  total_reports_accepted: number;
  personal_acceptance_rate: number;
};

// ============================================================================
// Command Models - Request Types
// ============================================================================

/**
 * Command for creating a new project
 * Used in POST /api/projects request body
 * Omits auto-generated fields: id, user_id, status, created_at, updated_at
 */
export type CreateProjectCommand = Pick<
  ProjectEntity,
  'name' | 'develop_config' | 'staging_config' | 'production_config'
>;

/**
 * Command for updating an existing project
 * Used in PATCH /api/projects/:id request body
 * All fields are optional (partial update)
 */
export type UpdateProjectCommand = Partial<CreateProjectCommand>;

// ============================================================================
// Response Wrappers
// ============================================================================

/**
 * Wrapper for single project responses
 * Used in: GET /api/projects/:id, POST /api/projects, PATCH /api/projects/:id, POST /api/projects/:project_id/accept
 */
export type SingleProjectResponse = {
  data: ProjectDTO;
};

/**
 * Wrapper for demo project response
 * Used in: GET /api/projects/demo
 */
export type DemoProjectResponse = {
  data: DemoProjectDTO;
};

/**
 * Wrapper for project list responses
 * Used in: GET /api/projects
 */
export type ProjectListResponse = {
  data: ProjectDTO[];
  pagination: PaginationDTO;
};

/**
 * Wrapper for single report responses
 * Used in: GET /api/reports/:id, GET /api/projects/:project_id/reports/latest, POST /api/projects/:project_id/analyze
 */
export type SingleReportResponse = {
  data: ReportDTO;
};

/**
 * Wrapper for report list responses
 * Used in: GET /api/projects/:project_id/reports
 */
export type ReportListResponse = {
  data: ReportDTO[];
  pagination: PaginationDTO;
};

/**
 * Wrapper for acceptance rate analytics response
 * Used in: GET /api/analytics/acceptance-rate
 */
export type AcceptanceRateResponse = {
  data: AcceptanceRateDTO;
};

/**
 * Wrapper for user stats analytics response
 * Used in: GET /api/analytics/user-stats
 */
export type UserStatsResponse = {
  data: UserStatsDTO;
};

// ============================================================================
// Error Response Types
// ============================================================================

/**
 * Validation error detail for 400 Bad Request responses
 */
export type ValidationError = {
  field: string;
  message: string;
};

/**
 * Standard error response format
 * Used for all error responses (400, 401, 403, 404, 409, 429, 500, 503)
 */
export type ErrorResponse = {
  error: string;
  code?: string;
  details?: ValidationError[];
};

// ============================================================================
// Query Parameter Types
// ============================================================================

/**
 * Query parameters for GET /api/projects
 */
export type ProjectListQueryParams = {
  status?: StatusEnum;
  limit?: number;
  offset?: number;
};

/**
 * Query parameters for GET /api/projects/:project_id/reports
 */
export type ReportListQueryParams = {
  limit?: number;
  offset?: number;
};

/**
 * Query parameters for GET /api/analytics/acceptance-rate
 */
export type AcceptanceRateQueryParams = {
  start_date?: string; // ISO8601 timestamp
  end_date?: string; // ISO8601 timestamp
  user_id?: string; // UUID, admin only
};
