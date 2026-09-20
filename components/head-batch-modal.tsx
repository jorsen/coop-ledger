'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

export interface HeadBatch {
  id?: number;
  name: string;
  heads: number | string;
  due_date: string | null;
  status: 'paid' | 'not_paid';
}

const EMPTY: HeadBatch = { name: '', heads: '', due_date: '', status: 'not_paid' };

interface HeadBatchModalProps {
  batch?: HeadBatch;
  onClose: () => void;
  onSave: () => void;
}

export default function HeadBatchModal({ batch, onClose, onSave }: HeadBatchModalProps) {
  const [form, setForm] = useState<HeadBatch>(batch ? { ...batch, due_date: batch.due_date?.toString().slice(0, 10) ?? '' } : EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof HeadBatch>(key: K, value: HeadBatch[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const url = batch?.id ? `/api/head-batches/${batch.id}` : '/api/head-batches';
      const method = batch?.id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, heads: Number(form.heads) || 0 }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Something went wrong');
        return;
      }
      onSave();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 pt-16">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {batch?.id ? 'Edit Batch Record' : 'Add Batch Record'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800 dark:bg-gray-700 dark:text-white"
              placeholder="e.g. Andak / Maricel"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"># of Heads *</label>
              <input
                type="text"
                inputMode="numeric"
                value={form.heads}
                onChange={(e) => set('heads', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
              <input
                type="date"
                value={form.due_date ?? ''}
                onChange={(e) => set('due_date', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value as 'paid' | 'not_paid')}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800 dark:bg-gray-700 dark:text-white"
            >
              <option value="not_paid">Not Paid</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-800 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
