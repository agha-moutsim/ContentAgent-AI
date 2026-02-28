// Custom generators for property-based testing with fast-check
import fc from 'fast-check'
import type { ContentPackage } from '@/lib/types'

export const userArbitrary = fc.record({
  email: fc.emailAddress(),
  password: fc.string({ minLength: 8, maxLength: 50 }),
  plan: fc.constantFrom('free' as const, 'pro' as const),
})

export const contentIdeaArbitrary = fc.string({
  minLength: 10,
  maxLength: 2000,
})

export const contentPackageArbitrary: fc.Arbitrary<ContentPackage> = fc.record({
  youtubeTitles: fc.array(fc.string({ minLength: 10, maxLength: 70 }), {
    minLength: 5,
    maxLength: 10,
  }),
  hooks: fc.array(fc.string({ minLength: 10, maxLength: 200 }), {
    minLength: 3,
    maxLength: 5,
  }),
  fullScript: fc.string({ minLength: 100, maxLength: 5000 }),
  shortFormScripts: fc.array(fc.string({ minLength: 50, maxLength: 500 }), {
    minLength: 3,
    maxLength: 5,
  }),
  twitterThread: fc.string({ minLength: 100, maxLength: 2000 }),
  linkedinPost: fc.string({ minLength: 100, maxLength: 1500 }),
  thumbnailIdeas: fc.array(fc.string({ minLength: 5, maxLength: 30 }), {
    minLength: 5,
    maxLength: 7,
  }),
  ctaVariations: fc.array(fc.string({ minLength: 10, maxLength: 100 }), {
    minLength: 5,
    maxLength: 7,
  }),
})

export const jwtSecretArbitrary = fc.string({ minLength: 32, maxLength: 64 })

export const validEmailArbitrary = fc.emailAddress()

export const validPasswordArbitrary = fc.string({
  minLength: 8,
  maxLength: 50,
})

export const invalidEmailArbitrary = fc.oneof(
  fc.string({ maxLength: 5 }),
  fc.constant('not-an-email'),
  fc.constant('missing@domain'),
  fc.constant('@nodomain.com'),
)

export const invalidPasswordArbitrary = fc.oneof(
  fc.string({ maxLength: 7 }), // Too short
  fc.constant(''), // Empty
)

export const sqlInjectionArbitrary = fc.constantFrom(
  "'; DROP TABLE users; --",
  "' OR '1'='1",
  "admin'--",
  "' UNION SELECT * FROM users--",
)

export const xssArbitrary = fc.constantFrom(
  '<script>alert("xss")</script>',
  '<img src=x onerror=alert(1)>',
  'javascript:alert(1)',
  '<svg onload=alert(1)>',
)
