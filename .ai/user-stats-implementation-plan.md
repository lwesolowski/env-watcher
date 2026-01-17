# API Endpoint Implementation Plan: GET /api/analytics/user-stats

## 1. Endpoint Overview

**Purpose**: Retrieve activity statistics for the authenticated user, including project counts by status, report generation/acceptance counts, and personal acceptance rate.

**Functionality**: Aggregates data from `projects` and `analysis_logs` tables to provide a comprehensive overview of user activity. Used for displaying personal dashboard metrics and tracking user engagement.

**Business Value**: Enables users to monitor their own usage patterns and success rates, supporting the MVP goal of user engagement tracking.

---

## 2. Request Details

- **HTTP Method**: `GET`
- **URL Structure**: `/api/analytics/user-stats`
- **Path Parameters**: None
- **Query Parameters**: None
- **Request Body**: None
- **Required Headers**:
  - `Authorization: Bearer <JWT_TOKEN>` (Supabase JWT)
  - `Content-Type: application/json` (standard)

**Example Request**:
```bash
GET /api/analytics/user-stats HTTP/1.1
Host: api.envwatcher.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 3. Utilized Types

### DTOs (Response Types)

**`UserStatsDTO`** (src/types.ts:94-101)
```typescript
{
  total_projects: number;
  draft_projects: number;
  verified_projects: number;
  total_reports_generated: number;
  total_reports_accepted: number;
  personal_acceptance_rate: number;
}
```

**`UserStatsResponse`** (src/types.ts:182-184)
```typescript
{
  data: UserStatsDTO;
}
```

### Entity Types

**`ProjectEntity`** (src/types.ts:10)
- Used for querying projects table
- Fields: `id`, `user_id`, `status`, etc.

**`AnalysisLogEntity`** (src/types.ts:20)
- Used for querying analysis_logs table
- Fields: `id`, `user_id`, `event_type`, `created_at`

### Enums

**`StatusEnum`** (src/types.ts:31)
- Values: `'DRAFT'` | `'VERIFIED'`

**`AnalysisEventEnum`** (src/types.ts:38)
- Values: `'GENERATED'` | `'ACCEPTED'`

### Error Types

**`ErrorResponse`** (src/types.ts:202-206)
```typescript
{
  error: string;
  code?: string;
  details?: ValidationError[];
}
```

---

## 4. Response Details

### Success Response (200 OK)

**Content-Type**: `application/json`

**Body Structure**:
```json
{
  "data": {
    "total_projects": 15,
    "draft_projects": 3,
    "verified_projects": 12,
    "total_reports_generated": 45,
    "total_reports_accepted": 40,
    "personal_acceptance_rate": 88.9
  }
}
```

**Field Descriptions**:
- `total_projects`: Total number of projects owned by user
- `draft_projects`: Count of projects with status='DRAFT'
- `verified_projects`: Count of projects with status='VERIFIED'
- `total_reports_generated`: Count of analysis_logs with event_type='GENERATED'
- `total_reports_accepted`: Count of analysis_logs with event_type='ACCEPTED'
- `personal_acceptance_rate`: Calculated as (accepted/generated) * 100, rounded to 1 decimal place

### Error Responses

**401 Unauthorized**
```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```
**Triggers**:
- Missing `Authorization` header
- Invalid JWT token
- Expired JWT token

**500 Internal Server Error**
```json
{
  "error": "Failed to retrieve user statistics",
  "code": "INTERNAL_SERVER_ERROR"
}
```
**Triggers**:
- Database connection failure
- Query execution error
- Unexpected runtime exception

---

## 5. Data Flow

### Request Flow

1. **Request Reception**
   - API handler receives GET request at `/api/analytics/user-stats`
   - Middleware extracts `Authorization` header

2. **Authentication**
   - Supabase client validates JWT token
   - Extract `user_id` from token claims (auth.uid())
   - Return 401 if authentication fails

3. **Service Layer Invocation**
   - Call `AnalyticsService.getUserStats(user_id)`
   - Service handles all business logic and data aggregation

4. **Database Queries** (executed in parallel for performance)

   **Query 1: Project Statistics**
   ```sql
   SELECT
     COUNT(*) AS total_projects,
     COUNT(*) FILTER (WHERE status = 'DRAFT') AS draft_projects,
     COUNT(*) FILTER (WHERE status = 'VERIFIED') AS verified_projects
   FROM projects
   WHERE user_id = $1;
   ```

   **Query 2: Analysis Log Statistics**
   ```sql
   SELECT
     COUNT(*) FILTER (WHERE event_type = 'GENERATED') AS total_reports_generated,
     COUNT(*) FILTER (WHERE event_type = 'ACCEPTED') AS total_reports_accepted
   FROM analysis_logs
   WHERE user_id = $1;
   ```

5. **Data Aggregation**
   - Combine results from both queries
   - Calculate `personal_acceptance_rate`:
     ```typescript
     const rate = generated > 0
       ? Math.round((accepted / generated) * 1000) / 10
       : 0;
     ```
   - Handle edge case: if no reports generated, rate = 0

6. **Response Construction**
   - Build `UserStatsDTO` object
   - Wrap in `UserStatsResponse` structure
   - Return with 200 status code

### External Dependencies

- **Supabase PostgreSQL**: Primary data source for projects and analysis_logs tables
- **Supabase Auth**: JWT validation and user_id extraction
- **Row-Level Security**: Automatically filters queries by authenticated user

### No External Services Required
- This endpoint only reads from database
- No AI service calls
- No third-party APIs

---

## 6. Security Considerations

### Authentication

**Mechanism**: Supabase JWT Bearer Token

**Implementation**:
- Extract token from `Authorization: Bearer <token>` header
- Validate token signature using Supabase client
- Verify token expiration (handled automatically by Supabase)
- Extract `user_id` from token claims

**Middleware Stack**:
```typescript
// Pseudo-code
async function authenticateUser(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) throw new UnauthorizedError('Authentication required');

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new UnauthorizedError('Invalid token');

  return user.id; // user_id for downstream use
}
```

### Authorization

**Mechanism**: Row-Level Security (RLS) at database level

**Enforcement**:
- RLS policies automatically filter queries by `user_id = auth.uid()`
- User can only see their own projects and analysis_logs
- No additional application-layer authorization needed
- Database guarantees data isolation

**RLS Policies Applied**:
- `projects`: User can SELECT only their own rows
- `analysis_logs`: User can SELECT only their own rows (requires service_role or specific policy adjustment)

**Note**: According to spec, `analysis_logs` SELECT requires service_role. Implementation should either:
1. Grant SELECT policy for user's own logs: `user_id = auth.uid()`
2. Use service role connection with application-layer filtering

### Input Validation

**Minimal Validation Required** (no user inputs):
- Validate JWT token format (handled by Supabase)
- No query parameters to sanitize
- No request body to validate

### Data Security

**No Sensitive Data Exposure**:
- Only aggregate counts returned
- No project names, configurations, or report content
- No other users' data accessible

**Output Sanitization**:
- Numbers only, no risk of XSS
- No HTML or user-generated content in response

### Rate Limiting

**General API Limit**: 100 requests per minute per user

**Implementation**:
- Token bucket algorithm per `user_id`
- Rate limit headers included in response:
  ```
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 87
  X-RateLimit-Reset: 1640000000
  ```

**429 Response** (if limit exceeded):
```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 60
}
```

### CORS Configuration

**Allowed Origins**:
- Production: `https://envwatcher.com`
- Development: `http://localhost:*`

