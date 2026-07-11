'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '@/lib/api';

interface ImportBatch {
  id: string;
  list_name: string;
  imported_at: string;
  count: number;
}

interface ImportLead {
  businessName?: string;
  normalizeName?: string;
  address?: string;
  city?: string;
  country?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  phone?: string;
  email?: string;
  enrichedPhone?: string;
  enrichedEmail?: string;
  sources?: { type: string; name: string }[];
  categories?: string[];
}

interface LeadWithKey extends ImportLead {
  _key: string;
  _batchId: string;
  _batchName: string;
}

function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return null;
  const s = Number(score);
  let cls = 'score-low';
  if (s > 70) cls = 'score-high';
  else if (s > 40) cls = 'score-mid';
  return (
    <span className="score-mini-bar">
      <span className={`score-badge ${cls}`}>{Math.round(s)}</span>
      <span className="score-mini-bar-track">
        <span className="score-mini-bar-fill" style={{
          width: `${Math.min(s, 100)}%`,
          background: s > 70 ? '#10B981' : s > 40 ? '#F59E0B' : '#EF4444',
        }} />
      </span>
    </span>
  );
}

function getScore(l: ImportLead): number {
  if (l.rating) return Math.round(l.rating * 20);
  if (l.reviewCount) return Math.min(l.reviewCount * 2, 100);
  return 50;
}
function getName(l: ImportLead): string { return l.businessName || l.normalizeName || '—'; }
function getPhone(l: ImportLead): string { return l.enrichedPhone || l.phone || ''; }
function getEmail(l: ImportLead): string { return l.enrichedEmail || l.email || ''; }

const CITY_COLORS = [
  { bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.15)', dot: '#10B981' },
  { bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.15)', dot: '#3B82F6' },
  { bg: 'rgba(139,92,246,0.06)', border: 'rgba(139,92,246,0.15)', dot: '#8B5CF6' },
  { bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.15)', dot: '#F59E0B' },
  { bg: 'rgba(236,72,153,0.06)', border: 'rgba(236,72,153,0.15)', dot: '#EC4899' },
  { bg: 'rgba(14,165,233,0.06)', border: 'rgba(14,165,233,0.15)', dot: '#0EA5E9' },
  { bg: 'rgba(168,85,247,0.06)', border: 'rgba(168,85,247,0.15)', dot: '#A855F7' },
  { bg: 'rgba(249,115,22,0.06)', border: 'rgba(249,115,22,0.15)', dot: '#F97316' },
];

