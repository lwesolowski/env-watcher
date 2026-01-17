import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../db/database.types';
import { UnauthorizedError } from '../errors';

/**
 * Extract JWT token from Authorization header
 * @param request - HTTP Request object
 * @returns JWT token string
 * @throws UnauthorizedError if Authorization header is missing or malformed
 */
export function extractToken(request: Request): string {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Authentication required');
  }

  return authHeader.replace('Bearer ', '');
}

/**
 * Authenticate user using Supabase JWT token
 * @param token - JWT token from Authorization header
 * @param supabaseClient - Supabase client instance
 * @returns Authenticated user ID
 * @throws UnauthorizedError if token is invalid or expired
 */
export async function authenticateUser(
  token: string,
  supabaseClient: SupabaseClient<Database>
): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabaseClient.auth.getUser(token);

  if (error || !user) {
    throw new UnauthorizedError('Invalid or expired token');
  }

  return user.id;
}
