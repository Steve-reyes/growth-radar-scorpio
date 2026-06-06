'use client';

import { useState, useEffect } from 'react';
import { DailyBrief } from '@/lib/types';
import { apiGet, apiPost } from '@/lib/api';

export default function BriefsPage() {
  const [briefs, setBriefs] = useState<DailyBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = (msg: string, type: string) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    apiGet<DailyBrief[]>('/api/briefs')
      .then(data => setBriefs(data))
      .catch(() => showToast('Failed to load briefs', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const newBrief = await apiPost<DailyBrief>('/api/briefs/generate');
      setBriefs(prev => [newBrief, ...prev]);
      setExpandedId(newBrief.id);
      showToast('Brief generated', 'success');
    } catch {
      showToast('Failed to generate brief', 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1C1C1E] dark:text-white">Daily Briefs</h1>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="ios-pill ios-pill-primary disabled:opacity-50"
        >
          {generating ? 'Generating...' : 'Generate Now'}
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="ios-card p-5">
              <div className="skeleton h-6 w-48 mb-3" />
              <div className="skeleton h-4 w-32 mb-2" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-3/4 mt-1" />
            </div>
          ))}
        </div>
      ) : briefs.length === 0 ? (
        <div className="ios-card p-12 text-center">
          <p className="text-lg font-semibold text-[#8E8E93] mb-2">No briefs yet</p>
          <p className="text-sm text-[#8E8E93] mb-4">Generate your first daily brief to get AI-powered insights</p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="ios-pill ios-pill-primary disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Generate Now'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {briefs.map((brief, index) => {
            const isLatest = index === 0;
            const isExpanded = expandedId === brief.id;

            return (
              <div
                key={brief.id}
                className={`ios-card overflow-hidden transition-all ${
                  isLatest ? 'ring-2 ring-[#007AFF] ring-offset-2 dark:ring-offset-[#1C1C1E]' : ''
                }`}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : brief.id)}
                  className="w-full text-left p-5 flex items-start justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-[#1C1C1E] dark:text-white">{brief.title}</h3>
                      {isLatest && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#007AFF] bg-[#007AFF]/10 px-2 py-0.5 rounded-full">
                          Latest
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-[#8E8E93]">
                      <span>{new Date(brief.generated_at).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}</span>
                      <span>{brief.lead_count} leads</span>
                    </div>
                    {!isExpanded && (
                      <p className="text-sm text-[#8E8E93] mt-2 line-clamp-2">{brief.summary}</p>
                    )}
                  </div>
                  <svg
                    className={`w-5 h-5 text-[#8E8E93] mt-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-0 border-t border-black/5 dark:border-white/5">
                    <div className="prose prose-sm dark:prose-invert max-w-none mt-4 text-[#1C1C1E] dark:text-[#F2F2F7] whitespace-pre-wrap">
                      {brief.summary}
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-[#8E8E93]">
                      <span>Delivered: {brief.delivered ? 'Yes' : 'No'}</span>
                      {brief.territory_id && (
                        <span>· Territory ID: {brief.territory_id}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
