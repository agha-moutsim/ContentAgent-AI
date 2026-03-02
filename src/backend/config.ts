// Environment configuration module
// Validates and provides type-safe access to environment variables

interface Config {
  database: {
    url: string;
  };
  auth: {
    jwtSecret: string;
  };
  openai: {
    apiKey: string;
  };
  stripe: {
    secretKey: string;
    webhookSecret: string;
    priceIdPro: string;
  };
  gemini: {
    apiKey: string;
  };
  app: {
    url: string;
    nodeEnv: string;
  };
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    // During build/static analysis, don't crash if env vars are missing
    if (process.env.NODE_ENV === 'production' && !process.env.NETLIFY && !process.env.VERCEL) {
       // On local production builds we still want to know if something is missing
       // but for Netlify/Vercel build environments, we should be lenient
    }
    
    // Check if we are in a build environment (Next.js build or CI)
    const isBuild = process.env.NEXT_PHASE === 'phase-production-build' || process.env.CI === 'true';
    
    if (isBuild) {
      console.warn(`[Build Warning] Missing environment variable: ${key}. Using empty string.`);
      return '';
    }

    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config: Config = {
  database: {
    url: getEnvVar('DATABASE_URL'),
  },
  auth: {
    jwtSecret: getEnvVar('JWT_SECRET'),
  },
  openai: {
    apiKey: getEnvVar('OPENAI_API_KEY'),
  },
  stripe: {
    secretKey: getEnvVar('STRIPE_SECRET_KEY'),
    webhookSecret: getEnvVar('STRIPE_WEBHOOK_SECRET'),
    priceIdPro: getEnvVar('STRIPE_PRICE_ID_PRO'),
  },
  gemini: {
    apiKey: getEnvVar('GEMINI_API_KEY'),
  },
  app: {
    url: getEnvVar('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
    nodeEnv: getEnvVar('NODE_ENV', 'development'),
  },
};

// Validate configuration on module load (only in non-test environments)
/*
if (process.env.NODE_ENV !== 'test') {
  try {
    // Access config to trigger validation
    const _ = config.database.url;
  } catch (error) {
    console.error('Configuration validation failed:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}
*/
