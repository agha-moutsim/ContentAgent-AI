import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/backend/utils/jwt';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Read JWT token directly from next/headers cookies
    // This route is accessed via browser navigation (not fetch), so localStorage Bearer token
    // cannot be sent - only the HttpOnly cookie is available
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Authentication required', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    let user: any;
    try {
      user = verifyToken(token);
    } catch {
      return NextResponse.json({ error: 'Invalid session. Please log in again.' }, { status: 401 });
    }

    if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
      return NextResponse.json({ error: 'LinkedIn Developer credentials not configured. Please add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET to your .env.local' }, { status: 500 });
    }

    // Dynamically derive base URL from the incoming request
    const reqUrl = new URL(request.url);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${reqUrl.protocol}//${reqUrl.host}`;
    const finalBaseUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;

    const callbackUrl = `${finalBaseUrl}/api/auth/linkedin/callback`;

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

    const isLocal = process.env.NODE_ENV === 'development';
    const cookieOpts = {
      httpOnly: true,
      secure: !isLocal,
      maxAge: 3600,
      path: '/',
      sameSite: 'lax' as const,
    };

    response.cookies.set('linkedin_oauth_state', state, cookieOpts);
    response.cookies.set('linkedin_oauth_userid', String(user.userId), cookieOpts);

    return response;
  } catch (error: any) {
    console.error('LinkedIn OAuth Init Error:', error);
    return NextResponse.json({ error: 'Failed to initialize LinkedIn login' }, { status: 500 });
  }
}
