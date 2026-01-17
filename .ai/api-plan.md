# REST API Plan - EnvWatcher

## 1. Resources

| Resource | Database Table | Description |
|----------|---------------|-------------|
| Projects | `public.projects` | User-owned configuration projects with three environment configs |
| Reports | `public.reports` | AI-generated analysis reports containing diff tables and recommendations |
| Analytics | `public.analysis_logs` | Aggregated metrics for KPI tracking (not direct table access) |
| Demo | Hardcoded data | Static demonstration project for onboarding |

**Note**: Authentication is handled by Supabase Auth SDK (not custom API endpoints). Users are managed in `auth.users` table.

## 2. Endpoints

### 2.1 Projects

#### List User Projects

**GET** `/api/projects`

**Description**: Retrieve all projects belonging to the authenticated user, ordered by creation date (newest first).

**Authentication**: Required (Supabase JWT)

**Query Parameters**:
- `status` (optional) - Filter by status enum: `DRAFT` | `VERIFIED`
- `limit` (optional, default: 50) - Maximum number of results (1-100)
- `offset` (optional, default: 0) - Pagination offset

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "string",
      "develop_config": "string",
      "staging_config": "string",
      "production_config": "string",
      "status": "DRAFT" | "VERIFIED",
      "created_at": "ISO8601 timestamp",
      "updated_at": "ISO8601 timestamp"
    }
  ],
  "pagination": {
    "total": 0,
    "limit": 50,
    "offset": 0
  }
}
```

**Error Responses**:
- `401 Unauthorized` - Missing or invalid authentication token
  ```json
  { "error": "Authentication required" }
  ```

---

#### Get Project by ID

**GET** `/api/projects/:id`

**Description**: Retrieve a specific project by ID. User must own the project.

**Authentication**: Required

**Path Parameters**:
- `id` - UUID of the project

**Response** (200 OK):
```json
{
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "name": "string",
    "develop_config": "string",
    "staging_config": "string",
    "production_config": "string",
    "status": "DRAFT" | "VERIFIED",
    "created_at": "ISO8601 timestamp",
    "updated_at": "ISO8601 timestamp"
  }
}
```

**Error Responses**:
- `401 Unauthorized` - Missing or invalid authentication
- `404 Not Found` - Project doesn't exist or user doesn't own it
  ```json
  { "error": "Project not found" }
  ```

---

#### Get Demo Project

**GET** `/api/projects/demo`

**Description**: Retrieve a hardcoded demonstration project with sample configurations. Not stored in database. Available to all users (including unauthenticated).

**Authentication**: Not required

**Response** (200 OK):
```json
{
  "data": {
    "id": "demo",
    "name": "Demo Project - Node.js Microservice",
    "develop_config": "Node: v18.0.0\nExpress: 4.18.0\nPostgreSQL: 14.1\nRedis: 6.2\nRAM: 2GB\nCPU: 2 cores",
    "staging_config": "Node: v18.0.0\nExpress: 4.18.0\nPostgreSQL: 14.5\nRedis: 6.2\nRAM: 4GB\nCPU: 2 cores",
    "production_config": "Node: v16.14.0\nExpress: 4.17.1\nPostgreSQL: 14.5\nRedis: 7.0\nRAM: 8GB\nCPU: 4 cores",
    "status": "VERIFIED",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "is_demo": true
  }
}
```

---

#### Create Project

**POST** `/api/projects`

**Description**: Create a new project. Initial status is always `DRAFT`.

**Authentication**: Required

**Request Body**:
```json
{
  "name": "string",
  "develop_config": "string",
  "staging_config": "string",
  "production_config": "string"
}
```

**Validation Rules**:
- `name`: Required, max 64 characters
- `develop_config`: Required, max 10,000 characters
- `staging_config`: Required, max 10,000 characters
- `production_config`: Required, max 10,000 characters

**Response** (201 Created):
```json
{
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "name": "string",
    "develop_config": "string",
    "staging_config": "string",
    "production_config": "string",
    "status": "DRAFT",
    "created_at": "ISO8601 timestamp",
    "updated_at": "ISO8601 timestamp"
  }
}
```

**Error Responses**:
- `400 Bad Request` - Validation failed
  ```json
  {
    "error": "Validation failed",
    "details": [
      {
        "field": "name",
        "message": "Project name must not exceed 64 characters"
      },
      {
        "field": "develop_config",
        "message": "Configuration for develop must not exceed 10,000 characters"
      }
    ]
  }
  ```
- `401 Unauthorized` - Missing or invalid authentication

---

#### Update Project

**PATCH** `/api/projects/:id`

**Description**: Update project fields. If any configuration field changes, status automatically resets to `DRAFT` (via database trigger).

**Authentication**: Required

**Path Parameters**:
- `id` - UUID of the project

**Request Body** (all fields optional):
```json
{
  "name": "string",
  "develop_config": "string",
  "staging_config": "string",
  "production_config": "string"
}
```

**Validation Rules**: Same as Create Project

**Response** (200 OK):
```json
{
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "name": "string",
    "develop_config": "string",
    "staging_config": "string",
    "production_config": "string",
    "status": "DRAFT",
    "created_at": "ISO8601 timestamp",
    "updated_at": "ISO8601 timestamp"
  }
}
```

**Error Responses**:
- `400 Bad Request` - Validation failed (same format as Create)
- `401 Unauthorized` - Missing or invalid authentication
- `404 Not Found` - Project doesn't exist or user doesn't own it

---

#### Delete Project

**DELETE** `/api/projects/:id`

**Description**: Delete a project. Cascades to delete all associated reports and analysis logs.

**Authentication**: Required

**Path Parameters**:
- `id` - UUID of the project

**Response** (204 No Content):
```
(empty body)
```

**Error Responses**:
- `401 Unauthorized` - Missing or invalid authentication
- `404 Not Found` - Project doesn't exist or user doesn't own it

---

### 2.2 Reports

#### List Project Reports

**GET** `/api/projects/:project_id/reports`

**Description**: Retrieve all reports for a specific project, ordered by creation date (newest first).

**Authentication**: Required

**Path Parameters**:
- `project_id` - UUID of the project

**Query Parameters**:
- `limit` (optional, default: 20) - Maximum number of results (1-100)
- `offset` (optional, default: 0) - Pagination offset

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "diff_html": "<table>...</table>",
      "recommendations": "string",
      "created_at": "ISO8601 timestamp"
    }
  ],
  "pagination": {
    "total": 0,
    "limit": 20,
    "offset": 0
  }
}
```