export default function LeadsImportedPage() {
  const [allLeads, setAllLeads] = useState<LeadWithKey[]>([]);
  const [imports, setImports] = useState<ImportBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [selectedLead, setSelectedLead] = useState<LeadWithKey | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<string>('businessName');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const showToast = (msg: string, type: string) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sortArrow = (key: string) => {
    if (sortKey !== key) return ' ↕';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  const sortLeads = (arr: LeadWithKey[]) => [...arr].sort((a, b) => {
    const getVal = (l: LeadWithKey, k: string): string | number => {
      if (k === 'score') return getScore(l);
      if (k === 'rating') return l.rating ?? 0;
      if (k === 'reviewCount') return l.reviewCount ?? 0;
      return ((l as any)[k]?.toString().toLowerCase() || '');
    };
    const va = getVal(a, sortKey);
    const vb = getVal(b, sortKey);
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const loadData = () => {
    setLoading(true);
    apiGet<{ imports: ImportBatch[] }>('/api/import/list').then(async data => {
      setImports(data.imports || []);
      const all: LeadWithKey[] = [];
      await Promise.all((data.imports || []).map(async imp => {
        try {
          const res = await apiGet<{ batch: { leads: ImportLead[] } }>(`/api/import/${imp.id}`);
          (res.batch.leads || []).forEach((lead, i) => {
            all.push({ ...lead, _key: `${imp.id}_${i}`, _batchId: imp.id, _batchName: imp.list_name });
          });
        } catch { /* skip */ }
      }));
      setAllLeads(all);
    }).catch(() => showToast('Failed to load', 'error')).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  // Client filters
  const filtered = allLeads.filter(l => {
    if (batchFilter && l._batchId !== batchFilter) return false;
    if (cityFilter && l.city !== cityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!getName(l).toLowerCase().includes(q) &&
          !(l.city || '').toLowerCase().includes(q) &&
          !getPhone(l).includes(q) &&
          !(l._batchName || '').toLowerCase().includes(q)) return false;
    }
    if (getScore(l) < minScore) return false;
    return true;
  });

  // Group by import list/batch
  const grouped = filtered.reduce<Record<string, LeadWithKey[]>>((acc, l) => {
    const batchName = l._batchName || 'Unknown';
    if (!acc[batchName]) acc[batchName] = [];
    acc[batchName].push(l);
    return acc;
  }, {});

  const batchNames = Object.keys(grouped).sort();
  const allCities = [...new Set(allLeads.map(l => l.city).filter(Boolean))].sort() as string[];

  useEffect(() => {
    if (batchNames.length > 0 && expandedCities.size === 0)
      setExpandedCities(new Set(batchNames));
  }, [batchNames.length]);

  const toggleCity = (batchName: string) => {
    setExpandedCities(prev => {
      const next = new Set(prev);
      if (next.has(batchName)) next.delete(batchName); else next.add(batchName);
      return next;
    });
  };

  const expandAll = () => setExpandedCities(new Set(batchNames));
  const collapseAll = () => setExpandedCities(new Set());

  const handleDeleteBatch = async (batchName: string) => {
    // Find all leads with this batch name
    const batchIds = [...new Set(allLeads.filter(l => l._batchName === batchName).map(l => l._batchId))];
    if (!batchIds.length) return;
    if (!confirm(`Delete entire "${batchName}" list (${allLeads.filter(l => l._batchName === batchName).length} leads)?`)) return;
    try {
      await Promise.all(batchIds.map(id => fetch(`/api/import/${id}`, { method: 'DELETE' })));
      setAllLeads(prev => prev.filter(l => l._batchName !== batchName));
      if (selectedLead && selectedLead._batchName === batchName) setSelectedLead(null);
      showToast(`🗑️ Deleted "${batchName}"`, 'success');
    } catch {
      showToast('Failed to delete batch', 'error');
    }
  };

  const handleDelete = async (key: string) => {
    const [batchId, idx] = key.split('_');
    if (!batchId || idx === undefined) return;
    try {
      await fetch(`/api/import/${batchId}/lead/${idx}`, { method: 'DELETE' });
      setAllLeads(prev => prev.filter(l => l._key !== key));
      if (selectedLead?._key === key) setSelectedLead(null);
      showToast('🗑️ Deleted', 'success');
    } catch {
      showToast('Failed to delete', 'error');
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const data = await apiPost<{ imported: number; totalLeads: number }>('/api/import/run');
      showToast(`✅ Imported ${data.totalLeads} leads from LeadScraper`, 'success');
      await loadData();
    } catch {
      showToast('❌ Import failed', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleCSVImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      // Proper CSV parse (handles quoted commas in fields like "4,3(88)")
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            inQuotes = !inQuotes;
          } else if (ch === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += ch;
          }
        }
        result.push(current.trim());
        return result;
      };
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { showToast('CSV must have headers + data', 'error'); return; }
      const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').toLowerCase());
      const leads: ImportLead[] = lines.slice(1).map(line => {
        const vals = parseCSVLine(line).map(v => v.replace(/^"|"$/g, ''));
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => obj[h] = vals[i] || '');
        return {
          businessName: obj['business'] || obj['business name'] || obj['businessname'] || obj['name'] || obj['business_name'] || '',
          city: obj['city'] || '',
          phone: obj['phone'] || '',
          email: obj['email'] || '',
          website: obj['website'] || '',
          rating: parseFloat(obj['rating']) || undefined,
          reviewCount: parseInt(obj['reviews']) || undefined,
          address: obj['address'] || '',
        };
      }).filter(l => l.businessName);
      if (!leads.length) { showToast('No valid leads in CSV', 'error'); return; }
      // POST to backend for storage
      try {
        await apiPost('/api/import/csv', { leads, listName: file.name.replace(/\.csv$/i, '') });
        showToast(`✅ Imported ${leads.length} leads from CSV`, 'success');
        await loadData();
      } catch {
        showToast('❌ CSV import failed', 'error');
      }
    };
    input.click();
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="page-breadcrumb mb-1">
            Imports <span className="page-breadcrumb-sep">/</span> <span className="text-[#94A3B8]">Leads — Imported</span>
          </div>
          <h1 className="text-2xl font-bold text-[#F1F5F9]">Leads — Imported</h1>
          <p className="text-sm text-[#64748B] mt-1">
            {filtered.length} leads in {batchNames.length} import lists
            {batchFilter && imports.find(i => i.id === batchFilter) &&
              <> from <strong className="text-[#94A3B8]">{imports.find(i => i.id === batchFilter)!.list_name}</strong></>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleCSVImport} className="dark-pill dark-pill-secondary h-[42px] text-sm">
            📄 Import CSV
          </button>
          <button onClick={handleImport} disabled={importing} className="dark-pill dark-pill-primary h-[42px] text-sm">
            {importing ? (
              <><svg className="animate-spin -ml-1 mr-2 h-4 w-4 inline" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4" />
              </svg> Importing...</>
            ) : '📥 Import from LeadScraper'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="dark-card p-4 mb-6">
        <form onSubmit={e => { e.preventDefault(); }} className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px] search-input-wrapper">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" />
            </svg>
            <input className="dark-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search business name, city, phone..." />
          </div>
          <div>
            <select className="dark-select" value={batchFilter} onChange={e => setBatchFilter(e.target.value)}>
              <option value="">All Batches</option>
              {imports.map(i => <option key={i.id} value={i.id}>{i.list_name} ({i.count})</option>)}
            </select>
          </div>
          <div>
            <select className="dark-select" value={cityFilter} onChange={e => setCityFilter(e.target.value)}>
              <option value="">All Cities</option>
              {allCities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-[#64748B] whitespace-nowrap">Min Score:</label>
            <input type="range" min={0} max={100} value={minScore} onChange={e => setMinScore(Number(e.target.value))} className="w-20" />
            <span className="text-sm font-semibold text-[#10B981] font-mono w-7 text-right">{minScore}</span>
          </div>
        </form>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="dark-card p-4">
              <div className="skeleton h-6 w-48 mb-4" />
              <div className="space-y-2">{[1,2,3].map(j => <div key={j} className="skeleton h-10 w-full" />)}</div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="dark-card p-12 text-center">
          <div className="text-4xl mb-4 text-[#64748B]">📥</div>
          <p className="text-lg font-semibold text-[#64748B] mb-2">No imported leads</p>
          <p className="text-sm text-[#64748B] mb-4">Click "Import from LeadScraper" or "Import CSV" to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button onClick={expandAll} className="text-xs font-semibold text-[#10B981] hover:underline">Expand All</button>
            <span className="text-[#64748B]">·</span>
            <button onClick={collapseAll} className="text-xs font-semibold text-[#64748B] hover:text-[#F1F5F9]">Collapse All</button>
          </div>

          {batchNames.map((batchName, idx) => {
            const batchLeads = grouped[batchName];
            const colors = CITY_COLORS[idx % CITY_COLORS.length];
            const avgScore = Math.round(batchLeads.reduce((s, l) => s + getScore(l), 0) / batchLeads.length);
            const isExpanded = expandedCities.has(batchName);
            return (
              <div key={batchName} className="dark-card overflow-hidden transition-all" style={{ borderColor: isExpanded ? colors.border : 'rgba(148,163,184,0.06)' }}>
                <div className="flex items-center justify-between p-4">
                  <button onClick={() => toggleCity(batchName)} className="flex items-center gap-3 hover:bg-[rgba(148,163,184,0.02)] transition-colors text-left flex-1">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: colors.dot, boxShadow: `0 0 6px ${colors.dot}60` }} />
                      <h3 className="text-lg font-bold text-[#F1F5F9]">{batchName}</h3>
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full" style={{ background: colors.bg, color: colors.dot }}>{batchLeads.length}</span>
                      {avgScore > 0 && <span className="text-xs text-[#64748B] font-mono">avg {avgScore}</span>}
                    </div>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`text-[#64748B] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                      <path d="M4 6l4 4 4-4" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteBatch(batchName)}
                    className="text-sm border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-400 px-2.5 py-1 rounded-lg font-medium ml-2 whitespace-nowrap"
                    title="Delete entire batch"
                  >
                    🗑️ List
                  </button>
                </div>

                {isExpanded && (
                  <div className="overflow-x-auto border-t border-[rgba(148,163,184,0.06)]">
                    <table className="dark-table">
                      <thead>
                        <tr>
                          <th className="cursor-pointer hover:text-[#10B981] select-none" onClick={() => handleSort('businessName')}>Business<span className="text-[#64748B] text-xs ml-1">{sortArrow('businessName')}</span></th>
                          <th className="cursor-pointer hover:text-[#10B981] select-none" onClick={() => handleSort('phone')}>Phone<span className="text-[#64748B] text-xs ml-1">{sortArrow('phone')}</span></th>
                          <th className="cursor-pointer hover:text-[#10B981] select-none" onClick={() => handleSort('email')}>Email<span className="text-[#64748B] text-xs ml-1">{sortArrow('email')}</span></th>
                          <th className="cursor-pointer hover:text-[#10B981] select-none" onClick={() => handleSort('website')}>Website<span className="text-[#64748B] text-xs ml-1">{sortArrow('website')}</span></th>
                          <th className="cursor-pointer hover:text-[#10B981] select-none" onClick={() => handleSort('rating')}>Rating<span className="text-[#64748B] text-xs ml-1">{sortArrow('rating')}</span></th>
                          <th className="cursor-pointer hover:text-[#10B981] select-none" onClick={() => handleSort('reviewCount')}>Reviews<span className="text-[#64748B] text-xs ml-1">{sortArrow('reviewCount')}</span></th>
                          <th className="cursor-pointer hover:text-[#10B981] select-none" onClick={() => handleSort('score')}>Score<span className="text-[#64748B] text-xs ml-1">{sortArrow('score')}</span></th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortLeads(batchLeads).map(lead => (
                          <tr key={lead._key} className="transition-colors cursor-pointer" onClick={() => setSelectedLead(lead)}>
                            <td className="font-semibold text-[#F1F5F9]">{getName(lead)}</td>
                            <td className="text-sm text-[#94A3B8]">{getPhone(lead) ? <a href={`tel:${getPhone(lead)}`} className="hover:text-[#10B981]">{getPhone(lead)}</a> : '-'}</td>
                            <td className="text-sm text-[#94A3B8]">{getEmail(lead) ? <a href={`mailto:${getEmail(lead)}`} className="hover:text-[#10B981]">{getEmail(lead)}</a> : '-'}</td>
                            <td className="text-sm text-[#94A3B8] max-w-[150px] truncate">{lead.website ? <a href={lead.website} target="_blank" className="hover:text-[#10B981]">{lead.website.replace(/^https?:\/\//, '').substring(0, 25)}</a> : '-'}</td>
                            <td className="text-sm text-[#F59E0B]">{lead.rating ? `⭐ ${lead.rating}` : '-'}</td>
                            <td className="text-sm text-[#94A3B8]">{lead.reviewCount ?? '-'}</td>
                            <td className="text-sm text-[#64748B]">{lead._batchName}</td>
                            <td><ScoreBadge score={getScore(lead)} /></td>
                            <td className="text-right">
                              <button
                                onClick={e => { e.stopPropagation(); handleDelete(lead._key); }}
                                className="text-sm border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-400 px-2.5 py-1 rounded-lg font-medium"
                                title="Delete this lead"
                              >
                                🗑️
                              </button>
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

      {/* Detail Modal */}
      {selectedLead && (
        <div className="modal-overlay" onClick={() => setSelectedLead(null)}>
          <div className="dark-card p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto modal-glow" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-[#F1F5F9]">{getName(selectedLead)}</h2>
                <p className="text-sm text-[#94A3B8]">{[selectedLead.city, selectedLead.country].filter(Boolean).join(', ')}</p>
              </div>
              <ScoreBadge score={getScore(selectedLead)} />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              {selectedLead.address && <div className="col-span-2"><span className="text-[#64748B]">Address:</span> {selectedLead.address}</div>}
              {getPhone(selectedLead) && <div><span className="text-[#64748B]">Phone:</span> <a href={`tel:${getPhone(selectedLead)}`} className="text-[#10B981] hover:underline">{getPhone(selectedLead)}</a></div>}
              {getEmail(selectedLead) && <div><span className="text-[#64748B]">Email:</span> <a href={`mailto:${getEmail(selectedLead)}`} className="text-[#10B981] hover:underline">{getEmail(selectedLead)}</a></div>}
              {selectedLead.website && <div><span className="text-[#64748B]">Website:</span> <a href={selectedLead.website} target="_blank" className="text-[#10B981] hover:underline">{selectedLead.website}</a></div>}
              {selectedLead.rating && <div><span className="text-[#64748B]">Rating:</span> ⭐ {selectedLead.rating} {selectedLead.reviewCount ? `(${selectedLead.reviewCount} reviews)` : ''}</div>}
              <div><span className="text-[#64748B]">Batch:</span> {selectedLead._batchName}</div>
              {(selectedLead.categories?.length ?? 0) > 0 && <div className="col-span-2"><span className="text-[#64748B]">Categories:</span> {selectedLead.categories?.join(', ')}</div>}
              {selectedLead.sources?.length ? <div className="col-span-2"><span className="text-[#64748B]">Sources:</span> {selectedLead.sources.map(s => s.name).join(', ')}</div> : null}
            </div>
            <div className="flex gap-2">
              <a href={`https://www.google.com/search?q=${encodeURIComponent(getName(selectedLead) + ' ' + (selectedLead.city || '') + ' phone website')}`} target="_blank" rel="noopener noreferrer" className="dark-pill dark-pill-secondary flex-1 text-center no-underline">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1.5">
                  <circle cx="6" cy="6" r="4.5" /><path d="M9.5 9.5L13 13" />
                </svg>
                Search Google
              </a>
              <button onClick={() => handleDelete(selectedLead._key)} className="dark-pill bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex-1">🗑️ Delete</button>
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
