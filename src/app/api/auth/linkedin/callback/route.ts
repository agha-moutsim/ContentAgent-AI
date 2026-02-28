import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/backend/db/client';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    const storedState = request.cookies.get('linkedin_oauth_state')?.value;
    const storedUserId = request.cookies.get('linkedin_oauth_userid')?.value;

    const isLocal = process.env.NODE_ENV === 'development';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (isLocal ? 'http://localhost:3000' : 'https://yourdomain.com');
    const settingsUrl = `${baseUrl}/dashboard/settings`;

    if (!code || !state || !storedState || !storedUserId) {
      console.error('LinkedIn Auth: Missing code, state, or userId cookies');
      return NextResponse.redirect(`${settingsUrl}?error=session_expired`);
    }

    if (state !== storedState) {
      console.error('LinkedIn Auth: State mismatch');
      return NextResponse.redirect(`${settingsUrl}?error=invalid_state`);
    }

    if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
      throw new Error('LinkedIn credentials missing from environment');
    }

    const callbackUrl = `${baseUrl}/api/auth/linkedin/callback`;

    // Exchange code for access token
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: callbackUrl,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error('LinkedIn token exchange failed:', errBody);
      throw new Error('Failed to exchange LinkedIn authorization code for token');
    }

    const tokenData = await tokenRes.json();
    const { access_token, expires_in } = tokenData;

    // Use the OpenID Connect userinfo endpoint to get the user's profile
    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!profileRes.ok) {
      const errBody = await profileRes.text();
      console.error('LinkedIn profile fetch failed:', errBody);
      throw new Error('Failed to fetch LinkedIn profile');
    }

    const profile = await profileRes.json();
    const linkedinUsername = profile.name || profile.email || 'Unknown';
    const linkedinId = profile.sub;

    const platformsPatch = {
      linkedin: {
        accessToken: access_token,
        expiresIn: expires_in,
        username: linkedinUsername,
        id: linkedinId,
        connectedAt: new Date().toISOString(),
      }
    };

    await query(`
      UPDATE users 
      SET integrated_platforms = COALESCE(integrated_platforms, '{}'::jsonb) || $1::jsonb
      WHERE id = $2
    `, [JSON.stringify(platformsPatch), storedUserId]);

    const response = NextResponse.redirect(`${settingsUrl}?success=linkedin_connected&username=${encodeURIComponent(linkedinUsername)}`);

    response.cookies.delete('linkedin_oauth_state');
    response.cookies.delete('linkedin_oauth_userid');

    return response;
  } catch (error: any) {
    console.error('LinkedIn OAuth Callback Error:', error);
    const isLocal = process.env.NODE_ENV === 'development';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (isLocal ? 'http://localhost:3000' : 'https://yourdomain.com');
    return NextResponse.redirect(`${baseUrl}/dashboard/settings?error=linkedin_auth_failed`);
  }
}
