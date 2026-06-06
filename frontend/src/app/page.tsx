'use client';

import { useState, useEffect } from 'react';
import { DashboardStats, Lead, DailyBrief } from '@/lib/types';
import { apiGet } from '@/lib/api';

function SkeletonCard() {
  return (
    <div className="ios-card p-5">
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
      <td className="p-3"><div className="skeleton h-5 w-12" /></td>
      <td className="p-3"><div className="skeleton h-5 w-20" /></td>
      <td className="p-3"><div className="skeleton h-5 w-28" /></td>
    </tr>
  );
}

function ScoreBadge({ score }: { score: number }) {
  let cls = 'score-low';
  if (score > 70) cls = 'score-high';
  else if (score > 40) cls = 'score-mid';
  return <span className={`score-badge ${cls}`}>{score}</span>;
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge status-${status}`}>{status}</span>;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [statsData, leadsData] = await Promise.all([
          apiGet<DashboardStats>('/api/settings/stats').catch(() => null),
          apiGet<Lead[]>('/api/leads?limit=50').catch(() => [])
        ]);
        if (statsData) setStats(statsData);
        if (leadsData) setLeads(leadsData);

        const briefData = await apiGet<DailyBrief>('/api/briefs/latest').catch(() => null);
        if (briefData) setBrief(briefData);
      } catch (e) {
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Compute score distribution from leads
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

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="ios-card p-8 text-center">
          <p className="text-[#FF3B30] font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : (
          <>
            <div className="ios-card p-5">
              <p className="text-sm font-bold text-[#636366] uppercase tracking-[0.05em] mb-1">Total Territories</p>
              <p className="text-4xl font-extrabold text-[#1C1C1E] dark:text-white">{stats?.total_territories ?? 0}</p>
            </div>
            <div className="ios-card p-5">
              <p className="text-sm font-bold text-[#636366] uppercase tracking-[0.05em] mb-1">Total Leads</p>
              <p className="text-4xl font-extrabold text-[#1C1C1E] dark:text-white">{stats?.total_leads ?? 0}</p>
            </div>
            <div className="ios-card p-5">
              <p className="text-sm font-bold text-[#636366] uppercase tracking-[0.05em] mb-1">Leads Today</p>
              <p className="text-4xl font-extrabold text-[#1C1C1E] dark:text-white">{stats?.leads_today ?? 0}</p>
            </div>
            <div className="ios-card p-5">
              <p className="text-sm font-bold text-[#636366] uppercase tracking-[0.05em] mb-1">Avg HVAC Score</p>
              <p className="text-4xl font-extrabold text-[#004BB5] dark:text-[#64B5FF]">{stats ? (stats.average_hvac_score ?? 0).toFixed(1) : '0'}</p>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Leads Table */}
        <div className="lg:col-span-2 ios-card overflow-hidden">
          <div className="px-5 py-4 border-b border-black/5 dark:border-white/5">
            <h2 className="text-lg font-bold text-[#1C1C1E] dark:text-white">Recent Leads</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="ios-table">
              <thead>
                <tr>
                  <th className="text-xs font-bold text-[#636366] uppercase tracking-[0.08em] px-4 py-3 text-left">Business</th>
                  <th className="text-xs font-bold text-[#636366] uppercase tracking-[0.08em] px-4 py-3 text-left">City</th>
                  <th className="text-xs font-bold text-[#636366] uppercase tracking-[0.08em] px-4 py-3 text-left">Type</th>
                  <th className="text-xs font-bold text-[#636366] uppercase tracking-[0.08em] px-4 py-3 text-left">Score</th>
                  <th className="text-xs font-bold text-[#636366] uppercase tracking-[0.08em] px-4 py-3 text-left">Status</th>
                  <th className="text-xs font-bold text-[#636366] uppercase tracking-[0.08em] px-4 py-3 text-left">Discovered</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <>
                    <SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow />
                  </>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-[#8E8E93]">No leads yet</td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                      <td className="font-semibold text-[#1C1C1E] dark:text-white">{lead.business_name}</td>
                      <td className="text-[#636366] dark:text-[#C7C7CC]">{lead.city || '-'}</td>
                      <td className="text-[#636366] dark:text-[#C7C7CC] max-w-[200px] truncate">{lead.business_type || '-'}</td>
                      <td><ScoreBadge score={lead.hvac_score} /></td>
                      <td><StatusBadge status={lead.status} /></td>
                      <td className="text-sm text-[#8E8E93]">
                        {lead.discovered_at ? new Date(lead.discovered_at).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Score Distribution */}
        <div className="space-y-6">
          <div className="ios-card p-5">
            <h2 className="text-lg font-bold mb-4 text-[#1C1C1E] dark:text-white">Score Distribution</h2>
            <div className="space-y-3">
              {loading ? (
                <>
                  {scoreRanges.map((r, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[#8E8E93]">{r.label}</span>
                        <span className="skeleton h-4 w-8" />
                      </div>
                      <div className="h-6 bg-[#F2F2F7] dark:bg-[#3A3A3C] rounded-lg overflow-hidden">
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
                        <span className="text-[#8E8E93]">{range.label}</span>
                        <span className="font-semibold text-[#1C1C1E] dark:text-white">{count}</span>
                      </div>
                      <div className="h-6 bg-[#F2F2F7] dark:bg-[#3A3A3C] rounded-lg overflow-hidden">
                        <div
                          className="score-bar bg-[#007AFF]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Brief */}
          <div className="ios-card p-5">
            <h2 className="text-lg font-bold mb-2 text-[#1C1C1E] dark:text-white">Latest Brief</h2>
            {loading ? (
              <div className="space-y-2">
                <div className="skeleton h-5 w-48" />
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-3/4" />
              </div>
            ) : brief ? (
              <div>
                <p className="text-sm font-semibold text-[#007AFF] mb-1">{brief.title}</p>
                <div className="text-sm text-[#3A3A3C] dark:text-[#E5E5EA] leading-relaxed line-clamp-6">
                  {brief.summary
                    .replace(/\*\*(.*?)\*\*/g, '$1')
                    .replace(/^## /gm, '')
                    .replace(/^\- /gm, '• ')
                    .split('\n').slice(0, 12).join('\n')}
                </div>
                <p className="text-xs text-[#8E8E93] mt-2">
                  {new Date(brief.generated_at).toLocaleDateString()} · {brief.lead_count} leads
                </p>
              </div>
            ) : (
              <p className="text-sm text-[#8E8E93]">No briefs generated yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
