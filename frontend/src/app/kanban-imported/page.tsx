'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

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
  socialLinks?: Record<string, string>;
  sources?: { type: string; name: string }[];
  categories?: string[];
}

interface LeadWithKey extends ImportLead {
  _key: string;
  status: string;
}

const COLUMNS = [
  { key: 'new', label: 'New', color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
  { key: 'contacted', label: 'Contacted', color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
  { key: 'qualified', label: 'Qualified', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
  { key: 'converted', label: 'Converted', color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
  { key: 'dismissed', label: 'Dismissed', color: '#64748B', bg: 'rgba(100,116,139,0.08)' },
];

const IMPORT_COLORS = [
  { bg: 'rgba(16,185,129,0.12)', text: '#10B981', dot: '#10B981' },
  { bg: 'rgba(59,130,246,0.12)', text: '#3B82F6', dot: '#3B82F6' },
  { bg: 'rgba(139,92,246,0.12)', text: '#8B5CF6', dot: '#8B5CF6' },
  { bg: 'rgba(245,158,11,0.12)', text: '#F59E0B', dot: '#F59E0B' },
  { bg: 'rgba(236,72,153,0.12)', text: '#EC4899', dot: '#EC4899' },
  { bg: 'rgba(14,165,233,0.12)', text: '#0EA5E9', dot: '#0EA5E9' },
  { bg: 'rgba(168,85,247,0.12)', text: '#A855F7', dot: '#A855F7' },
  { bg: 'rgba(249,115,22,0.12)', text: '#F97316', dot: '#F97316' },
];

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

function getLeadScore(lead: ImportLead): number {
  if (lead.rating) return lead.rating * 20; // scale 1-5 → 20-100
  if (lead.reviewCount) return Math.min(lead.reviewCount * 2, 100);
  return 50; // default mid
}

function getLeadName(lead: ImportLead): string {
  return lead.businessName || lead.normalizeName || 'Unknown';
}

function getLeadCity(lead: ImportLead): string {
  return lead.city || lead.country || '';
}

function getLeadPhone(lead: ImportLead): string {
  return lead.enrichedPhone || lead.phone || '';
}

function getLeadEmail(lead: ImportLead): string {
  return lead.enrichedEmail || lead.email || '';
}

const _loadStatuses = async (token: string | null): Promise<Record<string, string>> => {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch('/api/kanban/imported/statuses', { headers });
    if (!res.ok) return {};
    return await res.json();
  } catch { return {}; }
};

const _saveStatus = async (key: string, status: string, token: string | null) => {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    await fetch(`/api/kanban/imported/statuses/${encodeURIComponent(key)}`, {
      method: 'PUT', headers, body: JSON.stringify({ status }),
    });
  } catch { /* fail silently */ }
};

export default function KanbanImportedPage() {
  const { token } = useAuth();
  const [imports, setImports] = useState<ImportBatch[]>([]);
  const [allLeads, setAllLeads] = useState<LeadWithKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadWithKey | null>(null);
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = (msg: string, type: string) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    if (!token) return; // wait for auth to init
    setLoading(true);
    apiGet<{ imports: ImportBatch[] }>('/api/import/list')
      .then(async (data) => {
        setImports(data.imports || []);
        if (data.imports?.length > 0) {
          const savedStatuses = await _loadStatuses(token);
          const mergedStatuses: Record<string, string> = savedStatuses;
          const all: LeadWithKey[] = [];
          await Promise.all(data.imports.map(async (imp) => {
            try {
              const res = await apiGet<{ batch: { leads: ImportLead[] } }>(`/api/import/${imp.id}`);
              (res.batch.leads || []).forEach((lead, idx) => {
                const key = `${imp.id}_${idx}`;
                all.push({ ...lead, _key: key, status: mergedStatuses[key] || 'new' });
              });
            } catch { /* skip failed */ }
          }));
          setAllLeads(all);
        }
      })
      .catch(() => showToast('Failed to load imports', 'error'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleStatusUpdate = useCallback((key: string, newStatus: string) => {
    setAllLeads(prev => prev.map(l => l._key === key ? { ...l, status: newStatus } : l));
    _saveStatus(key, newStatus, token);
    showToast(`Moved to ${newStatus}`, 'success');
  }, [token]);

  const filteredLeads = selectedImportId
    ? allLeads.filter(l => l._key.startsWith(selectedImportId))
    : allLeads;

  const getColumnLeads = (status: string) =>
    filteredLeads.filter(l => l.status === status)
      .sort((a, b) => getLeadScore(b) - getLeadScore(a));

  const getImportName = (id: string | null) => {
    if (!id) return '';
    return imports.find(i => i.id === id)?.list_name || '';
  };

  const leadsCountByImport = (impId: string | null) =>
    impId ? allLeads.filter(l => l._key.startsWith(impId)).length : allLeads.length;

  const handleDragStart = (e: React.DragEvent, key: string) => {
    setDraggingKey(key);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', key);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = useCallback((e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const key = e.dataTransfer.getData('text/plain');
    if (!key) return;
    setDraggingKey(null);
    const lead = allLeads.find(l => l._key === key);
    if (!lead || lead.status === newStatus) return;
    handleStatusUpdate(key, newStatus);
  }, [allLeads, handleStatusUpdate]);

  return (
    <div>
      <div className="mb-6">
        <div className="page-breadcrumb mb-1">
          Kanban <span className="page-breadcrumb-sep">/</span> <span className="text-[#94A3B8]">Imported Leads</span>
        </div>
        <h1 className="text-2xl font-bold text-[#F1F5F9]">Kanban — Imported</h1>
        <p className="text-sm text-[#64748B] mt-1">
          Drag & drop imported leads between columns &middot; {filteredLeads.length} leads
          {selectedImportId && (
            <> in <strong className="text-[#94A3B8]">{getImportName(selectedImportId)}</strong></>
          )}
        </p>
      </div>

      {/* Import batch filter */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => setSelectedImportId(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            selectedImportId === null
              ? 'bg-[rgba(16,185,129,0.2)] text-[#10B981] ring-1 ring-[#10B981]'
              : 'bg-[rgba(148,163,184,0.08)] text-[#64748B] hover:bg-[rgba(148,163,184,0.15)]'
          }`}
        >
          All ({leadsCountByImport(null)})
        </button>
        {imports.map((imp, idx) => {
          const colors = IMPORT_COLORS[idx % IMPORT_COLORS.length];
          const count = leadsCountByImport(imp.id);
          if (count === 0) return null;
          return (
            <button
              key={imp.id}
              onClick={() => setSelectedImportId(imp.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedImportId === imp.id ? 'ring-1 ring-offset-1 ring-offset-[#1A1D27]' : 'hover:opacity-80'
              }`}
              style={{
                background: selectedImportId === imp.id ? colors.bg : 'rgba(148,163,184,0.08)',
                color: selectedImportId === imp.id ? colors.text : '#64748B',
              }}
            >
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${selectedImportId === imp.id ? '' : 'opacity-40'}`}
                style={{ background: colors.dot }} />
              {imp.list_name} ({count})
            </button>
          );
        })}
      </div>

      {/* Board */}
      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map(col => (
            <div key={col.key} className="flex-1 min-w-[260px]">
              <div className="skeleton h-10 w-full mb-3 rounded-lg" />
              {[1,2,3].map(i => <div key={i} className="skeleton h-24 w-full mb-2 rounded-lg" />)}
            </div>
          ))}
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="dark-card p-12 text-center">
          <p className="text-lg font-semibold text-[#64748B] mb-2">No imported leads</p>
          <p className="text-sm text-[#64748B]">
            Go to <a href="/leads-imported" className="text-[#10B981] hover:underline">Leads — Imported</a> to import data first.
          </p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 280px)' }}>
          {COLUMNS.map(col => {
            const columnLeads = getColumnLeads(col.key);
            return (
              <div
                key={col.key}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.key)}
                className="flex-1 min-w-[260px] max-w-[320px] rounded-xl p-3"
                style={{ background: col.bg, border: `1px solid ${col.color}20` }}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: col.color, boxShadow: `0 0 6px ${col.color}60` }} />
                    <span className="text-sm font-bold text-[#F1F5F9]">{col.label}</span>
                  </div>
                  <span className="text-xs font-mono text-[#64748B] bg-[rgba(148,163,184,0.08)] px-2 py-0.5 rounded-full">
                    {columnLeads.length}
                  </span>
                </div>

                <div className="space-y-2 min-h-[60px]">
                  {columnLeads.map(lead => (
                    <div
                      key={lead._key}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead._key)}
                      onClick={() => setSelectedLead(lead)}
                      className={`kanban-card p-3 rounded-lg cursor-grab active:cursor-grabbing transition-all duration-150
                        ${draggingKey === lead._key ? 'opacity-50 scale-95' : 'hover:scale-[1.02]'}
                      `}
                      style={{
                        background: 'rgba(15,17,23,0.8)',
                        border: draggingKey === lead._key
                          ? `2px solid ${col.color}60`
                          : '1px solid rgba(148,163,184,0.1)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-sm font-semibold text-[#F1F5F9] leading-tight truncate">
                          {getLeadName(lead)}
                        </span>
                        <ScoreBadge score={getLeadScore(lead)} />
                      </div>
                      <p className="text-xs text-[#64748B] truncate">
                        {getLeadCity(lead) || '-'}
                        {lead.country && ` · ${lead.country}`}
                      </p>
                    </div>
                  ))}

                  {columnLeads.length === 0 && (
                    <div className="flex items-center justify-center h-16 rounded-lg border border-dashed border-[rgba(148,163,184,0.1)]">
                      <p className="text-xs text-[#64748B]">Drop leads here</p>
                    </div>
                  )}
                </div>
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
                <h2 className="text-xl font-bold text-[#F1F5F9]">{getLeadName(selectedLead)}</h2>
                <p className="text-sm text-[#94A3B8]">
                  {[selectedLead.city, selectedLead.country].filter(Boolean).join(', ')}
                </p>
              </div>
              <ScoreBadge score={getLeadScore(selectedLead)} />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              {selectedLead.address && (
                <div className="col-span-2">
                  <span className="text-[#64748B]">Address:</span> {selectedLead.address}
                </div>
              )}
              {getLeadPhone(selectedLead) && (
                <div>
                  <span className="text-[#64748B]">Phone:</span>{' '}
                  <a href={`tel:${getLeadPhone(selectedLead)}`} className="text-[#10B981] hover:underline">{getLeadPhone(selectedLead)}</a>
                </div>
              )}
              {getLeadEmail(selectedLead) && (
                <div>
                  <span className="text-[#64748B]">Email:</span>{' '}
                  <a href={`mailto:${getLeadEmail(selectedLead)}`} className="text-[#10B981] hover:underline">{getLeadEmail(selectedLead)}</a>
                </div>
              )}
              {selectedLead.website && (
                <div>
                  <span className="text-[#64748B]">Website:</span>{' '}
                  <a href={selectedLead.website} target="_blank" className="text-[#10B981] hover:underline">
                    {selectedLead.website}
                  </a>
                </div>
              )}
              {selectedLead.rating && (
                <div>
                  <span className="text-[#64748B]">Rating:</span> ⭐ {selectedLead.rating}
                  {selectedLead.reviewCount ? ` (${selectedLead.reviewCount} reviews)` : ''}
                </div>
              )}
              {(selectedLead.categories?.length ?? 0) > 0 && (
                <div>
                  <span className="text-[#64748B]">Categories:</span>{' '}
                  {selectedLead.categories?.join(', ')}
                </div>
              )}
              {selectedLead.sources?.length && (
                <div className="col-span-2">
                  <span className="text-[#64748B]">Sources:</span>{' '}
                  {selectedLead.sources.map(s => s.name).join(', ')}
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-[#64748B] mb-2">Status</label>
              <div className="flex flex-wrap gap-2">
                {['new', 'contacted', 'qualified', 'converted', 'dismissed'].map(s => (
                  <button
                    key={s}
                    onClick={() => {
                      handleStatusUpdate(selectedLead._key, s);
                      setSelectedLead(prev => prev ? { ...prev, status: s } : null);
                    }}
                    className={`status-badge status-${s} cursor-pointer transition-all ${
                      selectedLead.status === s ? 'ring-2 ring-[#10B981] ring-offset-2 ring-offset-[#1A1D27]' : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    <span className={`status-dot status-dot-${s}`} />
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(getLeadName(selectedLead) + ' ' + (selectedLead.city || '') + ' phone website')}`}
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

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0">
            {toast.type === 'success'
              ? <path d="M3 8L6 11L13 4" />
              : <circle cx="8" cy="8" r="6" />
            }
          </svg>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
