'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface FeedType {
  id: number;
  name: string;
  current_price: number | null;
  price_date: string | null;
}

interface FeedPrice {
  id: number;
  price_per_bag: number;
  effective_date: string;
}

const peso = (n: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// ── Add Feed Type modal ──────────────────────────────────────────────────────
function AddFeedTypeModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/feed-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) { setError((await res.json()).error); setLoading(false); return; }
    onSave();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Add Feed Type</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. FINISHER LUNTIAN 50KLS"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 bg-green-800 text-white py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Price modal ──────────────────────────────────────────────────────────
function AddPriceModal({
  feedType,
  onClose,
  onSave,
}: {
  feedType: FeedType;
  onClose: () => void;
  onSave: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const [price, setPrice]       = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [date, setDate]         = useState(today);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/feed-prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feed_type_id: feedType.id,
        price_per_bag: Number(price),
        delivery_fee_per_bag: deliveryFee ? Number(deliveryFee) : 0,
        effective_date: date,
      }),
    });
    if (!res.ok) { setError((await res.json()).error); setLoading(false); return; }
    onSave();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Update Price</h2>
            <p className="text-xs text-gray-500 mt-0.5">{feedType.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Effective Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Price / Bag (₱)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={feedType.current_price ? String(feedType.current_price) : '0'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Delivery Fee / Bag (₱)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(e.target.value)}
              placeholder="e.g. 80"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
            />
          </div>
          <p className="text-xs text-gray-500">
            This only affects transactions on or after this date. Existing saved transactions will not change.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 bg-green-800 text-white py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
              {loading ? 'Saving…' : 'Set Price'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Feed type card ───────────────────────────────────────────────────────────
function FeedTypeCard({
  feedType,
  onRefresh,
}: {
  feedType: FeedType;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [prices, setPrices]     = useState<FeedPrice[]>([]);
  const [addPrice, setAddPrice] = useState(false);

  const loadPrices = useCallback(async () => {
    const res = await fetch(`/api/feed-types/${feedType.id}`);
    setPrices(await res.json());
  }, [feedType.id]);

  useEffect(() => {
    if (expanded) loadPrices();
  }, [expanded, loadPrices]);

  async function deletePrice(priceId: number) {
    if (!confirm('Remove this price entry?')) return;
    await fetch(`/api/feed-prices/${priceId}`, { method: 'DELETE' });
    loadPrices();
    onRefresh();
  }

  async function deleteFeedType() {
    if (!confirm(`Archive "${feedType.name}"?`)) return;
    await fetch(`/api/feed-types/${feedType.id}`, { method: 'DELETE' });
    onRefresh();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm">{feedType.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {feedType.current_price
              ? <>Current: <span className="font-semibold text-green-700">{peso(feedType.current_price)}</span> / bag (as of {fmtDate(feedType.price_date!)})</>
              : <span className="text-amber-600">No price set yet</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setAddPrice(true)}
            className="flex items-center gap-1.5 bg-green-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700"
          >
            <Plus className="w-3.5 h-3.5" /> Update Price
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={deleteFeedType}
            className="p-1.5 border border-gray-200 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Price history */}
      {expanded && (
        <div className="border-t border-gray-100">
          {prices.length === 0 ? (
            <p className="text-xs text-gray-400 px-5 py-4">No price history yet.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 px-5 py-2">Effective Date</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-5 py-2">Price / Bag</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody>
                {prices.map((p, i) => (
                  <tr key={p.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2 text-sm text-gray-700">
                      {fmtDate(p.effective_date)}
                      {i === 0 && (
                        <span className="ml-2 text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">current</span>
                      )}
                    </td>
                    <td className="px-5 py-2 text-sm font-medium text-gray-900 text-right">{peso(p.price_per_bag)}</td>
                    <td className="px-5 py-2">
                      <button
                        onClick={() => deletePrice(p.id)}
                        className="float-right p-1 text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {addPrice && (
        <AddPriceModal
          feedType={feedType}
          onClose={() => setAddPrice(false)}
          onSave={() => { setAddPrice(false); loadPrices(); onRefresh(); setExpanded(true); }}
        />
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function FeedsPage() {
  const [feedTypes, setFeedTypes] = useState<FeedType[]>([]);
  const [loading, setLoading]     = useState(true);
  const [addModal, setAddModal]   = useState(false);

  const fetchFeedTypes = useCallback(async () => {
    const res = await fetch('/api/feed-types');
    setFeedTypes(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchFeedTypes(); }, [fetchFeedTypes]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Feed Types</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage feed types and price history</p>
        </div>
        <button
          onClick={() => setAddModal(true)}
          className="flex items-center gap-2 bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 sm:ml-auto"
        >
          <Plus className="w-4 h-4" /> Add Feed Type
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-6 text-sm text-amber-800">
        Updating a price only affects <strong>new transactions</strong> on or after that date.
        All existing saved transaction amounts remain unchanged.
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-green-800 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : feedTypes.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-16">No feed types yet.</p>
      ) : (
        <div className="space-y-3">
          {feedTypes.map((ft) => (
            <FeedTypeCard key={ft.id} feedType={ft} onRefresh={fetchFeedTypes} />
          ))}
        </div>
      )}

      {addModal && (
        <AddFeedTypeModal
          onClose={() => setAddModal(false)}
          onSave={() => { setAddModal(false); fetchFeedTypes(); }}
        />
      )}
    </div>
  );
}
