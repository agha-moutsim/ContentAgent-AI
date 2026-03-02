import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { scrapeUrl } from '@/backend/services/urlScraper';
import { requireAuth } from '@/backend/middleware/auth';

/**
 * POST /api/scrape
 * Accepts a { url } body and returns scraped { title, content, type }
 * Protected by authentication middleware.
 */
export async function POST(request: Request) {
  return await requireAuth(request as any, async (_req) => {
    try {
      const { url } = await request.json();

      if (!url || typeof url !== 'string' || url.trim() === '') {
        return NextResponse.json(
          { error: 'A valid URL is required.' },
          { status: 400 }
        );
      }

      const scraped = await scrapeUrl(url.trim());

      return NextResponse.json({
        title: scraped.title,
        content: scraped.content,
        type: scraped.type,
        url: scraped.url,
      });
    } catch (error: any) {
      console.error('Scrape error:', error.message);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch content from the provided URL.' },
        { status: 422 }
      );
    }
  });
}
