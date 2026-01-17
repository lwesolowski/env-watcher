/**
 * Custom error classes for API error handling
 */

/**
 * Error thrown when authentication is required or fails
 * HTTP Status: 401 Unauthorized
 */
export class UnauthorizedError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Error thrown when rate limit is exceeded
 * HTTP Status: 429 Too Many Requests
 */
export class RateLimitError extends Error {
  public retryAfter: number;

  constructor(message: string = 'Rate limit exceeded', retryAfter: number = 60) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Error thrown when database operations fail
 * HTTP Status: 500 Internal Server Error
 */
export class DatabaseError extends Error {
  constructor(message: string = 'Database operation failed') {
    super(message);
    this.name = 'DatabaseError';
  }
}
