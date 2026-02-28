import { describe, it, expect } from 'vitest'

describe('Project Setup', () => {
  it('should have test environment configured', () => {
    expect(process.env.NODE_ENV).toBe('test')
    expect(process.env.JWT_SECRET).toBeDefined()
  })

  it('should have required environment variables', () => {
    expect(process.env.DATABASE_URL).toBeDefined()
    expect(process.env.OPENAI_API_KEY).toBeDefined()
    expect(process.env.STRIPE_SECRET_KEY).toBeDefined()
  })
})
