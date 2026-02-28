import { NextResponse } from 'next/server';
import { requireAuth } from '@/backend/middleware/auth';
import { TwitterApi } from 'twitter-api-v2';
import { queryOne, query } from '@/backend/db/client';

// ────────────────────────────────────────────────────
// Twitter publishing
// ────────────────────────────────────────────────────
async function publishToTwitter(userId: number, tweets: string[]): Promise<string> {
  const userRes = await queryOne('SELECT integrated_platforms FROM users WHERE id = $1', [userId]);
  const platforms = userRes?.integrated_platforms || {};
  const twitterCreds = platforms.twitter;

  if (!twitterCreds?.accessToken) {
    throw new Error('Twitter account not connected. Please connect in Settings.');
  }

  const postThread = async (accessToken: string) => {
    const client = new TwitterApi(accessToken);
    return await client.v2.tweetThread(tweets.map(t => t.trim()).filter(t => t.length > 0));
  };

  try {
    const result = await postThread(twitterCreds.accessToken);
    return `https://twitter.com/user/status/${result[0].data.id}`;
  } catch (err: any) {
    // Handle token expiry
    if (err.code === 401 && twitterCreds.refreshToken && process.env.TWITTER_CLIENT_ID) {
      const authClient = new TwitterApi({
        clientId: process.env.TWITTER_CLIENT_ID,
        clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      });
      const { client: refreshedClient, accessToken, refreshToken: newRefreshToken, expiresIn } = await authClient.refreshOAuth2Token(twitterCreds.refreshToken);
      
      platforms.twitter = { ...platforms.twitter, accessToken, refreshToken: newRefreshToken, expiresIn };
      await query(`UPDATE users SET integrated_platforms = $1::jsonb WHERE id = $2`, [JSON.stringify(platforms), userId]);

      const refreshedTweets = tweets.map(t => t.trim()).filter(t => t.length > 0);
      const result = await refreshedClient.v2.tweetThread(refreshedTweets);
      return `https://twitter.com/user/status/${result[0].data.id}`;
    }
    throw err;
  }
}

// ────────────────────────────────────────────────────
// LinkedIn publishing
// ────────────────────────────────────────────────────
async function publishToLinkedIn(userId: number, content: string): Promise<string> {
  const userRes = await queryOne('SELECT integrated_platforms FROM users WHERE id = $1', [userId]);
  const platforms = userRes?.integrated_platforms || {};
  const linkedinCreds = platforms.linkedin;

  if (!linkedinCreds?.accessToken) {
    throw new Error('LinkedIn account not connected. Please connect in Settings.');
  }

  // Get the user's LinkedIn URN (person ID)
  const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${linkedinCreds.accessToken}` },
  });

  if (!profileRes.ok) {
    const errText = await profileRes.text();
    if (profileRes.status === 401) {
      throw new Error('LinkedIn token expired. Please reconnect your LinkedIn account in Settings.');
    }
    throw new Error(`LinkedIn profile fetch failed: ${errText}`);
  }

  const profile = await profileRes.json();
  const authorUrn = `urn:li:person:${profile.sub}`;

  // Post the content as a LinkedIn share
  const postRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${linkedinCreds.accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: content },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }),
  });

  if (!postRes.ok) {
    const errBody = await postRes.text();
    throw new Error(`LinkedIn post failed: ${errBody}`);
  }

  // LinkedIn returns the post ID in the X-RestLi-Id header
  const postId = postRes.headers.get('x-restli-id') || postRes.headers.get('X-RestLi-Id');
  return postId ? `https://www.linkedin.com/feed/update/${postId}` : 'published';
}

// ────────────────────────────────────────────────────
// Main handler
// ────────────────────────────────────────────────────
export async function POST(request: Request) {
  return await requireAuth(request as any, async (req) => {
    try {
      const { platform, content } = await request.json();

      if (!platform || !content || !Array.isArray(content) || content.length === 0) {
        return NextResponse.json({ error: 'Valid platform and content array required' }, { status: 400 });
      }

      if (!['twitter', 'linkedin'].includes(platform)) {
        return NextResponse.json({ error: 'Supported platforms: twitter, linkedin' }, { status: 400 });
      }

      let url: string;

      if (platform === 'twitter') {
        url = await publishToTwitter(Number(req.user!.userId), content);
      } else {
        // LinkedIn expects a single string; join the array with newlines
        url = await publishToLinkedIn(Number(req.user!.userId), content.join('\n\n'));
      }

      return NextResponse.json({ success: true, url });
    } catch (error: any) {
      console.error('Publishing Error:', error);
      const message = error.data?.detail || error.message || 'Failed to publish content';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
