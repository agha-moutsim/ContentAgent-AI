# Design Document: Content Execution Agent

## Overview

The Content Execution Agent is a full-stack Next.js SaaS application that transforms a single content idea into comprehensive multi-platform content packages. The system is architected as a task-oriented AI agent with structured workflows, not a simple chatbot interface.

### Key Design Principles

1. **Backend-First AI Processing**: All AI operations execute server-side to protect API keys and enable proper rate limiting
2. **Structured Agent Workflow**: Multi-step AI pipeline with visible progress tracking
3. **Subscription-Driven Architecture**: Usage enforcement at the API layer with database-backed tracking
4. **Export-First Output**: All generated content designed for immediate export and reuse
5. **Production-Ready Security**: JWT authentication, input validation, rate limiting, and webhook verification

### Technology Stack

- **Frontend**: Next.js 14 (App Router), React, TailwindCSS
- **Backend**: Next.js API Routes (Node.js runtime)
- **Database**: PostgreSQL via Supabase
- **Authentication**: JWT with bcrypt password hashing
- **AI Provider**: OpenAI API (GPT-4 or GPT-3.5-turbo)
- **Payments**: Stripe Checkout and Webhooks
- **Deployment**: Vercel (frontend/API) + Supabase (database)

## Architecture

### System Architecture Diagram

```mermaid
graph TB
    subgraph Client["Client Layer"]
        LP[Landing Page]
        AUTH[Auth Pages]
        DASH[Dashboard]
        HIST[History Page]
    end
    
    subgraph API["API Layer (Next.js Routes)"]
        AUTH_API[/api/auth]
        GEN_API[/api/generate]
        HIST_API[/api/history]
        SUB_API[/api/subscription]
        WEBHOOK[/api/webhooks/stripe]
    end
    
    subgraph Services["Service Layer"]
        AI_SVC[AI Pipeline Service]
        AUTH_SVC[Auth Service]
        USAGE_SVC[Usage Service]
        EXPORT_SVC[Export Service]
    end
    
    subgraph External["External Services"]
        OPENAI[OpenAI API]
        STRIPE[Stripe API]
        DB[(Supabase PostgreSQL)]
    end
    
    LP --> AUTH_API
    AUTH --> AUTH_API
    DASH --> GEN_API
    DASH --> HIST_API
    HIST --> HIST_API
    DASH --> SUB_API
    
    AUTH_API --> AUTH_SVC
    GEN_API --> AI_SVC
    GEN_API --> USAGE_SVC
    HIST_API --> DB
    SUB_API --> STRIPE
    WEBHOOK --> DB
    
    AI_SVC --> OPENAI
    AI_SVC --> DB
    AUTH_SVC --> DB
    USAGE_SVC --> DB
    EXPORT_SVC --> DASH
    
    STRIPE -.webhook.-> WEBHOOK
```

### Request Flow: Content Generation

```mermaid
sequenceDiagram
    participant User
    participant Dashboard
    participant API as /api/generate
    participant Usage as Usage Service
    participant AI as AI Pipeline Service
    participant OpenAI
    participant DB as Database
    
    User->>Dashboard: Submit content idea
    Dashboard->>API: POST with JWT + idea
    API->>API: Validate JWT
    API->>Usage: Check usage limits
    Usage->>DB: Query user plan & count
    DB-->>Usage: Plan data
    
    alt Free user at limit
        Usage-->>API: Limit exceeded
        API-->>Dashboard: 403 Upgrade required
    else Within limits
        Usage-->>API: Allowed
        API->>AI: Execute pipeline
        
        AI->>OpenAI: Step 1: Idea expansion
        OpenAI-->>AI: Expanded concept
        Dashboard-->>User: Show progress: "Expanding idea..."
        
        AI->>OpenAI: Step 2: Audience positioning
        OpenAI-->>AI: Target audience
        Dashboard-->>User: Show progress: "Analyzing audience..."
        
        AI->>OpenAI: Step 3: Content breakdown
        OpenAI-->>AI: Content structure
        Dashboard-->>User: Show progress: "Structuring content..."
        
        AI->>OpenAI: Step 4: Multi-platform generation
        OpenAI-->>AI: Complete content package
        Dashboard-->>User: Show progress: "Generating outputs..."
        
        AI->>DB: Save history record
        AI->>Usage: Increment counter
        AI-->>API: Content package
        API-->>Dashboard: 200 + content
        Dashboard-->>User: Display results
    end
```

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Client
    participant API as /api/auth
    participant DB as Database
    
    User->>Client: Enter credentials
    Client->>API: POST /api/auth/login
    API->>DB: Query user by email
    DB-->>API: User record
    API->>API: Verify password hash
    
    alt Valid credentials
        API->>API: Generate JWT
        API-->>Client: 200 + JWT token
        Client->>Client: Store token (httpOnly cookie)
        Client-->>User: Redirect to dashboard
    else Invalid credentials
        API-->>Client: 401 Unauthorized
        Client-->>User: Show error
    end
