import { NextResponse } from 'next/server';
import { requireAuth } from '@/backend/middleware/auth';

/**
 * GET /api/social/download-image?url=...
 * Proxies an image download to avoid CORS and force proper file saving.
 */
export async function GET(request: Request) {
  return await requireAuth(request as any, async (_req) => {
    try {
      const { searchParams } = new URL(request.url);
      const imageUrl = searchParams.get('url');

      if (!imageUrl) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
      }

      // Security: Only allow pollinations or Lexica URLs
      if (!imageUrl.includes('pollinations.ai') && !imageUrl.includes('lexica.art')) {
         return NextResponse.json({ error: 'Invalid image source' }, { status: 403 });
      }

      // Advanced Browser Headers to bypass bot detection
      const browserHeaders = {
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site'
      };

      const tryFetch = async (url: string) => {
        try {
          // If it's a Lexica SEARCH url, we need to get the first image result first
          if (url.includes('lexica.art/api')) {
            const lexicaRes = await fetch(url);
            if (!lexicaRes.ok) return null;
            const data = await lexicaRes.json();
            if (!data.images || data.images.length === 0) return null;
            url = data.images[0].src; // Use the first high-quality result
          }

          const response = await fetch(url, { 
            headers: browserHeaders,
            signal: AbortSignal.timeout(20000)
          });

          if (response.ok) {
            const contentType = response.headers.get('Content-Type');
            if (contentType && contentType.startsWith('image/')) {
              return response;
            }
          }
          return null;
        } catch (e) {
          console.error(`Fetch failed for ${url}:`, e);
          return null;
        }
      };

      let finalResponse = await tryFetch(imageUrl);

      // FALLBACK 1: Try swapping seed on primary if it failed
      if (!finalResponse && imageUrl.includes('pollinations.ai')) {
        const urlObj = new URL(imageUrl);
        urlObj.searchParams.set('seed', Math.floor(Math.random() * 1000000).toString());
        finalResponse = await tryFetch(urlObj.toString());
      }

      // FALLBACK 2: Try Lexica search if primary totally failed
      if (!finalResponse) {
        console.log('Main providers failed. Falling back to Lexica search.');
        const prompt = imageUrl.split('/').pop()?.split('?')[0] || 'beautiful thumbnail';
        const lexicaFallbackUrl = `https://lexica.art/api/v1/search?q=${prompt}`;
        finalResponse = await tryFetch(lexicaFallbackUrl);
      }

      if (!finalResponse) {
        return NextResponse.json({ 
          error: 'The AI generation servers are experiencing a total outage. Please try a different idea or check back in 10 minutes.' 
        }, { status: 502 });
      }

      const blob = await finalResponse.blob();
      const buffer = Buffer.from(await blob.arrayBuffer());

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': finalResponse.headers.get('Content-Type') || 'image/jpeg',
          'Content-Disposition': `attachment; filename="ai-generated-image-${Date.now()}.jpg"`,
          'Cache-Control': 'no-cache',
        },
      });

    } catch (error: any) {
      console.error('Final Proxy Error:', error);
      return NextResponse.json({ error: 'System error during final fallback proxy' }, { status: 500 });
    }
  });
}
