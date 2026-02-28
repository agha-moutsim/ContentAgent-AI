# Implementation Plan: Content Execution Agent

## Overview

This implementation plan breaks down the Content Execution Agent into discrete, incremental coding tasks. Each task builds on previous work, with testing integrated throughout. The plan follows a bottom-up approach: database → services → API routes → frontend components → integration.

## Tasks

- [x] 1. Project Setup and Configuration
  - Initialize Next.js 14 project with TypeScript and App Router
  - Configure TailwindCSS with dark theme design system
  - Set up environment variables structure (.env.example)
  - Install core dependencies: pg/Supabase client, bcrypt, jsonwebtoken, openai, stripe, fast-check
  - Configure TypeScript with strict mode
  - Set up test framework (Jest/Vitest) with fast-check
  - _Requirements: 11.3, 11.6_

- [x] 2. Database Schema and Client Setup
  - [x] 2.1 Create database schema SQL file
    - Define users table with all required fields and indexes
    - Define history table with foreign key constraints and indexes
    - Define rate_limits table (optional, for non-Redis setup)
    - Include CASCADE DELETE for user → history relationship
    - _Requirements: 10.1, 10.2, 10.3, 10.5_
  
  - [x] 2.2 Implement database client wrapper
    - Create connection pool configuration
    - Implement query helper functions with error handling
    - Add connection retry logic
    - _Requirements: 10.4, 10.6_
  
  - [ ]* 2.3 Write property test for database schema
    - **Property 29: Database Schema Completeness**
    - **Validates: Requirements 10.1, 10.2**
  
  - [ ]* 2.4 Write property test for cascade deletion
    - **Property 30: Cascade Deletion**
    - **Validates: Requirements 10.3**

- [x] 3. Authentication Service Layer
  - [x] 3.1 Implement JWT utility functions
    - Create generateToken function with 7-day expiration
    - Create verifyToken function with error handling
    - Add token refresh logic
    - _Requirements: 1.2, 1.4_
  
  - [x] 3.2 Implement password hashing service
    - Create hashPassword function using bcrypt (10 rounds)
    - Create comparePassword function
    - _Requirements: 1.5_
  
  - [x] 3.3 Implement auth service with user CRUD
    - Create createUser function with validation
    - Create findUserByEmail function
    - Create authenticateUser function
    - _Requirements: 1.1, 1.2, 1.6_
  
  - [ ]* 3.4 Write property test for authentication round trip
    - **Property 1: Authentication Round Trip**
    - **Validates: Requirements 1.1, 1.2**
  
  - [ ]* 3.5 Write property test for password security
    - **Property 2: Password Security**
    - **Validates: Requirements 1.5**
  
  - [ ]* 3.6 Write property test for error message safety
    - **Property 4: Authentication Error Message Safety**
    - **Validates: Requirements 1.6**

- [x] 4. Authentication Middleware
  - [x] 4.1 Create requireAuth middleware
    - Extract JWT from cookie or Authorization header
    - Verify token and attach user to request
    - Handle expired tokens with appropriate error
    - _Requirements: 1.3, 1.4, 7.6_
  
  - [x] 4.2 Create rate limiting middleware
    - Implement in-memory rate limiter (10 req/min per user)
    - Return 429 with retry-after header when exceeded
    - _Requirements: 7.2_
  
  - [ ]* 4.3 Write property test for protected route access control
    - **Property 3: Protected Route Access Control**
    - **Validates: Requirements 1.3, 1.4**
  
  - [ ]* 4.4 Write property test for JWT validation
    - **Property 27: JWT Validation on Protected Routes**
    - **Validates: Requirements 7.6**
  
  - [ ]* 4.5 Write property test for rate limiting
    - **Property 25: Rate Limiting Enforcement**
    - **Validates: Requirements 7.2**

- [x] 5. Usage Service
  - [x] 5.1 Implement usage tracking service
    - Create checkLimit function (validates plan and count)
    - Create getCurrentBillingPeriodStart helper
    - Calculate usage from history table dynamically
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [ ]* 5.2 Write property test for free user usage tracking
    - **Property 9: Free User Usage Tracking**
    - **Validates: Requirements 3.1, 3.2**
  
  - [ ]* 5.3 Write property test for pro user unlimited access
    - **Property 10: Pro User Unlimited Access**
    - **Validates: Requirements 3.3**
  
  - [ ]* 5.4 Write property test for billing period reset
    - **Property 11: Billing Period Reset**
    - **Validates: Requirements 3.4**
  
  - [ ]* 5.5 Write property test for plan validation
    - **Property 12: Plan Validation Before Generation**
    - **Validates: Requirements 3.5**