```

## Components and Interfaces

### Frontend Components

#### 1. Landing Page (`app/page.tsx`)

**Purpose**: Marketing page for unauthenticated users

**Key Sections**:
- Hero with value proposition and CTA
- Problem/Solution explanation
- Features showcase (3-4 key features)
- Pricing comparison table
- Final CTA section

**State**: None (static content)

**Navigation**: Links to `/signup` and `/login`

#### 2. Authentication Pages

**Login Page** (`app/login/page.tsx`):
```typescript
interface LoginForm {
  email: string;
  password: string;
}

// Calls POST /api/auth/login
// On success: stores JWT, redirects to /dashboard
// On error: displays validation message
```

**Signup Page** (`app/signup/page.tsx`):
```typescript
interface SignupForm {
  email: string;
  password: string;
  confirmPassword: string;
}

// Calls POST /api/auth/signup
// Validates password strength and email format
// On success: auto-login and redirect to /dashboard
```

#### 3. Dashboard (`app/dashboard/page.tsx`)

**Purpose**: Main content generation interface

**State**:
```typescript
interface DashboardState {
  inputIdea: string;
  isGenerating: boolean;
  currentStep: string | null; // "Expanding idea...", etc.
  generatedContent: ContentPackage | null;
  usageCount: number;
  userPlan: 'free' | 'pro';
  error: string | null;
}
```

**Layout**:
- Sidebar navigation (Dashboard, History, Account, Upgrade)
- Main content area with input textarea
- Generate button with loading state
- Results display area (card-based sections)
- Usage indicator (e.g., "3/5 generations used")

**Key Interactions**:
- Submit idea → POST /api/generate
- Copy section → navigator.clipboard.writeText()
- Export .txt → Trigger download
- Export .doc → Generate and download .docx file

#### 4. History Page (`app/history/page.tsx`)

**Purpose**: View and manage past generations

**State**:
```typescript
interface HistoryState {
  records: HistoryRecord[];
  selectedRecord: HistoryRecord | null;
  isLoading: boolean;
}

interface HistoryRecord {
  id: string;
  inputIdea: string;
  contentPackage: ContentPackage;
  createdAt: Date;
}
```

**Layout**:
- List view of past generations (reverse chronological)
- Click to expand full content
- Delete button per record
- Reuse button (populates dashboard input)

**API Calls**:
- GET /api/history → Fetch all records
- DELETE /api/history/:id → Remove record
- POST /api/generate (when reusing)

#### 5. Upgrade Page (`app/upgrade/page.tsx`)

**Purpose**: Subscription management and upgrade flow

**Features**:
- Display current plan status
- Pricing comparison
- "Upgrade to Pro" button → Stripe Checkout
- Manage subscription link (for pro users)

**API Calls**:
- POST /api/subscription/create-checkout → Get Stripe URL
- Redirect to Stripe Checkout
- Return URL: /dashboard?success=true

### Backend API Routes

#### 1. Authentication API (`app/api/auth/`)

**POST /api/auth/signup**
```typescript
interface SignupRequest {
  email: string;
  password: string;
}

interface SignupResponse {
  success: boolean;
  token?: string;
  error?: string;
}

// Implementation:
// 1. Validate email format and password strength
// 2. Check if email already exists
// 3. Hash password with bcrypt (10 rounds)
// 4. Insert user record (plan: 'free', usageCount: 0)
// 5. Generate JWT token
// 6. Return token in httpOnly cookie
```

**POST /api/auth/login**
```typescript
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    email: string;
    plan: 'free' | 'pro';
    usageCount: number;
  };
  error?: string;
}

// Implementation:
// 1. Query user by email
// 2. Compare password with bcrypt
// 3. Generate JWT token (expires in 7 days)
// 4. Return token + user data
```

**Middleware: `requireAuth`**
```typescript
// Validates JWT from cookie or Authorization header
// Attaches user object to request
// Returns 401 if invalid/missing token
```

#### 2. Generation API (`app/api/generate/route.ts`)

**POST /api/generate**
```typescript
interface GenerateRequest {
  idea: string;
}

interface GenerateResponse {
  success: boolean;
  content?: ContentPackage;
  error?: string;
  upgradeRequired?: boolean;
}

interface ContentPackage {
  youtubeTitles: string[];
  hooks: string[];
  fullScript: string;
  shortFormScripts: string[];
  twitterThread: string;
  linkedinPost: string;
  thumbnailIdeas: string[];
  ctaVariations: string[];
}

// Implementation:
// 1. Validate JWT (requireAuth middleware)
// 2. Validate input (max 2000 chars, not empty)
// 3. Check usage limits (usageService.checkLimit)
// 4. Execute AI pipeline (aiPipelineService.generate)
// 5. Save to history (db.history.create)
// 6. Increment usage counter (usageService.increment)
// 7. Return content package
```

**Rate Limiting**: 10 requests/minute per user (using in-memory store or Redis)

#### 3. History API (`app/api/history/`)

**GET /api/history**
```typescript
interface HistoryResponse {
  records: HistoryRecord[];
}

