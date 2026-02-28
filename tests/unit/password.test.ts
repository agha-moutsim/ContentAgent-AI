import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword } from '../../lib/utils/password';

describe('Password Hashing Service', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123';
      const hashed = await hashPassword(password);
      
      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);
      expect(hashed.length).toBeGreaterThan(0);
    });

    it('should produce different hashes for the same password', async () => {
      const password = 'testPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      // bcrypt uses random salts, so hashes should be different
      expect(hash1).not.toBe(hash2);
    });

    it('should hash different passwords differently', async () => {
      const password1 = 'password1';
      const password2 = 'password2';
      const hash1 = await hashPassword(password1);
      const hash2 = await hashPassword(password2);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      const password = 'testPassword123';
      const hashed = await hashPassword(password);
      
      const result = await comparePassword(password, hashed);
      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword456';
      const hashed = await hashPassword(password);
      
      const result = await comparePassword(wrongPassword, hashed);
      expect(result).toBe(false);
    });

    it('should handle empty password comparison', async () => {
      const password = 'testPassword123';
      const hashed = await hashPassword(password);
      
      const result = await comparePassword('', hashed);
      expect(result).toBe(false);
    });

    it('should be case-sensitive', async () => {
      const password = 'TestPassword123';
      const hashed = await hashPassword(password);
      
      const result = await comparePassword('testpassword123', hashed);
      expect(result).toBe(false);
    });
  });

  describe('Security Properties', () => {
    it('should never store plaintext password', async () => {
      const password = 'mySecretPassword';
      const hashed = await hashPassword(password);
      
      // Hashed password should not contain the plaintext
      expect(hashed).not.toContain(password);
      expect(hashed).not.toBe(password);
    });

    it('should produce bcrypt-formatted hash', async () => {
      const password = 'testPassword123';
      const hashed = await hashPassword(password);
      
      // bcrypt hashes start with $2a$, $2b$, or $2y$
      expect(hashed).toMatch(/^\$2[aby]\$/);
    });
  });
});
