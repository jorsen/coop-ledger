'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Eye, Trash2, ClipboardList } from 'lucide-react';
import { usePoll } from '@/hooks/use-poll';

interface Batch {
  id: number;
  batch_number: string;
  batch_date: string;
  notes: string;
  transaction_count: number;
  total_bags: number;
  total_debit: number;
}

const peso = (n: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function BatchesPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ batch_date: new Date().toISOString().split('T')[0], notes: '' });
  const [saving, setSaving] = useState(false);

  const fetchBatches = useCallback(async () => {
    const res = await fetch('/api/batches');
    const data = await res.json();
    if (Array.isArray(data)) setBatches(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);
  usePoll(fetchBatches);

  async function handleCreate() {
    setSaving(true);
    await fetch('/api/batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setShowModal(false);
    setForm({ batch_date: new Date().toISOString().split('T')[0], notes: '' });
    fetchBatches();
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this batch? Transactions will remain but lose their batch assignment.')) return;
    await fetch(`/api/batches/${id}`, { method: 'DELETE' });
    fetchBatches();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-green-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Batches</h1>
          <p className="text-sm text-gray-500 mt-0.5">Index cards — group transactions by delivery batch</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
        >
          <Plus className="w-4 h-4" />
          New Batch
        </button>
      </div>

      {batches.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No batches yet. Create one to start grouping transactions.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {batches.map((b) => (
          <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between mb-1">
              <div>
                <span className="inline-block bg-green-800 text-white text-xs font-bold px-2 py-0.5 rounded mb-1">
                  {b.batch_number}
                </span>
                <p className="text-sm text-gray-500">{fmtDate(b.batch_date)}</p>
              </div>
            </div>
            {b.notes && <p className="text-xs text-gray-900 dark:text-gray-400 mb-3 line-clamp-2">{b.notes}</p>}

            <div className="flex items-center gap-4 py-3 border-t border-gray-100 mb-3">
              <div>
                <p className="text-xs text-gray-500">Transactions</p>
                <p className="text-sm font-semibold text-gray-900">{b.transaction_count}</p>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div>
                <p className="text-xs text-gray-500">Bags</p>
                <p className="text-sm font-semibold text-gray-900">{b.total_bags}</p>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div>
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-sm font-semibold text-green-700">{peso(b.total_debit)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push(`/batches/${b.id}`)}
                className="flex-1 flex items-center justify-center gap-2 border border-gray-200 text-gray-700 py-1.5 rounded-lg text-sm hover:bg-gray-50"
              >
                <Eye className="w-4 h-4" />
                View
              </button>
              <button
                onClick={() => handleDelete(b.id)}
                className="p-1.5 border border-gray-200 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* New Batch Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">New Batch</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Batch Date *</label>
                <input
                  type="date"
                  value={form.batch_date}
                  onChange={(e) => setForm((f) => ({ ...f, batch_date: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Optional description…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="flex-1 bg-green-800 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? 'Creating…' : 'Create Batch'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
