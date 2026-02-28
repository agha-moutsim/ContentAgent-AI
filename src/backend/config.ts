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
