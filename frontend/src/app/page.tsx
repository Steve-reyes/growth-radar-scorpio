'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardStats, Lead, DailyBrief } from '@/lib/types';
import { apiGet } from '@/lib/api';

interface ImportBatchSummary {
  id: string;
  list_name: string;
  imported_at: string;
  count: number;
}

interface ImportListResponse {
  imports: ImportBatchSummary[];
}

function SkeletonCard() {
  return (
    <div className="dark-card p-5">
      <div className="skeleton h-4 w-24 mb-3" />
      <div className="skeleton h-8 w-16" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr>
      <td className="p-3"><div className="skeleton h-5 w-40" /></td>
      <td className="p-3"><div className="skeleton h-5 w-24" /></td>
      <td className="p-3"><div className="skeleton h-5 w-20" /></td>
    </tr>
  );
}

function ScoreBadge({ score }: { score: number }) {
  let cls = 'score-low';
  if (score > 70) cls = 'score-high';
  else if (score > 40) cls = 'score-mid';
  return (
    <span className={`score-mini-bar`}>
      <span className={`score-badge ${cls}`}>{score}</span>
      <span className="score-mini-bar-track">
        <span
          className="score-mini-bar-fill"
          style={{
            width: `${score}%`,
            background: score > 70 ? '#3B82F6' : score > 40 ? '#F59E0B' : '#EF4444',
          }}
        />
      </span>
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status-badge status-${status}`}>
      <span className={`status-dot status-dot-${status}`} />
      {status}
    </span>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [importBatches, setImportBatches] = useState<ImportBatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadCache, setLeadCache] = useState<Record<number, { name: string; score: number; city: string }>>({});
  const [sortKey, setSortKey] = useState<string>('hvac_score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'hvac_score' ? 'desc' : 'asc');
    }
  };

  const sortArrow = (key: string) => {
    if (sortKey !== key) return ' ↕';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  const sortedLeads = [...leads].sort((a, b) => {
    const getVal = (l: Lead, k: string): string | number => {
      if (k === 'hvac_score') return l.hvac_score;
      if (k === 'discovered_at') return l.discovered_at || '';
      return (l as any)[k]?.toLowerCase() || '';
    };
    const va = getVal(a, sortKey);
    const vb = getVal(b, sortKey);
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  useEffect(() => {
    async function load() {
      try {
        const [statsData, leadsData, importData] = await Promise.all([
          apiGet<DashboardStats>('/api/settings/stats').catch(() => null),
          apiGet<Lead[]>('/api/leads?limit=200').catch(() => []),
          apiGet<ImportListResponse>('/api/import/list').catch(() => ({ imports: [] })),
        ]);
        if (statsData) setStats(statsData);
        if (leadsData) setLeads(leadsData);
        if (importData?.imports) setImportBatches(importData.imports);

        const briefData = await apiGet<DailyBrief>('/api/briefs/latest').catch(() => null);
        if (briefData) {
          setBrief(briefData);
          fetchLeadNames(briefData);
        }
      } catch (e) {
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const fetchLeadNames = useCallback(async (b: DailyBrief) => {
    if (!b.top_lead_ids || b.top_lead_ids.length === 0) return;
    try {
      const leads = await Promise.all(
        b.top_lead_ids.map(id => apiGet<Lead>(`/api/leads/${id}`).catch(() => null))
      );
      const updates: Record<number, { name: string; score: number; city: string }> = {};
      leads.forEach(l => {
        if (l) updates[l.id] = { name: l.business_name, score: l.hvac_score, city: l.city || '' };
      });
      setLeadCache(prev => ({ ...prev, ...updates }));
    } catch {}
  }, []);

  const handleLeadClick = async (leadId: number) => {
    try {
      const lead = await apiGet<Lead>(`/api/leads/${leadId}`);
      setSelectedLead(lead);
    } catch {}
  };

  // Compute score distribution from permit leads
  const scoreRanges = [
    { label: '0-20', min: 0, max: 20 },
    { label: '21-40', min: 21, max: 40 },
    { label: '41-60', min: 41, max: 60 },
    { label: '61-80', min: 61, max: 80 },
    { label: '81-100', min: 81, max: 100 },
  ];
  const maxCount = leads.length > 0
    ? Math.max(...scoreRanges.map(r => leads.filter(l => l.hvac_score >= r.min && l.hvac_score <= r.max).length))
    : 1;

  const totalImported = importBatches.reduce((sum, b) => sum + b.count, 0);

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="dark-card p-8 text-center">
          <p className="text-[#EF4444] font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="page-breadcrumb mb-1">
            Dashboard <span className="page-breadcrumb-sep">/</span> <span className="text-[#94A3B8]">Overview</span>
          </div>
          <h1 className="text-2xl font-bold text-[#F1F5F9]">Dashboard</h1>
          <p className="text-sm text-[#64748B] mt-1">Overview of your HVAC business growth</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leads Analytics Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Combined Totals */}
          <div className="dark-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#F1F5F9]">Leads Analytics</h2>
              <div className="flex items-center gap-3">
                <a href="/leads-imported" className="text-xs text-[#3B82F6] hover:underline font-semibold">Imported →</a>
                <a href="/leads" className="text-xs text-[#3B82F6] hover:underline font-semibold">Permits →</a>
              </div>
            </div>
            {loading ? (
              <div className="grid grid-cols-4 gap-4">
                <div className="skeleton h-16 w-full"/>
                <div className="skeleton h-16 w-full"/>
                <div className="skeleton h-16 w-full"/>
                <div className="skeleton h-16 w-full"/>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.15)] rounded-xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-[#3B82F6] font-mono">{stats ? (stats.total_leads ?? 0) + totalImported : totalImported}</p>
                  <p className="text-xs text-[#64748B] mt-1">Total All Leads</p>
                </div>
                <div className="bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.15)] rounded-xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-[#3B82F6] font-mono">{stats?.total_leads ?? 0}</p>
                  <p className="text-xs text-[#64748B] mt-1">Permit Leads</p>
                </div>
                <div className="bg-[rgba(139,92,246,0.08)] border border-[rgba(139,92,246,0.15)] rounded-xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-[#8B5CF6] font-mono">{totalImported}</p>
                  <p className="text-xs text-[#64748B] mt-1">Imported Leads</p>
                </div>
                <div className="bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.15)] rounded-xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-[#F59E0B] font-mono">{stats ? (stats.average_hvac_score ?? 0).toFixed(1) : '0'}</p>
                  <p className="text-xs text-[#64748B] mt-1">Avg HVAC Score</p>
                </div>
              </div>
            )}
          </div>

          {/* Imported + Permit Details */}
          <div className="grid grid-cols-2 gap-6">
            {/* Imported Leads Detail */}
            <div className="dark-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-[#F1F5F9]">Imported</h3>
                <a href="/leads-imported" className="text-xs text-[#3B82F6] hover:underline">View All →</a>
              </div>
              {loading ? (
                <div className="space-y-3">
                  <div className="skeleton h-10 w-full"/>
                  <div className="skeleton h-10 w-full"/>
                  <div className="skeleton h-10 w-full"/>
                </div>
              ) : importBatches.length === 0 ? (
                <p className="text-sm text-[#64748B] text-center py-6">No imported leads yet</p>
              ) : (
                <>
                  <div className="space-y-3 mb-3">
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[rgba(139,92,246,0.06)] border border-[rgba(139,92,246,0.1)]">
                      <span className="text-xs text-[#64748B]">Import Lists</span>
                      <span className="text-lg font-extrabold text-[#8B5CF6] font-mono">{importBatches.length}</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[rgba(139,92,246,0.06)] border border-[rgba(139,92,246,0.1)]">
                      <span className="text-xs text-[#64748B]">Total Leads</span>
                      <span className="text-lg font-extrabold text-[#8B5CF6] font-mono">{totalImported}</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[rgba(139,92,246,0.06)] border border-[rgba(139,92,246,0.1)]">
                      <span className="text-xs text-[#64748B]">Avg per List</span>
                      <span className="text-lg font-extrabold text-[#8B5CF6] font-mono">{Math.round(totalImported / importBatches.length)}</span>
                    </div>
                  </div>
                  <div className="text-xs text-[#64748B] flex justify-between">
                    <span>Newest: {new Date(importBatches[0].imported_at).toLocaleDateString()}</span>
                    <span>Oldest: {new Date(importBatches[importBatches.length - 1].imported_at).toLocaleDateString()}</span>
                  </div>
                </>
              )}
            </div>

            {/* Permit Leads Detail */}
            <div className="dark-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-[#F1F5F9]">Permits</h3>
                <a href="/leads" className="text-xs text-[#3B82F6] hover:underline">View All →</a>
              </div>
              {loading ? (
                <div className="space-y-3">
                  <div className="skeleton h-10 w-full"/>
                  <div className="skeleton h-10 w-full"/>
                  <div className="skeleton h-10 w-full"/>
                </div>
              ) : leads.length === 0 ? (
                <p className="text-sm text-[#64748B] text-center py-6">No permit leads yet</p>
              ) : (
                <>
                  <div className="space-y-3 mb-3">
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[rgba(59,130,246,0.06)] border border-[rgba(59,130,246,0.1)]">
                      <span className="text-xs text-[#64748B]">Total Leads</span>
                      <span className="text-lg font-extrabold text-[#3B82F6] font-mono">{leads.length}</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[rgba(59,130,246,0.06)] border border-[rgba(59,130,246,0.1)]">
                      <span className="text-xs text-[#64748B]">Avg Score</span>
                      <span className="text-lg font-extrabold text-[#3B82F6] font-mono">{(leads.reduce((s, l) => s + l.hvac_score, 0) / leads.length).toFixed(1)}</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[rgba(59,130,246,0.06)] border border-[rgba(59,130,246,0.1)]">
                      <span className="text-xs text-[#64748B]">Cities</span>
                      <span className="text-lg font-extrabold text-[#3B82F6] font-mono">{new Set(leads.filter(l => l.city).map(l => l.city)).size}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#64748B]">
                    <span>High score: {Math.max(...leads.map(l => l.hvac_score))}</span>
                    <span>Low: {Math.min(...leads.map(l => l.hvac_score))}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Top Import Lists Quick Reference */}
          {!loading && importBatches.length > 0 && (
            <div className="dark-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[#F1F5F9]">Largest Import Lists</h3>
                <a href="/leads-imported" className="text-xs text-[#3B82F6] hover:underline">View All →</a>
              </div>
              <div className="space-y-2">
                {[...importBatches]
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 5)
                  .map((batch, i) => (
                    <div key={batch.id} className="flex items-center gap-3">
                      <span className="text-xs font-mono text-[#64748B] w-5 text-right">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[#F1F5F9] truncate">{batch.list_name}</span>
                          <span className="text-sm font-mono text-[#8B5CF6] font-semibold ml-3">{batch.count}</span>
                        </div>
                        <div className="mt-1 h-1.5 bg-[rgba(148,163,184,0.06)] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(batch.count / Math.max(...importBatches.map(b => b.count))) * 100}%`,
                              background: 'linear-gradient(90deg, #8B5CF6, #A78BFA)'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Score Distribution + Latest Brief */}
        <div className="space-y-6">
          <div className="dark-card p-5">
            <h2 className="text-base font-bold mb-4 text-[#F1F5F9]">Score Distribution</h2>
            <div className="space-y-3">
              {loading ? (
                <>
                  {scoreRanges.map((r, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[#64748B]">{r.label}</span>
                        <span className="skeleton h-4 w-8" />
                      </div>
                      <div className="h-6 bg-[rgba(148,163,184,0.06)] rounded-lg overflow-hidden">
                        <div className="skeleton h-full w-0" />
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                scoreRanges.map((range) => {
                  const count = leads.filter(l => l.hvac_score >= range.min && l.hvac_score <= range.max).length;
                  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  return (
                    <div key={range.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[#64748B]">{range.label}</span>
                        <span className="font-semibold text-[#F1F5F9] font-mono flex items-center gap-2">
                          <span>{count}</span>
                          <span className="text-xs text-[#64748B] font-normal">
                            ({maxCount > 0 ? Math.round((count / maxCount) * 100) : 0}%)
                          </span>
                        </span>
                      </div>
                      <div className="h-6 bg-[rgba(148,163,184,0.06)] rounded-lg overflow-hidden">
                        <div
                          className="score-bar score-bar-gradient"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
              {!loading && leads.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[rgba(148,163,184,0.06)]">
                  <div className="flex items-center gap-2 text-xs text-[#64748B]">
                    <span>Avg: <span className="font-mono text-[#94A3B8]">
                      {(leads.reduce((sum, l) => sum + l.hvac_score, 0) / leads.length).toFixed(1)}
                    </span></span>
                    <span className="text-[rgba(148,163,184,0.2)]">·</span>
                    <span>Total: <span className="font-mono text-[#94A3B8]">{leads.length}</span></span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recent Brief */}
          <div className="dark-card p-5">
            <h2 className="text-base font-bold mb-2 text-[#F1F5F9]">Latest Brief</h2>
            {loading ? (
              <div className="space-y-2">
                <div className="skeleton h-5 w-48" />
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-3/4" />
              </div>
            ) : brief ? (
              <div>
                <p className="text-sm font-semibold text-[#3B82F6] mb-1">{brief.title}</p>
                <div className="text-sm text-[#94A3B8] leading-relaxed line-clamp-5 whitespace-pre-wrap">
                  {brief.summary
                    .replace(/^#+\s*/gm, '')
                    .replace(/\*\*(.*?)\*\*/g, '$1')
                    .replace(/^- /gm, '  • ')
                    .replace(/—/g, '—')
                    .split('\n').filter(l => l.trim()).slice(0, 8).join('\n')}
                </div>

                {brief.top_lead_ids && brief.top_lead_ids.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {brief.top_lead_ids.map((id, i) => {
                      const cached = leadCache[id];
                      return (
                        <button
                          key={id}
                          onClick={() => handleLeadClick(id)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg
                            bg-[rgba(59,130,246,0.06)] border border-[rgba(59,130,246,0.12)]
                            hover:bg-[rgba(59,130,246,0.12)] hover:border-[rgba(59,130,246,0.25)]
                            transition-all duration-150 cursor-pointer text-left"
                        >
                          <span className="w-5 h-5 rounded-full bg-[rgba(59,130,246,0.15)] text-[#3B82F6] 
                            flex items-center justify-center text-[10px] font-bold font-mono shrink-0">
                            {i + 1}
                          </span>
                          <span className="flex-1 truncate text-[#F1F5F9] font-medium">
                            {cached ? cached.name : `Lead #${id}`}
                          </span>
                          {cached && (
                            <span className={`text-xs font-mono font-bold shrink-0 ${
                              cached.score > 70 ? 'text-[#3B82F6]' : cached.score > 40 ? 'text-[#F59E0B]' : 'text-[#EF4444]'
                            }`}>
                              {cached.score}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                <p className="text-xs text-[#64748B] mt-2 flex items-center gap-2">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="6" cy="6" r="5" />
                    <path d="M6 3v3l2 2" />
                  </svg>
                  {new Date(brief.generated_at).toLocaleDateString()} · {brief.lead_count} leads
                </p>
              </div>
            ) : (
              <p className="text-sm text-[#64748B]">No briefs generated yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : (
          <>
            <div className="dark-card-gradient p-5">
              <p className="text-xs font-bold text-[#64748B] uppercase tracking-[0.08em] mb-2">Total Territories</p>
              <div className="flex items-end gap-3">
                <p className="text-3xl font-extrabold text-[#F1F5F9] font-mono">{stats?.total_territories ?? 0}</p>
                <span className="trend-up text-xs font-semibold flex items-center gap-0.5 mb-1">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 7L5 3L9 7" />
                  </svg>
                  +12%
                </span>
              </div>
            </div>
            <div className="dark-card p-5">
              <p className="text-xs font-bold text-[#64748B] uppercase tracking-[0.08em] mb-2">Total Leads (Permits)</p>
              <div className="flex items-end gap-3">
                <p className="text-3xl font-extrabold text-[#F1F5F9] font-mono">{stats?.total_leads ?? 0}</p>
                <span className="trend-up text-xs font-semibold flex items-center gap-0.5 mb-1">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 7L5 3L9 7" />
                  </svg>
                  +8%
                </span>
              </div>
            </div>
            <div className="dark-card p-5">
              <p className="text-xs font-bold text-[#64748B] uppercase tracking-[0.08em] mb-2">Imported Leads</p>
              <div className="flex items-end gap-3">
                <p className="text-3xl font-extrabold text-[#8B5CF6] font-mono">{totalImported}</p>
                <span className="text-xs text-[#64748B] font-mono">{importBatches.length} lists</span>
              </div>
            </div>
            <div className="dark-card p-5">
              <p className="text-xs font-bold text-[#64748B] uppercase tracking-[0.08em] mb-2">Avg HVAC Score</p>
              <div className="flex items-end gap-3">
                <p className="text-3xl font-extrabold text-[#3B82F6] font-mono">{stats ? (stats.average_hvac_score ?? 0).toFixed(1) : '0'}</p>
                <span className="trend-up text-xs font-semibold flex items-center gap-0.5 mb-1">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 7L5 3L9 7" />
                  </svg>
                  +5%
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div className="modal-overlay" onClick={() => setSelectedLead(null)}>
          <div
            className="dark-card p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto modal-glow"
            onClick={e => e.stopPropagation()}
          >
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
                <div className="col-span-2">
                  <span className="text-[#64748B]">Address:</span> {selectedLead.address}
                </div>
              )}
              {selectedLead.phone && (
                <div>
                  <span className="text-[#64748B]">Phone:</span>{' '}
                  <a href={`tel:${selectedLead.phone}`} className="text-[#3B82F6] hover:underline">{selectedLead.phone}</a>
                </div>
              )}
              {selectedLead.email && (
                <div>
                  <span className="text-[#64748B]">Email:</span>{' '}
                  <a href={`mailto:${selectedLead.email}`} className="text-[#3B82F6] hover:underline">{selectedLead.email}</a>
                </div>
              )}
              {selectedLead.website && (
                <div>
                  <span className="text-[#64748B]">Website:</span>{' '}
                  <a href={selectedLead.website} target="_blank" className="text-[#3B82F6] hover:underline">
                    {selectedLead.website}
                  </a>
                </div>
              )}
              <div>
                <span className="text-[#64748B]">Type:</span> {selectedLead.business_type || '-'}
              </div>
              <div>
                <span className="text-[#64748B]">Source:</span> {selectedLead.lead_source || '-'}
              </div>
              <div>
                <span className="text-[#64748B]">Status:</span>{' '}
                <span className={`status-badge status-${selectedLead.status}`}>{selectedLead.status}</span>
              </div>
              {selectedLead.score_reason && (
                <div className="col-span-2">
                  <span className="text-[#64748B]">Score Reason:</span> {selectedLead.score_reason}
                </div>
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
              <button
                onClick={() => setSelectedLead(null)}
                className="dark-pill dark-pill-secondary flex-1"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
