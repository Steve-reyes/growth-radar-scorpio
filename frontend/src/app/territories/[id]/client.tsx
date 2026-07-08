'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Territory, Lead } from '@/lib/types';
import { apiGet, apiPost, apiDelete } from '@/lib/api';

function ScoreBadge({ score }: { score: number }) {
  let cls = 'score-low';
  if (score > 70) cls = 'score-high';
  else if (score > 40) cls = 'score-mid';
  return (
    <span className="score-mini-bar">
      <span className={`score-badge ${cls}`}>{score}</span>
      <span className="score-mini-bar-track">
        <span
          className="score-mini-bar-fill"
          style={{
            width: `${score}%`,
            background: score > 70 ? '#10B981' : score > 40 ? '#F59E0B' : '#EF4444',
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

export default function TerritoryDetailClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [territory, setTerritory] = useState<Territory | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterMinScore, setFilterMinScore] = useState(0);
  const [sortKey, setSortKey] = useState<string>('business_name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortArrow = (key: string) => {
    if (sortKey !== key) return ' ↕';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  const getVal = (l: Lead, k: string): string | number => {
    if (k === 'hvac_score') return l.hvac_score;
    if (k === 'discovered_at') return l.discovered_at || '';
    return (l as any)[k]?.toLowerCase() || '';
  };

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

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiDelete(`/api/territories/${id}`);
      showToast('Territory deleted', 'success');
      setTimeout(() => router.push('/territories'), 1000);
    } catch {
      showToast('Failed to delete territory', 'error');
      setDeleting(false);
    }
    setShowDeleteConfirm(false);
  };

  const filteredLeads = leads.filter(l => {
    if (filterStatus && l.status !== filterStatus) return false;
    if (filterType && l.business_type !== filterType) return false;
    if (l.hvac_score < filterMinScore) return false;
    return true;
  });

  const sortedLeads = [...filteredLeads].sort((a, b) => {
    const va = getVal(a, sortKey);
    const vb = getVal(b, sortKey);
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
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
      <div className="dark-card p-8 text-center">
        <p className="text-[#EF4444] font-semibold">Territory not found</p>
        <Link href="/territories" className="text-[#10B981] text-sm mt-2 inline-block hover:underline">Back to territories</Link>
      </div>
    );
  }

  const avgScoreColor = territory.avg_score
    ? territory.avg_score > 70 ? '#10B981' : territory.avg_score > 40 ? '#F59E0B' : '#EF4444'
    : '#64748B';

  return (
    <div>
      {/* Breadcrumb */}
      <div className="page-breadcrumb mb-2">
        <Link href="/territories">Territories</Link>
        <span className="page-breadcrumb-sep">/</span>
        <span className="text-[#94A3B8]">{territory.name}</span>
      </div>

      {/* Territory Header */}
      <div className="dark-card p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[#F1F5F9]">{territory.name}</h1>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                territory.is_active
                  ? 'bg-[rgba(16,185,129,0.15)] text-[#10B981]'
                  : 'bg-[rgba(100,116,139,0.15)] text-[#64748B]'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  territory.is_active ? 'bg-[#10B981] shadow-[0_0_4px_rgba(16,185,129,0.5)]' : 'bg-[#64748B]'
                }`} />
                {territory.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-sm text-[#94A3B8] mt-1">
              {territory.city}, {territory.province}
              {territory.postal_code && ` · ${territory.postal_code}`}
              {territory.radius_km && ` · ${territory.radius_km}km radius`}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleIngest}
              disabled={ingesting}
              className="dark-pill dark-pill-primary disabled:opacity-50 hover-lift"
            >
              {ingesting ? 'Ingesting...' : 'Run Ingestion'}
            </button>
            <button
              onClick={handleGenerateBrief}
              disabled={generating}
              className="dark-pill dark-pill-secondary disabled:opacity-50 hover-lift"
            >
              {generating ? 'Generating...' : 'Generate Brief'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="dark-pill text-[#EF4444] border border-[rgba(239,68,68,0.3)] hover:bg-[rgba(239,68,68,0.1)] disabled:opacity-50 hover-lift"
            >
              Delete
            </button>
          </div>
        </div>
        <div className="flex gap-8 mt-4 pt-4 border-t border-[rgba(148,163,184,0.06)]">
          <div>
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Total Leads</span>
            <p className="trit-stat-value text-[#F1F5F9] font-mono">{territory.total_leads ?? leads.length}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Avg Score</span>
            <p className="trit-stat-value font-mono" style={{ color: avgScoreColor }}>
              {territory.avg_score ? territory.avg_score.toFixed(1) : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <select
          className="dark-select"
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
          className="dark-select"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="">All Types</option>
          {uniqueTypes.map(t => (
            <option key={t} value={t!}>{t}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#64748B] font-semibold uppercase tracking-wide">Min Score:</span>
          <input
            type="range"
            min={0}
            max={100}
            value={filterMinScore}
            onChange={e => setFilterMinScore(Number(e.target.value))}
            className="w-20"
          />
          <span className="text-sm font-semibold text-[#10B981] font-mono w-7 text-right">{filterMinScore}</span>
        </div>
      </div>

      {/* Leads List */}
      <div className="dark-card overflow-hidden">
        <div className="px-5 py-4 border-b border-[rgba(148,163,184,0.06)]">
          <h2 className="text-base font-bold text-[#F1F5F9]">
            Leads <span className="font-mono text-[#10B981]">({sortedLeads.length})</span>
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="dark-table">
            <thead>
              <tr>
                <th className="cursor-pointer hover:text-[#10B981] select-none" onClick={() => handleSort('business_name')}>
                  Business<span className="text-[#64748B] text-xs ml-1">{sortArrow('business_name')}</span>
                </th>
                <th className="cursor-pointer hover:text-[#10B981] select-none" onClick={() => handleSort('phone')}>
                  Phone<span className="text-[#64748B] text-xs ml-1">{sortArrow('phone')}</span>
                </th>
                <th className="cursor-pointer hover:text-[#10B981] select-none" onClick={() => handleSort('email')}>
                  Email<span className="text-[#64748B] text-xs ml-1">{sortArrow('email')}</span>
                </th>
                <th className="cursor-pointer hover:text-[#10B981] select-none text-right" onClick={() => handleSort('licence_fee')}>
                  Fee<span className="text-[#64748B] text-xs ml-1">{sortArrow('licence_fee')}</span>
                </th>
                <th className="cursor-pointer hover:text-[#10B981] select-none text-right" onClick={() => handleSort('num_employees')}>
                  Emp<span className="text-[#64748B] text-xs ml-1">{sortArrow('num_employees')}</span>
                </th>
                <th className="cursor-pointer hover:text-[#10B981] select-none" onClick={() => handleSort('city')}>
                  City<span className="text-[#64748B] text-xs ml-1">{sortArrow('city')}</span>
                </th>
                <th className="cursor-pointer hover:text-[#10B981] select-none" onClick={() => handleSort('business_type')}>
                  Type<span className="text-[#64748B] text-xs ml-1">{sortArrow('business_type')}</span>
                </th>
                <th className="cursor-pointer hover:text-[#10B981] select-none" onClick={() => handleSort('hvac_score')}>
                  Score<span className="text-[#64748B] text-xs ml-1">{sortArrow('hvac_score')}</span>
                </th>
                <th className="cursor-pointer hover:text-[#10B981] select-none" onClick={() => handleSort('status')}>
                  Status<span className="text-[#64748B] text-xs ml-1">{sortArrow('status')}</span>
                </th>
                <th className="cursor-pointer hover:text-[#10B981] select-none" onClick={() => handleSort('lead_source')}>
                  Source<span className="text-[#64748B] text-xs ml-1">{sortArrow('lead_source')}</span>
                </th>
                <th className="cursor-pointer hover:text-[#10B981] select-none" onClick={() => handleSort('discovered_at')}>
                  Discovered<span className="text-[#64748B] text-xs ml-1">{sortArrow('discovered_at')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedLeads.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-[#64748B]">No leads match filters</td>
                </tr>
              ) : (
                sortedLeads.map(lead => (
                  <tr key={lead.id} className="transition-colors">
                    <td className="font-semibold text-[#F1F5F9]">{lead.business_name}</td>
                    <td className="text-sm text-[#94A3B8]">
                      {lead.phone ? (
                        <a href={`tel:${lead.phone}`} className="hover:text-[#10B981] transition-colors">{lead.phone}</a>
                      ) : '-'}
                    </td>
                    <td className="text-sm text-[#94A3B8]">
                      {lead.email ? (
                        <a href={`mailto:${lead.email}`} className="hover:text-[#10B981] transition-colors">{lead.email}</a>
                      ) : '-'}
                    </td>
                    <td className="text-sm text-[#94A3B8] text-right font-mono">{lead.licence_fee ? `$${lead.licence_fee.toLocaleString()}` : '-'}</td>
                    <td className="text-sm text-[#94A3B8] text-right font-mono">{lead.num_employees ?? '-'}</td>
                    <td className="text-[#94A3B8]">{lead.city || '-'}</td>
                    <td className="text-[#94A3B8]">{lead.business_type || '-'}</td>
                    <td><ScoreBadge score={lead.hvac_score} /></td>
                    <td><StatusBadge status={lead.status} /></td>
                    <td className="text-sm text-[#94A3B8]">{lead.lead_source || '-'}</td>
                    <td className="text-sm text-[#64748B]">
                      {lead.discovered_at ? new Date(lead.discovered_at).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="dark-card p-6 w-full max-w-sm mx-4 modal-glow" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-[#F1F5F9] mb-2">Delete Territory?</h2>
            <p className="text-sm text-[#64748B] mb-6">
              This will deactivate <strong className="text-[#F1F5F9]">{territory?.name}</strong> and hide its leads.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="dark-pill dark-pill-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-lg bg-[#EF4444] hover:bg-[#DC2626] disabled:opacity-50 text-white text-sm font-semibold transition-all"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            {toast.type === 'success' ? (
              <path d="M3 8L6 11L13 4" />
            ) : (
              <circle cx="8" cy="8" r="6" />
            )}
          </svg>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
