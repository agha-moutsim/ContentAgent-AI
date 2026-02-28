// Core type definitions for the Content Execution Agent

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name?: string;
  avatarUrl?: string;
  plan: 'free' | 'pro';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HistoryRecord {
  id: string;
  userId: string;
  inputIdea: string;
  contentPackage: ContentPackage;
  createdAt: Date;
}

export interface ContentPackage {
  youtubeTitles: string[];
  hooks: string[];
  fullScript: string;
  shortFormScripts: string[];
  twitterThread: string;
  linkedinPost: string;
  thumbnailIdeas: string[];
  ctaVariations: string[];
}

export interface JWTPayload {
  userId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  plan: 'free' | 'pro';
  iat: number;
  exp: number;
}

export interface StripeWebhookEvent {
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

export interface APIError {
  error: string;
  code: string;
  [key: string]: any;
}

export interface SignupRequest {
  email: string;
  password: string;
}

export interface SignupResponse {
  success: boolean;
  token?: string;
  error?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    email: string;
    plan: 'free' | 'pro';
    usageCount: number;
  };
  error?: string;
}

export interface GenerateRequest {
  idea: string;
}

export interface GenerateResponse {
  success: boolean;
  content?: ContentPackage;
  error?: string;
  upgradeRequired?: boolean;
}

export interface CheckoutRequest {
  priceId: string;
}

export interface CheckoutResponse {
  url: string;
}

export interface HistoryResponse {
  records: HistoryRecord[];
}
