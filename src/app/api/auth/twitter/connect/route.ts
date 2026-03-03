import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/backend/utils/jwt';
import { TwitterApi } from 'twitter-api-v2';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Read the JWT token directly from next/headers cookies
    // This is necessary because this route is accessed via browser navigation (not fetch),
    // so the localStorage Bearer token CANNOT be sent - only the HttpOnly cookie is available
    const cookieStore = cookies();
    let token = cookieStore.get('token')?.value;

    if (!token) {
      const reqUrl = new URL(request.url);
      token = reqUrl.searchParams.get('token') || undefined;
    }

    if (!token) {
      const reqUrl = new URL(request.url);
      const baseUrl = `${reqUrl.protocol}//${reqUrl.host}`;
      return NextResponse.redirect(`${baseUrl}/login`);
    }

    let user: any;
    try {
      user = verifyToken(token);
    } catch {
      const reqUrl = new URL(request.url);
      const baseUrl = `${reqUrl.protocol}//${reqUrl.host}`;
      return NextResponse.redirect(`${baseUrl}/login`);
    }

    if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
      return NextResponse.json({ error: 'Twitter Developer credentials not configured' }, { status: 500 });
    }

    const client = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
    });

    const isLocal = process.env.NODE_ENV === 'development';
    
    // Dynamically derive the base URL from the incoming request to work on any domain 
    const reqUrl = new URL(request.url);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${reqUrl.protocol}//${reqUrl.host}`;
    const finalBaseUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
    
    const callbackUrl = `${finalBaseUrl}/api/auth/twitter/callback`;
    
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
    response.cookies.set('twitter_oauth_userid', String(user.userId), cookieOpts);

    return response;
  } catch (error: any) {
    console.error('Twitter OAuth Init Error:', error);
    return NextResponse.json({ error: 'Failed to initialize Twitter login' }, { status: 500 });
  }
}