**Error Responses**:
- `401 Unauthorized` - Missing or invalid authentication
- `404 Not Found` - Project doesn't exist or user doesn't own it

---

#### Get Latest Report

**GET** `/api/projects/:project_id/reports/latest`

**Description**: Retrieve the most recent report for a project. This is the primary endpoint for displaying reports in the UI.

**Authentication**: Required

**Path Parameters**:
- `project_id` - UUID of the project

**Response** (200 OK):
```json
{
  "data": {
    "id": "uuid",
    "project_id": "uuid",
    "diff_html": "<table>...</table>",
    "recommendations": "string",
    "created_at": "ISO8601 timestamp"
  }
}
```

**Error Responses**:
- `401 Unauthorized` - Missing or invalid authentication
- `404 Not Found` - Project doesn't exist, user doesn't own it, or no reports exist

---

#### Get Report by ID

**GET** `/api/reports/:id`

**Description**: Retrieve a specific report. User must own the associated project.

**Authentication**: Required

**Path Parameters**:
- `id` - UUID of the report

**Response** (200 OK):
```json
{
  "data": {
    "id": "uuid",
    "project_id": "uuid",
    "diff_html": "<table>...</table>",
    "recommendations": "string",
    "created_at": "ISO8601 timestamp"
  }
}
```

**Error Responses**:
- `401 Unauthorized` - Missing or invalid authentication
- `404 Not Found` - Report doesn't exist or user doesn't own associated project

---

#### Generate Report (Analyze Project)

**POST** `/api/projects/:project_id/analyze`

**Description**: Generate a new AI-powered analysis report for the project. Creates report record and logs `GENERATED` event. If configurations were changed since last verification, status remains/becomes `DRAFT`.

**Authentication**: Required

**Path Parameters**:
- `project_id` - UUID of the project

