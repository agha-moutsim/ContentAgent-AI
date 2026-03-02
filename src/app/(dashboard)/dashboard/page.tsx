'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';

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
        credentials: 'include',
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
        credentials: 'include',
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
      const response = await fetch(proxyUrl, { credentials: 'include' });
      
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
        const img = new window.Image();
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
        credentials: 'include',
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
        credentials: 'include',
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
        credentials: 'include',
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
    <div className="space-y-12 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-extrabold uppercase tracking-widest mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            AI Engine Online
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-3">
            Create <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Magic</span>
          </h1>
          <p className="text-gray-400 max-w-md leading-relaxed">
            Transform your vision into high-impact multi-platform content with a single click.
          </p>
        </div>
        
        <div className="flex items-center gap-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex -space-x-4">
            {['elonmusk', 'sama', 'rauchg'].map((handle) => (
              <div key={handle} className="w-12 h-12 rounded-full border-[3px] border-[#050505] bg-slate-800 flex items-center justify-center overflow-hidden ring-2 ring-white/5 transition-transform hover:scale-110 cursor-pointer z-10 hover:z-20 shadow-xl">
                <Image src={`https://unavatar.io/twitter/${handle}`} alt={handle} width={48} height={48} unoptimized className="object-cover w-full h-full" />
              </div>
            ))}
            <div className="w-12 h-12 rounded-full border-[3px] border-[#050505] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 transition-transform hover:scale-110 cursor-pointer z-10 group">
              <span className="text-sm font-black group-hover:rotate-90 transition-transform duration-300">+</span>
            </div>
          </div>
          <div className="flex flex-col ml-1">
            <span className="text-white text-sm font-black tracking-wide">2,500+</span>
            <span className="text-gray-500 text-[9px] uppercase tracking-widest font-black">Creators Active</span>
          </div>
        </div>
      </div>
      
      <div className="bento-grid">
        {/* Form Column - Bento Card */}
        <div className="lg:col-span-5 h-fit animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="glass p-10 rounded-[2.5rem] border-white/10 relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 blur-[100px] -z-10 group-hover:bg-indigo-600/10 transition-all duration-700" />
            
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 flex items-center justify-center text-xl">✨</div>
              <h2 className="text-xl font-bold text-white">Content Brief</h2>
            </div>
            
            {/* Tab Switcher */}
            <div className="flex gap-1.5 mb-8 p-1.5 bg-white/5 rounded-2xl border border-white/5">
              <button
                type="button"
                onClick={() => { setInputMode('idea'); setPreview(null); setFetchError(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${inputMode === 'idea' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 scale-[1.02]' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                My Idea
              </button>
              <button
                type="button"
                onClick={() => { setInputMode('url'); setIdea(''); setError(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${inputMode === 'url' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 scale-[1.02]' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                URL Feed
              </button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-8">
              
              {/* Tone Selection */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 mb-4 ml-1">
                  Strategy / Tone
                </label>
                <div className="grid grid-cols-5 gap-2.5">
                  {[
                    { id: 'balanced', label: 'Bal', icon: '⚖️' },
                    { id: 'professional', label: 'Pro', icon: '👔' },
                    { id: 'witty', label: 'Fun', icon: '🎭' },
                    { id: 'educational', label: 'Edu', icon: '🎓' },
                    { id: 'punchy', label: 'Hyp', icon: '🥊' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTone(t.id)}
                      className={`flex flex-col items-center justify-center py-4 px-2 rounded-2xl border transition-all duration-300 ${tone === t.id ? 'bg-indigo-600/20 border-indigo-500/50 text-white shadow-glow translate-y-[-2px]' : 'bg-white/5 border-white/5 text-gray-400 hover:border-white/10 hover:bg-white/10'}`}
                    >
                      <span className="text-xl mb-2">{t.icon}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* MY IDEA MODE */}
              {inputMode === 'idea' && (
                <div className="space-y-4">
                  <label htmlFor="idea" className="block text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2 ml-1">
                    Describe your vision
                  </label>
                  <div className="relative group">
                    <textarea
                      id="idea"
                      rows={6}
                      className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-white placeholder-gray-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all resize-none shadow-inner leading-relaxed"
                      placeholder="e.g., Explain the core benefits of decentralized finance for local small businesses..."
                      value={idea}
                      onChange={(e) => setIdea(e.target.value)}
                    />
                    <div className="absolute bottom-6 right-6 text-[9px] text-gray-600 font-black tracking-widest">
                      {idea.length} / 500
                    </div>
                  </div>
                </div>
              )}

              {/* FROM URL MODE */}
              {inputMode === 'url' && (
                <div className="space-y-6">
                  <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2 ml-1">
                    Source Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-gray-600 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                      placeholder="Article, Blog, or YouTube URL"
                      value={url}
                      onChange={(e) => { setUrl(e.target.value); setPreview(null); setFetchError(null); }}
                    />
                    <button
                      type="button"
                      onClick={handleFetchUrl}
                      disabled={isFetching || !url.trim()}
                      className="px-6 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-xs font-black uppercase tracking-widest text-white transition-all disabled:opacity-50 shadow-lg shadow-indigo-600/20 active:scale-95"
                    >
                      {isFetching ? (
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      ) : 'Scan'}
                    </button>
                  </div>

                  {fetchError && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-semibold animate-shake">
                      ⚠️ {fetchError}
                    </div>
                  )}

                  {preview && (
                    <div className="p-5 bg-indigo-500/10 border border-indigo-500/20 rounded-3xl animate-fade-in">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-600/20 flex items-center justify-center">
                          {preview.type === 'youtube' ? '🎥' : '📰'}
                        </div>
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Source Recognized</span>
                      </div>
                      <p className="text-white text-sm font-bold line-clamp-2 mb-1">{preview.title}</p>
                      <p className="text-gray-400 text-[11px] font-medium italic">Scanner has processed the data. Ready for engine.</p>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-3xl text-rose-400 text-xs flex items-start gap-4 animate-fade-in">
                  <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 shrink-0 mt-0.5">⚠️</div>
                  <div>
                    <p className="font-black uppercase tracking-widest mb-1.5 text-[10px]">Processing Error</p>
                    <p className="text-rose-300/80 leading-relaxed text-[11px] font-medium">{error}</p>
                    {error.includes('quota') && (
                      <button 
                        onClick={() => window.location.href = '/dashboard/settings'}
                        className="mt-3 inline-flex items-center text-[10px] uppercase font-black tracking-widest text-white hover:text-indigo-400 transition-colors"
                      >
                        Upgrade Capacity →
                      </button>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isGenerating || !canGenerate}
                className="w-full relative group flex items-center justify-center py-5 px-6 border border-transparent text-xs font-black uppercase tracking-[0.25em] rounded-3xl text-white bg-indigo-600 hover:bg-indigo-500 transition-all duration-300 disabled:opacity-50 overflow-hidden shadow-2xl shadow-indigo-600/30 active:scale-95"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                {isGenerating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-4 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing Magic...
                  </>
                ) : (
                  <>
                    <svg className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Ignite Pipeline
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-7 space-y-8 h-full">
          {!result && !isGenerating ? (
            <div className="h-full glass border-2 border-dashed border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center p-12 text-center min-h-[500px] animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <div className="p-6 rounded-3xl bg-white/5 mb-6 border border-white/5 shadow-inner">
                <svg className="h-10 w-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l4 4v10a2 2 0 01-2 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 3v5h5" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12h10M7 16h10" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-400 mb-3">Engine Idle</h3>
              <p className="max-w-xs text-gray-500 text-sm leading-relaxed">
                Feed the engine an idea or URL to witness its multi-platform transformation.
              </p>
            </div>
          ) : isGenerating ? (
            <div className="space-y-6 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass p-10 rounded-[2.5rem] h-48 border-white/5" />
              ))}
            </div>
          ) : result && (
            <div className="space-y-6 pb-10">

              {/* Export PDF Action Bar */}
              <div className="glass p-5 rounded-3xl border-white/10 flex items-center justify-between gap-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-xl shadow-glow">✅</div>
                  <div>
                    <p className="text-sm font-black text-white uppercase tracking-widest">Blueprint Ready</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">8 Layers Orchestrated</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleGenerateHashtags}
                    disabled={isGeneratingHashtags}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-all disabled:opacity-50"
                  >
                    {isGeneratingHashtags ? (
                      <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    ) : '🏷️'}
                    {isGeneratingHashtags ? 'Analyzing...' : 'Tags'}
                  </button>
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/25 active:scale-95"
                  >
                    📥 Package PDF
                  </button>
                </div>
              </div>

              {/* Hashtag Research Panel */}
              {hashtags && (
                <div className="glass p-8 rounded-[2.5rem] shadow-glass border-white/10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl shadow-lg ring-4 ring-indigo-500/10">🏷️</div>
                    <div>
                      <h2 className="text-lg font-black text-white uppercase tracking-widest">Discovery Tags</h2>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Algorithmic optimized clusters</p>
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
                <div className="glass p-10 rounded-[2.5rem] shadow-glass border-white/10 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                  <div className="flex items-center mb-8">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/20 text-red-500 mr-5 border border-red-500/10 shadow-glow-sm">
                      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.377.505 9.377.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-widest">Viral Titles</h3>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">CTR-optimized hooks</p>
                    </div>
                    <div className="ml-auto">
                      <CopyButton text={result.youtubeTitles.join('\n')} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    {result.youtubeTitles.map((title: string, i: number) => (
                      <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-red-500/30 transition-all duration-300 group flex items-start gap-4">
                        <span className="text-red-500/50 font-black text-[10px] mt-1 shrink-0 bg-red-500/5 w-6 h-6 rounded-lg flex items-center justify-center">{i + 1}</span>
                        <span className="text-gray-300 group-hover:text-white transition-colors text-sm font-medium leading-relaxed flex-1">{title}</span>
                        <CopyButton text={title} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Twitter Thread */}
              {result.twitterThread && (
                <div className="glass p-10 rounded-[2.5rem] shadow-glass border-white/10 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                  <div className="flex items-center mb-8 flex-wrap gap-4">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-500/20 to-sky-600/20 text-sky-400 mr-1 border border-sky-500/10 shadow-glow-sm">
                      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-widest">Twitter Thread</h3>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Authored for engagement</p>
                    </div>
                    <div className="ml-auto flex items-center gap-3">
                      <CopyButton text={result.twitterThread} />
                      <button
                        onClick={() => handlePublish('twitter', result.twitterThread.split('\n\n').filter((t: string) => t.trim().length > 0))}
                        disabled={isPublishingTwitter || twitterSuccess !== null}
                        type="button"
                        className="px-6 py-2 bg-[#1DA1F2] hover:bg-[#1a91da] disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-lg shadow-sky-500/20 active:scale-95"
                      >
                        {isPublishingTwitter ? 'Syncing...' : twitterSuccess ? 'Live ✓' : 'X Publish'}
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-300 whitespace-pre-wrap bg-white/5 p-8 rounded-3xl border border-white/5 leading-relaxed shadow-inner">
                    {result.twitterThread}
                  </div>
                </div>
              )}

              {/* 3. LinkedIn Post */}
              {result.linkedinPost && (
                <div className="glass p-10 rounded-[2.5rem] shadow-glass border-white/10 animate-fade-in" style={{ animationDelay: '0.5s' }}>
                  <div className="flex items-center mb-8 flex-wrap gap-4">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-600/20 to-blue-700/20 text-blue-400 mr-1 border border-blue-600/10 shadow-glow-sm">
                      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-widest">LinkedIn Draft</h3>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Professional network poise</p>
                    </div>
                    <div className="ml-auto flex items-center gap-3">
                      <CopyButton text={result.linkedinPost} />
                      <button
                        onClick={() => handlePublish('linkedin', [result.linkedinPost])}
                        disabled={isPublishingLinkedIn || linkedInSuccess !== null}
                        type="button"
                        className="px-6 py-2 bg-[#0A66C2] hover:bg-[#0958a8] disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                      >
                        {isPublishingLinkedIn ? 'Broadcasting...' : linkedInSuccess ? 'Live ✓' : 'LinkedIn Send'}
                      </button>
                    </div>
                  </div>

                  {linkedInSuccess && (
                    <div className="mb-6 p-5 bg-green-500/10 border border-green-500/20 rounded-3xl text-green-400 text-xs flex items-center justify-between animate-fade-in">
                      <span className="font-bold">Transmission successful.</span>
                      {linkedInSuccess !== 'published' && (
                        <a href={linkedInSuccess} target="_blank" rel="noreferrer" className="underline font-black uppercase tracking-widest hover:text-green-300">View Feed ↗</a>
                      )}
                    </div>
                  )}
                  <div className="text-sm text-gray-300 whitespace-pre-wrap bg-white/5 p-8 rounded-3xl border border-white/5 leading-relaxed shadow-inner">
                    {result.linkedinPost}
                  </div>

                  {/* LinkedIn Image Preview */}
                  {generatedImages['linkedin'] ? (
                    <div className="mt-6 relative group rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                      <Image src={generatedImages['linkedin']} alt="LinkedIn Post AI" width={512} height={512} className="w-full object-cover transition-transform duration-700 group-hover:scale-105" unoptimized />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <button
                        onClick={() => downloadImage(generatedImages['linkedin'], 'linkedin-post.jpg')}
                        className="absolute bottom-4 right-4 bg-white/10 backdrop-blur-xl border border-white/20 text-white p-3 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white/20"
                        title="Download Asset"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleGenerateImage(result.linkedinPost, 'linkedin', '1:1')}
                      disabled={generatingImageId !== null}
                      className="mt-6 w-full flex items-center justify-center gap-3 py-4 bg-white/5 hover:bg-indigo-600/10 border border-white/10 hover:border-indigo-500/50 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 hover:text-white transition-all duration-300 disabled:opacity-50 group"
                    >
                      {generatingImageId === 'linkedin' ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                          Rendering Aesthetic...
                        </>
                      ) : (
                        <>
                          <svg className="h-5 w-5 transition-transform group-hover:rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          Generate Visual Asset
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* 4. Video Hooks */}
              {result.hooks?.length > 0 && (
                <div className="glass p-10 rounded-[2.5rem] shadow-glass border-white/10 animate-fade-in" style={{ animationDelay: '0.6s' }}>
                  <div className="flex items-center mb-8">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-600/20 text-orange-400 mr-5 border border-orange-500/10 shadow-glow-sm">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-widest">Power Hooks</h3>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">First-second retention mechanics</p>
                    </div>
                    <div className="ml-auto">
                      <CopyButton text={result.hooks.join('\n\n')} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    {result.hooks.map((hook: string, i: number) => (
                      <div key={i} className="p-5 rounded-2xl bg-orange-500/5 border border-orange-500/10 hover:border-orange-500/30 transition-all duration-300 group">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <span className="text-[9px] font-black text-orange-500 uppercase tracking-[0.2em] mb-2 block">Hook Protocol {i + 1}</span>
                            <p className="text-gray-300 text-sm font-medium leading-relaxed group-hover:text-white transition-colors">{hook}</p>
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
                <div className="glass p-10 rounded-[2.5rem] shadow-glass border-white/10 animate-fade-in" style={{ animationDelay: '0.7s' }}>
                  <div className="flex items-center mb-8">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-amber-600/20 text-yellow-400 mr-5 border border-yellow-500/10 shadow-glow-sm">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-widest">AI Media Engine</h3>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Stunning visual concepts</p>
                    </div>
                    <div className="ml-auto">
                      <CopyButton text={result.thumbnailIdeas.join('\n')} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {result.thumbnailIdeas.map((idea: string, i: number) => {
                      const imageId = `thumbnail-${i}`;
                      return (
                        <div key={i} className="space-y-4">
                          <div className="p-6 rounded-3xl bg-yellow-500/5 border border-yellow-500/10 hover:border-yellow-500/30 transition-all duration-300 h-full flex flex-col justify-between gap-5 shadow-inner">
                            <div className="flex items-start justify-between gap-4">
                              <p className="text-white text-xs font-bold leading-relaxed flex-1">{idea}</p>
                              <CopyButton text={idea} />
                            </div>
                            
                            {generatedImages[imageId] ? (
                              <div className="relative group rounded-2xl overflow-hidden border border-white/10 shadow-xl">
                                <Image src={generatedImages[imageId]} alt={idea} width={640} height={360} className="w-full aspect-video object-cover transition-transform duration-700 group-hover:scale-110" unoptimized />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <button
                                  onClick={() => downloadImage(generatedImages[imageId], `thumbnail-${i}.jpg`)}
                                  className="absolute bottom-3 right-3 bg-white/10 backdrop-blur-xl border border-white/20 text-white p-2.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-white/20"
                                  title="Download Image"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleGenerateImage(idea, imageId, '16:9')}
                                disabled={generatingImageId !== null}
                                className="w-full flex items-center justify-center gap-2.5 py-4 bg-white/5 hover:bg-yellow-600/10 border border-white/10 hover:border-yellow-500/50 rounded-2xl text-[9px] font-black uppercase tracking-[0.25em] text-gray-500 hover:text-white transition-all duration-300 disabled:opacity-50 group shadow-lg"
                              >
                                {generatingImageId === imageId ? (
                                  <>
                                    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                                    Rendering...
                                  </>
                                ) : (
                                  <>
                                    <svg className="h-4 w-4 transition-transform group-hover:rotate-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    Visualize Concept
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
                <div className="glass p-10 rounded-[2.5rem] shadow-glass border-white/10 animate-fade-in" style={{ animationDelay: '0.8s' }}>
                  <div className="flex items-center mb-8">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-600/20 text-green-400 mr-5 border border-green-500/10 shadow-glow-sm">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-widest">Conversion Hooks</h3>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">High-intent CTA variations</p>
                    </div>
                    <div className="ml-auto">
                      <CopyButton text={result.ctaVariations.join('\n')} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    {result.ctaVariations.map((cta: string, i: number) => (
                      <div key={i} className="p-4 rounded-2xl bg-green-500/5 border border-green-500/10 hover:border-green-500/30 transition-all duration-300 flex items-center gap-4 group">
                        <span className="text-green-500 font-black text-xs shrink-0 group-hover:translate-x-1 transition-transform">→</span>
                        <span className="text-gray-300 text-sm font-medium flex-1 group-hover:text-white transition-colors">{cta}</span>
                        <CopyButton text={cta} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 7. Short-Form Scripts */}
              {result.shortFormScripts?.length > 0 && (
                <div className="glass p-10 rounded-[2.5rem] shadow-glass border-white/10 animate-fade-in" style={{ animationDelay: '0.9s' }}>
                  <div className="flex items-center mb-8">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-500/20 to-rose-600/20 text-pink-400 mr-5 border border-pink-500/10 shadow-glow-sm">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-widest">Vertical Reels</h3>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">TikTok & Shorts optimized scripts</p>
                    </div>
                    <div className="ml-auto">
                      <CopyButton text={result.shortFormScripts.join('\n\n---\n\n')} />
                    </div>
                  </div>
                  <div className="space-y-6">
                    {result.shortFormScripts.map((script: string, i: number) => (
                      <div key={i} className="rounded-[2rem] overflow-hidden border border-white/5 bg-white/5 group transition-all duration-500 hover:border-pink-500/20 shadow-inner">
                        <div className="px-6 py-3 bg-pink-500/5 border-b border-white/5 flex items-center justify-between">
                          <span className="text-[10px] font-black text-pink-400 uppercase tracking-widest">Script Protocol {i + 1}</span>
                          <CopyButton text={script} />
                        </div>
                        <div className="p-6 text-sm text-gray-300 font-medium whitespace-pre-wrap leading-relaxed group-hover:text-white transition-colors">
                          {script}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 8. Full YouTube Script */}
              {result.fullScript && (
                <div className="glass p-10 rounded-[2.5rem] shadow-glass border-white/10 animate-fade-in" style={{ animationDelay: '1s' }}>
                  <div className="flex items-center mb-8">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-600/20 text-purple-400 mr-5 border border-purple-500/10 shadow-glow-sm">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-widest">Master Script</h3>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Full-length YouTube orchestration</p>
                    </div>
                    <div className="ml-auto">
                      <CopyButton text={result.fullScript} />
                    </div>
                  </div>
                  <div className="text-sm text-gray-300 font-medium whitespace-pre-wrap bg-white/5 p-8 rounded-3xl border border-white/5 leading-relaxed max-h-[500px] overflow-y-auto scrollbar-custom shadow-inner group">
                    <div className="group-hover:text-white transition-colors duration-500">
                      {result.fullScript}
                    </div>
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
