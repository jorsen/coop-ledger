'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Client {
  id?: number;
  client_code: string;
  name: string;
  loan_number: string;
  status: string;
  heads: number;
  allocation: number;
}

interface ClientModalProps {
  mode: 'add' | 'edit';
  client?: Client;
  onClose: () => void;
  onSave: () => void;
}

const EMPTY: Client = {
  client_code: '',
  name: '',
  loan_number: '1',
  status: 'active',
  heads: 0,
  allocation: 0,
};

export default function ClientModal({ mode, client, onClose, onSave }: ClientModalProps) {
  const [form, setForm] = useState<Client>(client ?? EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(client ?? EMPTY);
  }, [client]);

  function set(key: keyof Client, value: string | number) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const url  = mode === 'add' ? '/api/clients' : `/api/clients/${client!.id}`;
      const method = mode === 'add' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {mode === 'add' ? 'Add Caretaker' : 'Edit Caretaker'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className={`grid gap-4 ${mode === 'edit' ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {mode === 'edit' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Client ID</label>
                <input
                  value={form.client_code}
                  onChange={(e) => set('client_code', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Loan #</label>
              <input
                value={form.loan_number}
                onChange={(e) => set('loan_number', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
                placeholder="e.g. 1"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
              placeholder="e.g. Dela Cruz, Juan M."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Heads</label>
              <input
                type="number"
                min="0"
                value={form.heads}
                onChange={(e) => set('heads', Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Allocation (₱)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.allocation}
                onChange={(e) => set('allocation', Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
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
