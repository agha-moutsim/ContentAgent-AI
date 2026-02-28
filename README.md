# Content Execution Agent

A production-ready SaaS application that transforms a single content idea into comprehensive multi-platform content packages.

## Features

- 🤖 AI-powered content generation using OpenAI
- 📱 Multi-platform output (YouTube, Twitter/X, LinkedIn, Shorts/Reels)
- 🔐 Secure authentication with JWT
- 💳 Stripe subscription integration
- 📊 Usage tracking and plan enforcement
- 📝 Content history management
- 📤 Export to .txt and .doc formats

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL via Supabase
- **Authentication**: JWT with bcrypt
- **AI**: OpenAI API (GPT-4)
- **Payments**: Stripe
- **Testing**: Vitest with fast-check for property-based testing

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (or Supabase account)
- OpenAI API key
- Stripe account

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env.local` and fill in your environment variables:

```bash
cp .env.example .env.local
```

4. Run database migrations (see `lib/db/schema.sql`)

5. Start the development server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

See `.env.example` for all required environment variables.

## Testing

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run property-based tests
npm run test:property

# Run integration tests
npm run test:integration

# Generate coverage report
npm run test:coverage
```

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Protected dashboard pages
│   └── api/               # API routes
├── components/            # React components
│   └── ui/               # Reusable UI components
├── lib/                   # Core business logic
│   ├── db/               # Database client and queries
│   ├── middleware/       # API middleware
│   ├── services/         # Business logic services
│   └── utils/            # Utility functions
└── tests/                # Test files
    ├── unit/             # Unit tests
    ├── property/         # Property-based tests
    ├── integration/      # Integration tests
    └── helpers/          # Test utilities
```

## Deployment

This application is designed to be deployed on Vercel with Supabase for the database.

1. Push your code to GitHub
2. Import the project in Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy

## License

MIT