- [x] 6. AI Pipeline Service
  - [x] 6.1 Create OpenAI client wrapper
    - Initialize OpenAI client with API key from env
    - Create helper for chat completions with error handling
    - Add timeout configuration (60 seconds)
    - _Requirements: 2.1, 7.3_
  
  - [x] 6.2 Implement AI pipeline orchestration
    - Create AIPipelineService class
    - Implement expandIdea method with system prompt
    - Implement analyzeAudience method
    - Implement createStructure method
    - Implement generateAllContent method (parallel generation)
    - Add progress callback support for each step
    - _Requirements: 2.1, 2.2, 12.1_
  
  - [x] 6.3 Implement individual content generators
    - Create generateYouTubeTitles (5-10 variations)
    - Create generateHooks (3-5 variations)
    - Create generateFullScript (with timestamps)
    - Create generateShortFormScripts (3-5 scripts)
    - Create generateTwitterThread (formatted with numbering)
    - Create generateLinkedInPost (professional tone)
    - Create generateThumbnailIdeas (5-7 options)
    - Create generateCTAs (5-7 variations)
    - _Requirements: 12.2, 12.3, 12.4_
  
  - [ ]* 6.4 Write property test for pipeline sequential execution
    - **Property 5: AI Pipeline Sequential Execution**
    - **Validates: Requirements 2.1, 2.2**
  
  - [ ]* 6.5 Write property test for content package completeness
    - **Property 6: Content Package Completeness**
    - **Validates: Requirements 2.3, 12.2, 12.3, 12.4**
  
  - [ ]* 6.6 Write property test for content output structure
    - **Property 7: Content Output Structure**
    - **Validates: Requirements 2.4, 12.6**
  
  - [ ]* 6.7 Write property test for generation failure handling
    - **Property 8: Generation Failure Handling**
    - **Validates: Requirements 2.6**

- [ ] 7. Export Service
  - [-] 7.1 Implement text export functionality
    - Create generateTxt function formatting all sections
    - Add proper section headers and spacing
    - _Requirements: 5.2_
  
  - [-] 7.2 Implement Word document export
    - Install and configure 'docx' library
    - Create generateDoc function with formatted sections
    - Preserve markdown formatting (headings, lists, bold)
    - _Requirements: 5.3, 5.5_
  
  - [-] 7.3 Implement filename generation
    - Create generateFilename helper (timestamp + sanitized idea)
    - Sanitize special characters for filesystem compatibility
    - _Requirements: 5.4_
  
  - [ ]* 7.4 Write property test for export format preservation
    - **Property 18: Export Format Preservation**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.5**
  
  - [ ]* 7.5 Write property test for filename generation
    - **Property 19: Export Filename Generation**
    - **Validates: Requirements 5.4**

- [ ] 8. Input Validation and Sanitization
  - [ ] 8.1 Create validation utilities
    - Implement validateEmail function
    - Implement validatePassword function (min 8 chars)
    - Implement validateContentIdea (max 2000 chars, not empty)
    - _Requirements: 7.1_
  
  - [ ] 8.2 Create sanitization utilities
    - Implement sanitizeInput function (remove HTML/script tags)
    - Implement sanitizeFilename function
    - _Requirements: 7.4_
  
  - [ ]* 8.3 Write property test for input length validation
    - **Property 24: Input Length Validation**
    - **Validates: Requirements 7.1**
  
  - [ ]* 8.4 Write property test for input sanitization
    - **Property 26: Input Sanitization**
    - **Validates: Requirements 7.4**

- [ ] 9. Authentication API Routes
  - [ ] 9.1 Implement POST /api/auth/signup
    - Validate email and password
    - Check for duplicate email
    - Hash password and create user record
    - Generate JWT and set httpOnly cookie
    - Return user data and token
    - _Requirements: 1.1, 1.5_
  
  - [ ] 9.2 Implement POST /api/auth/login
    - Validate credentials
    - Compare password hash
    - Generate JWT and set httpOnly cookie
    - Return user data and token
    - Implement secure error messages
    - _Requirements: 1.2, 1.6_
  
  - [ ]* 9.3 Write unit tests for auth API edge cases
    - Test empty credentials
    - Test malformed email
    - Test duplicate email signup
    - Test SQL injection attempts
    - _Requirements: 1.1, 1.2, 1.6_

- [ ] 10. Checkpoint - Authentication Complete
  - Ensure all authentication tests pass
  - Verify JWT generation and validation works
  - Test signup and login flows manually
  - Ask the user if questions arise

