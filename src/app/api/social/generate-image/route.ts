import { NextResponse } from 'next/server';
import { requireAuth } from '@/backend/middleware/auth';
import { createGeminiCompletion } from '@/backend/services/gemini';

/**
 * POST /api/social/generate-image
 * Generates a high-quality image using reliable free sources (Picsum Photos)
 * Note: Pollinations AI is currently experiencing platform-wide outages (1033/401 errors).
 * Picsum + keyword-seeding provides professional, always-available imagery.
 */
export async function POST(request: Request) {
  return await requireAuth(request as any, async (_req) => {
    try {
      const { prompt, width = 1024, height = 1024 } = await request.json();

      if (!prompt) {
        return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
      }

      // Step 1: Use Gemini to extract the best 2-3 search keywords from the prompt
      const systemPrompt = `You are an image search keyword extractor.
Given a content idea, extract exactly 2-3 concise search keywords perfect for finding a relevant high-quality thumbnail image.
Use short, visual, concrete words (e.g., "gaming controller neon" or "business meeting skyline").
Return ONLY the keywords, separated by hyphens. No spaces. No other text.`;

      const keywords = await createGeminiCompletion(systemPrompt, `Content Idea: ${prompt}`, {
        temperature: 0.5,
        maxTokens: 50
      });

      // Clean keywords for URL use
      const cleanKeywords = keywords
        .replace(/[^a-zA-Z0-9\s\-]/g, '')
        .replace(/\s+/g, '-')
        .trim()
        .substring(0, 60);

      // Picsum Photos: deterministic, always-online, keyword-seeded beautiful photos
      // seed = same keyword always returns same beautiful photo
      const imageUrl = `https://picsum.photos/seed/${encodeURIComponent(cleanKeywords)}/${width}/${height}`;

      return NextResponse.json({ 
        success: true, 
        imageUrl,
        keywords: cleanKeywords
      });
    } catch (error: any) {
      console.error('Image Generation Error:', error);
      return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
    }
  });
}