// Implementation:
// 1. Validate JWT
// 2. Query history records WHERE userId = current user
// 3. Order by createdAt DESC
// 4. Return records
```

**DELETE /api/history/:id**
```typescript
// Implementation:
// 1. Validate JWT
// 2. Verify record belongs to current user
// 3. Delete record
// 4. Return 204 No Content
```

#### 4. Subscription API (`app/api/subscription/`)

**POST /api/subscription/create-checkout**
```typescript
interface CheckoutRequest {
  priceId: string; // Stripe price ID for pro plan
}

interface CheckoutResponse {
  url: string; // Stripe Checkout URL
}

// Implementation:
// 1. Validate JWT
// 2. Create Stripe Checkout Session
// 3. Set success_url and cancel_url
// 4. Include user ID in metadata
// 5. Return checkout URL
```

**POST /api/webhooks/stripe**
```typescript
// Implementation:
// 1. Verify Stripe signature
// 2. Parse event type:
//    - checkout.session.completed → Upgrade user to pro
//    - customer.subscription.deleted → Downgrade to free
//    - invoice.payment_failed → Send notification
// 3. Update user record in database
// 4. Return 200 (Stripe requires quick response)
```

### Service Layer

#### 1. AI Pipeline Service (`lib/services/aiPipeline.ts`)

**Purpose**: Orchestrate multi-step AI content generation

```typescript
class AIPipelineService {
  private openai: OpenAI;
  
  async generate(idea: string, onProgress?: (step: string) => void): Promise<ContentPackage> {
    // Step 1: Idea Expansion
    onProgress?.("Expanding your idea...");
    const expandedIdea = await this.expandIdea(idea);
    
    // Step 2: Audience Positioning
    onProgress?.("Analyzing target audience...");
    const audience = await this.analyzeAudience(expandedIdea);
    
    // Step 3: Content Breakdown
    onProgress?.("Structuring content framework...");
    const structure = await this.createStructure(expandedIdea, audience);
    
    // Step 4: Multi-Platform Generation
    onProgress?.("Generating platform-specific content...");
    const content = await this.generateAllContent(structure);
    
    return content;
  }
  
  private async expandIdea(idea: string): Promise<string> {
    const prompt = `You are a content strategist. Expand this content idea into a comprehensive concept with key angles and hooks:\n\n${idea}`;
    // Call OpenAI API
  }
  
  private async analyzeAudience(expandedIdea: string): Promise<string> {
    const prompt = `Based on this content concept, identify the target audience, their pain points, and what will resonate:\n\n${expandedIdea}`;
    // Call OpenAI API
  }
  
  private async createStructure(idea: string, audience: string): Promise<ContentStructure> {
    const prompt = `Create a content structure with main points, supporting details, and flow for:\nIdea: ${idea}\nAudience: ${audience}`;
    // Call OpenAI API
  }
  
  private async generateAllContent(structure: ContentStructure): Promise<ContentPackage> {
    // Parallel generation of all content types
    const [titles, hooks, script, shorts, twitter, linkedin, thumbnails, ctas] = await Promise.all([
      this.generateYouTubeTitles(structure),
      this.generateHooks(structure),
      this.generateFullScript(structure),
      this.generateShortFormScripts(structure),
      this.generateTwitterThread(structure),
      this.generateLinkedInPost(structure),
      this.generateThumbnailIdeas(structure),
      this.generateCTAs(structure)
    ]);
    
    return {
      youtubeTitles: titles,
      hooks,
      fullScript: script,
      shortFormScripts: shorts,
      twitterThread: twitter,
      linkedinPost: linkedin,
      thumbnailIdeas: thumbnails,
      ctaVariations: ctas
    };
  }
}
```

**System Prompts**: Each generation method uses carefully crafted prompts that:
- Emphasize conversion and engagement
- Avoid generic fluff
- Use persuasive, action-oriented language
- Follow platform-specific best practices
- Output structured markdown

#### 2. Usage Service (`lib/services/usage.ts`)

**Purpose**: Enforce subscription limits

```typescript
class UsageService {
  async checkLimit(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const user = await db.users.findById(userId);
    
    if (user.plan === 'pro') {
      return { allowed: true };
    }
    
    // Free plan: check monthly limit
    const currentPeriodStart = this.getCurrentBillingPeriodStart();
    const usageThisPeriod = await db.history.count({
      userId,
      createdAt: { gte: currentPeriodStart }
    });
    
    if (usageThisPeriod >= 5) {
      return { 
        allowed: false, 
        reason: 'Free plan limit reached. Upgrade to Pro for unlimited generations.' 
      };
    }
    
    return { allowed: true };
  }
  
  async increment(userId: string): Promise<void> {
    // Increment is implicit via history record creation
    // Usage count is calculated dynamically from history table
  }
  
