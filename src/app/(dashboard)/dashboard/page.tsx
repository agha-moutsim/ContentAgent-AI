'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import ExportModal to avoid SSR issues with jsPDF
const ExportModal = dynamic(() => import('@/frontend/components/ExportModal'), { ssr: false });


type InputMode = 'idea' | 'url';

interface ScrapedPreview {
  title: string;
  content: string;
  type: 'article' | 'youtube' | 'webpage';
}

// Reusable copy button component
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy to clipboard"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-all"
    >
      {copied ? (
        <>
          <svg className="h-3.5 w-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          <span className="text-green-400">Copied!</span>
        </>
      ) : (
        <>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          Copy
        </>
      )}
    </button>
  );
}

// HashtagChip: clickable hashtag that copies on click
function HashtagChip({ tag, color }: { tag: string; color: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    try { await navigator.clipboard.writeText(tag); } catch { /* */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [tag]);
  return (
    <button
      onClick={handleCopy}
      style={{ borderColor: color + '44', background: color + '18', color: copied ? '#22c55e' : color }}
      className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border transition-all hover:brightness-125 cursor-pointer"
    >
      {copied ? '✓ Copied!' : tag}
    </button>
  );
}

export default function DashboardPage() {
  const [inputMode, setInputMode] = useState<InputMode>('idea');
  const [idea, setIdea] = useState('');
  const [url, setUrl] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ScrapedPreview | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [tone, setTone] = useState('balanced');

  // Twitter publish state
  const [isPublishingTwitter, setIsPublishingTwitter] = useState(false);
  const [twitterSuccess, setTwitterSuccess] = useState<string | null>(null);

  // LinkedIn publish state
  const [isPublishingLinkedIn, setIsPublishingLinkedIn] = useState(false);
  const [linkedInSuccess, setLinkedInSuccess] = useState<string | null>(null);

  // Image generation state
  const [generatingImageId, setGeneratingImageId] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({});

  // Export PDF state
  const [showExportModal, setShowExportModal] = useState(false);

  // Hashtag state
  const [hashtags, setHashtags] = useState<{ twitter: string; linkedin: string; instagram: string } | null>(null);
  const [isGeneratingHashtags, setIsGeneratingHashtags] = useState(false);

  const handlePublish = async (platform: 'twitter' | 'linkedin', content: string[]) => {
    const setPublishing = platform === 'twitter' ? setIsPublishingTwitter : setIsPublishingLinkedIn;
    const setSuccess = platform === 'twitter' ? setTwitterSuccess : setLinkedInSuccess;

    setPublishing(true);
    setSuccess(null);
    setError(null);

    try {
      const response = await fetch('/api/social/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, content }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Publishing failed');
      }

      setSuccess(data.url || 'published');
    } catch (err: any) {
      if (err.message.includes('not connected') || err.message.includes('connect in Settings')) {
        const platformName = platform === 'twitter' ? 'Twitter' : 'LinkedIn';
        alert(`You need to connect your ${platformName} account first. Go to Settings → Social Integrations.`);
        window.location.href = '/dashboard/settings';
      } else {
        setError(`${platform === 'twitter' ? 'Twitter' : 'LinkedIn'} Publish Error: ${err.message}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleGenerateImage = async (prompt: string, id: string, aspectRatio: '16:9' | '1:1' = '1:1') => {
    setGeneratingImageId(id);
    setError(null);

    const width = aspectRatio === '16:9' ? 1280 : 1024;
    const height = aspectRatio === '16:9' ? 720 : 1024;

    try {
      const response = await fetch('/api/social/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, width, height }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Image generation failed');

      setGeneratedImages(prev => ({ ...prev, [id]: data.imageUrl }));
    } catch (err: any) {
      setError(`Image Generation Error: ${err.message}`);
    } finally {
      // The instruction included setIsGeneratingImage(false); but this state variable is not declared.
      // To maintain syntactical correctness as per instructions, and avoid introducing undeclared variables,
      // this line is omitted. If 'isGeneratingImage' is intended, it should be declared in useState.
      setGeneratingImageId(null);
    }
  };

  const downloadImage = async (url: string, filename: string) => {
    try {
      // Strategy 1: Try the backend proxy first
      const proxyUrl = `/api/social/download-image?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      if (response.ok) {
        const blob = await response.blob();
        if (blob.size > 1000) {
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
          return;
        }
      }

      // Strategy 2: Canvas-based download (works when proxy is blocked)
      // Browser can load images from these providers directly via <img> tag
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || 1024;
            canvas.height = img.naturalHeight || 1024;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas not supported');
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((blob) => {
              if (!blob) { reject(new Error('Failed to create image blob')); return; }
              const blobUrl = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = blobUrl;
              link.download = filename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(blobUrl);
              resolve();
            }, 'image/png');
          } catch (e) { reject(e); }
        };
        img.onerror = () => reject(new Error('Image could not be loaded. The AI provider may be temporarily down.'));
        img.src = url;
      });
    } catch (error: any) {
      console.error('Download failed:', error);
      // Strategy 3: Open in new tab as final fallback
      window.open(url, '_blank');
      alert('Image opened in a new tab. Right-click the image and select "Save As" to download it.');
    }
  };

  const handleFetchUrl = async () => {
    if (!url.trim()) return;
    setIsFetching(true);
    setFetchError(null);
    setPreview(null);

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch URL');
      setPreview({ title: data.title, content: data.content, type: data.type });
    } catch (err: any) {
      setFetchError(err.message);
    } finally {
      setIsFetching(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setResult(null);
    setError(null);
    setTwitterSuccess(null);
    setLinkedInSuccess(null);
    setGeneratedImages({});
    setHashtags(null); // Clear old hashtags on new generation


    const generationIdea = inputMode === 'url' ? (preview?.title || url) : idea;
    const sourceContent = inputMode === 'url' ? preview?.content : undefined;

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: generationIdea, sourceContent, tone }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(JSON.stringify(errorData));
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      console.error('Error:', err);
      let errorMsg = err.message || 'Failed to generate content. Please try again.';
      
      try {
        const errorData = JSON.parse(err.message);
        if (errorData.isProviderQuota) {
          errorMsg = `The Gemini AI Service is temporarily busy globally (at its shared capacity). This affects ALL accounts on this server right now. GOOD NEWS: Your individual account limits are still safe and weren't used! Please try again in 5-10 minutes.`;
        } else if (errorData.resetTime) {
          const resetDate = new Date(errorData.resetTime);
          const now = new Date();
          const diffMs = resetDate.getTime() - now.getTime();
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          errorMsg = `You've reached your individual account limit (3/3). Reset happens in about ${diffHours > 0 ? diffHours + 'h ' : ''}${diffMins}m.`;
        } else if (errorData.error) {
          errorMsg = errorData.error;
        }
      } catch (e) {
        // raw string message, just use as is
      }

      setError(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const canGenerate = inputMode === 'idea' ? idea.trim().length > 0 : preview !== null;

  const handleGenerateHashtags = async () => {
    if (!result) return;
    setIsGeneratingHashtags(true);
    try {
      const response = await fetch('/api/social/hashtags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea: idea || result.youtubeTitles?.[0] || 'content',
          twitterThread: Array.isArray(result.twitterThread) ? result.twitterThread.join('\n') : result.twitterThread,
          linkedinPost: result.linkedinPost,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Hashtag generation failed');
      setHashtags(data.hashtags);
    } catch (err: any) {
      console.error('Hashtag error:', err);
    } finally {
      setIsGeneratingHashtags(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Create New Content</h1>
          <p className="text-gray-400">Generate high-quality multi-platform content in seconds.</p>
        </div>
        <div className="flex -space-x-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-8 h-8 rounded-full border-2 border-[#09090b] bg-gray-800 flex items-center justify-center text-[10px] font-bold">
              {String.fromCharCode(64 + i)}
            </div>
          ))}
          <div className="w-8 h-8 rounded-full border-2 border-[#09090b] bg-indigo-600 flex items-center justify-center text-[10px] font-bold">+</div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-5">
          <div className="glass p-8 rounded-3xl shadow-glass relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 blur-3xl -z-10 group-hover:bg-indigo-600/10 transition-colors" />
            
            {/* Tab Switcher */}
            <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-2xl">
              <button
                type="button"
                onClick={() => { setInputMode('idea'); setPreview(null); setFetchError(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${inputMode === 'idea' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                My Idea
              </button>
              <button
                type="button"
                onClick={() => { setInputMode('url'); setIdea(''); setError(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${inputMode === 'url' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                From URL
              </button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-6">
              
              {/* Tone Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3 ml-1">
                  Content Tone
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'balanced', label: 'Balanced', icon: '⚖️' },
                    { id: 'professional', label: 'Professional', icon: '👔' },
                    { id: 'witty', label: 'Witty', icon: '🎭' },
                    { id: 'educational', label: 'Educational', icon: '🎓' },
                    { id: 'punchy', label: 'Punchy', icon: '🥊' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTone(t.id)}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${tone === t.id ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-glow-sm' : 'bg-white/5 border-white/5 text-gray-400 hover:border-white/10 hover:bg-white/10'}`}
                    >
                      <span className="text-lg mb-1">{t.icon}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* MY IDEA MODE */}
              {inputMode === 'idea' && (
                <div>
                  <label htmlFor="idea" className="block text-sm font-semibold text-gray-300 mb-3 ml-1">
                    What's your content idea?
                  </label>
                  <div className="relative">
                    <textarea
                      id="idea"
                      rows={5}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all resize-none shadow-inner"
                      placeholder="e.g., How AI is changing the future of marketing..."
                      value={idea}
                      onChange={(e) => setIdea(e.target.value)}
                    />
                    <div className="absolute bottom-4 right-4 text-[10px] text-gray-500 font-mono">
                      {idea.length} / 500
                    </div>
                  </div>
                </div>
              )}

              {/* FROM URL MODE */}
              {inputMode === 'url' && (
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-gray-300 mb-3 ml-1">
                    Paste a URL to repurpose
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                      placeholder="https://medium.com/article... or YouTube URL"
                      value={url}
                      onChange={(e) => { setUrl(e.target.value); setPreview(null); setFetchError(null); }}
                    />
                    <button
                      type="button"
                      onClick={handleFetchUrl}
                      disabled={isFetching || !url.trim()}
                      className="px-4 py-3 bg-white/10 border border-white/10 rounded-2xl text-sm font-semibold text-white hover:bg-white/20 transition-all disabled:opacity-50 shrink-0"
                    >
                      {isFetching ? (
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      ) : 'Fetch'}
                    </button>
                  </div>

                  {fetchError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                      ⚠️ {fetchError}
                    </div>
                  )}

                  {preview && (
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
                      <div className="flex items-center gap-2 mb-1">
                        {preview.type === 'youtube' ? <span className="text-base">🎥</span> : <span className="text-base">📰</span>}
                        <span className="text-xs font-bold text-green-400 uppercase tracking-wide">
                          {preview.type === 'youtube' ? 'YouTube Video' : 'Article'} Ready
                        </span>
                      </div>
                      <p className="text-white text-sm font-semibold line-clamp-2">{preview.title}</p>
                      <p className="text-gray-400 text-xs mt-1">Content fetched successfully. Click Generate below!</p>
                    </div>
                  )}

                  {!preview && !fetchError && (
                    <p className="text-gray-500 text-xs ml-1">Supports: Medium, news sites, blogs, YouTube videos</p>
                  )}
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm flex items-start gap-3">
                  <svg className="h-5 w-5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-bold mb-1">Error</p>
                    <p className="text-red-400/80">{error}</p>
                    {error.includes('quota') && (
                      <button 
                        onClick={() => window.location.href = '/dashboard/settings'}
                        className="mt-2 text-white font-bold underline hover:text-red-300 transition-colors"
                      >
                        Upgrade to Pro for more quota →
                      </button>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isGenerating || !canGenerate}
                className="w-full group relative flex items-center justify-center py-4 px-6 border border-transparent text-sm font-bold rounded-2xl text-white bg-gradient-premium hover:shadow-glow transition-all disabled:opacity-50 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                {isGenerating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Executing Ultra-Fast Pipeline...
                  </>
                ) : (
                  <>
                    <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate Content
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-7">
          {!result && !isGenerating ? (
            <div className="h-full border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center p-12 text-center text-gray-500 min-h-[400px]">
              <div className="p-4 rounded-full bg-white/5 mb-4">
                <svg className="h-8 w-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l4 4v10a2 2 0 01-2 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 3v5h5" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12h10M7 16h10" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-400">No Content Generated</h3>
              <p className="max-w-xs mt-2">Enter an idea on the left to see your content transformed into 8 multi-platform formats.</p>
            </div>
          ) : isGenerating ? (
            <div className="space-y-6 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="glass p-6 rounded-3xl h-32 border-white/5" />
              ))}
            </div>
          ) : result && (
            <div className="space-y-6 animate-fade-in">

              {/* Export PDF Action Bar */}
              <div className="glass p-4 rounded-2xl border-white/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center text-base">✅</div>
                  <div>
                    <p className="text-sm font-semibold text-white">Content Package Ready</p>
                    <p className="text-xs text-gray-400">All platforms generated successfully</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleGenerateHashtags}
                    disabled={isGeneratingHashtags}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all disabled:opacity-50"
                  >
                    {isGeneratingHashtags ? (
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    ) : '🏷️'}
                    {isGeneratingHashtags ? 'Generating...' : 'Hashtags'}
                  </button>
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/25"
                  >
                    📥 Export PDF
                  </button>
                </div>
              </div>

              {/* Hashtag Research Panel */}
              {hashtags && (
                <div className="glass p-6 rounded-3xl shadow-glass border-white/10">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-base shadow-lg">🏷️</div>
                    <div>
                      <h2 className="text-base font-bold text-white tracking-tight">Hashtag Research</h2>
                      <p className="text-xs text-gray-400">Click any hashtag to copy it</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {[
                      { platform: '🐦 Twitter / X', color: '#1d9bf0', tags: hashtags.twitter },
                      { platform: '💼 LinkedIn', color: '#0077b5', tags: hashtags.linkedin },
                      { platform: '📸 Instagram', color: '#e1306c', tags: hashtags.instagram },
                    ].map(({ platform, color, tags }) => (
                      <div key={platform}>
                        <p className="text-xs font-semibold text-gray-400 mb-2">{platform}</p>
                        <div className="flex flex-wrap gap-2">
                          {tags.split(/\s+/).filter(t => t.startsWith('#')).map(tag => (
                            <HashtagChip key={tag} tag={tag} color={color} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}


              {result.youtubeTitles?.length > 0 && (
                <div className="glass p-8 rounded-3xl shadow-glass border-white/10">
                  <div className="flex items-center mb-5">
                    <div className="p-3 rounded-xl bg-red-500/10 text-red-400 mr-4">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.377.505 9.377.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                    </div>
                    <h3 className="text-lg font-bold">YouTube Titles</h3>
                    <span className="ml-auto text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-lg mr-2">{result.youtubeTitles.length} titles</span>
                    <CopyButton text={result.youtubeTitles.join('\n')} />
                  </div>
                  <div className="space-y-2">
                    {result.youtubeTitles.map((title: string, i: number) => (
                      <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-red-500/30 transition-colors cursor-pointer group flex items-start gap-3">
                        <span className="text-red-500/50 font-mono text-xs mt-0.5 shrink-0">{i + 1}.</span>
                        <span className="text-gray-300 group-hover:text-white transition-colors text-sm flex-1">{title}</span>
                        <CopyButton text={title} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Twitter Thread */}
              {result.twitterThread && (
                <div className="glass p-8 rounded-3xl shadow-glass border-white/10">
                  <div className="flex items-center mb-5 flex-wrap gap-2">
                    <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400 mr-2">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                    </div>
                    <h3 className="text-lg font-bold">Twitter Thread</h3>
                    <div className="ml-auto flex items-center gap-2 flex-wrap">
                      <CopyButton text={result.twitterThread} />
                      <button
                        onClick={() => handlePublish('twitter', result.twitterThread.split('\n\n').filter((t: string) => t.trim().length > 0))}
                        disabled={isPublishingTwitter || twitterSuccess !== null}
                        type="button"
                        className="flex items-center gap-2 px-4 py-1.5 bg-[#1DA1F2] hover:bg-[#1a91da] disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all"
                      >
                        {isPublishingTwitter ? 'Publishing...' : twitterSuccess ? 'Published! ✓' : 'Post Thread 🚀'}
                      </button>
                    </div>
                  </div>

                  {twitterSuccess && (
                    <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm flex items-center justify-between">
                      <span className="font-bold">Successfully published your thread!</span>
                      {twitterSuccess !== 'published' && (
                        <a href={twitterSuccess} target="_blank" rel="noreferrer" className="underline font-bold hover:text-green-300">View live on Twitter ↗</a>
                      )}
                    </div>
                  )}
                  <div className="text-sm text-gray-300 whitespace-pre-wrap bg-white/5 p-5 rounded-2xl border border-white/5 leading-relaxed">
                    {result.twitterThread}
                  </div>
                </div>
              )}

              {/* 3. LinkedIn Post */}
              {result.linkedinPost && (
                <div className="glass p-8 rounded-3xl shadow-glass border-white/10">
                  <div className="flex items-center mb-5 flex-wrap gap-2">
                    <div className="p-3 rounded-xl bg-blue-600/10 text-blue-400 mr-2">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                    </div>
                    <h3 className="text-lg font-bold">LinkedIn Post</h3>
                    <div className="ml-auto flex items-center gap-2 flex-wrap">
                      <CopyButton text={result.linkedinPost} />
                      <button
                        onClick={() => handlePublish('linkedin', [result.linkedinPost])}
                        disabled={isPublishingLinkedIn || linkedInSuccess !== null}
                        type="button"
                        className="flex items-center gap-2 px-4 py-1.5 bg-[#0A66C2] hover:bg-[#0958a8] disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all"
                      >
                        {isPublishingLinkedIn ? 'Publishing...' : linkedInSuccess ? 'Published! ✓' : 'Post to LinkedIn 💼'}
                      </button>
                    </div>
                  </div>

                  {linkedInSuccess && (
                    <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm flex items-center justify-between">
                      <span className="font-bold">Successfully published to LinkedIn!</span>
                      {linkedInSuccess !== 'published' && (
                        <a href={linkedInSuccess} target="_blank" rel="noreferrer" className="underline font-bold hover:text-green-300">View on LinkedIn ↗</a>
                      )}
                    </div>
                  )}
                  <div className="text-sm text-gray-300 whitespace-pre-wrap bg-white/5 p-5 rounded-2xl border border-white/5 leading-relaxed">
                    {result.linkedinPost}
                  </div>

                  {/* LinkedIn Image Preview */}
                  {generatedImages['linkedin'] ? (
                    <div className="mt-4 relative group">
                      <img src={generatedImages['linkedin']} alt="LinkedIn Post AI" className="w-full rounded-2xl border border-white/10 shadow-lg object-cover" />
                      <button
                        onClick={() => downloadImage(generatedImages['linkedin'], 'linkedin-post.jpg')}
                        className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Download Image"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleGenerateImage(result.linkedinPost, 'linkedin', '1:1')}
                      disabled={generatingImageId !== null}
                      className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-all disabled:opacity-50"
                    >
                      {generatingImageId === 'linkedin' ? (
                        <>
                          <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                          Generating Image...
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          Generate LinkedIn Post Image
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* 4. Video Hooks */}
              {result.hooks?.length > 0 && (
                <div className="glass p-8 rounded-3xl shadow-glass border-white/10">
                  <div className="flex items-center mb-5">
                    <div className="p-3 rounded-xl bg-orange-500/10 text-orange-400 mr-4">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <h3 className="text-lg font-bold">Video Hooks</h3>
                    <span className="ml-auto text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-lg mr-2">{result.hooks.length} hooks</span>
                    <CopyButton text={result.hooks.join('\n\n')} />
                  </div>
                  <div className="space-y-3">
                    {result.hooks.map((hook: string, i: number) => (
                      <div key={i} className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 hover:border-orange-500/30 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <span className="text-xs font-bold text-orange-500/70 uppercase tracking-wide mr-2">Hook {i + 1}</span>
                            <p className="text-gray-300 text-sm mt-1">{hook}</p>
                          </div>
                          <CopyButton text={hook} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. Thumbnail Ideas */}
              {result.thumbnailIdeas?.length > 0 && (
                <div className="glass p-8 rounded-3xl shadow-glass border-white/10">
                  <div className="flex items-center mb-5">
                    <div className="p-3 rounded-xl bg-yellow-500/10 text-yellow-400 mr-4">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <h3 className="text-lg font-bold">Thumbnail Ideas</h3>
                    <div className="ml-auto">
                      <CopyButton text={result.thumbnailIdeas.join('\n')} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {result.thumbnailIdeas.map((idea: string, i: number) => {
                      const imageId = `thumbnail-${i}`;
                      return (
                        <div key={i} className="space-y-2">
                          <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10 hover:border-yellow-500/30 transition-colors h-full flex flex-col justify-between gap-3">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-yellow-300 text-sm font-bold flex-1">{idea}</p>
                              <CopyButton text={idea} />
                            </div>
                            
                            {generatedImages[imageId] ? (
                              <div className="relative group rounded-lg overflow-hidden border border-white/10">
                                <img src={generatedImages[imageId]} alt={idea} className="w-full h-auto aspect-video object-cover" />
                                <button
                                  onClick={() => downloadImage(generatedImages[imageId], `thumbnail-${i}.jpg`)}
                                  className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Download Image"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleGenerateImage(idea, imageId, '16:9')}
                                disabled={generatingImageId !== null}
                                className="w-full flex items-center justify-center gap-1.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold text-gray-400 hover:text-white transition-all disabled:opacity-50"
                              >
                                {generatingImageId === imageId ? (
                                  <>
                                    <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                                    Generating...
                                  </>
                                ) : (
                                  <>
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    Generate AI Thumbnail
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 6. CTA Variations */}
              {result.ctaVariations?.length > 0 && (
                <div className="glass p-8 rounded-3xl shadow-glass border-white/10">
                  <div className="flex items-center mb-5">
                    <div className="p-3 rounded-xl bg-green-500/10 text-green-400 mr-4">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                    </div>
                    <h3 className="text-lg font-bold">Call-to-Action Variations</h3>
                    <div className="ml-auto">
                      <CopyButton text={result.ctaVariations.join('\n')} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    {result.ctaVariations.map((cta: string, i: number) => (
                      <div key={i} className="p-3 rounded-xl bg-green-500/5 border border-green-500/10 hover:border-green-500/30 transition-colors flex items-center gap-3">
                        <span className="text-green-500 font-bold text-sm shrink-0">→</span>
                        <span className="text-gray-300 text-sm flex-1">{cta}</span>
                        <CopyButton text={cta} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 7. Short-Form Scripts */}
              {result.shortFormScripts?.length > 0 && (
                <div className="glass p-8 rounded-3xl shadow-glass border-white/10">
                  <div className="flex items-center mb-5">
                    <div className="p-3 rounded-xl bg-pink-500/10 text-pink-400 mr-4">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </div>
                    <h3 className="text-lg font-bold">Short-Form Scripts</h3>
                    <span className="ml-2 text-xs text-gray-500">(Reels / Shorts / TikTok)</span>
                    <div className="ml-auto">
                      <CopyButton text={result.shortFormScripts.join('\n\n---\n\n')} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    {result.shortFormScripts.map((script: string, i: number) => (
                      <div key={i} className="rounded-2xl overflow-hidden border border-white/5">
                        <div className="px-4 py-2 bg-pink-500/10 border-b border-white/5 flex items-center justify-between">
                          <span className="text-xs font-bold text-pink-400 uppercase tracking-wide">Script {i + 1}</span>
                          <CopyButton text={script} />
                        </div>
                        <div className="p-4 text-sm text-gray-300 whitespace-pre-wrap bg-white/5 leading-relaxed">
                          {script}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 8. Full YouTube Script */}
              {result.fullScript && (
                <div className="glass p-8 rounded-3xl shadow-glass border-white/10">
                  <div className="flex items-center mb-5">
                    <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 mr-4">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <h3 className="text-lg font-bold">Full YouTube Script</h3>
                    <div className="ml-auto">
                      <CopyButton text={result.fullScript} />
                    </div>
                  </div>
                  <div className="text-sm text-gray-300 whitespace-pre-wrap bg-white/5 p-5 rounded-2xl border border-white/5 leading-relaxed max-h-96 overflow-y-auto">
                    {result.fullScript}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>

      {/* Export Modal — rendered at root level inside outer div */}
      {showExportModal && (
        <ExportModal
          idea={idea}
          content={{
            youtubeTitles: result?.youtubeTitles,
            hooks: result?.hooks,
            twitterThread: Array.isArray(result?.twitterThread) ? result.twitterThread.join('\n\n') : result?.twitterThread,
            linkedinPost: result?.linkedinPost,
            thumbnailIdeas: result?.thumbnailIdeas,
            ctaVariations: result?.ctaVariations,
            fullScript: result?.fullScript,
            shortFormScripts: result?.shortFormScripts,
          }}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}