**Allowed Methods**: `GET, POST, PATCH, DELETE, OPTIONS`

**Allowed Headers**: `Content-Type, Authorization`

---

## 7. Error Handling

### Error Scenarios

#### 1. Missing Authorization Header
**HTTP Status**: 401 Unauthorized

**Response**:
```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

**Trigger**: Request sent without `Authorization` header

**Handling**: Middleware catches missing header before reaching handler

---

#### 2. Invalid JWT Token
**HTTP Status**: 401 Unauthorized

**Response**:
```json
{
  "error": "Invalid or expired token",
  "code": "UNAUTHORIZED"
}
```

**Trigger**:
- Malformed token
- Expired token
- Invalid signature

**Handling**: Supabase client throws error during `getUser()` call

---

#### 3. Database Connection Failure
**HTTP Status**: 500 Internal Server Error

**Response**:
```json
{
  "error": "Failed to retrieve user statistics",
  "code": "INTERNAL_SERVER_ERROR"
}
```

**Trigger**: PostgreSQL connection issues, network timeout

**Handling**:
- Catch database errors in service layer
- Log error details for debugging
- Return generic error message to client (don't expose internals)

**Logging**:
```typescript
logger.error('Database query failed in getUserStats', {
  user_id,
  error: error.message,
  stack: error.stack
});
```

---

#### 4. Query Execution Error
**HTTP Status**: 500 Internal Server Error

**Response**: Same as database connection failure

**Trigger**:
- SQL syntax error (should not occur in production)
- Permission issues with RLS policies

**Handling**: Log detailed error, return generic 500 response

---

#### 5. Rate Limit Exceeded
**HTTP Status**: 429 Too Many Requests

**Response**:
```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 60
}
```

**Trigger**: User exceeds 100 requests/minute

**Handling**: Rate limiter middleware rejects request before reaching handler

---

### Error Handling Strategy

**Centralized Error Handler**:
```typescript
// Pseudo-code
function handleError(error: Error): Response {
  if (error instanceof UnauthorizedError) {
    return new Response(JSON.stringify({
      error: error.message,
      code: 'UNAUTHORIZED'
    }), { status: 401 });
  }

  if (error instanceof RateLimitError) {
    return new Response(JSON.stringify({
      error: error.message,
      code: 'RATE_LIMIT_EXCEEDED',
      retry_after: error.retryAfter
    }), { status: 429 });
  }

  // Generic 500 for unexpected errors
  logger.error('Unexpected error', { error });
  return new Response(JSON.stringify({
    error: 'Internal server error',
    code: 'INTERNAL_SERVER_ERROR'
  }), { status: 500 });
}
```

**Error Logging**:
- Log all errors with context (user_id, endpoint, timestamp)
- Include stack traces for 500 errors
- Don't log sensitive data (tokens, passwords)

---

## 8. Performance Considerations

### Database Query Optimization

**Parallel Query Execution**:
- Execute project stats and analysis log stats queries concurrently
- Use `Promise.all()` to avoid sequential blocking
- Reduces total response time from ~50ms to ~25ms (estimated)

```typescript
// Pseudo-code
const [projectStats, logStats] = await Promise.all([
  queryProjectStats(userId),
  queryAnalysisLogStats(userId)
]);
```

**Index Utilization**:
- Query on `projects.user_id` uses `projects_user_id_idx` index
- Query on `analysis_logs.user_id` uses `analysis_logs_user_id_idx` index
- Both queries should be fast (< 10ms) with proper indexes

**Query Complexity**: O(n) where n = number of user's records (low complexity)

### Caching Strategy

**Not Recommended for MVP**:
- Data changes frequently (on project updates, report generation)
- Stale data would provide poor UX
- Query is already fast with indexes

**Future Optimization** (if needed):
- Cache with 1-minute TTL
- Invalidate cache on project/report mutations
- Use Redis for caching layer

### Connection Pooling

**Handled by Supabase**:
- PostgreSQL connection pooling managed automatically
- PgBouncer included in Supabase infrastructure
- No application-level configuration needed

### Response Size

**Minimal Payload**:
- Response < 200 bytes (6 integer fields)
- No pagination needed (single object response)
- Gzip compression reduces to ~100 bytes

### Expected Performance

**Target Response Time**: < 100ms (p95)

**Breakdown**:
- Authentication: ~5ms
- Database queries (parallel): ~25ms
- Data aggregation: ~1ms
- Response serialization: ~1ms
- Network latency: variable (~50-200ms depending on client location)

**Bottlenecks**:
- Unlikely for this endpoint (simple aggregation)
- Monitor for users with extremely high project counts (> 10,000)

---

## 9. Implementation Steps

### Step 1: Create AnalyticsService

**File**: `src/services/analyticsService.ts`

**Responsibilities**:
- Database queries for user statistics
- Data aggregation and calculation logic
- Error handling for database operations

**Key Functions**:
```typescript
export class AnalyticsService {
  constructor(private supabaseClient: SupabaseClient<Database>) {}

