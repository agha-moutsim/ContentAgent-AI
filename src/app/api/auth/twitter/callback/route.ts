import { NextResponse, NextRequest } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { query } from '@/backend/db/client';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const state = url.searchParams.get('state');
    const code = url.searchParams.get('code');

    // Read the three cookies we set in the /connect step
    const storedState = request.cookies.get('twitter_oauth_state')?.value;
    const storedVerifier = request.cookies.get('twitter_oauth_verifier')?.value;
    const storedUserId = request.cookies.get('twitter_oauth_userid')?.value;

    const isLocal = process.env.NODE_ENV === 'development';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (isLocal ? 'http://localhost:3000' : 'https://yourdomain.com');
    const settingsUrl = `${baseUrl}/dashboard/settings`;

    if (!state || !storedState || !code || !storedVerifier || !storedUserId) {
      console.error('Twitter Auth: Missing state, verifier, or userId cookies/params');
      console.error({ state, storedState: !!storedState, code: !!code, storedVerifier: !!storedVerifier, storedUserId });
      return NextResponse.redirect(`${settingsUrl}?error=session_expired`);
    }

    if (state !== storedState) {
      console.error('Twitter Auth: State mismatch');
      return NextResponse.redirect(`${settingsUrl}?error=invalid_state`);
    }

    if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
      throw new Error('Twitter credentials missing from environment');
    }

    const client = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
    });

    const callbackUrl = `${baseUrl}/api/auth/twitter/callback`;

    // Exchange the authorization code for tokens
    const { client: loggedClient, accessToken, refreshToken, expiresIn } = await client.loginWithOAuth2({
      code,
      codeVerifier: storedVerifier,
      redirectUri: callbackUrl,
    });

    // Get the authenticated user's Twitter profile
    const { data: twitterUser } = await loggedClient.v2.me();

    const platformsPatch = {
      twitter: {
        accessToken,
        refreshToken,
        expiresIn,
        username: twitterUser.username,
        id: twitterUser.id,
        connectedAt: new Date().toISOString()
      }
    };

    // Save tokens to the database using the userId from the cookie
    await query(`
      UPDATE users 
      SET integrated_platforms = COALESCE(integrated_platforms, '{}'::jsonb) || $1::jsonb
      WHERE id = $2
    `, [JSON.stringify(platformsPatch), storedUserId]);

    // Redirect to settings page with a success message
    const response = NextResponse.redirect(`${settingsUrl}?success=twitter_connected&username=${twitterUser.username}`);
    
    // Clean up all the temporary OAuth cookies
    response.cookies.delete('twitter_oauth_state');
    response.cookies.delete('twitter_oauth_verifier');
    response.cookies.delete('twitter_oauth_userid');

    return response;
  } catch (error: any) {
    console.error('Twitter OAuth Callback Error:', error);
    const isLocal = process.env.NODE_ENV === 'development';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (isLocal ? 'http://localhost:3000' : 'https://yourdomain.com');
    return NextResponse.redirect(`${baseUrl}/dashboard/settings?error=twitter_auth_failed`);
  }
}
