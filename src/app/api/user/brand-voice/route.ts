import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { requireAuth } from '@/backend/middleware/auth';
import { query } from '@/backend/db/client';

export async function POST(request: Request) {
  return await requireAuth(request as any, async (req) => {
    try {
      const { brandVoice } = await request.json();

      await query(
        'UPDATE users SET brand_voice = $1, updated_at = NOW() WHERE id = $2',
        [brandVoice, req.user!.userId]
      );

      return NextResponse.json({ success: true });
    } catch (error: any) {
      console.error('Failed to save brand voice:', error);
      return NextResponse.json(
        { error: 'Failed to save brand voice' },
        { status: 500 }
      );
    }
  });
}