  async getUserStats(userId: string): Promise<UserStatsDTO> {
    // Query projects table
    // Query analysis_logs table
    // Calculate acceptance rate
    // Return aggregated stats
  }
}
```

**Dependencies**:
- Supabase client instance
- Database type definitions

---

### Step 2: Implement Database Queries

**Projects Query**:
```typescript
const { data: projectStats, error: projectError } = await this.supabaseClient
  .from('projects')
  .select('status')
  .eq('user_id', userId);

if (projectError) throw new Error('Failed to fetch project stats');

const total_projects = projectStats.length;
const draft_projects = projectStats.filter(p => p.status === 'DRAFT').length;
const verified_projects = projectStats.filter(p => p.status === 'VERIFIED').length;
```

**Analysis Logs Query**:
```typescript
const { data: logStats, error: logError } = await this.supabaseClient
  .from('analysis_logs')
  .select('event_type')
  .eq('user_id', userId);

if (logError) throw new Error('Failed to fetch analysis log stats');

const total_reports_generated = logStats.filter(l => l.event_type === 'GENERATED').length;
const total_reports_accepted = logStats.filter(l => l.event_type === 'ACCEPTED').length;
```

**Note**: Consider using aggregate functions in PostgreSQL for better performance if available in Supabase client.

---

### Step 3: Calculate Acceptance Rate

**Formula**: `(accepted / generated) * 100`

**Implementation**:
```typescript
const personal_acceptance_rate = total_reports_generated > 0
  ? Math.round((total_reports_accepted / total_reports_generated) * 1000) / 10
  : 0;
