'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Territory, Lead } from '@/lib/types';
import { apiGet, apiPost } from '@/lib/api';

function ScoreBadge({ score }: { score: number }) {
  let cls = 'score-low';
  if (score > 70) cls = 'score-high';
  else if (score > 40) cls = 'score-mid';
  return <span className={`score-badge ${cls}`}>{score}</span>;
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge status-${status}`}>{status}</span>;
}

export default function TerritoryDetailClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [territory, setTerritory] = useState<Territory | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterMinScore, setFilterMinScore] = useState(0);

  const showToast = (msg: string, type: string) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    async function load() {
      try {
        const [t, leadsData] = await Promise.all([
          apiGet<Territory>(`/api/territories/${id}`),
          apiGet<Lead[]>(`/api/leads?territory_id=${id}`),
        ]);
        setTerritory(t);
        setLeads(leadsData);
      } catch {
        showToast('Failed to load territory', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleIngest = async () => {
    setIngesting(true);
    try {
      await apiPost(`/api/territories/${id}/ingest`);
      showToast('Ingestion started', 'success');
    } catch {
      showToast('Failed to start ingestion', 'error');
    } finally {
      setIngesting(false);
    }
  };

  const handleGenerateBrief = async () => {
    setGenerating(true);
    try {
      await apiPost(`/api/briefs/generate?territory_id=${id}`);
      showToast('Brief generated', 'success');
    } catch {
      showToast('Failed to generate brief', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const filteredLeads = leads.filter(l => {
    if (filterStatus && l.status !== filterStatus) return false;
    if (filterType && l.business_type !== filterType) return false;
    if (l.hvac_score < filterMinScore) return false;
    return true;
  });

  const uniqueTypes = [...new Set(leads.map(l => l.business_type).filter(Boolean))];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48 mb-2" />
        <div className="skeleton h-6 w-64" />
        <div className="skeleton h-64 w-full mt-6" />
      </div>
    );
  }

  if (!territory) {
    return (
      <div className="ios-card p-8 text-center">
        <p className="text-[#FF3B30] font-semibold">Territory not found</p>
        <Link href="/territories" className="text-[#007AFF] text-sm mt-2 inline-block">Back to territories</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2">
        <Link href="/territories" className="text-sm text-[#007AFF] font-semibold hover:underline">
          ← Territories
        </Link>
      </div>

      {/* Territory Header */}
      <div className="ios-card p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[#1C1C1E] dark:text-white">{territory.name}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                territory.is_active
                  ? 'bg-[#34C759]/10 text-[#34C759]'
                  : 'bg-[#8E8E93]/10 text-[#8E8E93]'
              }`}>
                {territory.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-sm text-[#8E8E93] mt-1">
              {territory.city}, {territory.province}
              {territory.postal_code && ` · ${territory.postal_code}`}
              {territory.radius_km && ` · ${territory.radius_km}km radius`}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleIngest}
              disabled={ingesting}
              className="ios-pill ios-pill-primary disabled:opacity-50"
            >
              {ingesting ? 'Ingesting...' : 'Run Ingestion'}
            </button>
            <button
              onClick={handleGenerateBrief}
              disabled={generating}
              className="ios-pill ios-pill-secondary disabled:opacity-50"
            >
              {generating ? 'Generating...' : 'Generate Brief'}
            </button>
          </div>
        </div>
        <div className="flex gap-6 mt-4 pt-4 border-t border-black/5 dark:border-white/5">
          <div>
            <span className="text-sm text-[#8E8E93]">Total Leads</span>
            <p className="text-xl font-bold text-[#1C1C1E] dark:text-white">{territory.lead_count ?? leads.length}</p>
          </div>
          <div>
            <span className="text-sm text-[#8E8E93]">Avg Score</span>
            <p className="text-xl font-bold text-[#007AFF]">
              {territory.avg_score ? territory.avg_score.toFixed(1) : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          className="ios-select"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="converted">Converted</option>
          <option value="dismissed">Dismissed</option>
        </select>
        <select
          className="ios-select"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="">All Types</option>
          {uniqueTypes.map(t => (
            <option key={t} value={t!}>{t}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#8E8E93] font-medium">Min Score:</span>
          <input
            type="range"
            min={0}
            max={100}
            value={filterMinScore}
            onChange={e => setFilterMinScore(Number(e.target.value))}
            className="w-24 accent-[#007AFF]"
          />
          <span className="text-sm font-semibold text-[#1C1C1E] dark:text-white">{filterMinScore}</span>
        </div>
      </div>

      {/* Leads List */}
      <div className="ios-card overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5 dark:border-white/5">
          <h2 className="text-lg font-bold text-[#1C1C1E] dark:text-white">
            Leads ({filteredLeads.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="ios-table">
            <thead>
              <tr>
                <th>Business</th>
                <th>City</th>
                <th>Type</th>
                <th>Score</th>
                <th>Status</th>
                <th>Source</th>
                <th>Discovered</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-[#8E8E93]">No leads match filters</td>
                </tr>
              ) : (
                filteredLeads.map(lead => (
                  <tr key={lead.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                    <td className="font-semibold text-[#1C1C1E] dark:text-white">{lead.business_name}</td>
                    <td className="text-[#8E8E93]">{lead.city || '-'}</td>
                    <td className="text-[#8E8E93]">{lead.business_type || '-'}</td>
                    <td><ScoreBadge score={lead.hvac_score} /></td>
                    <td><StatusBadge status={lead.status} /></td>
                    <td className="text-sm text-[#8E8E93]">{lead.lead_source || '-'}</td>
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

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
