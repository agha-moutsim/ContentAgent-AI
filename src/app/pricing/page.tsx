'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function PricingPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate checkout');
      }

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      setError(err.message);
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] -z-10" />

      <div className="text-center max-w-3xl mb-16 relative z-10">
        <Link href="/" className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/5 border border-white/10 mb-8 hover:bg-white/10 transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6 tracking-tighter">
          Simple pricing for <span className="text-transparent bg-clip-text bg-gradient-premium">creators</span>
        </h1>
        <p className="text-xl text-gray-400">
          Scale your content creation game without limits. 
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-5xl w-full relative z-10">
        
        {/* Free Plan */}
        <div className="glass p-8 rounded-[2rem] border border-white/10 flex flex-col">
          <div className="mb-8">
            <h3 className="text-2xl font-bold mb-2">Starter</h3>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-5xl font-black">$0</span>
              <span className="text-gray-400 font-medium">/forever</span>
            </div>
            <p className="text-gray-400">Perfect to test the waters.</p>
          </div>

          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-center gap-3">
              <div className="p-1 rounded-full bg-indigo-500/20 text-indigo-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <span className="text-gray-300">3 generations per day</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="p-1 rounded-full bg-indigo-500/20 text-indigo-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <span className="text-gray-300">Standard AI Models</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="p-1 rounded-full bg-indigo-500/20 text-indigo-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <span className="text-gray-300">&quot;URL to Content&quot; Feature</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="p-1 rounded-full bg-gray-800 text-gray-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </div>
              <span className="text-gray-500 line-through">Priority Processing</span>
            </li>
          </ul>

          <Link
            href="/signup"
            className="w-full py-4 px-6 rounded-2xl bg-white/5 border border-white/10 text-center font-bold hover:bg-white/10 transition-colors"
          >
            Get Started Free
          </Link>
        </div>

        {/* Pro Plan */}
        <div className="glass p-8 rounded-[2rem] border-2 border-indigo-500/50 flex flex-col relative transform md:-translate-y-4 shadow-2xl shadow-indigo-500/10">
          <div className="absolute -top-4 inset-x-0 flex justify-center">
            <span className="bg-gradient-premium py-1 px-4 rounded-full text-xs font-bold tracking-widest uppercase shadow-glow">
              Most Popular
            </span>
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
              Pro <span className="text-xl">👑</span>
            </h3>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-5xl font-black">$19</span>
              <span className="text-gray-400 font-medium">/month</span>
            </div>
            <p className="text-gray-400">Unleash your content machine.</p>
          </div>

          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-center gap-3">
              <div className="p-1 rounded-full bg-indigo-500/20 text-indigo-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <span className="text-white font-semibold">Unlimited generations</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="p-1 rounded-full bg-indigo-500/20 text-indigo-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <span className="text-white font-semibold">Highest Priority Processing</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="p-1 rounded-full bg-indigo-500/20 text-indigo-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <span className="text-gray-300">All Starter features</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="p-1 rounded-full bg-indigo-500/20 text-indigo-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <span className="text-gray-300">Early access to new models</span>
            </li>
          </ul>

          {error && (
            <div className="mb-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
              {error}
            </div>
          )}

          <button
            onClick={handleUpgrade}
            disabled={isProcessing}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-premium font-bold hover:shadow-glow transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              'Upgrade to Pro'
            )}
          </button>
          <p className="text-center text-xs text-gray-500 mt-4 flex items-center justify-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
            Secured by Stripe
          </p>
        </div>

      </div>
    </div>
  );
}
