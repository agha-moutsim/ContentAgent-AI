import { NextResponse } from 'next/server';
import { requireAuth } from '@/backend/middleware/auth';
import { createGeminiCompletion } from '@/backend/services/gemini';

/**
 * POST /api/social/hashtags
 * Generates platform-specific hashtags using Gemini AI
 */
export async function POST(request: Request) {
  return await requireAuth(request as any, async (_req) => {
    try {
      const { idea, twitterThread, linkedinPost } = await request.json();

      if (!idea) {
        return NextResponse.json({ error: 'Idea is required' }, { status: 400 });
      }

      const systemPrompt = `You are an expert social media hashtag strategist with deep knowledge of trending topics.
Given a content idea and platform-specific posts, generate highly relevant hashtags for each platform.

Rules:
- Twitter: 3-5 hashtags, concise, trending-style (e.g. #AITools #ContentCreator)
- LinkedIn: 4-6 hashtags, professional, industry-focused (e.g. #DigitalMarketing #Leadership)  
- Instagram: 8-12 hashtags, mix of niche and broad, discovery-focused
- Each hashtag must start with #
- Separate hashtags with spaces
- No quotes or extra formatting

Return EXACTLY this JSON structure:
{
  "twitter": "#Tag1 #Tag2 #Tag3 #Tag4 #Tag5",
  "linkedin": "#Tag1 #Tag2 #Tag3 #Tag4 #Tag5 #Tag6",
  "instagram": "#Tag1 #Tag2 #Tag3 #Tag4 #Tag5 #Tag6 #Tag7 #Tag8 #Tag9 #Tag10"
}`;

      const context = `
Content Idea: ${idea}
${twitterThread ? `Twitter Thread: ${twitterThread.substring(0, 300)}` : ''}
${linkedinPost ? `LinkedIn Post: ${linkedinPost.substring(0, 300)}` : ''}
`;

      const response = await createGeminiCompletion(systemPrompt, context, {
        temperature: 0.7,
        maxTokens: 400,
      });

      // Parse the JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from AI');
      }

      const hashtags = JSON.parse(jsonMatch[0]);

      return NextResponse.json({
        success: true,
        hashtags: {
          twitter: hashtags.twitter || '',
          linkedin: hashtags.linkedin || '',
          instagram: hashtags.instagram || '',
        },
      });
    } catch (error: any) {
      console.error('Hashtag Generation Error:', error);
      return NextResponse.json({ error: 'Failed to generate hashtags' }, { status: 500 });
    }
  });
}
