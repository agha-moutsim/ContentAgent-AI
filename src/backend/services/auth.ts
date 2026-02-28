// Authentication service for user CRUD operations
import { queryOne } from '../db/client';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { User } from '../types';

/**
 * Creates a new user account with hashed password
 * @param email - User's email address
 * @param password - User's plaintext password
 * @returns Created user object (without password hash)
 * @throws Error if email already exists or validation fails
 */
export async function createUser(
  email: string,
  password: string
): Promise<Omit<User, 'passwordHash'>> {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('VALIDATION_INVALID_EMAIL');
  }

  // Validate password strength (minimum 8 characters)
  if (password.length < 8) {
    throw new Error('VALIDATION_PASSWORD_TOO_SHORT');
  }

  // Check if email already exists
  const existingUser = await queryOne<User>(
    'SELECT id FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (existingUser) {
    throw new Error('DB_DUPLICATE_EMAIL');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Insert user record
  const result = await queryOne<{
    id: string;
    email: string;
    plan: 'free' | 'pro';
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    full_name: string | null;
    avatar_url: string | null;
    created_at: Date;
    updated_at: Date;
  }>(
    `INSERT INTO users (email, password_hash, plan)
     VALUES ($1, $2, $3)
     RETURNING id, email, plan, stripe_customer_id, stripe_subscription_id, full_name, avatar_url, created_at, updated_at`,
    [email.toLowerCase(), passwordHash, 'free']
  );

  if (!result) {
    throw new Error('DB_INSERT_FAILED');
  }

  return {
    id: result.id,
    email: result.email,
    plan: result.plan,
    name: result.full_name || undefined,
    avatarUrl: result.avatar_url || undefined,
    stripeCustomerId: result.stripe_customer_id || undefined,
    stripeSubscriptionId: result.stripe_subscription_id || undefined,
    createdAt: result.created_at,
    updatedAt: result.updated_at,
  };
}

/**
 * Finds a user by email address
 * @param email - User's email address
 * @returns User object if found, null otherwise
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await queryOne<{
    id: string;
    email: string;
    password_hash: string;
    plan: 'free' | 'pro';
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    full_name: string | null;
    avatar_url: string | null;
    created_at: Date;
    updated_at: Date;
  }>(
    `SELECT id, email, password_hash, plan, stripe_customer_id, stripe_subscription_id, full_name, avatar_url, created_at, updated_at
     FROM users
     WHERE email = $1`,
    [email.toLowerCase()]
  );

  if (!result) {
    return null;
  }

  return {
    id: result.id,
    email: result.email,
    passwordHash: result.password_hash,
    plan: result.plan,
    name: result.full_name || undefined,
    avatarUrl: result.avatar_url || undefined,
    stripeCustomerId: result.stripe_customer_id || undefined,
    stripeSubscriptionId: result.stripe_subscription_id || undefined,
    createdAt: result.created_at,
    updatedAt: result.updated_at,
  };
}

/**
 * Authenticates a user with email and password
 * @param email - User's email address
 * @param password - User's plaintext password
 * @returns Object containing JWT token and user data
 * @throws Error with generic message if authentication fails (Requirements 1.6)
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<{
  token: string;
  user: {
    id: string;
    email: string;
    plan: 'free' | 'pro';
    name?: string;
    avatarUrl?: string;
  };
}> {
  // Find user by email
  const user = await findUserByEmail(email);

  // Use generic error message to avoid revealing whether email exists (Requirements 1.6)
  if (!user) {
    throw new Error('AUTH_INVALID_CREDENTIALS');
  }

  // Compare password with hash
  const isPasswordValid = await comparePassword(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new Error('AUTH_INVALID_CREDENTIALS');
  }

  // Generate JWT token
  const token = generateToken(user.id, user.email, user.plan, user.name, user.avatarUrl);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      plan: user.plan,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
  };
}
