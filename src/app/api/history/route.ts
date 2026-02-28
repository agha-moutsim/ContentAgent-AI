import { NextResponse } from 'next/server';
import { historyService } from '@/backend/services/history';
import { requireAuth } from '@/backend/middleware/auth';

/**
 * GET /api/history
 * Retrieves all history records for the authenticated user
 */
export async function GET(request: Request) {
  return await requireAuth(request as any, async (req) => {
    try {
      const records = await historyService.getUserHistory(req.user!.userId);
      return NextResponse.json({ records });
    } catch (error: any) {
      console.error('Fetch history error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch history' },
        { status: 500 }
      );
    }
  });
}
