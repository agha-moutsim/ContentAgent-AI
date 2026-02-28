'use client';

import { useState, useEffect } from 'react';
import { HistoryRecord } from '@/backend/types';
import Link from 'next/link';

export default function HistoryDetailPage({ params }: { params: { id: string } }) {
  const [record, setRecord] = useState<HistoryRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecord();
  }, [params.id]);

  const fetchRecord = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/history/${params.id}`);
      if (response.status === 404) {
        throw new Error('Record not found');
      }
      if (!response.ok) {
        throw new Error('Failed to fetch record');
      }
      const data = await response.json();
      setRecord(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error || 'Something went wrong'}</p>
        <Link href="/dashboard/history" className="text-indigo-600 hover:text-indigo-500">
          Back to History
        </Link>
      </div>
    );
  }

  const { contentPackage } = record;

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/dashboard/history" className="text-indigo-600 hover:text-indigo-500 flex items-center text-sm font-medium">
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to History
        </Link>
        <div className="text-sm text-gray-500">
          Generated on {new Date(record.createdAt).toLocaleDateString()}
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Original Idea</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">{record.inputIdea}</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* YouTube Titles */}
        <section>
          <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">YouTube Titles</h3>
          <ul className="list-disc pl-5 space-y-2">
            {contentPackage.youtubeTitles.map((title, i) => (
              <li key={i} className="text-gray-700">{title}</li>
            ))}
          </ul>
        </section>

        {/* Twitter Thread */}
        <section>
          <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Twitter Thread</h3>
          <div className="bg-gray-50 p-4 rounded-lg border whitespace-pre-wrap text-gray-700">
            {contentPackage.twitterThread}
          </div>
        </section>

        {/* LinkedIn Post */}
        <section>
          <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">LinkedIn Post</h3>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 whitespace-pre-wrap text-gray-700">
            {contentPackage.linkedinPost}
          </div>
        </section>

        {/* Video Hooks */}
        <section>
          <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Video Hooks</h3>
          <div className="grid grid-cols-1 gap-4">
            {contentPackage.hooks.map((hook, i) => (
              <div key={i} className="p-3 bg-indigo-50 border border-indigo-100 rounded text-gray-700">
                <span className="font-bold mr-2 text-indigo-600">#{i + 1}</span> {hook}
              </div>
            ))}
          </div>
        </section>

        {/* CTA Variations */}
        <section>
          <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Call to Action Variations</h3>
          <ul className="space-y-2">
            {contentPackage.ctaVariations.map((cta, i) => (
              <li key={i} className="p-2 border rounded hover:bg-gray-50 text-gray-700 flex">
                <span className="text-gray-400 mr-3">{i + 1}.</span> {cta}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