- [ ] 11. Generation API Route
  - [ ] 11.1 Implement POST /api/generate
    - Apply requireAuth middleware
    - Apply rate limiting middleware
    - Validate and sanitize input
    - Check usage limits via usageService
    - Execute AI pipeline with progress tracking
    - Save history record to database
    - Return content package
    - Handle errors without incrementing usage
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 3.5, 7.1, 7.2, 7.4_
  
  - [ ]* 11.2 Write property test for immediate upgrade access
    - **Property 13: Immediate Upgrade Access**
    - **Validates: Requirements 3.6**
  
  - [ ]* 11.3 Write integration test for full generation flow
    - Test complete flow: auth → validate → check limits → generate → save → return
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 4.1_

- [ ] 12. History API Routes
  - [ ] 12.1 Implement GET /api/history
    - Apply requireAuth middleware
    - Query history records for current user
    - Order by createdAt DESC
    - Return records array
    - _Requirements: 4.2_
  
  - [ ] 12.2 Implement DELETE /api/history/:id
    - Apply requireAuth middleware
    - Verify record belongs to current user
    - Delete record from database
    - Return 204 No Content
    - _Requirements: 4.4_
  
  - [ ]* 12.3 Write property test for history record creation
    - **Property 14: History Record Creation**
    - **Validates: Requirements 4.1, 4.3**
  
  - [ ]* 12.4 Write property test for chronological ordering
    - **Property 15: History Chronological Ordering**
    - **Validates: Requirements 4.2**
  
  - [ ]* 12.5 Write property test for history deletion
    - **Property 16: History Record Deletion**
    - **Validates: Requirements 4.4**
  
  - [ ]* 12.6 Write property test for history isolation
    - **Property 17: History Record Isolation**
    - **Validates: Requirements 4.6**

- [ ] 13. Subscription API Routes
  - [ ] 13.1 Implement POST /api/subscription/create-checkout
    - Apply requireAuth middleware
    - Create Stripe Checkout session with price ID
    - Include user ID in metadata
    - Set success_url and cancel_url
    - Return checkout URL
    - _Requirements: 6.1_
  
  - [ ] 13.2 Implement POST /api/webhooks/stripe
    - Verify Stripe webhook signature
    - Parse event type (checkout.session.completed, customer.subscription.deleted, invoice.payment_failed)
    - Update user plan in database based on event
    - Log webhook events
    - Return 200 for valid webhooks, 400 for invalid signatures
    - _Requirements: 6.2, 6.3, 6.4, 6.5_
  
  - [ ]* 13.3 Write property test for Stripe checkout redirect
    - **Property 21: Stripe Checkout Redirect**
    - **Validates: Requirements 6.1**
  
  - [ ]* 13.4 Write property test for webhook state transitions
    - **Property 22: Webhook Plan State Transitions**
    - **Validates: Requirements 6.2, 6.3, 6.4**
  
  - [ ]* 13.5 Write property test for webhook signature verification
    - **Property 23: Webhook Signature Verification**
    - **Validates: Requirements 6.5**
  
  - [ ]* 13.6 Write unit tests for webhook edge cases
    - Test unknown event types
    - Test malformed payloads
    - Test missing metadata
    - _Requirements: 6.2, 6.3, 6.4, 6.5_

- [ ] 14. Checkpoint - Backend APIs Complete
  - Ensure all API tests pass
  - Test generation flow with mocked OpenAI
  - Test webhook processing with mocked Stripe events
  - Verify rate limiting and auth middleware work correctly
  - Ask the user if questions arise

- [ ] 15. UI Component Library
  - [ ] 15.1 Create base UI components
    - Create Button component with loading states
    - Create Input component with validation states
    - Create Card component for content sections
    - Create Sidebar component with navigation
    - Apply dark theme styling with TailwindCSS
    - _Requirements: 8.1, 8.2, 8.4_
  
  - [ ] 15.2 Create LoadingAnimation component
    - Implement step-by-step progress indicator
    - Show current pipeline step text
    - Add smooth transitions
    - _Requirements: 2.2, 8.3_
  
  - [ ] 15.3 Create UsageIndicator component
    - Display "X/5 generations used" for free users
    - Display "Unlimited" for pro users
    - Add upgrade prompt when at limit
    - _Requirements: 3.2_

