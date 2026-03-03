'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function SettingsPage() {
  const [user, setUser] = useState<{ email: string; plan: string; name?: string; brandVoice?: string; twitterConnected?: boolean; twitterUsername?: string; linkedinConnected?: boolean; linkedinUsername?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Brand Voice State
  const [brandVoice, setBrandVoice] = useState('');
  const [isSavingVoice, setIsSavingVoice] = useState(false);
  
  // Analyzer State
  const [voiceExamples, setVoiceExamples] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzerOpen, setAnalyzerOpen] = useState(false);

  useEffect(() => {
    fetchUserProfile();

    // Check for OAuth callbacks in URL
    const params = new URLSearchParams(window.location.search);
    const successVal = params.get('success');
    const usernameVal = params.get('username') || '';
    if (successVal === 'twitter_connected') {
      alert(`✅ Successfully connected Twitter account: @${usernameVal}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (successVal === 'linkedin_connected') {
      alert(`✅ Successfully connected LinkedIn account: ${decodeURIComponent(usernameVal)}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('error')) {
      alert(`❌ Failed to connect Platform: ${params.get('error')}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/auth/profile', { 
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        credentials: 'include' 
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        if (data.user.brandVoice) setBrandVoice(data.user.brandVoice);
      } else {
        throw new Error('Could not load profile details.');
      }
    } catch (err: any) {
      setError(err.message || 'Connection to profile service failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVoice = async () => {
    setIsSavingVoice(true);
    try {
      const res = await fetch('/api/user/brand-voice', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        credentials: 'include',
        body: JSON.stringify({ brandVoice })
      });
      if (res.ok) {
        alert('✅ Brand Voice updated successfully! All future content will use this tone.');
      } else {
        throw new Error('Failed to save');
      }
    } catch (err) {
      alert('Failed to save brand voice.');
    } finally {
      setIsSavingVoice(false);
    }
  };

  const handleAnalyzeVoice = async () => {
    if (!voiceExamples.trim()) return alert('Please paste some examples first.');
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/analyze-voice', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        credentials: 'include',
        body: JSON.stringify({ examples: voiceExamples })
      });
      const data = await res.json();
      if (data.voiceProfile) {
        setBrandVoice(data.voiceProfile);
        setAnalyzerOpen(false);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      alert(err.message || 'Analysis failed. Try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const [isProcessingUpgrade, setIsProcessingUpgrade] = useState(false);

  const handleUpgrade = async () => {
    setIsProcessingUpgrade(true);
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        credentials: 'include',
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to start checkout');
        setIsProcessingUpgrade(false);
      }
    } catch (err) {
      alert('Error connecting to billing service');
      setIsProcessingUpgrade(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Account Settings</h1>
        <p className="text-gray-400">Manage your profile, subscription, and custom AI brand voice.</p>
      </div>

      {loading ? (
        <div className="space-y-6 animate-pulse">
          <div className="glass h-64 rounded-3xl border-white/5" />
          <div className="glass h-32 rounded-3xl border-white/5" />
        </div>
      ) : error ? (
        <div className="glass p-12 rounded-3xl border-red-500/20 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Profile Error</h3>
          <p className="text-gray-400 mb-8 max-w-sm mx-auto">{error}</p>
          <button 
            onClick={fetchUserProfile}
            className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-bold transition-all"
          >
            Retry Loading
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            
            {/* Custom Brand Voice Manager - The Crown Jewel Feature */}
            <div className="glass p-8 rounded-3xl border-indigo-500/30 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-premium" />
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                    Custom Brand Voice 🗣️
                  </h3>
                  <p className="text-sm text-gray-400">Force the AI to perfectly replicate your exact writing style.</p>
                </div>
              </div>

              {!analyzerOpen ? (
                <div className="space-y-4">
                  <textarea
                    value={brandVoice}
                    onChange={(e) => setBrandVoice(e.target.value)}
                    placeholder="E.g., Start with a hook. Use bullet points. Keep sentences under 15 words. Tone should be punchy and direct with no emojis."
                    className="w-full h-32 p-4 rounded-xl bg-white/5 border border-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 text-gray-200 placeholder-gray-600 resize-none font-mono text-sm leading-relaxed"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveVoice}
                      disabled={isSavingVoice}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSavingVoice ? 'Saving...' : 'Save Voice Profile'}
                    </button>
                    <button
                      onClick={() => setAnalyzerOpen(true)}
                      className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 font-bold rounded-xl transition-colors border border-white/10 flex items-center gap-2"
                    >
                      ✨ Auto-Analyze My Tone
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl animate-fade-in">
                  <h4 className="font-bold text-indigo-400 mb-2">AI Tone Analyzer</h4>
                  <p className="text-xs text-gray-400 mb-4">Paste 1-3 of your best posts below. We&apos;ll analyze your vocabulary, pacing, and style to build your guidelines.</p>
                  <textarea
                    value={voiceExamples}
                    onChange={(e) => setVoiceExamples(e.target.value)}
                    placeholder="Paste your past tweets, LinkedIn posts, or blog introductions here..."
                    className="w-full h-40 p-4 rounded-xl bg-[#09090b] border border-white/10 focus:border-indigo-500/50 text-gray-300 mb-4 resize-none text-sm"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleAnalyzeVoice}
                      disabled={isAnalyzing}
                      className="flex-1 py-2.5 bg-gradient-premium rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-glow"
                    >
                      {isAnalyzing ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          Analyzing Voice...
                        </>
                      ) : (
                        'Extract Voice Guidelines'
                      )}
                    </button>
                    <button
                      onClick={() => setAnalyzerOpen(false)}
                      className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Info Card */}
            <div className="glass p-8 rounded-3xl border-white/5">
              <div className="flex items-center mb-8 pb-8 border-b border-white/5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center font-bold text-2xl text-white">
                  {user?.email.charAt(0).toUpperCase()}
                </div>
                <div className="ml-6">
                  <h3 className="text-xl font-bold text-white mb-1">Personal Details</h3>
                  <p className="text-sm text-gray-400">Your account identifier and credentials.</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs uppercase tracking-widest font-bold text-gray-500 mb-2">Email Address</label>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-gray-300 font-medium">
                    {user?.email}
                  </div>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest font-bold text-gray-500 mb-2">Password</label>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-gray-500 flex justify-between items-center">
                    <span>••••••••••••</span>
                    <button className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors">Change Password</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Integrations Card */}
            <div className="glass p-8 rounded-3xl border-white/5">
              <div className="flex items-center mb-8 pb-8 border-b border-white/5">
                <div className="w-16 h-16 rounded-2xl bg-[#1DA1F2]/10 flex items-center justify-center font-bold text-2xl text-[#1DA1F2]">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                </div>
                <div className="ml-6">
                  <h3 className="text-xl font-bold text-white mb-1">Social Integrations</h3>
                  <p className="text-sm text-gray-400">Connect your accounts to enable one-click publishing.</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Twitter Row */}
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-[#1DA1F2]/10 text-[#1DA1F2]">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-white">X (Twitter)</h4>
                      <p className="text-xs text-gray-400">{user?.twitterConnected ? `Connected as @${user?.twitterUsername}` : 'Not connected'}</p>
                    </div>
                  </div>
                  {user?.twitterConnected ? (
                    <div className="px-4 py-2 bg-green-500/10 text-green-400 rounded-xl font-bold text-sm border border-green-500/20">Connected ✓</div>
                  ) : (
                    <button 
                      onClick={() => window.location.href = `/api/auth/twitter/connect?token=${localStorage.getItem('token')}`} 
                      className="px-6 py-2 bg-[#1DA1F2] hover:bg-[#1a91da] text-white font-bold rounded-xl transition-all text-sm"
                    >
                      Connect X
                    </button>
                  )}
                </div>

                {/* LinkedIn Row */}
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-[#0A66C2]/10 text-[#0A66C2]">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-white">LinkedIn</h4>
                      <p className="text-xs text-gray-400">{user?.linkedinConnected ? `Connected as ${user?.linkedinUsername}` : 'Not connected'}</p>
                    </div>
                  </div>
                  {user?.linkedinConnected ? (
                    <div className="px-4 py-2 bg-green-500/10 text-green-400 rounded-xl font-bold text-sm border border-green-500/20">Connected ✓</div>
                  ) : (
                    <button 
                      onClick={() => window.location.href = `/api/auth/linkedin/connect?token=${localStorage.getItem('token')}`} 
                      className="px-6 py-2 bg-[#0A66C2] hover:bg-[#0958a8] text-white font-bold rounded-xl transition-all text-sm"
                    >
                      Connect LinkedIn
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="glass p-8 rounded-3xl border-red-500/10 bg-red-500/[0.02]">
              <h3 className="text-xl font-bold text-red-500 mb-2">Security & Session</h3>
              <p className="text-sm text-gray-500 mb-6">Terminate your current session or manage account deletion.</p>
              <Link
                href="/logout"
                className="inline-flex items-center px-6 py-3 border border-red-500/20 text-sm font-bold rounded-2xl text-red-500 bg-red-500/5 hover:bg-red-500/10 transition-all"
              >
                Sign Out from All Devices
              </Link>
            </div>
          </div>

          {/* Subscription Sidebar */}
          <div className="lg:col-span-1">
            <div className="glass p-8 rounded-3xl border-white/5 sticky top-8">
              <h3 className="text-xl font-bold text-white mb-6">Subscription</h3>
              <div className="mb-8">
                <div className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold ${
                  user?.plan === 'pro' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                }`}>
                  {user?.plan === 'pro' ? 'Pro Membership active' : 'Free Tier'}
                </div>
              </div>

              {user?.plan !== 'pro' ? (
                <div className="space-y-6">
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Unlock higher Gemini usage limits, unlimited history, priority AI speeds, and custom brand voices.
                  </p>
                  <button 
                    onClick={handleUpgrade}
                    disabled={isProcessingUpgrade}
                    className="w-full py-4 bg-gradient-premium rounded-2xl text-white font-bold hover:shadow-glow transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isProcessingUpgrade ? (
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : (
                      'Upgrade to Pro Now'
                    )}
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-green-500/5 rounded-2xl border border-green-500/10 text-sm text-green-400/80">
                  Your Pro features are active. You have full access to Custom Brand Voices and top-tier Gemini AI models.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
