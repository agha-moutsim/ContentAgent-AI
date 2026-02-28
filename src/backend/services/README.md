# Authentication Service

## Overview

The authentication service provides user CRUD operations for the Content Execution Agent application.

## Functions

### `createUser(email: string, password: string)`

Creates a new user account with the following features:
- Email validation (proper format)
- Password validation (minimum 8 characters)
- Duplicate email detection
- Password hashing using bcrypt (10 rounds)
- Automatic assignment to 'free' plan
- Email normalization to lowercase

**Throws:**
- `VALIDATION_INVALID_EMAIL` - Invalid email format
- `VALIDATION_PASSWORD_TOO_SHORT` - Password less than 8 characters
- `DB_DUPLICATE_EMAIL` - Email already exists
- `DB_INSERT_FAILED` - Database insertion failed

**Returns:** User object (without password hash)

### `findUserByEmail(email: string)`

Finds a user by email address.
- Case-insensitive email lookup
- Returns complete user object including password hash

**Returns:** User object if found, null otherwise

### `authenticateUser(email: string, password: string)`

Authenticates a user and generates a JWT token.
- Validates credentials
- Returns generic error message for security (Requirements 1.6)
- Generates JWT token with 7-day expiration
- Case-insensitive email lookup

**Throws:**
- `AUTH_INVALID_CREDENTIALS` - Invalid email or password (generic message)

**Returns:** Object containing JWT token and user data

## Requirements Satisfied

- **Requirement 1.1**: User registration with secure credential storage
- **Requirement 1.2**: User login with JWT token generation
- **Requirement 1.5**: Password hashing before storage
- **Requirement 1.6**: Generic error messages that don't reveal whether email or password was incorrect

## Testing

To run the tests, you need:
1. A PostgreSQL database running (local or Supabase)
2. Environment variables configured in `.env.local`:
   - `DATABASE_URL` - PostgreSQL connection string
   - `JWT_SECRET` - Secret key for JWT signing (min 32 chars)

Run tests with:
```bash
npm test tests/unit/auth.test.ts
```

## Usage Example

```typescript
import { createUser, authenticateUser } from './lib/services/auth';

// Create a new user
const user = await createUser('user@example.com', 'password123');
console.log(user.id, user.email, user.plan);

// Authenticate user
const { token, user: authUser } = await authenticateUser('user@example.com', 'password123');
console.log('JWT Token:', token);
console.log('User:', authUser);
```
