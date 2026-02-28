import { NextResponse } from 'next/server';
import { aiPipelineService } from '@/backend/services/aiPipeline';
import { historyService } from '@/backend/services/history';
import { requireAuth } from '@/backend/middleware/auth';
import { queryOne } from '@/backend/db/client';

export async function POST(request: Request) {
  return await requireAuth(request as any, async (req) => {
    try {
      const { idea, sourceContent, tone = 'balanced' } = await req.json();

      if (!idea || typeof idea !== 'string') {
        return NextResponse.json(
          { error: 'Invalid idea provided' },
          { status: 400 }
        );
      }

      // Check user plan and usage (Rolling 24-hour window)
      const user = req.user!;
      if (user.plan === 'free') {
        const { count, resetTime } = await historyService.getUsageStats(user.userId, 3);
        
        if (count >= 3) {
          return NextResponse.json(
            { 
              error: 'Usage limit reached', 
              upgradeRequired: true,
              resetTime: resetTime?.toISOString(),
              message: `You have used your 3 free generations. Limit resets on ${resetTime?.toLocaleString()}. Upgrade to Pro for unlimited access!` 
            },
            { status: 402 }
          );
        }
      }

      // Fetch user's custom brand voice
      const userRes = await queryOne('SELECT brand_voice FROM users WHERE id = $1', [user.userId]);
      const brandVoice = userRes?.brand_voice;

      // Generate Content (pass sourceContent if it came from a URL)
      const content = await aiPipelineService.generate(idea, undefined, sourceContent, brandVoice, tone);
      
      // Save to History
      try {
        await historyService.saveRecord(req.user!.userId, idea, content);
      } catch (dbError) {
        // We don't fail the whole request if saving history fails, but we log it
        console.error('Failed to save history:', dbError);
      }
      
      return NextResponse.json(content);

    } catch (error: any) {
      // Better logging for Native Error objects
      const errorDetails = {
        message: error.message,
        stack: error.stack,
        ...(error.response ? { responseData: error.response.data } : {}),
        ...error
      };
      
      console.error('Generation Error Detail:', errorDetails);
      
      // Distinguish between Provider Quota and regular errors (Fix for 'generate' matching 'rate')
      const errorStr = error.message?.toLowerCase() || '';
      const isProviderQuota = 
        errorStr.includes('quota') || 
        errorStr.includes('429') || 
        /\brate limit\b/.test(errorStr) ||
        errorStr.includes('resource_exhausted');

      if (isProviderQuota) {
        return NextResponse.json(
          { 
            error: 'AI Provider Quota Exceeded',
            isProviderQuota: true,
            message: 'The AI Service (Gemini) is temporarily busy or at its global limit for this server. This affects all accounts. Please try again in 5-10 minutes.' 
          },
          { status: 429 } // Too Many Requests
        );
      }
      
      return NextResponse.json(
        { error: error.message || 'Failed to generate content' },
        { status: 500 }
      );
    }
  });
}