**Request Body**: None (uses project's current configurations)

**AI Processing**:
1. Fetch project configurations (develop, staging, production)
2. Send to OpenRouter AI with prompt requesting:
   - HTML diff table comparing all three environments
   - "Source Fragment" column for hallucination mitigation
   - Separate recommendations section
   - English language output
3. Parse AI response into `diff_html` and `recommendations`

**Response** (201 Created):
```json
{
  "data": {
    "id": "uuid",
    "project_id": "uuid",
    "diff_html": "<table><thead><tr><th>Environment</th><th>Difference</th><th>Source Fragment</th></tr></thead><tbody>...</tbody></table>",
    "recommendations": "string",
    "created_at": "ISO8601 timestamp"
  }
}
```

**Error Responses**:
- `401 Unauthorized` - Missing or invalid authentication
- `404 Not Found` - Project doesn't exist or user doesn't own it
- `429 Too Many Requests` - Rate limit exceeded
  ```json
  { "error": "Rate limit exceeded. Please try again later." }
  ```
- `500 Internal Server Error` - AI service unavailable or processing failed
  ```json
  { "error": "Failed to generate report. Please try again." }
  ```
- `503 Service Unavailable` - AI provider is down
  ```json
  { "error": "AI service temporarily unavailable" }
  ```

---

#### Delete Report

**DELETE** `/api/reports/:id`

**Description**: Delete a specific report. User must own the associated project.

**Authentication**: Required

**Path Parameters**:
- `id` - UUID of the report

**Response** (204 No Content):
```
(empty body)
```

**Error Responses**:
- `401 Unauthorized` - Missing or invalid authentication
- `404 Not Found` - Report doesn't exist or user doesn't own associated project

---

### 2.3 Project Actions

#### Accept Report

**POST** `/api/projects/:project_id/accept`

**Description**: Mark a project as verified after reviewing its latest report. Updates status to `VERIFIED` and logs `ACCEPTED` event for KPI tracking.

**Authentication**: Required

**Path Parameters**:
- `project_id` - UUID of the project

**Request Body**: None

**Business Logic**:
1. Verify user owns project
2. Verify at least one report exists for project
3. Update project status to `VERIFIED`
4. Create analysis_log entry with `event_type='ACCEPTED'`

**Response** (200 OK):
```json
{
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "name": "string",
    "develop_config": "string",
    "staging_config": "string",
    "production_config": "string",
    "status": "VERIFIED",
    "created_at": "ISO8601 timestamp",
    "updated_at": "ISO8601 timestamp"
  }
}
```

**Error Responses**:
- `401 Unauthorized` - Missing or invalid authentication
- `404 Not Found` - Project doesn't exist or user doesn't own it
- `409 Conflict` - No report exists to accept
  ```json
  { "error": "Cannot accept project without a report. Please generate a report first." }
  ```

---

### 2.4 Analytics

#### Get Acceptance Rate

**GET** `/api/analytics/acceptance-rate`

**Description**: Retrieve KPI metrics showing the ratio of accepted reports to generated reports. This endpoint is used for measuring AI effectiveness (target: 90%).

**Authentication**: Required (Service role or Admin)

**Query Parameters**:
- `start_date` (optional) - ISO8601 timestamp, filter events after this date
- `end_date` (optional) - ISO8601 timestamp, filter events before this date
- `user_id` (optional) - UUID, filter by specific user (admin only)

**Response** (200 OK):
```json
{
  "data": {
    "acceptance_rate": 87.5,
    "generated_count": 120,
    "accepted_count": 105,
    "period": {
      "start": "ISO8601 timestamp",
      "end": "ISO8601 timestamp"
    }
  }
}
```

**Calculation**:
```
acceptance_rate = (accepted_count / generated_count) * 100
```

**Error Responses**:
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - User doesn't have service_role or admin privileges
  ```json
  { "error": "Insufficient permissions" }
  ```

---

#### Get User Activity Stats

**GET** `/api/analytics/user-stats`

**Description**: Retrieve activity statistics for the authenticated user (projects created, reports generated, reports accepted).

**Authentication**: Required

**Response** (200 OK):
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

**Error Responses**:
- `401 Unauthorized` - Missing or invalid authentication

---

## 3. Authentication and Authorization

### 3.1 Authentication Mechanism

**Provider**: Supabase Auth

**Method**: JWT Bearer Token

**Implementation**:
- Users register/login via Supabase Auth SDK (client-side)
- Supabase issues JWT tokens containing `user_id` and other claims
- API endpoints extract JWT from `Authorization: Bearer <token>` header
- Supabase client libraries handle token refresh automatically

**Registration Flow**:
```javascript
// Frontend (example)
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure_password'
})
```

**Login Flow**:
```javascript
// Frontend (example)
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure_password'
})
```

**Session Management**:
- Tokens stored in httpOnly cookies (if using SSR) or localStorage
- Automatic refresh handled by Supabase SDK
- Session persists across page refreshes

### 3.2 Authorization

**Row-Level Security (RLS)**:
- Enforced at PostgreSQL level via Supabase RLS policies
- API trusts authenticated user ID from JWT

**Projects**:
- Users can only SELECT/INSERT/UPDATE/DELETE their own projects
- Policy: `user_id = auth.uid()`

**Reports**:
- Users can access reports only for projects they own
- Policy: `EXISTS (SELECT 1 FROM projects WHERE projects.id = reports.project_id AND projects.user_id = auth.uid())`

**Analysis Logs**:
- Users can only INSERT logs for themselves (`user_id = auth.uid()`)
- Only service_role can SELECT (for analytics endpoints)
- Users cannot read or delete logs

**Demo Endpoint**:
- No authentication required
- Returns static hardcoded data

### 3.3 Error Responses

**401 Unauthorized**:
```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

**403 Forbidden**:
```json
{
  "error": "Insufficient permissions",
  "code": "FORBIDDEN"
}
```

---

## 4. Validation and Business Logic

### 4.1 Validation Rules

#### Project Name
- **Required**: Yes
- **Type**: String
- **Max Length**: 64 characters
- **Error**: `"Project name must not exceed 64 characters"`

#### Configuration Fields
- **Required**: Yes (all three: develop_config, staging_config, production_config)
- **Type**: String
- **Max Length**: 10,000 characters each
- **Error**: `"Configuration for {environment} must not exceed 10,000 characters"`

#### Project Status
- **Type**: Enum
- **Values**: `DRAFT`, `VERIFIED`
- **Default**: `DRAFT` on creation
- **Auto-reset**: Changes to `DRAFT` when any config field is updated (database trigger)

#### Analysis Event Type
- **Type**: Enum
- **Values**: `GENERATED`, `ACCEPTED`
- **Usage**: Internal, not user-input

### 4.2 Business Logic

#### Report Generation Workflow

1. **Pre-validation**:
   - Verify project exists and user owns it
   - Check all three config fields are non-empty

2. **AI Call**:
   - Construct prompt with project configurations
   - Request HTML diff table with source fragments
   - Request separate recommendations section
   - Specify English language output

3. **Post-processing**:
   - Parse AI response into `diff_html` and `recommendations`
   - Validate HTML structure (basic sanity check)
   - Sanitize HTML to prevent XSS (allow only table tags)

4. **Database Operations** (transaction):
   - Insert report record
   - Insert analysis_log with `event_type='GENERATED'`
   - Commit transaction

5. **Response**:
   - Return created report

**Failure Handling**:
- If AI call fails: Return 500/503 error, don't create report
- If DB insert fails: Rollback transaction, return 500 error

---

#### Report Acceptance Workflow

1. **Pre-validation**:
   - Verify project exists and user owns it
   - Verify at least one report exists for project
   - Check project is not already `VERIFIED` (optional optimization)

2. **Database Operations** (transaction):
   - Update project.status to `VERIFIED`
   - Insert analysis_log with `event_type='ACCEPTED'`
   - Update project.updated_at timestamp
   - Commit transaction

3. **Response**:
   - Return updated project

**Note**: If configs change after acceptance, status auto-resets to `DRAFT` via database trigger on next update.

---

#### Status Reset Trigger Logic

**Database Trigger** (not API logic):
```sql
CREATE TRIGGER reset_status_to_draft
BEFORE UPDATE ON projects
FOR EACH ROW
WHEN (
  OLD.develop_config IS DISTINCT FROM NEW.develop_config OR
  OLD.staging_config IS DISTINCT FROM NEW.staging_config OR
  OLD.production_config IS DISTINCT FROM NEW.production_config
)
EXECUTE FUNCTION set_status_to_draft();
```

**Effect**: Any PATCH to `/api/projects/:id` that modifies configs will result in `status='DRAFT'` in response.

---

### 4.3 Rate Limiting

**Strategy**: Token bucket per user

**Limits**:
- General API: 100 requests per minute per user
- Report Generation (`POST /api/projects/:project_id/analyze`): 10 requests per hour per user (AI calls are expensive)

**Headers** (included in all responses):
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1640000000
```

**Error Response** (429 Too Many Requests):
```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 3600
}
```

---

### 4.4 Error Handling

**Standard Error Response Format**:
```json
{
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE",
  "details": [] // optional, for validation errors
}
```

**HTTP Status Codes**:
- `200 OK` - Successful GET/PATCH/POST (non-creation)
- `201 Created` - Successful POST (creation)
- `204 No Content` - Successful DELETE
- `400 Bad Request` - Validation error or malformed request
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Authenticated but insufficient permissions
- `404 Not Found` - Resource doesn't exist or user doesn't own it
- `409 Conflict` - Business logic conflict (e.g., accept without report)
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Unexpected server error
- `503 Service Unavailable` - External service (AI) unavailable

---

## 5. Additional Considerations

### 5.1 Pagination

**Query Parameters** (where applicable):
- `limit` - Number of results (default varies by endpoint)
- `offset` - Skip N results for pagination

**Response Format**:
```json
{
  "data": [...],
  "pagination": {
    "total": 0,
    "limit": 50,
    "offset": 0,
    "has_more": false
  }
}
```

### 5.2 Filtering and Sorting

**Projects List**:
- Filter by `status` query parameter
- Always sorted by `created_at DESC`

**Reports List**:
- Always sorted by `created_at DESC` (newest first)

### 5.3 API Versioning

**Strategy**: URL path versioning

**Current Version**: `/api/v1/*` (optional for MVP, can use `/api/*`)

**Future Consideration**: When breaking changes needed, introduce `/api/v2/*`

### 5.4 CORS Configuration

**Allowed Origins**:
- Production domain (e.g., `https://envwatcher.com`)
- Localhost for development (`http://localhost:*`)

**Allowed Methods**: `GET, POST, PATCH, DELETE, OPTIONS`

**Allowed Headers**: `Content-Type, Authorization`

### 5.5 Content Type

**Request**: `Content-Type: application/json`

**Response**: `Content-Type: application/json`

### 5.6 Timestamps

**Format**: ISO 8601 UTC (e.g., `2024-01-15T14:30:00Z`)

**Fields**: `created_at`, `updated_at`

---

## 6. OpenRouter AI Integration

### 6.1 Endpoint

**URL**: `https://openrouter.ai/api/v1/chat/completions`

**Authentication**: API Key in header `Authorization: Bearer <OPENROUTER_API_KEY>`

### 6.2 Request Format

```json
{
  "model": "anthropic/claude-3-opus",
  "messages": [
    {
      "role": "system",
      "content": "You are an expert DevOps assistant analyzing environment configurations..."
    },
    {
      "role": "user",
      "content": "Compare these three environment configurations:\n\nDevelop:\n{develop_config}\n\nStaging:\n{staging_config}\n\nProduction:\n{production_config}\n\nGenerate an HTML table showing differences with source fragments, then provide recommendations."
    }
  ]
}
```

### 6.3 Response Parsing

**Expected AI Output Format**:
```html
<table>
  <thead>
    <tr>
      <th>Environment</th>
      <th>Difference</th>
      <th>Source Fragment</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Production vs Develop</td>
      <td>Node version mismatch (16.14.0 vs 18.0.0)</td>
      <td>"Node: v16.14.0" | "Node: v18.0.0"</td>
    </tr>
  </tbody>
</table>

<h3>Recommendations</h3>
<ul>
  <li>Upgrade production Node.js to match develop/staging (v18.0.0)</li>
  <li>Update Express to 4.18.0 in production for security patches</li>
</ul>
```

**Parsing Strategy**:
- Split response on `<h3>Recommendations</h3>` or similar marker
- Extract `diff_html` from first part (table)
- Extract `recommendations` from second part (list or paragraphs)

### 6.4 Error Handling

- **Timeout**: 60 seconds
- **Retry**: 2 attempts with exponential backoff
- **Fallback**: Return 503 if all attempts fail

---

## 7. Sample API Flows

### 7.1 Complete User Journey

1. **User Registers** (Supabase SDK)
   ```
   POST supabase.auth.signUp()
   ```

2. **User Logs In** (Supabase SDK)
   ```
   POST supabase.auth.signInWithPassword()
   → Receives JWT token
   ```

3. **Fetch Projects** (Empty State)
   ```
   GET /api/projects
   Authorization: Bearer <token>

   ← 200 OK { data: [], pagination: { total: 0 } }
   ```

4. **Load Demo Project**
   ```
   GET /api/projects/demo

   ← 200 OK { data: { id: "demo", name: "Demo Project...", ... } }
   ```

5. **Create First Project**
   ```
   POST /api/projects
   Authorization: Bearer <token>
   Body: { name: "My App", develop_config: "...", staging_config: "...", production_config: "..." }

   ← 201 Created { data: { id: "uuid-1", status: "DRAFT", ... } }
   ```

6. **Generate Report**
   ```
   POST /api/projects/uuid-1/analyze
   Authorization: Bearer <token>

   [Backend calls OpenRouter AI]

   ← 201 Created { data: { id: "report-uuid-1", diff_html: "<table>...</table>", recommendations: "...", ... } }
   ```

7. **View Latest Report**
   ```
   GET /api/projects/uuid-1/reports/latest
   Authorization: Bearer <token>

   ← 200 OK { data: { id: "report-uuid-1", diff_html: "...", ... } }
   ```

8. **Accept Report**
   ```
   POST /api/projects/uuid-1/accept
   Authorization: Bearer <token>

   ← 200 OK { data: { id: "uuid-1", status: "VERIFIED", ... } }
   ```

9. **Edit Config** (Status resets to DRAFT)
   ```
   PATCH /api/projects/uuid-1
   Authorization: Bearer <token>
   Body: { develop_config: "Updated config..." }

   ← 200 OK { data: { id: "uuid-1", status: "DRAFT", ... } }
   ```

10. **View User Stats**
    ```
    GET /api/analytics/user-stats
    Authorization: Bearer <token>

    ← 200 OK { data: { total_projects: 1, draft_projects: 1, verified_projects: 0, ... } }
    ```

---

## 8. Security Checklist

- [x] All endpoints require authentication (except demo)
- [x] Row-Level Security (RLS) enforced at database level
- [x] JWT tokens validated on every request
- [x] Sensitive fields (passwords) never returned in API responses
- [x] HTML sanitization for AI-generated content
- [x] Rate limiting to prevent abuse
- [x] Input validation for all user-provided data
- [x] Parameterized queries to prevent SQL injection
- [x] CORS restricted to allowed origins
- [x] HTTPS required in production
- [x] API keys (OpenRouter) stored in environment variables, never exposed
- [x] Analysis logs write-only for users (read requires service_role)
- [x] 404 responses for unauthorized access (don't leak existence)

---

## 9. Performance Optimization

- **Database Indexes**: Already defined in schema (user_id, project_id, status)
- **Pagination**: Implemented on list endpoints to limit result sets
- **Lazy Loading**: Reports fetched separately from projects
- **Caching**: Consider caching demo project response (static data)
- **Connection Pooling**: Supabase handles PostgreSQL connection pooling
- **Rate Limiting**: Prevents AI endpoint abuse (expensive operations)

---

## 10. Monitoring and Observability

**Recommended Metrics**:
- Request count per endpoint
- Response time (p50, p95, p99)
- Error rate by status code
- AI generation success/failure rate
- Analysis log events (GENERATED, ACCEPTED) for KPI tracking

**Logging**:
- All API requests with user_id, endpoint, status code
- AI call attempts and results
- Validation errors
- Rate limit hits

**Alerts**:
- AI service downtime
- Error rate > 5%
- Acceptance rate < 85% (below target)
