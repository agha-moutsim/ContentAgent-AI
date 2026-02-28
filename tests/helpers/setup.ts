// Test setup file for Vitest
// This file runs before all tests

// Set test environment variables
Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true });
process.env.JWT_SECRET = 'test-secret-key-for-testing-only-min-32-chars'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.OPENAI_API_KEY = 'sk-test-key'
process.env.STRIPE_SECRET_KEY = 'sk_test_key'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
process.env.STRIPE_PRICE_ID_PRO = 'price_test'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
