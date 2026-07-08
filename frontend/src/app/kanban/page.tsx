'use client';

import { useState, useEffect, useCallback } from 'react';
import { Lead, Territory } from '@/lib/types';
import { apiGet, apiPatch } from '@/lib/api';

const COLUMNS = [
  { key: 'new', label: 'New', color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
  { key: 'contacted', label: 'Contacted', color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
  { key: 'qualified', label: 'Qualified', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
  { key: 'converted', label: 'Converted', color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
  { key: 'dismissed', label: 'Dismissed', color: '#64748B', bg: 'rgba(100,116,139,0.08)' },
];

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

const TERRITORY_COLORS = [
  { bg: 'rgba(16,185,129,0.12)', text: '#10B981', dot: '#10B981' },
  { bg: 'rgba(59,130,246,0.12)', text: '#3B82F6', dot: '#3B82F6' },
  { bg: 'rgba(139,92,246,0.12)', text: '#8B5CF6', dot: '#8B5CF6' },
  { bg: 'rgba(245,158,11,0.12)', text: '#F59E0B', dot: '#F59E0B' },
  { bg: 'rgba(236,72,153,0.12)', text: '#EC4899', dot: '#EC4899' },
  { bg: 'rgba(14,165,233,0.12)', text: '#0EA5E9', dot: '#0EA5E9' },
];

export default function KanbanPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activeTerritoryId, setActiveTerritoryId] = useState<number | null>(null);

  const showToast = (msg: string, type: string) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const handleStatusUpdate = async (leadId: number, newStatus: string) => {
    try {
      await apiPatch(`/api/kanban/leads/${leadId}`, { status: newStatus });
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
      if (selectedLead?.id === leadId) setSelectedLead({ ...selectedLead, status: newStatus });
      showToast(`Status updated to ${newStatus}`, 'success');
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  useEffect(() => {
    apiGet<{ leads: Lead[]; territories: Territory[] }>('/api/kanban/leads')
      .then((data) => {
        setLeads(data.leads);
        setTerritories(data.territories.filter(t => t.is_active));
      })
      .catch(() => showToast('Failed to load data', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleDragStart = (e: React.DragEvent, leadId: number) => {
    setDraggingId(leadId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(leadId));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = useCallback(async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const leadId = parseInt(e.dataTransfer.getData('text/plain'));
    if (!leadId) return;

    setDraggingId(null);
    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.status === newStatus) return;

    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));

    try {
      await apiPatch(`/api/kanban/leads/${leadId}`, { status: newStatus });
      showToast(`Moved to ${newStatus}`, 'success');
    } catch {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: lead.status } : l));
      showToast('Failed to update status', 'error');
    }
  }, [leads]);

  const filteredLeads = activeTerritoryId
    ? leads.filter(l => l.territory_id === activeTerritoryId)
    : leads;

  const getColumnLeads = (status: string) =>
    filteredLeads.filter(l => l.status === status)
      .sort((a, b) => b.hvac_score - a.hvac_score);

  const territoryLeadsCount = (tid: number | null) =>
    tid ? leads.filter(l => l.territory_id === tid).length : leads.length;

  return (
    <div>
      <div className="mb-6">
        <div className="page-breadcrumb mb-1">
          Leads <span className="page-breadcrumb-sep">/</span> <span className="text-[#94A3B8]">Kanban Board</span>
        </div>
        <h1 className="text-2xl font-bold text-[#F1F5F9]">Kanban Board</h1>
        <p className="text-sm text-[#64748B] mt-1">
          Drag & drop leads between columns &middot; {filteredLeads.length} leads
          {activeTerritoryId && territories.find(t => t.id === activeTerritoryId) && (
            <> in <strong className="text-[#94A3B8]">{territories.find(t => t.id === activeTerritoryId)!.name}</strong></>
          )}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => setActiveTerritoryId(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTerritoryId === null
              ? 'bg-[rgba(16,185,129,0.2)] text-[#10B981] ring-1 ring-[#10B981]'
              : 'bg-[rgba(148,163,184,0.08)] text-[#64748B] hover:bg-[rgba(148,163,184,0.15)]'
          }`}
        >
          All ({territoryLeadsCount(null)})
        </button>
        {territories.map((t, idx) => {
          const colors = TERRITORY_COLORS[idx % TERRITORY_COLORS.length];
          const count = territoryLeadsCount(t.id);
          if (count === 0) return null;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTerritoryId(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTerritoryId === t.id ? 'ring-1 ring-offset-1 ring-offset-[#1A1D27]' : 'hover:opacity-80'
              }`}
              style={{
                background: activeTerritoryId === t.id ? colors.bg : 'rgba(148,163,184,0.08)',
                color: activeTerritoryId === t.id ? colors.text : '#64748B',
              }}
            >
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${activeTerritoryId === t.id ? '' : 'opacity-40'}`}
                style={{ background: colors.dot }} />
              {t.name} ({count})
            </button>
          );
        })}
      </div>

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
          <p className="text-lg font-semibold text-[#64748B] mb-2">No leads</p>
          <p className="text-sm text-[#64748B]">
            {activeTerritoryId ? 'No leads in this territory yet.' : 'Add a territory and run a search to get started.'}
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
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      onClick={() => setSelectedLead(lead)}
                      className={`kanban-card p-3 rounded-lg cursor-grab active:cursor-grabbing transition-all duration-150
                        ${draggingId === lead.id ? 'opacity-50 scale-95' : 'hover:scale-[1.02]'}
                      `}
                      style={{
                        background: 'rgba(15,17,23,0.8)',
                        border: draggingId === lead.id
                          ? `2px solid ${col.color}60`
                          : '1px solid rgba(148,163,184,0.1)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-sm font-semibold text-[#F1F5F9] leading-tight truncate">
                          {lead.business_name}
                        </span>
                        <span
                          className="text-xs font-bold font-mono px-1.5 py-0.5 rounded flex-shrink-0"
                          style={{
                            background: lead.hvac_score >= 70 ? 'rgba(16,185,129,0.2)' : lead.hvac_score >= 40 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)',
                            color: lead.hvac_score >= 70 ? '#10B981' : lead.hvac_score >= 40 ? '#F59E0B' : '#EF4444',
                          }}
                        >
                          {lead.hvac_score}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] truncate">
                        {lead.city || lead.province || '-'}
                        {lead.business_type && ` · ${lead.business_type}`}
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
                  <a href={`tel:${selectedLead.phone}`} className="text-[#10B981] hover:underline">{selectedLead.phone}</a>
                </div>
              )}
              {selectedLead.email && (
                <div>
                  <span className="text-[#64748B]">Email:</span>{' '}
                  <a href={`mailto:${selectedLead.email}`} className="text-[#10B981] hover:underline">{selectedLead.email}</a>
                </div>
              )}
              {(selectedLead.licence_fee || selectedLead.num_employees) && (
                <div className="col-span-2 flex gap-4 mt-1">
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
                  <a href={selectedLead.website} target="_blank" className="text-[#10B981] hover:underline">
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

            <div className="mb-4">
              <label className="block text-sm font-semibold text-[#64748B] mb-2">Status</label>
              <div className="flex flex-wrap gap-2">
                {['new', 'contacted', 'qualified', 'converted', 'dismissed'].map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusUpdate(selectedLead.id, s)}
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
