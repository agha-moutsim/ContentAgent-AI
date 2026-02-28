import { NextResponse } from 'next/server';
import { historyService } from '@/backend/services/history';
import { requireAuth } from '@/backend/middleware/auth';

/**
 * GET /api/history/[id] - Retrieves a specific record
 * DELETE /api/history/[id] - Deletes a specific record
 */

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  return await requireAuth(request as any, async (req) => {
    try {
      const record = await historyService.getRecordById(params.id, req.user!.userId);
      
      if (!record) {
        return NextResponse.json(
          { error: 'Record not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(record);
    } catch (error: any) {
      console.error('Fetch record error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch record' },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  return await requireAuth(request as any, async (req) => {
    try {
      const success = await historyService.deleteRecord(params.id, req.user!.userId);
      
      if (!success) {
        return NextResponse.json(
          { error: 'Record not found or already deleted' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ success: true });
    } catch (error: any) {
      console.error('Delete record error:', error);
      return NextResponse.json(
        { error: 'Failed to delete record' },
        { status: 500 }
      );
    }
  });
}
