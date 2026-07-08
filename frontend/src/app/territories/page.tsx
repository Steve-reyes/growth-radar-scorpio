'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Territory } from '@/lib/types';
import { apiGet, apiPost, apiDelete } from '@/lib/api';

export default function TerritoriesPage() {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [searchingId, setSearchingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', city: '', province: '', postal_code: '', radius_km: 10 });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = (msg: string, type: string) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    apiGet<Territory[]>('/api/territories')
      .then(setTerritories)
      .catch(() => showToast('Failed to load territories', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const newT = await apiPost<Territory>('/api/territories', {
        ...form,
        radius_km: Number(form.radius_km),
        postal_code: form.postal_code || null,
      });
      setTerritories(prev => [...prev, newT]);
      setShowModal(false);
      setForm({ name: '', city: '', province: '', postal_code: '', radius_km: 10 });
      showToast('Territory added', 'success');
    } catch {
      showToast('Failed to add territory', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this territory?')) return;
    setDeletingId(id);
    try {
      await apiDelete(`/api/territories/${id}`);
      setTerritories(prev => prev.filter(t => t.id !== id));
      showToast('Territory deleted', 'success');
    } catch {
      showToast('Failed to delete territory', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSearch = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSearchingId(id);
    try {
      await apiPost(`/api/territories/${id}/ingest`);
      showToast('Search started', 'success');
    } catch {
      showToast('Failed to start search', 'error');
    } finally {
      setSearchingId(null);
    }
  };

  const avgScoreColor = (score: number | undefined) => {
    if (!score) return '#64748B';
    if (score > 70) return '#10B981';
    if (score > 40) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="page-breadcrumb mb-1">
            Territories <span className="page-breadcrumb-sep">/</span> <span className="text-[#94A3B8]">All Territories</span>
          </div>
          <h1 className="text-2xl font-bold text-[#F1F5F9]">Territories</h1>
          <p className="text-sm text-[#64748B] mt-1">Manage your service territories</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="dark-pill dark-pill-primary hover-lift"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
            <path d="M8 3v10M3 8h10" />
          </svg>
          Add Territory
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="dark-card p-5">
              <div className="skeleton h-6 w-32 mb-3" />
              <div className="skeleton h-4 w-24 mb-2" />
              <div className="skeleton h-4 w-16" />
            </div>
          ))}
        </div>
      ) : territories.length === 0 ? (
        <div className="dark-card p-12 text-center">
          <p className="text-lg font-semibold text-[#64748B] mb-2">No territories yet</p>
          <p className="text-sm text-[#64748B] mb-4">Add your first territory to start finding leads</p>
          <button
            onClick={() => setShowModal(true)}
            className="dark-pill dark-pill-primary"
          >
            + Add Territory
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {territories.map(t => (
            <div key={t.id} className="dark-card p-5 hover:border-[rgba(148,163,184,0.2)] transition-all block group hover-lift relative">
              <Link
                href={`/territories/${t.id}`}
                className="block"
              >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold text-lg text-[#F1F5F9] group-hover:text-[#10B981] transition-colors">
                  {t.name}
                </h3>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  t.is_active
                    ? 'bg-[rgba(16,185,129,0.15)] text-[#10B981]'
                    : 'bg-[rgba(100,116,139,0.15)] text-[#64748B]'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    t.is_active ? 'bg-[#10B981] shadow-[0_0_4px_rgba(16,185,129,0.5)]' : 'bg-[#64748B]'
                  }`} />
                  {t.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-sm text-[#94A3B8] mb-3">
                {t.city}, {t.province}
              </p>
              <div className="flex items-center gap-4 pt-3 border-t border-[rgba(148,163,184,0.06)]">
                <div>
                  <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Leads</p>
                  <p className="trit-stat-value text-[#F1F5F9] font-mono">{t.total_leads ?? 0}</p>
                </div>
                {t.avg_score !== undefined && (
                  <div>
                    <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Avg Score</p>
                    <p className="trit-stat-value font-mono" style={{ color: avgScoreColor(t.avg_score) }}>
                      {t.avg_score.toFixed(1)}
                    </p>
                  </div>
                )}
                <div className="ml-auto">
                  <button
                    onClick={(e) => handleSearch(t.id, e)}
                    disabled={searchingId === t.id}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[rgba(16,185,129,0.15)] text-[#10B981] hover:bg-[rgba(16,185,129,0.25)] transition-all disabled:opacity-50"
                  >
                    {searchingId === t.id ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </div>
              </Link>
              <button
                onClick={(e) => handleDelete(t.id, e)}
                disabled={deletingId === t.id}
                className="absolute bottom-3 right-3 w-7 h-7 flex items-center justify-center rounded-md text-[#64748B] hover:text-[#EF4444] hover:bg-[rgba(239,68,68,0.1)] transition-all opacity-0 group-hover:opacity-100"
                title="Delete territory"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 4h12M5 4V2.5a1 1 0 011-1h4a1 1 0 011 1V4M13 4v9.5a1 1 0 01-1 1H4a1 1 0 01-1-1V4" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Territory Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="dark-card p-6 w-full max-w-md mx-4 modal-glow" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 text-[#F1F5F9]">Add Territory</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#64748B] mb-1.5">Name</label>
                <input
                  className="dark-input"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="e.g. Toronto Downtown"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#64748B] mb-1.5">City</label>
                  <input
                    className="dark-input"
                    value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    required
                    placeholder="Toronto"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#64748B] mb-1.5">Province</label>
                  <input
                    className="dark-input"
                    value={form.province}
                    onChange={e => setForm(f => ({ ...f, province: e.target.value }))}
                    required
                    placeholder="ON"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#64748B] mb-1.5">Postal Code</label>
                  <input
                    className="dark-input"
                    value={form.postal_code}
                    onChange={e => setForm(f => ({ ...f, postal_code: e.target.value }))}
                    placeholder="M5V 2T6"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#64748B] mb-1.5">Radius (km)</label>
                  <input
                    className="dark-input"
                    type="number"
                    value={form.radius_km}
                    onChange={e => setForm(f => ({ ...f, radius_km: Number(e.target.value) }))}
                    min={1}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="dark-pill dark-pill-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="dark-pill dark-pill-primary flex-1 disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Add Territory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
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
