'use client';

import { useState, useEffect } from 'react';
import { Lead } from '@/lib/types';
import { apiGet, apiPatch } from '@/lib/api';
import { exportLeadsCSV } from '@/lib/csv';

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

const CITY_COLORS = [
  { bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.15)', dot: '#3B82F6' },
  { bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.15)', dot: '#3B82F6' },
  { bg: 'rgba(139,92,246,0.06)', border: 'rgba(139,92,246,0.15)', dot: '#8B5CF6' },
  { bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.15)', dot: '#F59E0B' },
  { bg: 'rgba(236,72,153,0.06)', border: 'rgba(236,72,153,0.15)', dot: '#EC4899' },
  { bg: 'rgba(14,165,233,0.06)', border: 'rgba(14,165,233,0.15)', dot: '#0EA5E9' },
  { bg: 'rgba(168,85,247,0.06)', border: 'rgba(168,85,247,0.15)', dot: '#A855F7' },
  { bg: 'rgba(249,115,22,0.06)', border: 'rgba(249,115,22,0.15)', dot: '#F97316' },
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());
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

  const sortLeads = (arr: Lead[]) => [...arr].sort((a, b) => {
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

  const showToast = (msg: string, type: string) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadLeads = () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (minScore > 0) params.set('min_score', String(minScore));
    if (search) params.set('search', search);
    params.set('limit', '2000');

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

  const uniqueTypes = [...new Set(leads.map(l => l.business_type).filter(Boolean))];

  // Apply client-side filters (city, type, search)
  const filtered = leads.filter(l => {
    if (cityFilter && l.city !== cityFilter) return false;
    if (typeFilter && l.business_type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const match = (l.business_name?.toLowerCase().includes(q) ||
        l.city?.toLowerCase().includes(q) ||
        l.phone?.includes(q) ||
        l.business_type?.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  // Group by city
  const grouped = filtered.reduce<Record<string, Lead[]>>((acc, l) => {
    const city = l.city || 'Unknown';
    if (!acc[city]) acc[city] = [];
    acc[city].push(l);
    return acc;
  }, {});

  const cityNames = Object.keys(grouped).sort();
  const allCities = [...new Set(leads.map(l => l.city).filter(Boolean))].sort() as string[];

  // Expand all cities by default on first load
  useEffect(() => {
    if (cityNames.length > 0 && expandedCities.size === 0) {
      setExpandedCities(new Set(cityNames));
    }
  }, [cityNames.length]);

  const toggleCity = (city: string) => {
    setExpandedCities(prev => {
      const next = new Set(prev);
      if (next.has(city)) next.delete(city);
      else next.add(city);
      return next;
    });
  };

  const expandAll = () => setExpandedCities(new Set(cityNames));
  const collapseAll = () => setExpandedCities(new Set());

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="page-breadcrumb mb-1">
            Leads <span className="page-breadcrumb-sep">/</span> <span className="text-[#94A3B8]">All Leads</span>
          </div>
          <h1 className="text-2xl font-bold text-[#F1F5F9]">Leads — Permits</h1>
          <p className="text-sm text-[#64748B] mt-1">
            {filtered.length} leads in {cityNames.length} cities
          </p>
        </div>
        <button
          onClick={() => exportLeadsCSV(filtered, `leads-${new Date().toISOString().slice(0,10)}.csv`)}
          className="dark-pill dark-pill-secondary h-[42px] text-sm flex items-center gap-1.5 hover-lift"
          title="Export filtered leads as CSV"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 1.5v8M4 7l3 3 3-3M1.5 10v2a.5.5 0 00.5.5h10a.5.5 0 00.5-.5v-2"/>
          </svg>
          Export CSV
        </button>
      </div>

      {/* Search & Filters */}
      <div className="dark-card p-4 mb-6">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px] search-input-wrapper">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="7" cy="7" r="4.5" />
              <path d="M10.5 10.5L14 14" />
            </svg>
            <input
              className="dark-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search business name, city, phone..."
            />
          </div>
          <div>
            <select className="dark-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="converted">Converted</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
          <div>
            <select className="dark-select" value={cityFilter} onChange={e => setCityFilter(e.target.value)}>
              <option value="">All Cities</option>
              {allCities.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <select className="dark-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              {uniqueTypes.map(t => (
                <option key={t} value={t!}>{t}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-[#64748B] whitespace-nowrap">Min Score:</label>
            <input
              type="range"
              min={0}
              max={100}
              value={minScore}
              onChange={e => setMinScore(Number(e.target.value))}
              className="w-20"
            />
            <span className="text-sm font-semibold text-[#3B82F6] font-mono w-7 text-right">{minScore}</span>
          </div>
          <button type="submit" className="dark-pill dark-pill-primary h-[42px] text-sm">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
              <circle cx="6" cy="6" r="4" />
              <path d="M9.5 9.5L13 13" />
            </svg>
            Search
          </button>
        </form>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="dark-card p-4">
              <div className="skeleton h-6 w-48 mb-4" />
              <div className="space-y-2">
                {[1,2,3].map(j => <div key={j} className="skeleton h-10 w-full" />)}
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="dark-card p-12 text-center">
          <p className="text-lg font-semibold text-[#64748B] mb-2">No leads found</p>
          <p className="text-sm text-[#64748B]">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Expand/Collapse All */}
          <div className="flex gap-2">
            <button onClick={expandAll} className="text-xs font-semibold text-[#3B82F6] hover:underline">Expand All</button>
            <span className="text-[#64748B]">·</span>
            <button onClick={collapseAll} className="text-xs font-semibold text-[#64748B] hover:text-[#F1F5F9]">Collapse All</button>
          </div>

          {cityNames.map((city, idx) => {
            const cityLeads = grouped[city];
            const colors = CITY_COLORS[idx % CITY_COLORS.length];
            const avgScore = Math.round(cityLeads.reduce((s, l) => s + l.hvac_score, 0) / cityLeads.length);
            const isExpanded = expandedCities.has(city);

            return (
              <div
                key={city}
                className="dark-card overflow-hidden transition-all"
                style={{ borderColor: isExpanded ? colors.border : 'rgba(148,163,184,0.06)' }}
              >
                {/* City Header */}
                <div className="w-full flex items-center justify-between p-4 transition-colors">
                  <button
                    onClick={() => toggleCity(city)}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left"
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: colors.dot, boxShadow: `0 0 6px ${colors.dot}60` }}
                    />
                    <h3 className="text-lg font-bold text-[#F1F5F9]">{city}</h3>
                    <span
                      className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: colors.bg, color: colors.dot }}
                    >
                      {cityLeads.length}
                    </span>
                    {avgScore > 0 && (
                      <span className="text-xs text-[#64748B] font-mono">
                        avg {avgScore}
                      </span>
                    )}
                    <svg
                      width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                      className={`text-[#64748B] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    >
                      <path d="M4 6l4 4 4-4" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); exportLeadsCSV(cityLeads, `${city.toLowerCase()}-leads.csv`); }}
                    className="text-xs font-semibold text-[#3B82F6] hover:text-[#60A5FA] flex items-center gap-1 px-2 py-1 rounded hover:bg-[rgba(59,130,246,0.1)] transition-all"
                    title={`Export ${city} leads as CSV`}
                  >
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 1.5v8M4 7l3 3 3-3M1.5 10v2a.5.5 0 00.5.5h10a.5.5 0 00.5-.5v-2"/>
                    </svg>
                    CSV
                  </button>
                </div>

                {/* City Leads Table */}
                {isExpanded && (
                  <div className="overflow-x-auto border-t border-[rgba(148,163,184,0.06)]">
                    <table className="dark-table">
                      <thead>
                        <tr>
                          <th className="cursor-pointer hover:text-[#3B82F6] select-none" onClick={() => handleSort('business_name')}>
                            Business<span className="text-[#64748B] text-xs ml-1">{sortArrow('business_name')}</span>
                          </th>
                          <th className="cursor-pointer hover:text-[#3B82F6] select-none" onClick={() => handleSort('phone')}>
                            Phone<span className="text-[#64748B] text-xs ml-1">{sortArrow('phone')}</span>
                          </th>
                          <th className="cursor-pointer hover:text-[#3B82F6] select-none" onClick={() => handleSort('email')}>
                            Email<span className="text-[#64748B] text-xs ml-1">{sortArrow('email')}</span>
                          </th>
                          <th className="cursor-pointer hover:text-[#3B82F6] select-none text-right" onClick={() => handleSort('licence_fee')}>
                            Fee<span className="text-[#64748B] text-xs ml-1">{sortArrow('licence_fee')}</span>
                          </th>
                          <th className="cursor-pointer hover:text-[#3B82F6] select-none text-right" onClick={() => handleSort('num_employees')}>
                            Emp<span className="text-[#64748B] text-xs ml-1">{sortArrow('num_employees')}</span>
                          </th>
                          <th className="cursor-pointer hover:text-[#3B82F6] select-none" onClick={() => handleSort('business_type')}>
                            Type<span className="text-[#64748B] text-xs ml-1">{sortArrow('business_type')}</span>
                          </th>
                          <th className="cursor-pointer hover:text-[#3B82F6] select-none" onClick={() => handleSort('hvac_score')}>
                            Score<span className="text-[#64748B] text-xs ml-1">{sortArrow('hvac_score')}</span>
                          </th>
                          <th className="cursor-pointer hover:text-[#3B82F6] select-none" onClick={() => handleSort('lead_source')}>
                            Source<span className="text-[#64748B] text-xs ml-1">{sortArrow('lead_source')}</span>
                          </th>
                          <th className="cursor-pointer hover:text-[#3B82F6] select-none" onClick={() => handleSort('status')}>
                            Status<span className="text-[#64748B] text-xs ml-1">{sortArrow('status')}</span>
                          </th>
                          <th className="cursor-pointer hover:text-[#3B82F6] select-none" onClick={() => handleSort('discovered_at')}>
                            Discovered<span className="text-[#64748B] text-xs ml-1">{sortArrow('discovered_at')}</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortLeads(cityLeads).map(lead => (
                          <tr
                            key={lead.id}
                            className="transition-colors cursor-pointer"
                            onClick={() => setSelectedLead(lead)}
                          >
                            <td className="font-semibold text-[#F1F5F9]">{lead.business_name}</td>
                            <td className="text-sm text-[#94A3B8]">
                              {lead.phone ? <a href={`tel:${lead.phone}`} className="hover:text-[#3B82F6]">{lead.phone}</a> : '-'}
                            </td>
                            <td className="text-sm text-[#94A3B8]">
                              {lead.email ? <a href={`mailto:${lead.email}`} className="hover:text-[#3B82F6]">{lead.email}</a> : '-'}
                            </td>
                            <td className="text-sm text-[#94A3B8] text-right font-mono">{lead.licence_fee ? `$${lead.licence_fee.toLocaleString()}` : '-'}</td>
                            <td className="text-sm text-[#94A3B8] text-right font-mono">{lead.num_employees ?? '-'}</td>
                            <td className="text-[#94A3B8]">{lead.business_type || '-'}</td>
                            <td><ScoreBadge score={lead.hvac_score} /></td>
                            <td className="text-sm text-[#94A3B8]">{lead.lead_source || '-'}</td>
                            <td><StatusBadge status={lead.status} /></td>
                            <td className="text-sm text-[#64748B]">
                              {lead.discovered_at ? new Date(lead.discovered_at).toLocaleDateString() : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
              <ScoreBadge score={selectedLead.hvac_score} />
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
              {selectedLead.score_reason && (
                <div className="col-span-2">
                  <span className="text-[#64748B]">Score Reason:</span> {selectedLead.score_reason}
                </div>
              )}
            </div>

            {/* Status update */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-[#64748B] mb-2">Status</label>
              <div className="flex flex-wrap gap-2">
                {['new', 'contacted', 'qualified', 'converted', 'dismissed'].map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusUpdate(selectedLead.id, s)}
                    className={`status-badge status-${s} cursor-pointer transition-all ${
                      selectedLead.status === s ? 'ring-2 ring-[#3B82F6] ring-offset-2 ring-offset-[#1A1D27]' : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    <span className={`status-dot status-dot-${s}`} />
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {selectedLead.notes && (
              <div className="mb-4">
                <span className="text-sm font-semibold text-[#64748B]">Notes</span>
                <p className="text-sm mt-1 text-[#94A3B8]">{selectedLead.notes}</p>
              </div>
            )}

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
