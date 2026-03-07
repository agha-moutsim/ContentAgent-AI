'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Signup failed');
      }

      const data = await res.json();
      if (data.token) localStorage.setItem('token', data.token);

      // After signup, redirect directly to dashboard as we are now auto-logged in
      // Use window.location.href for a hard refresh to clear client-side router cache
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass p-10 rounded-[2.5rem] shadow-glass border-white/10 animate-fade-in relative overflow-hidden group">
      {/* Decorative accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-purple-500/20 transition-colors" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <h2 className="mt-2 text-center text-3xl font-black text-white uppercase tracking-widest">
          Join Engine
        </h2>
        <p className="mt-2 text-center text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">
          Create your content operator account
        </p>
      </div>

      <form className="mt-10 space-y-6 relative z-10" onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4 animate-shake">
            <div className="flex">
              <div className="shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-xs font-bold text-red-400 uppercase tracking-wide">{error}</h3>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label
            htmlFor="email"
            className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1"
          >
            Digital Identity (Email)
          </label>
          <div className="mt-1">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@content.ai"
              className="appearance-none block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl shadow-inner text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all font-medium text-sm"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="password"
            className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1"
          >
            Secure Key (Password)
          </label>
          <div className="mt-1 relative group/input">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="appearance-none block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl shadow-inner text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all font-medium text-sm"
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center py-4 px-4 border border-purple-500/30 rounded-2xl shadow-glow text-xs font-black text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all duration-300 uppercase tracking-[0.2em] transform active:scale-95 disabled:opacity-50 group/btn"
          >
            {loading ? (
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              <>
                Initialize System
                <svg className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              </>
            )}
          </button>
        </div>
      </form>

      <div className="mt-8 relative z-10">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/5" />
          </div>
          <div className="relative flex justify-center text-[10px]">
            <span className="px-4 bg-[#0a0a0f] text-gray-500 font-bold uppercase tracking-widest">
              Existing Protocol
            </span>
          </div>
        </div>

        <div className="mt-6">
          <Link
            href="/login"
            className="w-full flex justify-center py-4 px-4 border border-white/10 rounded-2xl text-[10px] font-black text-gray-400 hover:text-white hover:bg-white/5 transition-all uppercase tracking-widest shadow-inner"
          >
            Access Authorized Session
          </Link>
        </div>
      </div>
    </div>
  );
}
