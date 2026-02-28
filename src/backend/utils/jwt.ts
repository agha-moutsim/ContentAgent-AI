// JWT utility functions for token generation and verification
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { JWTPayload } from '../types';

const JWT_EXPIRATION = '7d'; // 7 days

/**
 * Generates a JWT token for a user
 * @param userId - User's unique identifier
 * @param email - User's email address
 * @param plan - User's subscription plan ('free' or 'pro')
 * @returns Signed JWT token string
 */
export function generateToken(
  userId: string,
  email: string,
  plan: 'free' | 'pro',
  name?: string,
  avatarUrl?: string
): string {
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    userId,
    email,
    plan,
    name,
    avatarUrl,
  };

  return jwt.sign(payload, config.auth.jwtSecret, {
    expiresIn: JWT_EXPIRATION,
  });
}

/**
 * Verifies and decodes a JWT token
 * @param token - JWT token string to verify
 * @returns Decoded JWT payload if valid
 * @throws Error if token is invalid, expired, or malformed
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret) as JWTPayload;
    return decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('AUTH_TOKEN_EXPIRED');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('AUTH_INVALID_TOKEN');
    } else {
      throw new Error('AUTH_VERIFICATION_FAILED');
    }
  }
}

/**
 * Refreshes a JWT token if it's close to expiration
 * @param token - Current JWT token
 * @returns New token if refresh is needed, original token otherwise
 */
export function refreshTokenIfNeeded(token: string): string {
  try {
    const decoded = verifyToken(token);
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = decoded.exp - now;
    
    // Refresh if less than 1 day remaining
    const oneDayInSeconds = 24 * 60 * 60;
    if (timeUntilExpiry < oneDayInSeconds) {
      return generateToken(decoded.userId, decoded.email, decoded.plan, decoded.name, decoded.avatarUrl);
    }
    
    return token;
  } catch (error) {
    // If token is invalid or expired, throw the error
    throw error;
  }
}