- [ ] 16. Authentication Pages
  - [ ] 16.1 Create login page (app/login/page.tsx)
    - Build login form with email and password inputs
    - Call POST /api/auth/login on submit
    - Handle loading and error states
    - Redirect to /dashboard on success
    - Store JWT in httpOnly cookie
    - _Requirements: 1.2_
  
  - [ ] 16.2 Create signup page (app/signup/page.tsx)
    - Build signup form with email, password, confirmPassword
    - Validate password match client-side
    - Call POST /api/auth/signup on submit
    - Handle loading and error states
    - Auto-login and redirect to /dashboard on success
    - _Requirements: 1.1_
  
  - [ ]* 16.3 Write unit tests for auth form validation
    - Test password mismatch
    - Test empty fields
    - Test invalid email format
    - _Requirements: 1.1, 1.2_

- [ ] 17. Dashboard Page
  - [ ] 17.1 Create dashboard layout with sidebar
    - Implement sidebar navigation (Dashboard, History, Upgrade)
    - Add user info display (email, plan)
    - Apply dark theme styling
    - _Requirements: 8.4_
  
  - [ ] 17.2 Create GenerationForm component
    - Build textarea for content idea input
    - Add character counter (max 2000)
    - Add Generate button with loading state
    - Show UsageIndicator component
    - _Requirements: 7.1_
  
  - [ ] 17.3 Create ContentDisplay component
    - Display generated content in card-based sections
    - Organize sections: YouTube → Social → CTAs
    - Add copy-to-clipboard button per section
    - Add export buttons (.txt, .doc)
    - _Requirements: 5.1, 8.2, 8.7_
  
  - [ ] 17.4 Implement dashboard page logic
    - Fetch user data on mount (plan, usage count)
    - Handle form submission to POST /api/generate
    - Show LoadingAnimation during generation
    - Display ContentDisplay when generation completes
    - Handle errors and display user-friendly messages
    - _Requirements: 2.1, 2.2, 2.3, 3.2_
  
  - [ ]* 17.5 Write property test for content display organization
    - **Property 28: Content Display Organization**
    - **Validates: Requirements 8.2, 8.7**

- [ ] 18. History Page
  - [ ] 18.1 Create HistoryList component
    - Display list of history records (reverse chronological)
    - Show input idea preview and timestamp
    - Add expand/collapse functionality
    - Add delete button per record
    - Add reuse button (populates dashboard input)
    - _Requirements: 4.2, 4.4, 4.5_
  
  - [ ] 18.2 Implement history page logic
    - Fetch history records from GET /api/history on mount
    - Handle record expansion to show full content
    - Handle delete via DELETE /api/history/:id
    - Handle reuse by navigating to dashboard with query param
    - _Requirements: 4.2, 4.3, 4.4, 4.5_
  
  - [ ]* 18.3 Write integration test for history management
    - Test create → list → delete flow
    - _Requirements: 4.1, 4.2, 4.4_

- [ ] 19. Upgrade Page
  - [ ] 19.1 Create upgrade page (app/upgrade/page.tsx)
    - Display current plan status
    - Show pricing comparison table (Free vs Pro)
    - Add "Upgrade to Pro" button
    - Handle button click to POST /api/subscription/create-checkout
    - Redirect to Stripe Checkout URL
    - _Requirements: 6.1_
  
  - [ ] 19.2 Handle post-checkout redirect
    - Check for ?success=true query param on dashboard
    - Show success message when returning from Stripe
    - Refresh user plan status
    - _Requirements: 6.2_

- [ ] 20. Landing Page
  - [ ] 20.1 Create landing page (app/page.tsx)
    - Build hero section with value proposition and CTA
    - Build problem/solution section
    - Build features section (3-4 key features)
    - Build pricing section (Free vs Pro comparison)
    - Build final CTA section
    - Link CTAs to /signup
    - Apply dark theme styling
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [ ]* 20.2 Write unit test for landing page structure
    - Verify hero section exists
    - Verify pricing section exists
    - Verify CTA links to /signup
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 21. Export Functionality Integration
  - [ ] 21.1 Implement clipboard copy functionality
    - Add click handler to copy buttons
    - Use navigator.clipboard.writeText()
    - Show success toast notification
    - Handle clipboard API errors
    - _Requirements: 5.1_
  
  - [ ] 21.2 Implement file download functionality
    - Create download handler for .txt export
    - Create download handler for .doc export
    - Generate filename using export service
    - Trigger browser download
    - Handle export errors with retry option
    - _Requirements: 5.2, 5.3, 5.4, 5.6_
  
  - [ ]* 21.3 Write property test for export error recovery
    - **Property 20: Export Error Recovery**
    - **Validates: Requirements 5.6**

