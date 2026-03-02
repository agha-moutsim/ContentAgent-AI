'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { HistoryRecord } from '@/backend/types';

export default function HistoryPage() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/history', { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Database connection timed out. Please try again.');
      }
      const data = await response.json();
      setRecords(data.records || []);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to history service.');
    } finally {
      setLoading(false);
    }
  };

  const deleteRecord = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this record?')) return;
    
    try {
      const response = await fetch(`/api/history/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        setRecords(records.filter(r => r.id !== id));
      } else {
        alert('Failed to delete record');
      }
    } catch (err) {
      alert('Error deleting record');
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Content History</h1>
          <p className="text-gray-400">View and manage your previously generated content ideas.</p>
        </div>
        <Link 
          href="/dashboard" 
          className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-bold rounded-2xl text-white bg-gradient-premium hover:shadow-glow transition-all"
        >
          <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Content
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass p-6 rounded-3xl h-24 border-white/5" />
          ))}
        </div>
      ) : error ? (
        <div className="glass p-12 rounded-3xl border-red-500/20 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Something went wrong</h3>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">{error}</p>
          <button 
            onClick={fetchHistory}
            className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-bold transition-all"
          >
            Try Again
          </button>
        </div>
      ) : records.length === 0 ? (
        <div className="glass p-20 rounded-3xl border-dashed border-2 border-white/5 text-center">
          <p className="text-gray-500 text-lg mb-6">No content generated yet.</p>
          <Link href="/dashboard" className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors">
            Start creating your first piece of content →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {records.map((record) => (
            <div 
              key={record.id}
              className="glass p-6 rounded-3xl border-white/5 hover:border-white/20 transition-all group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center mb-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 mr-3 animate-pulse"></span>
                    <p className="text-lg font-bold text-white truncate max-w-2xl group-hover:text-indigo-400 transition-colors">
                      {record.inputIdea}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 ml-5">
                    Generated on {new Date(record.createdAt).toLocaleDateString()} at {new Date(record.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                <div className="flex items-center space-x-3 sm:self-center">
                  <Link
                    href={`/dashboard/history/${record.id}`}
                    className="px-5 py-2.5 bg-indigo-600/10 border border-indigo-500/20 rounded-xl text-sm font-bold text-indigo-400 hover:bg-indigo-600/20 transition-all"
                  >
                    View Result
                  </Link>
                  <button
                    onClick={(e) => deleteRecord(record.id, e)}
                    className="p-2.5 bg-red-500/5 border border-red-500/10 rounded-xl text-red-500/50 hover:text-red-500 hover:bg-red-500/10 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
