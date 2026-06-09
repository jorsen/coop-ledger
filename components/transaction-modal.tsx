'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Info } from 'lucide-react';

interface Client { id: number; name: string }
interface FeedType { id: number; name: string; current_price: number | null }
interface BatchOption { id: number; batch_number: string }

interface Transaction {
  id?: number;
  client_id: number | '';
  date: string;
  feed_type: string;
  bags: number;
  debit: number;
  credit: number;
  notes: string;
  sales_invoice: string;
  batch_id?: number | null;
}

interface TransactionModalProps {
  transaction?: Transaction;
  clients: Client[];
  defaultClientId?: number;
  defaultBatchId?: number;
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
  sales_invoice: '',
  batch_id: null,
};

const peso = (n: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);

export default function TransactionModal({
  transaction,
  clients,
  defaultClientId,
  defaultBatchId,
  onClose,
  onSave,
}: TransactionModalProps) {
  const [form, setForm] = useState<Transaction>(() =>
    transaction ? transaction : { ...EMPTY, client_id: defaultClientId ?? '', batch_id: defaultBatchId ?? null }
  );
  const [feedTypes, setFeedTypes] = useState<FeedType[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [pricePerBag, setPricePerBag] = useState<number | null>(null);
  const [priceDate, setPriceDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/feed-types').then((r) => r.json()).then(setFeedTypes);
  }, []);

  // Load batches whenever the selected client changes
  useEffect(() => {
    if (!form.client_id) { setBatches([]); return; }
    fetch(`/api/batches?client_id=${form.client_id}`)
      .then((r) => r.json())
      .then((data) => setBatches(Array.isArray(data) ? data : []));
  }, [form.client_id]);

  useEffect(() => {
    if (transaction) setForm(transaction);
    else setForm({ ...EMPTY, client_id: defaultClientId ?? '', batch_id: defaultBatchId ?? null });
  }, [transaction, defaultClientId, defaultBatchId]);

  // Look up effective price whenever feed type or date changes
  const fetchPrice = useCallback(async (feedTypeName: string, date: string) => {
    if (!feedTypeName || !date) { setPricePerBag(null); return; }
    const feedType = feedTypes.find((f) => f.name === feedTypeName);
    if (!feedType) { setPricePerBag(null); return; }

    const res = await fetch(`/api/feed-types/${feedType.id}/price?date=${date}`);
    const data = await res.json();
    setPricePerBag(data.price_per_bag ? Number(data.price_per_bag) : null);
    setPriceDate(data.effective_date ?? null);
  }, [feedTypes]);

  useEffect(() => {
    fetchPrice(form.feed_type, form.date);
  }, [form.feed_type, form.date, fetchPrice]);

  // Auto-calculate debit when bags or price changes (only if not editing)
  useEffect(() => {
    if (!transaction && pricePerBag !== null && form.bags > 0) {
      setForm((f) => ({ ...f, debit: form.bags * pricePerBag }));
    }
  }, [pricePerBag, form.bags, transaction]);

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

  const autoDebit = pricePerBag !== null && form.bags > 0 ? form.bags * pricePerBag : null;

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
          {/* Client */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Caretaker *</label>
            {clients.length === 1 ? (
              <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700">
                {clients[0].name}
              </div>
            ) : (
              <select
                value={form.client_id}
                onChange={(e) => set('client_id', Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
                required
              >
                <option value="">Select caretaker…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Batch */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Batch *</label>
            {defaultBatchId ? (
              <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700">
                {batches.find((b) => b.id === defaultBatchId)?.batch_number ?? `Batch #${defaultBatchId}`}
              </div>
            ) : (
              <select
                value={form.batch_id ?? ''}
                onChange={(e) => set('batch_id', e.target.value ? Number(e.target.value) : null)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
                required
              >
                <option value="">Select batch…</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.batch_number}</option>
                ))}
              </select>
            )}
            {!defaultBatchId && form.client_id && batches.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">No batches yet. Create a batch first from the caretaker page.</p>
            )}
          </div>

          {/* Date + Bags */}
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

          {/* Feed type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Feed Type</label>
            <select
              value={form.feed_type}
              onChange={(e) => set('feed_type', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
            >
              <option value="">Select feed type</option>
              {feedTypes.map((f) => (
                <option key={f.id} value={f.name}>{f.name}</option>
              ))}
            </select>

            {/* Price hint */}
            {pricePerBag !== null && (
              <p className="mt-1 flex items-center gap-1 text-xs text-green-700">
                <Info className="w-3 h-3" />
                Price on {priceDate}: {peso(pricePerBag)} / bag
                {autoDebit !== null && (
                  <span className="ml-1 font-medium">→ Debit: {peso(autoDebit)}</span>
                )}
              </p>
            )}
            {form.feed_type && pricePerBag === null && (
              <p className="mt-1 text-xs text-amber-600">No price set for this date. Enter debit manually.</p>
            )}
          </div>

          {/* Debit + Credit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Total Price (₱)
              </label>
              <input
                type="number"
                value={form.debit}
                readOnly
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700 cursor-not-allowed"
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

          {/* Notes */}
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
