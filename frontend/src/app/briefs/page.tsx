'use client';

import { useState, useEffect, useCallback } from 'react';
import { DailyBrief, Lead } from '@/lib/types';
import { apiGet, apiPost } from '@/lib/api';

function cleanSummary(text: string): string {
  return text
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^- /gm, '  • ')
    .replace(/—/g, '—')
    .trim();
}

function parseStatLine(line: string): { total?: string; avg?: string; hot?: string } | null {
  const m = line.match(/Leads:\s*(\d+)\s*.*?Avg Score:\s*(\d+)\/100\s*.*?Hot Leads:\s*(\d+)/);
  if (m) return { total: m[1], avg: m[2], hot: m[3] };
  return null;
}

export default function BriefsPage() {
  const [briefs, setBriefs] = useState<DailyBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadCache, setLeadCache] = useState<Record<number, { name: string; score: number; city: string }>>({});

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

  const fetchLeadNames = useCallback(async (brief: DailyBrief) => {
    if (!brief.top_lead_ids || brief.top_lead_ids.length === 0) return;
    const ids = brief.top_lead_ids.filter(id => !leadCache[id]);
    if (ids.length === 0) return;
    try {
      const leads = await Promise.all(
        ids.map(id => apiGet<Lead>(`/api/leads/${id}`).catch(() => null))
      );
      const updates: Record<number, { name: string; score: number; city: string }> = {};
      leads.forEach(l => {
        if (l) updates[l.id] = { name: l.business_name, score: l.hvac_score, city: l.city || '' };
      });
      setLeadCache(prev => ({ ...prev, ...updates }));
    } catch {}
  }, [leadCache]);

  const handleExpand = (brief: DailyBrief) => {
    const id = expandedId === brief.id ? null : brief.id;
    setExpandedId(id);
    if (id !== null) fetchLeadNames(brief);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await apiPost<any>('/api/briefs/generate');
      const newBriefs = result.briefs || [];
      setBriefs(prev => [...newBriefs, ...prev]);
      if (newBriefs.length > 0) {
        setExpandedId(newBriefs[0].id);
        fetchLeadNames(newBriefs[0]);
      }
      showToast('Brief generated', 'success');
    } catch {
      showToast('Failed to generate brief', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleLeadClick = async (leadId: number) => {
    try {
      const lead = await apiGet<Lead>(`/api/leads/${leadId}`);
      setSelectedLead(lead);
    } catch {
      showToast('Failed to load lead details', 'error');
    }
  };

  const renderSummarySections = (brief: DailyBrief) => {
    const lines = cleanSummary(brief.summary).split('\n').filter(l => l.trim());
    const sections: { type: 'header' | 'stats' | 'lead' | 'bullet' | 'other'; text: string; leadId?: number }[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('Territory:')) {
        sections.push({ type: 'header', text: trimmed.replace('Territory:', '').trim() });
      } else if (trimmed.startsWith('Top Leads')) {
        sections.push({ type: 'header', text: 'Top Leads to Prioritize' });
      } else if (trimmed.startsWith('Other Hot Leads')) {
        sections.push({ type: 'header', text: 'Other Hot Leads' });
      } else if (/^\d+\.\s/.test(trimmed)) {
        // Numbered lead — find index position in top_lead_ids
        const idx = sections.filter(s => s.type === 'lead').length;
        const leadId = brief.top_lead_ids?.[idx];
        sections.push({ type: 'lead', text: trimmed.replace(/^\d+\.\s*/, ''), leadId });
      } else if (trimmed.startsWith('•')) {
        sections.push({ type: 'bullet', text: trimmed.replace(/^•\s*/, '') });
      } else if (/^Leads:/.test(trimmed)) {
        sections.push({ type: 'stats', text: trimmed });
      } else if (trimmed) {
        sections.push({ type: 'other', text: trimmed });
      }
    }

    return sections;
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="page-breadcrumb mb-1">
            Daily Brief <span className="page-breadcrumb-sep">/</span> <span className="text-[#94A3B8]">AI Insights</span>
          </div>
          <h1 className="text-2xl font-bold text-[#F1F5F9]">Daily Briefs</h1>
          <p className="text-sm text-[#64748B] mt-1">AI-powered insights and summaries of your leads</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="dark-pill dark-pill-primary disabled:opacity-50 hover-lift"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
            <path d="M8 1v14M1 8h14" />
          </svg>
          {generating ? 'Generating...' : 'Generate Now'}
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="dark-card p-5">
              <div className="skeleton h-6 w-48 mb-3" />
              <div className="skeleton h-4 w-32 mb-2" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-3/4 mt-1" />
            </div>
          ))}
        </div>
      ) : briefs.length === 0 ? (
        <div className="dark-card p-12 text-center">
          <p className="text-lg font-semibold text-[#64748B] mb-2">No briefs yet</p>
          <p className="text-sm text-[#64748B] mb-4">Generate your first daily brief to get AI-powered insights</p>
          <button onClick={handleGenerate} disabled={generating} className="dark-pill dark-pill-primary disabled:opacity-50">
            {generating ? 'Generating...' : 'Generate Now'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {briefs.map((brief, index) => {
            const isLatest = index === 0;
            const isExpanded = expandedId === brief.id;
            const sections = isExpanded ? renderSummarySections(brief) : [];
            const statsSection = sections.find(s => s.type === 'stats');
            const statLine = statsSection ? parseStatLine(statsSection.text) : null;

            return (
              <div
                key={brief.id}
                className={`dark-card overflow-hidden transition-all duration-300 ${
                  isLatest ? 'ring-1 ring-[rgba(16,185,129,0.25)] ring-offset-1 ring-offset-[#0F1117]' : ''
                }`}
              >
                <button
                  onClick={() => handleExpand(brief)}
                  className="w-full text-left p-5 flex items-start justify-between gap-4 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-[#F1F5F9] group-hover:text-[#10B981] transition-colors">{brief.title}</h3>
                      {isLatest && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#10B981] bg-[rgba(16,185,129,0.12)] px-2.5 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shadow-[0_0_4px_rgba(16,185,129,0.5)]" />
                          Latest
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-[#64748B]">
                      <span className="flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="6" cy="6" r="5" />
                          <path d="M6 3v3l2 2" />
                        </svg>
                        {new Date(brief.generated_at).toLocaleDateString('en-US', {
                          weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                        })}
                      </span>
                      <span><span className="font-mono text-[#94A3B8]">{brief.lead_count}</span> leads</span>
                    </div>
                    {!isExpanded && (
                      <p className="text-sm text-[#94A3B8] mt-2 line-clamp-2 leading-relaxed">{cleanSummary(brief.summary).split('\n').filter(l => l.trim()).slice(0, 3).join(' · ')}</p>
                    )}
                  </div>
                  <svg
                    className={`w-5 h-5 text-[#64748B] mt-1 transition-all duration-300 shrink-0 ${
                      isExpanded ? 'rotate-180 text-[#10B981]' : 'group-hover:text-[#94A3B8]'
                    }`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isExpanded && (
                  <div className="brief-content">
                    <div className="px-5 pb-5 pt-0 border-t border-[rgba(148,163,184,0.06)]">
                      {/* Territory Header */}
                      {sections.filter(s => s.type === 'header' && s.text !== 'Top Leads to Prioritize' && s.text !== 'Other Hot Leads').map((s, i) => (
                        <div key={i} className="mt-4">
                          <h4 className="text-base font-bold text-[#F1F5F9]">{s.text}</h4>
                        </div>
                      ))}

                      {/* Stats Bar */}
                      {statLine && (
                        <div className="mt-3 flex gap-4">
                          {[
                            { label: 'Total Leads', value: statLine.total, color: 'text-[#94A3B8]' },
                            { label: 'Avg Score', value: statLine.avg, color: 'text-[#10B981]' },
                            { label: 'Hot Leads', value: statLine.hot, color: 'text-[#F59E0B]' },
                          ].map((s, i) => (
                            <div key={i} className="bg-[rgba(148,163,184,0.06)] rounded-lg px-4 py-2.5 flex-1 text-center">
                              <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">{s.label}</p>
                              <p className={`text-xl font-mono font-bold ${s.color}`}>{s.value || '-'}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Top Leads Section */}
                      {(sections.filter(s => s.type === 'header' && s.text === 'Top Leads to Prioritize').length > 0 || (brief.top_lead_ids && brief.top_lead_ids.length > 0)) && (
                        <div className="mt-5">
                          <h5 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-3">Top Leads to Prioritize</h5>
                          <div className="space-y-2">
                            {(brief.top_lead_ids || []).map((leadId, i) => {
                              const cached = leadId ? leadCache[leadId] : null;
                              return (
                                <button
                                  key={leadId || i}
                                  onClick={(e) => { e.stopPropagation(); if (leadId) handleLeadClick(leadId); }}
                                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg
                                    bg-[rgba(16,185,129,0.06)] border border-[rgba(16,185,129,0.12)]
                                    hover:bg-[rgba(16,185,129,0.12)] hover:border-[rgba(16,185,129,0.25)]
                                    transition-all duration-150 cursor-pointer text-left group/lead"
                                >
                                  <span className="w-6 h-6 rounded-full bg-[rgba(16,185,129,0.15)] text-[#10B981] 
                                    flex items-center justify-center text-xs font-bold font-mono shrink-0">
                                    {i + 1}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-[#F1F5F9] group-hover/lead:text-[#10B981] transition-colors truncate">
                                      {cached ? cached.name : `Loading...`}
                                    </p>
                                    {cached && (
                                      <p className="text-xs text-[#64748B] mt-0.5">{cached.city} · Score: {cached.score}</p>
                                    )}
                                  </div>
                                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#64748B] group-hover/lead:text-[#10B981] shrink-0">
                                    <path d="M5 3l4 4-4 4" />
                                  </svg>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Other Hot Leads */}
                      {sections.filter(s => s.type === 'header' && s.text === 'Other Hot Leads').length > 0 && (
                        <div className="mt-5">
                          <h5 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">Other Hot Leads</h5>
                          <div className="space-y-1">
                            {sections.filter(s => s.type === 'bullet').map((s, i) => (
                              <p key={i} className="text-sm text-[#94A3B8] pl-2 border-l-2 border-[rgba(245,158,11,0.3)]">
                                {s.text}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Other content */}
                      {sections.filter(s => s.type === 'other').map((s, i) => (
                        <p key={i} className="text-sm text-[#94A3B8] mt-3">{s.text}</p>
                      ))}

                      {/* Footer */}
                      <div className="mt-5 flex items-center gap-3 text-xs text-[#64748B] pt-3 border-t border-[rgba(148,163,184,0.04)]">
                        <span className="flex items-center gap-1">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 3h8M2 6h8M2 9h5" />
                          </svg>
                          Delivered: {brief.delivered ? 'Yes' : 'No'}
                        </span>
                        {brief.territory_id && (
                          <span className="flex items-center gap-1">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M6 1L7.5 4L10.5 4.5L8.5 7L9 10L6 8.5L3 10L3.5 7L1.5 4.5L4.5 4L6 1Z" />
                            </svg>
                            Territory: {brief.territory_id}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div className="modal-overlay" onClick={() => setSelectedLead(null)}>
          <div className="dark-card p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto modal-glow" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-[#F1F5F9]">{selectedLead.business_name}</h2>
                <p className="text-sm text-[#94A3B8]">
                  {[selectedLead.city, selectedLead.province].filter(Boolean).join(', ')}
                </p>
              </div>
              <span className={`score-badge ${selectedLead.hvac_score > 70 ? 'score-high' : selectedLead.hvac_score > 40 ? 'score-mid' : 'score-low'}`}>
                {selectedLead.hvac_score}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              {selectedLead.address && (
                <div className="col-span-2"><span className="text-[#64748B]">Address:</span> {selectedLead.address}</div>
              )}
              {selectedLead.phone && (
                <div><span className="text-[#64748B]">Phone:</span>{' '}
                <a href={`tel:${selectedLead.phone}`} className="text-[#10B981] hover:underline">{selectedLead.phone}</a></div>
              )}
              {selectedLead.email && (
                <div><span className="text-[#64748B]">Email:</span>{' '}
                <a href={`mailto:${selectedLead.email}`} className="text-[#10B981] hover:underline">{selectedLead.email}</a></div>
              )}
              {(selectedLead.licence_fee || selectedLead.num_employees) && (
                <div className="col-span-2 flex gap-4">
                  {selectedLead.licence_fee && (
                    <span className="text-sm"><span className="text-[#64748B]">Fee:</span> <span className="text-[#F1F5F9] font-mono">${selectedLead.licence_fee.toLocaleString()}</span></span>
                  )}
                  {selectedLead.num_employees && (
                    <span className="text-sm"><span className="text-[#64748B]">Emp:</span> <span className="text-[#F1F5F9] font-mono">{selectedLead.num_employees}</span></span>
                  )}
                </div>
              )}
              {selectedLead.website && (
                <div>
                  <span className="text-[#64748B]">Website:</span>{' '}
                  <a href={selectedLead.website} target="_blank" className="text-[#10B981] hover:underline">{selectedLead.website}</a>
                </div>
              )}
              <div><span className="text-[#64748B]">Type:</span> {selectedLead.business_type || '-'}</div>
              <div><span className="text-[#64748B]">Source:</span> {selectedLead.lead_source || '-'}</div>
              <div>
                <span className="text-[#64748B]">Status:</span>{' '}
                <span className={`status-badge status-${selectedLead.status}`}>{selectedLead.status}</span>
              </div>
              {selectedLead.score_reason && (
                <div className="col-span-2"><span className="text-[#64748B]">Score Reason:</span> {selectedLead.score_reason}</div>
              )}
            </div>
            <div className="flex gap-2">
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(selectedLead.business_name + ' ' + (selectedLead.city || '') + ' phone website')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="dark-pill dark-pill-secondary flex-1 text-center no-underline"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1.5">
                  <circle cx="6" cy="6" r="4.5" />
                  <path d="M9.5 9.5L13 13" />
                </svg>
                Search Google
              </a>
              <button onClick={() => setSelectedLead(null)} className="dark-pill dark-pill-secondary flex-1">Close</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            {toast.type === 'success' ? <path d="M3 8L6 11L13 4" /> : <circle cx="8" cy="8" r="6" />}
          </svg>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
