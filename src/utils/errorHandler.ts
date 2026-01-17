import type { ErrorResponse } from '../types';
import { UnauthorizedError, RateLimitError, DatabaseError } from '../errors';

/**
 * Centralized error handler for API routes
 * Converts custom errors to appropriate HTTP responses
 * @param error - Error thrown during request processing
 * @returns Response object with appropriate status code and error details
 */
export function handleError(error: unknown): Response {
  // Handle UnauthorizedError (401)
  if (error instanceof UnauthorizedError) {
    const errorResponse: ErrorResponse = {
      error: error.message,
      code: 'UNAUTHORIZED',
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Handle RateLimitError (429)
  if (error instanceof RateLimitError) {
    const errorResponse: ErrorResponse = {
      error: error.message,
      code: 'RATE_LIMIT_EXCEEDED',
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': error.retryAfter.toString(),
      },
    });
  }

  // Handle DatabaseError (500)
  if (error instanceof DatabaseError) {
    const errorResponse: ErrorResponse = {
      error: 'Failed to retrieve user statistics',
      code: 'INTERNAL_SERVER_ERROR',
    };
    // Log the actual database error for debugging
    console.error('Database error:', error.message);
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Handle unexpected errors (500)
  console.error('Unexpected error:', error);
  const errorResponse: ErrorResponse = {
    error: 'Internal server error',
    code: 'INTERNAL_SERVER_ERROR',
  };
  return new Response(JSON.stringify(errorResponse), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}
