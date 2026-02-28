import { NextResponse } from 'next/server';
import { requireAuth } from '@/backend/middleware/auth';
import { TwitterApi } from 'twitter-api-v2';

export async function GET(request: Request) {
  return await requireAuth(request as any, async (req) => {
    try {
      if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
        return NextResponse.json({ error: 'Twitter Developer credentials not configured' }, { status: 500 });
      }

      const client = new TwitterApi({
        clientId: process.env.TWITTER_CLIENT_ID,
        clientSecret: process.env.TWITTER_CLIENT_SECRET,
      });

      const isLocal = process.env.NODE_ENV === 'development';
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (isLocal ? 'http://localhost:3000' : 'https://yourdomain.com');
      const callbackUrl = `${baseUrl}/api/auth/twitter/callback`;
      
      const { url, codeVerifier, state } = client.generateOAuth2AuthLink(callbackUrl, {
        scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
      });

      const response = NextResponse.redirect(url);
      
      const cookieOpts = { 
        httpOnly: true, 
        secure: !isLocal, 
        maxAge: 3600, 
        path: '/',
        sameSite: 'lax' as const,
      };

      // Store state and verifier in HttpOnly cookies to validate the callback
      response.cookies.set('twitter_oauth_state', state, cookieOpts);
      response.cookies.set('twitter_oauth_verifier', codeVerifier, cookieOpts);
      
      // Store the userId so the callback can associate the token with the right user
      // WITHOUT relying on the JWT auth cookie (which browsers may strip on cross-site redirects)
      response.cookies.set('twitter_oauth_userid', String(req.user!.userId), cookieOpts);

      return response;
    } catch (error: any) {
      console.error('Twitter OAuth Init Error:', error);
      return NextResponse.json({ error: 'Failed to initialize Twitter login' }, { status: 500 });
    }
  });
}