```

**Edge Cases**:
- No reports generated: return 0% (not null or undefined)
- Avoid division by zero

---

### Step 4: Create API Route Handler

**File**: `src/pages/api/analytics/user-stats.ts` (Astro API route)

**Structure**:
```typescript
import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { AnalyticsService } from '../../../services/analyticsService';
import type { UserStatsResponse, ErrorResponse } from '../../../types';

export const GET: APIRoute = async ({ request }) => {
  try {
    // Extract and validate JWT
    const token = extractToken(request);

    // Authenticate user
    const userId = await authenticateUser(token);

    // Initialize service
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
    const analyticsService = new AnalyticsService(supabase);

    // Fetch statistics
    const stats = await analyticsService.getUserStats(userId);

    // Return response
    const response: UserStatsResponse = { data: stats };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return handleError(error);
  }
};
```

---

### Step 5: Implement Authentication Middleware

**File**: `src/middleware/auth.ts`

**Function**:
```typescript
export async function authenticateUser(token: string): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new UnauthorizedError('Invalid or expired token');
  }

  return user.id;
}

export function extractToken(request: Request): string {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Authentication required');
  }

  return authHeader.replace('Bearer ', '');
}
```

---

### Step 6: Implement Rate Limiting Middleware

**File**: `src/middleware/rateLimit.ts`

**Strategy**: Token bucket algorithm using in-memory store (or Redis for production)

**Implementation**:
```typescript
const rateLimits = new Map<string, { tokens: number; lastRefill: number }>();

