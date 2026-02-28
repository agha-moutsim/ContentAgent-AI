// Authentication middleware for protecting API routes
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../utils/jwt';
import { JWTPayload } from '../types';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

/**
 * Middleware to require authentication for API routes
 * Validates JWT from cookie or Authorization header
 * Attaches user object to request if valid
 * Returns 401 if invalid/missing token
 * 
 * Requirements: 1.3, 1.4, 7.6
 */
export async function requireAuth(
  request: NextRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  // Extract token from cookie or Authorization header
  let token: string | undefined;

  // Try to get token from Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // If not in header, try to get from cookie
  if (!token) {
    token = request.cookies.get('token')?.value;
  }

  // If no token found, return 401
  if (!token) {
    return NextResponse.json(
      {
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      },
      { status: 401 }
    );
  }

  // Verify token
  let user: JWTPayload;
  try {
    user = verifyToken(token);
  } catch (error: any) {
    // Handle expired tokens
    if (error.message === 'AUTH_TOKEN_EXPIRED') {
      return NextResponse.json(
        {
          error: 'Session expired. Please log in again.',
          code: 'AUTH_TOKEN_EXPIRED',
        },
        { status: 401 }
      );
    }

    // Handle invalid tokens
    return NextResponse.json(
      {
        error: 'Invalid authentication token',
        code: 'AUTH_INVALID_TOKEN',
      },
      { status: 401 }
    );
  }

  // Attach user to request
  const authenticatedRequest = request as AuthenticatedRequest;
  authenticatedRequest.user = user;

  // Call the handler with authenticated request
  // Handler errors will propagate naturally
  return await handler(authenticatedRequest);
}

/**
 * Helper function to extract user from authenticated request
 * @param request - Authenticated request object
 * @returns User payload from JWT
 * @throws Error if user is not attached (should never happen after requireAuth)
 */
export function getAuthenticatedUser(request: AuthenticatedRequest): JWTPayload {
  if (!request.user) {
    throw new Error('User not authenticated');
  }
  return request.user;
}
