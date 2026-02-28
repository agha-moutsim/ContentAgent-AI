// Unit tests for authentication service
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createUser, findUserByEmail, authenticateUser } from '../../lib/services/auth';
import { query } from '../../lib/db/client';
import { verifyToken } from '../../lib/utils/jwt';

describe('Authentication Service', () => {
  // Clean up test users after each test
  afterEach(async () => {
    await query('DELETE FROM users WHERE email LIKE $1', ['test%@example.com']);
  });

  describe('createUser', () => {
    it('should create a new user with valid credentials', async () => {
      const email = 'test1@example.com';
      const password = 'password123';

      const user = await createUser(email, password);

      expect(user).toBeDefined();
      expect(user.email).toBe(email);
      expect(user.plan).toBe('free');
      expect(user.id).toBeDefined();
      expect(user.createdAt).toBeDefined();
      expect('passwordHash' in user).toBe(false); // Should not return password hash
    });

    it('should normalize email to lowercase', async () => {
      const email = 'Test2@Example.COM';
      const password = 'password123';

      const user = await createUser(email, password);

      expect(user.email).toBe('test2@example.com');
    });

    it('should throw error for invalid email format', async () => {
      await expect(createUser('invalid-email', 'password123')).rejects.toThrow(
        'VALIDATION_INVALID_EMAIL'
      );
    });

    it('should throw error for password shorter than 8 characters', async () => {
      await expect(createUser('test3@example.com', 'short')).rejects.toThrow(
        'VALIDATION_PASSWORD_TOO_SHORT'
      );
    });

    it('should throw error for duplicate email', async () => {
      const email = 'test4@example.com';
      const password = 'password123';

      await createUser(email, password);

      await expect(createUser(email, password)).rejects.toThrow('DB_DUPLICATE_EMAIL');
    });

    it('should hash password before storage', async () => {
      const email = 'test5@example.com';
      const password = 'password123';

      await createUser(email, password);

      const user = await findUserByEmail(email);
      expect(user).toBeDefined();
      expect(user!.passwordHash).toBeDefined();
      expect(user!.passwordHash).not.toBe(password); // Password should be hashed
      expect(user!.passwordHash.startsWith('$2')).toBe(true); // bcrypt hash format
    });
  });

  describe('findUserByEmail', () => {
    it('should find existing user by email', async () => {
      const email = 'test6@example.com';
      const password = 'password123';

      await createUser(email, password);

      const user = await findUserByEmail(email);

      expect(user).toBeDefined();
      expect(user!.email).toBe(email);
      expect(user!.passwordHash).toBeDefined();
    });

    it('should return null for non-existent email', async () => {
      const user = await findUserByEmail('nonexistent@example.com');

      expect(user).toBeNull();
    });

    it('should be case-insensitive', async () => {
      const email = 'test7@example.com';
      const password = 'password123';

      await createUser(email, password);

      const user = await findUserByEmail('Test7@Example.COM');

      expect(user).toBeDefined();
      expect(user!.email).toBe(email);
    });
  });

  describe('authenticateUser', () => {
    beforeEach(async () => {
      // Create a test user for authentication tests
      await createUser('test8@example.com', 'password123');
    });

    it('should authenticate user with valid credentials', async () => {
      const result = await authenticateUser('test8@example.com', 'password123');

      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('test8@example.com');
      expect(result.user.plan).toBe('free');
    });

    it('should return valid JWT token', async () => {
      const result = await authenticateUser('test8@example.com', 'password123');

      const decoded = verifyToken(result.token);
      expect(decoded.userId).toBe(result.user.id);
      expect(decoded.email).toBe(result.user.email);
      expect(decoded.plan).toBe(result.user.plan);
    });

    it('should throw generic error for non-existent email', async () => {
      await expect(
        authenticateUser('nonexistent@example.com', 'password123')
      ).rejects.toThrow('AUTH_INVALID_CREDENTIALS');
    });

    it('should throw generic error for incorrect password', async () => {
      await expect(
        authenticateUser('test8@example.com', 'wrongpassword')
      ).rejects.toThrow('AUTH_INVALID_CREDENTIALS');
    });

    it('should not reveal whether email or password was incorrect', async () => {
      // Test with wrong email
      let error1: Error | null = null;
      try {
        await authenticateUser('wrong@example.com', 'password123');
      } catch (e) {
        error1 = e as Error;
      }

      // Test with wrong password
      let error2: Error | null = null;
      try {
        await authenticateUser('test8@example.com', 'wrongpassword');
      } catch (e) {
        error2 = e as Error;
      }

      // Both errors should be identical (Requirements 1.6)
      expect(error1?.message).toBe(error2?.message);
      expect(error1?.message).toBe('AUTH_INVALID_CREDENTIALS');
    });

    it('should be case-insensitive for email', async () => {
      const result = await authenticateUser('Test8@Example.COM', 'password123');

      expect(result).toBeDefined();
      expect(result.user.email).toBe('test8@example.com');
    });
  });
});
