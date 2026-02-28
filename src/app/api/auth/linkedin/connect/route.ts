import { NextResponse } from 'next/server';
import { requireAuth } from '@/backend/middleware/auth';

export async function GET(request: Request) {
  return await requireAuth(request as any, async (req) => {
    try {
      if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
        return NextResponse.json({ error: 'LinkedIn Developer credentials not configured. Please add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET to your .env.local' }, { status: 500 });
      }

      const isLocal = process.env.NODE_ENV === 'development';
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (isLocal ? 'http://localhost:3000' : 'https://yourdomain.com');
      const callbackUrl = `${baseUrl}/api/auth/linkedin/callback`;

      // Generate a random state for CSRF protection
      const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      // LinkedIn OAuth 2.0 authorization URL
      const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', process.env.LINKEDIN_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', callbackUrl);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('scope', 'openid profile email w_member_social');

      const response = NextResponse.redirect(authUrl.toString());

      const cookieOpts = {
        httpOnly: true,
        secure: !isLocal,
        maxAge: 3600,
        path: '/',
        sameSite: 'lax' as const,
      };

      response.cookies.set('linkedin_oauth_state', state, cookieOpts);
      response.cookies.set('linkedin_oauth_userid', String(req.user!.userId), cookieOpts);

      return response;
    } catch (error: any) {
      console.error('LinkedIn OAuth Init Error:', error);
      return NextResponse.json({ error: 'Failed to initialize LinkedIn login' }, { status: 500 });
    }
  });
}
