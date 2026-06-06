'use client';

import { useState, useEffect } from 'react';
import { Lead } from '@/lib/types';
import { apiGet, apiPatch, apiPost } from '@/lib/api';

function ScoreBadge({ score }: { score: number }) {
  let cls = 'score-low';
  if (score > 70) cls = 'score-high';
  else if (score > 40) cls = 'score-mid';
  return <span className={`score-badge ${cls}`}>{score}</span>;
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge status-${status}`}>{status}</span>;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = (msg: string, type: string) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadLeads = () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (minScore > 0) params.set('min_score', String(minScore));
    if (search) params.set('search', search);
    params.set('limit', '100');

    setLoading(true);
    apiGet<Lead[]>(`/api/leads?${params.toString()}`)
      .then(data => setLeads(data))
      .catch(() => showToast('Failed to load leads', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLeads();
  }, [statusFilter, minScore]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadLeads();
  };

  const handleStatusUpdate = async (leadId: number, newStatus: string) => {
    try {
      const updated = await apiPatch<Lead>(`/api/leads/${leadId}`, { status: newStatus });
      setLeads(prev => prev.map(l => l.id === leadId ? updated : l));
      if (selectedLead?.id === leadId) setSelectedLead(updated);
      showToast(`Status updated to ${newStatus}`, 'success');
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  const handleDraftEmail = async (leadId: number) => {
    setDrafting(true);
    try {
      const result = await apiPost<{ email: string }>(`/api/leads/${leadId}/draft`);
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ai_drafted_email: result.email } : l));
      if (selectedLead?.id === leadId) {
        setSelectedLead(prev => prev ? { ...prev, ai_drafted_email: result.email } : null);
      }
      showToast('Email drafted', 'success');
    } catch {
      showToast('Failed to draft email', 'error');
    } finally {
      setDrafting(false);
    }
  };

  const uniqueTypes = [...new Set(leads.map(l => l.business_type).filter(Boolean))];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-[#1C1C1E] dark:text-white">Leads</h1>

      {/* Search & Filters */}
      <div className="ios-card p-4 mb-6">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-[#8E8E93] mb-1 uppercase tracking-wide">Search</label>
            <input
              className="ios-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Business name, city..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#8E8E93] mb-1 uppercase tracking-wide">Status</label>
            <select className="ios-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="converted">Converted</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#8E8E93] mb-1 uppercase tracking-wide">Type</label>
            <select className="ios-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="">All</option>
              {uniqueTypes.map(t => (
                <option key={t} value={t!}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#8E8E93] mb-1 uppercase tracking-wide">
              Min Score: {minScore}
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={minScore}
              onChange={e => setMinScore(Number(e.target.value))}
              className="w-28 accent-[#007AFF]"
            />
          </div>
          <button type="submit" className="ios-pill ios-pill-primary h-[42px]">
            Search
          </button>
        </form>
      </div>

      {/* Leads Table */}
      <div className="ios-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="ios-table">
            <thead>
              <tr>
                <th>Business</th>
                <th>City</th>
                <th>Type</th>
                <th>Score</th>
                <th>Source</th>
                <th>Status</th>
                <th>Discovered</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="p-3"><div className="skeleton h-5 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-[#8E8E93]">
                    No leads found
                  </td>
                </tr>
              ) : (
                leads.map(lead => (
                  <tr
                    key={lead.id}
                    className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                    onClick={() => setSelectedLead(lead)}
                  >
                    <td className="font-semibold text-[#1C1C1E] dark:text-white">{lead.business_name}</td>
                    <td className="text-[#8E8E93]">{lead.city || '-'}</td>
                    <td className="text-[#8E8E93]">{lead.business_type || '-'}</td>
                    <td><ScoreBadge score={lead.hvac_score} /></td>
                    <td className="text-sm text-[#8E8E93]">{lead.lead_source || '-'}</td>
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

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div className="modal-overlay" onClick={() => setSelectedLead(null)}>
          <div
            className="ios-card p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-[#1C1C1E] dark:text-white">{selectedLead.business_name}</h2>
                <p className="text-sm text-[#8E8E93]">
                  {[selectedLead.city, selectedLead.province].filter(Boolean).join(', ')}
                </p>
              </div>
              <ScoreBadge score={selectedLead.hvac_score} />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              {selectedLead.address && (
                <div className="col-span-2">
                  <span className="text-[#8E8E93]">Address:</span> {selectedLead.address}
                </div>
              )}
              {selectedLead.phone && (
                <div>
                  <span className="text-[#8E8E93]">Phone:</span> {selectedLead.phone}
                </div>
              )}
              {selectedLead.website && (
                <div>
                  <span className="text-[#8E8E93]">Website:</span>{' '}
                  <a href={selectedLead.website} target="_blank" className="text-[#007AFF] hover:underline">
                    {selectedLead.website}
                  </a>
                </div>
              )}
              <div>
                <span className="text-[#8E8E93]">Type:</span> {selectedLead.business_type || '-'}
              </div>
              <div>
                <span className="text-[#8E8E93]">Source:</span> {selectedLead.lead_source || '-'}
              </div>
              {selectedLead.score_reason && (
                <div className="col-span-2">
                  <span className="text-[#8E8E93]">Score Reason:</span> {selectedLead.score_reason}
                </div>
              )}
            </div>

            {/* Status update */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-[#8E8E93] mb-1">Status</label>
              <div className="flex flex-wrap gap-2">
                {['new', 'contacted', 'qualified', 'converted', 'dismissed'].map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusUpdate(selectedLead.id, s)}
                    className={`status-badge status-${s} cursor-pointer transition-all ${
                      selectedLead.status === s ? 'ring-2 ring-[#007AFF] ring-offset-2 dark:ring-offset-[#2C2C2E]' : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Draft Email */}
            <div className="mb-4">
              <button
                onClick={() => handleDraftEmail(selectedLead.id)}
                disabled={drafting}
                className="ios-pill ios-pill-primary disabled:opacity-50 mb-2"
              >
                {drafting ? 'Drafting...' : 'Draft Email'}
              </button>
              {selectedLead.ai_drafted_email && (
                <div className="bg-[#F2F2F7] dark:bg-[#3A3A3C] rounded-xl p-4 text-sm whitespace-pre-wrap">
                  {selectedLead.ai_drafted_email}
                </div>
              )}
            </div>

            {selectedLead.notes && (
              <div className="mb-4">
                <span className="text-sm font-semibold text-[#8E8E93]">Notes</span>
                <p className="text-sm mt-1">{selectedLead.notes}</p>
              </div>
            )}

            <button
              onClick={() => setSelectedLead(null)}
              className="ios-pill ios-pill-secondary w-full"
            >
              Close
            </button>
          </div>
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
