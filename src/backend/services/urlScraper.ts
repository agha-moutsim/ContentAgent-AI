/**
 * URL Scraper Service
 * 
 * Extracts readable content from URLs for the "URL to Content" feature.
 * Supports:
 * - Blog posts / News articles (any public webpage)
 * - YouTube video URLs (title + description via oEmbed API)
 */

export interface ScrapedContent {
  title: string;
  content: string;
  type: 'article' | 'youtube' | 'webpage';
  url: string;
}

/**
 * Detect if a URL is a YouTube video link
 */
function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com\/watch|youtu\.be\/)/.test(url);
}

/**
 * Extract YouTube video ID from URL
 */
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&\s]+)/,
    /youtu\.be\/([^?\s]+)/,
    /youtube\.com\/embed\/([^?\s]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Fetch YouTube video metadata via public oEmbed API (no API key needed)
 */
async function scrapeYouTube(url: string): Promise<ScrapedContent> {
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    throw new Error('Could not extract YouTube video ID from URL.');
  }

  const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  const response = await fetch(oEmbedUrl);

  if (!response.ok) {
    throw new Error('Could not fetch YouTube video info. The video may be private or unavailable.');
  }

  const data = await response.json();
  const title = data.title || 'YouTube Video';
  const author = data.author_name || 'Unknown Channel';

  return {
    title,
    content: `YouTube Video: "${title}" by ${author}.\nVideo URL: ${url}\nChannel: ${author}`,
    type: 'youtube',
    url,
  };
}

/**
 * Strip HTML tags and decode common HTML entities from a string
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')   // Remove styles
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')        // Remove nav
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')  // Remove header
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')  // Remove footer
    .replace(/<[^>]+>/g, ' ')                           // Remove all remaining tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')                            // Collapse whitespace
    .trim();
}

/**
 * Extract the title from an HTML page
 */
function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : 'Untitled Page';
}

/**
 * Extract main content from an article/blog HTML
 * Tries to find the article body, falling back to the full stripped text
 */
function extractMainContent(html: string): string {
  // Try to find article/main/content tags first for cleaner text
  const contentPatterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<div[^>]*class="[^"]*(?:content|article|post|body|entry)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  ];

  for (const pattern of contentPatterns) {
    const match = html.match(pattern);
    if (match) {
      const extracted = stripHtml(match[1]);
      if (extracted.length > 200) { // Only use if substantial
        return extracted.substring(0, 4000); // Limit to 4000 chars
      }
    }
  }

  // Fallback: strip the whole page HTML
  return stripHtml(html).substring(0, 4000);
}

/**
 * Scrape a blog post or news article URL
 */
async function scrapeArticle(url: string): Promise<ScrapedContent> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw new Error(`Could not access the URL (HTTP ${response.status}). The page may require a login or be blocked.`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    throw new Error('This URL does not point to a webpage (it may be a PDF, image, or other file type).');
  }

  const html = await response.text();
  const title = extractTitle(html);
  const content = extractMainContent(html);

  if (content.length < 100) {
    throw new Error('Could not extract enough readable content from this page. It may require JavaScript to render (e.g., a React/Next.js app).');
  }

  return {
    title,
    content: `Title: ${title}\n\nArticle Content:\n${content}`,
    type: 'article',
    url,
  };
}

/**
 * Main entry point: scrape a URL and return structured content
 */
export async function scrapeUrl(url: string): Promise<ScrapedContent> {
  // Validate URL format
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error('Invalid URL. Please include http:// or https://');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('Only http:// and https:// URLs are supported.');
  }

  if (isYouTubeUrl(url)) {
    return scrapeYouTube(url);
  }

  return scrapeArticle(url);
}