  private getCurrentBillingPeriodStart(): Date {
    // Returns first day of current month
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}
```

#### 3. Export Service (`lib/services/export.ts`)

**Purpose**: Generate downloadable files

```typescript
class ExportService {
  generateTxt(content: ContentPackage, idea: string): string {
    // Format content as plain text with sections
    return `
CONTENT EXECUTION AGENT - GENERATED CONTENT
Original Idea: ${idea}
Generated: ${new Date().toISOString()}

=== YOUTUBE TITLES ===
${content.youtubeTitles.join('\n')}

=== HOOKS ===
${content.hooks.join('\n\n')}

=== FULL SCRIPT ===
${content.fullScript}

... (all sections)
    `.trim();
  }
  
  async generateDoc(content: ContentPackage, idea: string): Promise<Buffer> {
    // Use library like 'docx' to create .docx file
    // Include formatted sections with headings
    // Return buffer for download
  }
}
```

## Data Models

### Database Schema

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  plan VARCHAR(10) NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);

-- History table
CREATE TABLE history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  input_idea TEXT NOT NULL,
  content_package JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_history_user_id ON history(user_id);
CREATE INDEX idx_history_created_at ON history(created_at DESC);

-- Rate limiting table (optional, can use Redis instead)
CREATE TABLE rate_limits (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint VARCHAR(100) NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMP NOT NULL,
  PRIMARY KEY (user_id, endpoint)
);
```

### TypeScript Interfaces

```typescript
// User model
interface User {
  id: string;
  email: string;
  passwordHash: string;
  plan: 'free' | 'pro';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// History record model
interface HistoryRecord {
  id: string;
  userId: string;
  inputIdea: string;
  contentPackage: ContentPackage;
  createdAt: Date;
}

// Content package (stored as JSONB)
interface ContentPackage {
  youtubeTitles: string[];        // 5-10 variations
  hooks: string[];                 // 3-5 options
  fullScript: string;              // Complete script with timestamps
  shortFormScripts: string[];      // 3-5 scripts for 15-60s videos
  twitterThread: string;           // Formatted thread with numbering
  linkedinPost: string;            // Professional post with formatting
  thumbnailIdeas: string[];        // 5-7 text ideas for thumbnails
  ctaVariations: string[];         // 5-7 CTA options
}

// JWT payload
interface JWTPayload {
  userId: string;
  email: string;
  plan: 'free' | 'pro';
  iat: number;
  exp: number;
}

// Stripe webhook event
interface StripeWebhookEvent {
  type: string;
  data: {
    object: {
      customer: string;
      subscription?: string;
      metadata?: {
        userId: string;
      };
    };
  };
}
```

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Authentication
JWT_SECRET=your-secret-key-min-32-chars

# OpenAI
OPENAI_API_KEY=sk-...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PRO=price_...

# App
NEXT_PUBLIC_APP_URL=https://yourapp.com
NODE_ENV=production
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Authentication Round Trip

*For any* valid email and password combination, creating a user account then immediately logging in with those credentials should return a valid JWT token that grants access to protected routes.

**Validates: Requirements 1.1, 1.2**

### Property 2: Password Security

*For any* user account created in the system, the stored password field should never match the plaintext password (must be hashed) and should be verifiable using bcrypt comparison.

**Validates: Requirements 1.5**

### Property 3: Protected Route Access Control

*For any* protected API route, requests without a valid JWT token should return 401 Unauthorized, and requests with expired tokens should require re-authentication.

**Validates: Requirements 1.3, 1.4**

### Property 4: Authentication Error Message Safety

*For any* invalid login attempt (wrong email or wrong password), the error message should not reveal which credential was incorrect.

**Validates: Requirements 1.6**

### Property 5: AI Pipeline Sequential Execution

*For any* content generation request, the AI pipeline should execute steps in the exact order: idea expansion → audience positioning → content breakdown → multi-platform generation, with progress callbacks invoked for each step.

**Validates: Requirements 2.1, 2.2**

### Property 6: Content Package Completeness

*For any* successful content generation, the returned ContentPackage should contain all required fields (youtubeTitles, hooks, fullScript, shortFormScripts, twitterThread, linkedinPost, thumbnailIdeas, ctaVariations) with non-empty values, and YouTube content should include 5-10 titles, social content should be platform-specific, and short-form scripts should number 3-5.

**Validates: Requirements 2.3, 12.2, 12.3, 12.4**

### Property 7: Content Output Structure

*For any* generated content section, the output should contain valid markdown formatting with clear section headings.

**Validates: Requirements 2.4, 12.6**

### Property 8: Generation Failure Handling

*For any* AI pipeline execution that fails (API error, timeout, etc.), the system should return an error message and the user's usage counter should remain unchanged.

**Validates: Requirements 2.6**

### Property 9: Free User Usage Tracking

*For any* free user, completing a generation should increment their usage count for the current billing period, and attempting to generate after reaching 5 generations should be blocked with an upgrade prompt.

**Validates: Requirements 3.1, 3.2**

### Property 10: Pro User Unlimited Access

*For any* pro user, the system should allow generation requests regardless of count, never blocking based on usage limits.

**Validates: Requirements 3.3**

### Property 11: Billing Period Reset

*For any* free user with usage count > 0, when the billing period transitions to a new month, their effective usage count (calculated from history records in current period) should reset to 0.

**Validates: Requirements 3.4**

### Property 12: Plan Validation Before Generation

*For any* generation request, the system should validate the user's plan status and usage limits before executing the AI pipeline.

**Validates: Requirements 3.5**

### Property 13: Immediate Upgrade Access

*For any* user who upgrades from free to pro, the next generation request should succeed regardless of previous usage count.

**Validates: Requirements 3.6**

### Property 14: History Record Creation

*For any* successful content generation, a history record should be created containing the input idea, complete content package, and timestamp, and should be retrievable by the user.

**Validates: Requirements 4.1, 4.3**

### Property 15: History Chronological Ordering

*For any* user with multiple history records, fetching the history list should return records in reverse chronological order (newest first).

**Validates: Requirements 4.2**

### Property 16: History Record Deletion

*For any* history record, when a user deletes it, the record should be removed from the database and no longer appear in subsequent history queries.

**Validates: Requirements 4.4**

### Property 17: History Record Isolation

*For any* history record created by user A, user B should not be able to access, view, or delete that record.

**Validates: Requirements 4.6**

### Property 18: Export Format Preservation

*For any* content package, exporting to .txt should produce a plain text file with all sections, exporting to .doc should produce a valid Word document with preserved markdown formatting, and copying to clipboard should place the formatted text in the system clipboard.

**Validates: Requirements 5.1, 5.2, 5.3, 5.5**

### Property 19: Export Filename Generation

*For any* export operation, the generated filename should include a timestamp and a sanitized version of the input idea.

**Validates: Requirements 5.4**

### Property 20: Export Error Recovery

*For any* failed export operation, the system should display an error message and allow the user to retry without losing the generated content.

**Validates: Requirements 5.6**

### Property 21: Stripe Checkout Redirect

*For any* authenticated user initiating an upgrade, the system should return a valid Stripe Checkout URL with correct pricing and metadata.

**Validates: Requirements 6.1**

### Property 22: Webhook Plan State Transitions

*For any* valid Stripe webhook event (verified signature), a successful payment should upgrade the user to pro, a cancellation should downgrade to free, and a payment failure should maintain the current plan status.

**Validates: Requirements 6.2, 6.3, 6.4**

### Property 23: Webhook Signature Verification

*For any* incoming webhook request, if the Stripe signature is invalid or missing, the system should reject the request and not process the event.

**Validates: Requirements 6.5**

### Property 24: Input Length Validation

*For any* content generation request, inputs exceeding 2000 characters should be rejected with a validation error before reaching the AI pipeline.

**Validates: Requirements 7.1**

### Property 25: Rate Limiting Enforcement

*For any* user making more than 10 requests per minute to the generation endpoint, subsequent requests should return 429 Too Many Requests.

**Validates: Requirements 7.2**

### Property 26: Input Sanitization

*For any* user input containing HTML tags, SQL syntax, or script tags, the system should sanitize the input before processing or storage.

**Validates: Requirements 7.4**

### Property 27: JWT Validation on Protected Routes

*For any* API route marked as protected, requests with invalid, expired, or missing JWT tokens should be rejected with 401 Unauthorized.

**Validates: Requirements 7.6**

### Property 28: Content Display Organization

*For any* generated content displayed in the dashboard, sections should appear in a logical order (YouTube content, then social posts, then CTAs) within card-based UI elements.

**Validates: Requirements 8.2, 8.7**

### Property 29: Database Schema Completeness

*For any* user record created, it should contain all required fields (id, email, passwordHash, plan, createdAt, updatedAt), and for any history record created, it should contain all required fields (id, userId, inputIdea, contentPackage, createdAt).

**Validates: Requirements 10.1, 10.2**

### Property 30: Cascade Deletion

*For any* user account, when deleted, all associated history records should also be deleted from the database.

**Validates: Requirements 10.3**

### Property 31: Database Error Handling

*For any* database operation that fails (connection error, constraint violation, etc.), the system should log the error and return an appropriate HTTP error response without exposing internal details.

**Validates: Requirements 10.6**

### Property 32: Error Logging

*For any* error that occurs in the application (API errors, database errors, validation errors), the system should log the error with sufficient context for debugging.

**Validates: Requirements 11.5**

### Property 33: Environment-Specific Configuration

*For any* environment (development, staging, production), the system should load configuration from environment variables appropriate to that environment.

**Validates: Requirements 11.6**

## Error Handling

### Error Categories and Responses

#### 1. Authentication Errors

**Invalid Credentials**:
```typescript
{
  error: "Invalid email or password",
  code: "AUTH_INVALID_CREDENTIALS"
}
// HTTP 401
```

**Expired Token**:
```typescript
{
  error: "Session expired. Please log in again.",
  code: "AUTH_TOKEN_EXPIRED"
}
// HTTP 401
```

**Missing Token**:
```typescript
{
  error: "Authentication required",
  code: "AUTH_REQUIRED"
}
// HTTP 401
```

#### 2. Validation Errors

**Input Too Long**:
```typescript
{
  error: "Content idea must be 2000 characters or less",
  code: "VALIDATION_INPUT_TOO_LONG",
  maxLength: 2000,
  providedLength: 2543
}
// HTTP 400
```

**Empty Input**:
```typescript
{
  error: "Content idea cannot be empty",
  code: "VALIDATION_EMPTY_INPUT"
}
// HTTP 400
```

**Invalid Email Format**:
```typescript
{
  error: "Please provide a valid email address",
  code: "VALIDATION_INVALID_EMAIL"
}
// HTTP 400
```

#### 3. Usage Limit Errors

**Free Plan Limit Reached**:
```typescript
{
  error: "You've reached your monthly limit of 5 generations",
  code: "USAGE_LIMIT_EXCEEDED",
  upgradeUrl: "/upgrade",
  currentUsage: 5,
  planLimit: 5
}
// HTTP 403
```

#### 4. AI Pipeline Errors

**OpenAI API Error**:
```typescript
{
  error: "Content generation failed. Please try again.",
  code: "AI_GENERATION_FAILED",
  retryable: true
}
// HTTP 500
// Note: Usage counter NOT incremented
```

**Timeout**:
```typescript
{
  error: "Generation took too long. Please try again with a simpler idea.",
  code: "AI_TIMEOUT",
  retryable: true
}
// HTTP 504
```

#### 5. Database Errors

**Connection Error**:
```typescript
{
  error: "Service temporarily unavailable. Please try again.",
  code: "DB_CONNECTION_ERROR"
}
// HTTP 503
// Logged with full details server-side
```

**Constraint Violation** (e.g., duplicate email):
```typescript
{
  error: "An account with this email already exists",
  code: "DB_DUPLICATE_EMAIL"
}
// HTTP 409
```

#### 6. Rate Limiting

**Too Many Requests**:
```typescript
{
  error: "Too many requests. Please wait before trying again.",
  code: "RATE_LIMIT_EXCEEDED",
  retryAfter: 60 // seconds
}
// HTTP 429
```

#### 7. Payment Errors

**Stripe Checkout Creation Failed**:
```typescript
{
  error: "Unable to process upgrade. Please try again.",
  code: "PAYMENT_CHECKOUT_FAILED"
}
// HTTP 500
```

**Invalid Webhook Signature**:
```typescript
{
  error: "Invalid webhook signature",
  code: "WEBHOOK_INVALID_SIGNATURE"
}
// HTTP 400
// Logged as potential security issue
```

### Error Handling Strategy

1. **Client-Facing Errors**: User-friendly messages without technical details
2. **Server-Side Logging**: Full error details including stack traces for debugging
3. **Retryable Errors**: Include `retryable: true` flag for transient failures
4. **Error Codes**: Consistent error codes for client-side error handling
5. **No Information Leakage**: Never expose database structure, API keys, or internal logic
6. **Graceful Degradation**: System remains functional even if non-critical features fail

### Error Recovery Patterns

**AI Generation Failure**:
1. Log full error details
2. Return user-friendly error
3. Do NOT increment usage counter
4. Allow immediate retry

**Database Connection Loss**:
1. Implement connection pooling with retry logic
2. Return 503 Service Unavailable
3. Log error for monitoring
4. Automatic reconnection on next request

**Stripe Webhook Failure**:
1. Return 200 to Stripe (prevent retries for invalid signatures)
2. Log suspicious webhook attempts
3. For valid webhooks with processing errors, return 500 (Stripe will retry)

## Testing Strategy

### Dual Testing Approach

This application requires both unit tests and property-based tests for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and integration points
- **Property tests**: Verify universal properties across all inputs using randomized testing

Both testing approaches are complementary and necessary. Unit tests catch concrete bugs in specific scenarios, while property tests verify general correctness across a wide range of inputs.

### Property-Based Testing Configuration

**Library Selection**: Use `fast-check` for JavaScript/TypeScript property-based testing

**Test Configuration**:
- Minimum 100 iterations per property test (due to randomization)
- Each property test must reference its design document property
- Tag format: `// Feature: content-execution-agent, Property {number}: {property_text}`

**Example Property Test Structure**:
```typescript
import fc from 'fast-check';

// Feature: content-execution-agent, Property 1: Authentication Round Trip
test('authentication round trip preserves credentials', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.emailAddress(),
      fc.string({ minLength: 8, maxLength: 50 }),
      async (email, password) => {
        // Create user
        const signupRes = await signup(email, password);
        expect(signupRes.success).toBe(true);
        
        // Login with same credentials
        const loginRes = await login(email, password);
        expect(loginRes.success).toBe(true);
        expect(loginRes.token).toBeDefined();
        
        // Verify token grants access
        const dashboardRes = await fetch('/api/dashboard', {
          headers: { Authorization: `Bearer ${loginRes.token}` }
        });
        expect(dashboardRes.status).toBe(200);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Unit Testing Strategy

**Focus Areas for Unit Tests**:

1. **Authentication Edge Cases**:
   - Empty email/password
   - Malformed email addresses
   - Password too short
   - SQL injection attempts in credentials

2. **Usage Limit Boundary Conditions**:
   - Exactly 5 generations (at limit)
   - 6th generation attempt (over limit)
   - Billing period boundary (last day of month)

3. **Export Functionality**:
   - Empty content package
   - Very large content (stress test)
   - Special characters in filenames
   - Markdown edge cases (nested lists, code blocks)

4. **Webhook Processing**:
   - Unknown event types
   - Malformed webhook payloads
   - Missing metadata fields

5. **Integration Tests**:
   - Full generation flow (input → AI → database → response)
   - Upgrade flow (free → checkout → webhook → pro)
   - History management (create → list → delete)

### Test Organization

```
tests/
├── unit/
│   ├── auth.test.ts
│   ├── usage.test.ts
│   ├── export.test.ts
│   └── webhooks.test.ts
├── property/
│   ├── auth.property.test.ts
│   ├── generation.property.test.ts
│   ├── usage.property.test.ts
│   └── history.property.test.ts
├── integration/
│   ├── generation-flow.test.ts
│   ├── upgrade-flow.test.ts
│   └── history-flow.test.ts
└── helpers/
    ├── fixtures.ts
    ├── generators.ts (fast-check generators)
    └── test-db.ts
```

### Test Data Generators

**Custom Generators for Property Tests**:
```typescript
// generators.ts
import fc from 'fast-check';

export const userArbitrary = fc.record({
  email: fc.emailAddress(),
  password: fc.string({ minLength: 8, maxLength: 50 }),
  plan: fc.constantFrom('free', 'pro')
});

export const contentIdeaArbitrary = fc.string({ 
  minLength: 10, 
  maxLength: 2000 
});

export const contentPackageArbitrary = fc.record({
  youtubeTitles: fc.array(fc.string(), { minLength: 5, maxLength: 10 }),
  hooks: fc.array(fc.string(), { minLength: 3, maxLength: 5 }),
  fullScript: fc.string({ minLength: 100 }),
  shortFormScripts: fc.array(fc.string(), { minLength: 3, maxLength: 5 }),
  twitterThread: fc.string(),
  linkedinPost: fc.string(),
  thumbnailIdeas: fc.array(fc.string(), { minLength: 5, maxLength: 7 }),
  ctaVariations: fc.array(fc.string(), { minLength: 5, maxLength: 7 })
});
```

### Mocking Strategy

**OpenAI API Mocking**:
- Use `nock` or `msw` to mock OpenAI responses in tests
- Create realistic mock responses for each pipeline step
- Test both success and failure scenarios

**Stripe API Mocking**:
- Mock Stripe Checkout session creation
- Simulate webhook events with valid signatures
- Test webhook signature verification with invalid signatures

**Database Mocking**:
- Use in-memory SQLite for fast unit tests
- Use test database instance for integration tests
- Reset database state between tests

### CI/CD Testing Pipeline

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run test:unit
      - run: npm run test:property
      - run: npm run test:integration
      - run: npm run test:coverage
```

### Coverage Goals

- **Unit Tests**: 80%+ code coverage
- **Property Tests**: All 33 correctness properties implemented
- **Integration Tests**: All critical user flows covered
- **E2E Tests**: Landing page, signup, login, generation, history, upgrade

---

## Implementation Notes

### Project Structure

```
content-execution-agent/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── signup/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── history/
│   │   │   └── page.tsx
│   │   └── upgrade/
│   │       └── page.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   │   └── route.ts
│   │   │   └── signup/
│   │   │       └── route.ts
│   │   ├── generate/
│   │   │   └── route.ts
│   │   ├── history/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   ├── subscription/
│   │   │   └── create-checkout/
│   │   │       └── route.ts
│   │   └── webhooks/
│   │       └── stripe/
│   │           └── route.ts
│   ├── layout.tsx
│   └── page.tsx (landing page)
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   └── Sidebar.tsx
│   ├── ContentDisplay.tsx
│   ├── GenerationForm.tsx
│   ├── HistoryList.tsx
│   ├── LoadingAnimation.tsx
│   └── UsageIndicator.tsx
├── lib/
│   ├── services/
│   │   ├── aiPipeline.ts
│   │   ├── auth.ts
│   │   ├── export.ts
│   │   └── usage.ts
│   ├── db/
│   │   ├── client.ts
│   │   ├── schema.sql
│   │   └── queries.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   └── rateLimit.ts
│   └── utils/
│       ├── jwt.ts
│       ├── validation.ts
│       └── sanitize.ts
├── tests/
│   ├── unit/
│   ├── property/
│   ├── integration/
│   └── helpers/
├── public/
├── .env.example
├── .env.local
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

### Key Implementation Considerations

1. **Next.js App Router**: Use server components where possible for better performance
2. **API Route Handlers**: Implement consistent error handling middleware
3. **Database Connection**: Use connection pooling (pg-pool or Supabase client)
4. **JWT Storage**: Use httpOnly cookies for security (not localStorage)
5. **Rate Limiting**: Implement in-memory store for development, Redis for production
6. **Streaming Responses**: Consider streaming AI responses for better UX
7. **Optimistic UI Updates**: Update UI immediately, rollback on error
8. **Loading States**: Show progress for all async operations
9. **Error Boundaries**: Implement React error boundaries for graceful failures
10. **Accessibility**: Ensure WCAG 2.1 AA compliance for all UI components

### Performance Optimization

1. **AI Pipeline**: Run parallel generation where possible (all content types simultaneously)
2. **Database Queries**: Use indexes on userId, email, createdAt
3. **Static Generation**: Pre-render landing page at build time
4. **Image Optimization**: Use Next.js Image component for any images
5. **Code Splitting**: Lazy load dashboard components
6. **Caching**: Cache user plan status in JWT payload to reduce DB queries

### Security Checklist

- [ ] All passwords hashed with bcrypt (10+ rounds)
- [ ] JWT tokens stored in httpOnly cookies
- [ ] CSRF protection enabled
- [ ] Rate limiting on all API routes
- [ ] Input validation and sanitization
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (React escapes by default, verify)
- [ ] Stripe webhook signature verification
- [ ] Environment variables never exposed to client
- [ ] HTTPS enforced in production
- [ ] Security headers configured (CSP, HSTS, etc.)

### Deployment Checklist

- [ ] Environment variables configured in Vercel
- [ ] Database migrations run on Supabase
- [ ] Stripe webhook endpoint configured
- [ ] Domain configured and SSL enabled
- [ ] Error logging configured (Sentry, LogRocket, etc.)
- [ ] Analytics configured (optional)
- [ ] Performance monitoring enabled
- [ ] Backup strategy for database
- [ ] Rate limiting configured for production scale
- [ ] CORS configured correctly

---

## Appendix: AI Prompt Templates

### System Prompt for Idea Expansion

```
You are a content strategist helping creators develop compelling content ideas.

Given a content idea, expand it into a comprehensive concept by:
1. Identifying the core value proposition
2. Suggesting 3-5 key angles or perspectives
3. Highlighting potential hooks that grab attention
4. Noting what makes this idea unique or timely

Be concise but insightful. Focus on what will resonate with audiences.

Content Idea: {userInput}
```

### System Prompt for Audience Analysis

```
You are an audience research expert.

Based on this content concept, identify:
1. Primary target audience (demographics, interests, pain points)
2. What this audience cares about most
3. Their current challenges or frustrations
4. What will make them stop scrolling and engage

Be specific and actionable.

Content Concept: {expandedIdea}
```

### System Prompt for Content Structure

```
You are a content architect.

Create a structured outline for this content including:
1. Opening hook (first 5 seconds)
2. Main points (3-5 key ideas)
3. Supporting details for each point
4. Transitions between sections
5. Strong closing/CTA

Focus on flow and engagement.

Concept: {expandedIdea}
Audience: {audienceAnalysis}
```

### System Prompt for Multi-Platform Generation

```
You are a multi-platform content creator.

Generate the following based on the content structure:

1. YouTube Titles (5-10 variations):
   - Use power words and curiosity gaps
   - 60-70 characters optimal
   - Include numbers where relevant

2. Hooks (3-5 variations):
   - First 5 seconds of video
   - Pattern interrupts
   - Questions or bold statements

3. Full YouTube Script:
   - Include timestamps
   - Conversational tone
   - Clear structure with sections
   - Natural CTAs throughout

4. Short-Form Scripts (3-5 scripts for 15-60s videos):
   - Hook → Value → CTA format
   - Platform: Instagram Reels, TikTok, YouTube Shorts
   - Punchy and fast-paced

5. Twitter/X Thread:
   - 5-10 tweets
   - Number each tweet (1/10, 2/10, etc.)
   - Hook in first tweet
   - Value in middle tweets
   - CTA in final tweet

6. LinkedIn Post:
   - Professional tone
   - Story or insight-driven
   - 1300-1500 characters
   - Include line breaks for readability

7. Thumbnail Text Ideas (5-7 options):
   - 3-5 words max
   - High contrast concepts
   - Curiosity-driven

8. CTA Variations (5-7 options):
   - Subscribe/follow CTAs
   - Comment prompts
   - Link CTAs
   - Next video suggestions

Format all output in clean markdown with clear section headings.
Be persuasive and conversion-focused. Avoid generic fluff.

Content Structure: {contentStructure}
```

---

*End of Design Document*
