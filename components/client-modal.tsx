'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Client {
  id?: number;
  client_code: string;
  name: string;
  batch_number: string;
  status: string;
  heads: number | string;
  allocation: number | string;
  date_of_hauling: string;
  date_of_application: string;
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
  batch_number: '',
  status: 'active',
  heads: '',
  allocation: '',
  date_of_hauling: '',
  date_of_application: '',
};

export default function ClientModal({ mode, client, onClose, onSave }: ClientModalProps) {
  const [form, setForm] = useState<Client>(client ?? EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pricePerBag, setPricePerBag] = useState(0);

  useEffect(() => {
    setForm(client ?? EMPTY);
  }, [client]);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => setPricePerBag(Number(data.price_per_bag ?? 0)));
  }, []);

  function set(key: keyof Client, value: string | number) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleHeadsChange(value: string) {
    const heads = Number(value);
    const allocation = pricePerBag > 0 && heads > 0 ? heads * 5 * pricePerBag : '';
    setForm((f) => ({ ...f, heads: value, allocation: allocation === '' ? '' : String(allocation) }));
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
        let msg = 'Something went wrong';
        try { const d = await res.json(); msg = d.error ?? msg; } catch {}
        setError(msg);
        return;
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 overflow-y-auto p-4 pt-16">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {mode === 'add' ? 'Add Caretaker' : 'Edit Caretaker'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Batch # + Client ID (edit only) */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label className="block text-xs font-medium text-gray-700 mb-2">Batch #</label>
              <input
                value={form.batch_number}
                onChange={(e) => set('batch_number', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
                placeholder="e.g. 1"
              />
            </div>
            {mode === 'edit' && (
              <div style={{ flex: 1 }}>
                <label className="block text-xs font-medium text-gray-700 mb-2">Client ID</label>
                <input
                  value={form.client_code}
                  onChange={(e) => set('client_code', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
                />
              </div>
            )}
          </div>

          {/* Full Name — full width */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Full Name *</label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
              placeholder="e.g. Dela Cruz, Juan M."
              required
            />
          </div>

          {/* Heads + Allocation */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label className="block text-xs font-medium text-gray-700 mb-2">Heads</label>
              <input
                type="text"
                inputMode="numeric"
                value={form.heads}
                onChange={(e) => handleHeadsChange(e.target.value)}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="block text-xs font-medium text-gray-700 mb-2">Allocation (₱)</label>
              <input
                type="text"
                inputMode="numeric"
                value={form.allocation}
                onChange={(e) => set('allocation', e.target.value)}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
              />
            </div>
          </div>

          {/* Date of Application + Date of Hauling */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label className="block text-xs font-medium text-gray-700 mb-2">Date of Application</label>
              <input
                type="date"
                value={form.date_of_application}
                onChange={(e) => set('date_of_application', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
                style={{ backgroundColor: '#ffffff', height: '46px', WebkitAppearance: 'none', appearance: 'none' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="block text-xs font-medium text-gray-700 mb-2">Date of Hauling</label>
              <input
                type="date"
                value={form.date_of_hauling}
                onChange={(e) => set('date_of_hauling', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
                style={{ backgroundColor: '#ffffff', height: '46px', WebkitAppearance: 'none', appearance: 'none' }}
              />
            </div>
          </div>

          {/* Status — full width */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Status</label>
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
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