- [ ] 22. Error Handling and Logging
  - [ ] 22.1 Implement error logging service
    - Create logger utility with different levels (info, warn, error)
    - Log all API errors with context
    - Log database errors with sanitized details
    - Configure for production (consider Sentry integration)
    - _Requirements: 11.5_
  
  - [ ] 22.2 Implement error boundary components
    - Create React error boundary for dashboard
    - Create error boundary for history page
    - Show user-friendly error messages
    - Log errors to logging service
    - _Requirements: 10.6_
  
  - [ ]* 22.3 Write property test for database error handling
    - **Property 31: Database Error Handling**
    - **Validates: Requirements 10.6**
  
  - [ ]* 22.4 Write property test for error logging
    - **Property 32: Error Logging**
    - **Validates: Requirements 11.5**

- [ ] 23. Environment Configuration
  - [ ] 23.1 Create environment configuration module
    - Create config.ts that loads from process.env
    - Validate required environment variables on startup
    - Provide type-safe config object
    - Handle different environments (dev, staging, prod)
    - _Requirements: 11.3, 11.6_
  
  - [ ] 23.2 Create .env.example file
    - Document all required environment variables
    - Provide example values
    - Include comments explaining each variable
    - _Requirements: 11.3_
  
  - [ ]* 23.3 Write property test for environment-specific configuration
    - **Property 33: Environment-Specific Configuration**
    - **Validates: Requirements 11.6**

- [ ] 24. Final Integration and Polish
  - [ ] 24.1 Implement protected route wrapper
    - Create HOC or middleware to protect dashboard routes
    - Redirect to /login if not authenticated
    - Verify JWT on client-side navigation
    - _Requirements: 1.3_
  
  - [ ] 24.2 Add loading states and transitions
    - Add skeleton loaders for data fetching
    - Add smooth transitions between states
    - Add toast notifications for actions
    - _Requirements: 8.3, 8.5_
  
  - [ ] 24.3 Implement responsive design
    - Ensure mobile responsiveness for all pages
    - Test on different screen sizes
    - Adjust sidebar for mobile (hamburger menu)
    - _Requirements: 8.1_
  
  - [ ] 24.4 Add accessibility features
    - Add ARIA labels to interactive elements
    - Ensure keyboard navigation works
    - Test with screen reader
    - Add focus indicators
    - _Requirements: 8.1_

- [ ] 25. Testing and Quality Assurance
  - [ ]* 25.1 Run full test suite
    - Execute all unit tests
    - Execute all property tests (100+ iterations each)
    - Execute all integration tests
    - Verify 80%+ code coverage
    - _Requirements: All_
  
  - [ ]* 25.2 Perform manual testing
    - Test complete user journey: signup → generate → history → upgrade
    - Test error scenarios (invalid inputs, API failures)
    - Test rate limiting
    - Test webhook processing with Stripe CLI
    - _Requirements: All_
  
  - [ ]* 25.3 Security audit
    - Verify no API keys exposed to client
    - Test SQL injection prevention
    - Test XSS prevention
    - Verify CSRF protection
    - Test webhook signature verification
    - _Requirements: 7.3, 7.4, 7.5, 7.6, 6.5_

- [ ] 26. Deployment Preparation
  - [ ] 26.1 Configure production environment
    - Set up Vercel project
    - Configure environment variables in Vercel
    - Set up Supabase production database
    - Run database migrations
    - _Requirements: 11.1, 11.2_
  
  - [ ] 26.2 Configure Stripe for production
    - Create production Stripe products and prices
    - Configure webhook endpoint in Stripe dashboard
    - Test webhook delivery
    - _Requirements: 6.1, 6.2, 6.5_
  
  - [ ] 26.3 Configure security headers
    - Add Content-Security-Policy
    - Add HSTS header
    - Configure CORS
    - Enable HTTPS redirect
    - _Requirements: 7.3, 7.5_
  
  - [ ] 26.4 Create deployment documentation
    - Document deployment steps
    - Document environment variable setup
    - Document database migration process
    - Document Stripe webhook configuration
    - _Requirements: 11.1, 11.2_

- [ ] 27. Final Checkpoint - Production Ready
  - Verify all tests pass in CI/CD
  - Perform final manual testing on staging
  - Review security checklist
  - Review deployment checklist
  - Deploy to production
  - Monitor error logs and performance
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- The implementation follows a bottom-up approach: database → services → APIs → frontend
- All AI operations are backend-only for security
- JWT tokens stored in httpOnly cookies for security
- Rate limiting prevents abuse
- Comprehensive error handling ensures production reliability
