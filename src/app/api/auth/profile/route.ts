import { NextResponse } from 'next/server';
import { requireAuth } from '@/backend/middleware/auth';
import { queryOne } from '@/backend/db/client';

/**
 * GET /api/auth/profile
 * Returns the current authenticated user's profile from the database
 */
export async function GET(request: Request) {
  return await requireAuth(request as any, async (req) => {
    
    // Fetch latest data from database
    const user = await queryOne(
      'SELECT email, plan, brand_voice, integrated_platforms FROM users WHERE id = $1', 
      [req.user!.userId]
    );

    return NextResponse.json({
      user: {
        email: user?.email || req.user!.email,
        plan: user?.plan || req.user!.plan,
        name: req.user?.name,
        brandVoice: user?.brand_voice || null,
        twitterConnected: !!user?.integrated_platforms?.twitter,
        twitterUsername: user?.integrated_platforms?.twitter?.username || null,
        linkedinConnected: !!user?.integrated_platforms?.linkedin,
        linkedinUsername: user?.integrated_platforms?.linkedin?.username || null,
      }
    });
  });
}