export function checkRateLimit(userId: string): void {
  const limit = 100; // requests per minute
  const now = Date.now();

  let bucket = rateLimits.get(userId);

  if (!bucket) {
    bucket = { tokens: limit, lastRefill: now };
    rateLimits.set(userId, bucket);
  }

  // Refill tokens (1 per second)
  const elapsedSeconds = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(limit, bucket.tokens + elapsedSeconds);
  bucket.lastRefill = now;

  if (bucket.tokens < 1) {
    throw new RateLimitError('Rate limit exceeded');
  }

  bucket.tokens -= 1;
}
```

**Note**: For production, use Redis with sliding window algorithm for distributed systems.

---

### Step 7: Configure RLS Policy for Analysis Logs

**Database Migration**: Adjust RLS policy to allow users to read their own analysis logs

**SQL**:
```sql
CREATE POLICY "Users can view their own analysis logs"
ON public.analysis_logs
FOR SELECT
USING (auth.uid() = user_id);
```

**Alternative**: If keeping analysis_logs read-only for users, use service role connection in AnalyticsService.

---

### Step 8: Add Error Handling

**Custom Error Classes**:
```typescript
// src/errors/index.ts
export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string, public retryAfter: number = 60) {
    super(message);
    this.name = 'RateLimitError';
  }
}
```

**Centralized Error Handler**:
```typescript
// src/utils/errorHandler.ts
export function handleError(error: Error): Response {
  // Implementation as described in Error Handling section
}
```

---

### Step 9: Add Logging

**File**: `src/utils/logger.ts`

**Simple Implementation** (MVP):
```typescript
export const logger = {
  info: (message: string, meta?: object) => {
    console.log(JSON.stringify({ level: 'info', message, ...meta, timestamp: new Date().toISOString() }));
  },
  error: (message: string, meta?: object) => {
    console.error(JSON.stringify({ level: 'error', message, ...meta, timestamp: new Date().toISOString() }));
  }
};
```

**Usage in Handler**:
```typescript
logger.info('User stats requested', { user_id: userId });
```

---

### Step 10: Write Unit Tests

**File**: `src/services/analyticsService.test.ts`

**Test Cases**:
1. Returns correct stats for user with projects and reports
2. Returns zero values for new user with no data
3. Calculates acceptance rate correctly
4. Handles database errors gracefully
5. Returns 0% acceptance rate when no reports generated

**Framework**: Vitest (recommended for Astro projects)

---

### Step 11: Write Integration Tests

**File**: `src/pages/api/analytics/user-stats.test.ts`

**Test Cases**:
1. Returns 200 with valid JWT
2. Returns 401 without Authorization header
3. Returns 401 with invalid JWT
4. Returns 429 when rate limit exceeded
5. Returns correct data structure matching `UserStatsResponse` type

---

### Step 12: Add API Documentation

**File**: Update existing API documentation or create OpenAPI spec

**Endpoints Section**:
```yaml
/api/analytics/user-stats:
  get:
    summary: Get user activity statistics
    security:
      - BearerAuth: []
    responses:
      '200':
        description: Successful response
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UserStatsResponse'
      '401':
        $ref: '#/components/responses/Unauthorized'
      '500':
        $ref: '#/components/responses/InternalServerError'
```

---

### Step 13: Deploy and Monitor

**Deployment**:
- Build Docker image with new endpoint
- Deploy to DigitalOcean
- Run smoke tests against production

**Monitoring**:
- Track response times (target < 100ms p95)
- Monitor error rates (target < 1%)
- Set up alerts for 500 errors
- Track rate limit hits

**Metrics to Track**:
- Request count
- Average response time
- Error rate by status code
- Rate limit hit rate

---

### Step 14: Performance Testing

**Load Test**:
- Simulate 100 concurrent users
- Each user makes 10 requests
- Verify p95 response time < 100ms
- Verify no database connection pool exhaustion

**Tool**: Apache Bench or k6

**Command**:
```bash
k6 run --vus 100 --duration 30s user-stats-load-test.js
```

---

## 10. Testing Strategy

### Unit Tests

**AnalyticsService.getUserStats()**:
- Mock Supabase client responses
- Verify correct query construction
- Test acceptance rate calculation edge cases
- Test error handling

### Integration Tests

**API Route Handler**:
- Use test Supabase project
- Seed test data (projects, analysis_logs)
- Make real HTTP requests
- Verify response format and data accuracy

### End-to-End Tests

**User Flow**:
1. User creates account
2. User creates projects
3. User generates reports
4. User calls `/api/analytics/user-stats`
5. Verify stats reflect previous actions

---

## 11. Rollout Plan

### Phase 1: Development
- Implement service and route handler
- Write tests
- Test locally with Supabase local development

### Phase 2: Staging
- Deploy to staging environment
- Run integration tests
- Verify RLS policies work correctly
- Load test with production-like data volume

### Phase 3: Production
- Deploy to production
- Enable monitoring and alerting
- Announce new endpoint to frontend team
- Monitor for errors and performance issues

### Phase 4: Post-Deployment
- Gather user feedback
- Optimize queries if performance issues arise
- Consider adding caching if load increases

---

## 12. Success Criteria

- ✅ Endpoint returns 200 with correct data for authenticated users
- ✅ Endpoint returns 401 for unauthenticated requests
- ✅ Response time < 100ms (p95)
- ✅ Error rate < 1%
- ✅ Rate limiting works correctly
- ✅ RLS policies prevent unauthorized data access
- ✅ All tests pass (unit, integration, e2e)
- ✅ API documentation updated
- ✅ Monitoring and alerting configured
