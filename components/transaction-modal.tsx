'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Client { id: number; name: string }

interface Transaction {
  id?: number;
  client_id: number | '';
  date: string;
  feed_type: string;
  bags: number;
  debit: number;
  credit: number;
  notes: string;
}

interface TransactionModalProps {
  transaction?: Transaction;
  clients: Client[];
  defaultClientId?: number;
  onClose: () => void;
  onSave: () => void;
}

const EMPTY: Transaction = {
  client_id: '',
  date: new Date().toISOString().split('T')[0],
  feed_type: '',
  bags: 0,
  debit: 0,
  credit: 0,
  notes: '',
};

export default function TransactionModal({
  transaction,
  clients,
  defaultClientId,
  onClose,
  onSave,
}: TransactionModalProps) {
  const [form, setForm] = useState<Transaction>(() => {
    if (transaction) return transaction;
    return { ...EMPTY, client_id: defaultClientId ?? '' };
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (transaction) setForm(transaction);
    else setForm({ ...EMPTY, client_id: defaultClientId ?? '' });
  }, [transaction, defaultClientId]);

  function set<K extends keyof Transaction>(key: K, value: Transaction[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const url    = transaction ? `/api/transactions/${transaction.id}` : '/api/transactions';
      const method = transaction ? 'PUT' : 'POST';

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
            {transaction ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Client *</label>
            <select
              value={form.client_id}
              onChange={(e) => set('client_id', Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
              required
            >
              <option value="">Select client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Bags</label>
              <input
                type="number"
                min="0"
                value={form.bags}
                onChange={(e) => set('bags', Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Feed Type</label>
            <input
              value={form.feed_type}
              onChange={(e) => set('feed_type', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
              placeholder="e.g. STARTER LUNTIAN 50KLS"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Debit (₱)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.debit}
                onChange={(e) => set('debit', Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Credit (₱)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.credit}
                onChange={(e) => set('credit', Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800 resize-none"
              placeholder="Optional notes…"
            />
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
