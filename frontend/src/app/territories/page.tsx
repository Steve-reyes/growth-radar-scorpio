'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Territory } from '@/lib/types';
import { apiGet, apiPost } from '@/lib/api';

export default function TerritoriesPage() {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1C1C1E] dark:text-white">Territories</h1>
        <button
          onClick={() => setShowModal(true)}
          className="ios-pill ios-pill-primary"
        >
          + Add Territory
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="ios-card p-5">
              <div className="skeleton h-6 w-32 mb-3" />
              <div className="skeleton h-4 w-24 mb-2" />
              <div className="skeleton h-4 w-16" />
            </div>
          ))}
        </div>
      ) : territories.length === 0 ? (
        <div className="ios-card p-12 text-center">
          <p className="text-lg font-semibold text-[#8E8E93] mb-2">No territories yet</p>
          <p className="text-sm text-[#8E8E93] mb-4">Add your first territory to start finding leads</p>
          <button
            onClick={() => setShowModal(true)}
            className="ios-pill ios-pill-primary"
          >
            + Add Territory
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {territories.map(t => (
            <Link
              key={t.id}
              href={`/territories/${t.id}`}
              className="ios-card p-5 hover:shadow-md transition-shadow block group"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold text-lg text-[#1C1C1E] dark:text-white group-hover:text-[#007AFF] transition-colors">
                  {t.name}
                </h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  t.is_active
                    ? 'bg-[#34C759]/10 text-[#34C759]'
                    : 'bg-[#8E8E93]/10 text-[#8E8E93]'
                }`}>
                  {t.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-sm text-[#8E8E93] mb-1">
                {t.city}, {t.province}
              </p>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-[#8E8E93]">
                  <span className="font-semibold text-[#1C1C1E] dark:text-white">{t.lead_count ?? 0}</span> leads
                </span>
                {t.avg_score !== undefined && (
                  <span className="text-[#8E8E93]">
                    <span className="font-semibold text-[#007AFF]">{t.avg_score.toFixed(1)}</span> avg
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Add Territory Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="ios-card p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 text-[#1C1C1E] dark:text-white">Add Territory</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#8E8E93] mb-1">Name</label>
                <input
                  className="ios-input"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="e.g. Toronto Downtown"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#8E8E93] mb-1">City</label>
                  <input
                    className="ios-input"
                    value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    required
                    placeholder="Toronto"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#8E8E93] mb-1">Province</label>
                  <input
                    className="ios-input"
                    value={form.province}
                    onChange={e => setForm(f => ({ ...f, province: e.target.value }))}
                    required
                    placeholder="ON"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#8E8E93] mb-1">Postal Code</label>
                  <input
                    className="ios-input"
                    value={form.postal_code}
                    onChange={e => setForm(f => ({ ...f, postal_code: e.target.value }))}
                    placeholder="M5V 2T6"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#8E8E93] mb-1">Radius (km)</label>
                  <input
                    className="ios-input"
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
                  className="ios-pill ios-pill-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="ios-pill ios-pill-primary flex-1 disabled:opacity-50"
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
          {toast.msg}
        </div>
      )}
    </div>
  );
}
