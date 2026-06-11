'use client';

import { useEffect, useState, useCallback } from 'react';
import { Save, Plus, Trash2, ChevronDown, ChevronUp, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

// ── Types ────────────────────────────────────────────────────────────────────
interface FeedType {
  id: number;
  name: string;
  current_price: number | null;
  price_date: string | null;
}

interface FeedPrice {
  id: number;
  price_per_bag: number;
  delivery_fee_per_bag: number;
  effective_date: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const peso = (n: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// ── Add Feed Type modal ───────────────────────────────────────────────────────
function AddFeedTypeModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [name, setName]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

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
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 pt-16">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Add Feed Type</h2>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. FINISHER LUNTIAN 50KLS"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 bg-green-800 text-white py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Price modal ───────────────────────────────────────────────────────────
function AddPriceModal({ feedType, onClose, onSave }: { feedType: FeedType; onClose: () => void; onSave: () => void }) {
  const [price, setPrice]             = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [date, setDate]               = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

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
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 pt-16">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Update Price</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{feedType.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Effective Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Price / Bag (₱)</label>
            <input
              type="text"
              inputMode="numeric"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="e.g. 1625"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Delivery Fee / Bag (₱)</label>
            <input
              type="text"
              inputMode="numeric"
              value={deliveryFee}
              onChange={e => setDeliveryFee(e.target.value)}
              placeholder="e.g. 80"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Only affects transactions on or after this date. Existing transactions are unchanged.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 bg-green-800 text-white py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
              {loading ? 'Saving…' : 'Set Price'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Feed type card ────────────────────────────────────────────────────────────
function FeedTypeCard({ feedType, onRefresh }: { feedType: FeedType; onRefresh: () => void }) {
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
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-white text-sm">{feedType.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
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
            onClick={() => setExpanded(v => !v)}
            className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={deleteFeedType}
            className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700">
          {prices.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 px-5 py-4">No price history yet.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-5 py-2">Effective Date</th>
                  <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 px-5 py-2">Price / Bag</th>
                  <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 px-5 py-2">Delivery Fee</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody>
                {prices.map((p, i) => (
                  <tr key={p.id} className="border-b border-gray-50 dark:border-gray-700 last:border-0">
                    <td className="px-5 py-2 text-sm text-gray-700 dark:text-gray-300">
                      {fmtDate(p.effective_date)}
                      {i === 0 && <span className="ml-2 text-xs bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded">current</span>}
                    </td>
                    <td className="px-5 py-2 text-sm font-medium text-gray-900 dark:text-white text-right">{peso(p.price_per_bag)}</td>
                    <td className="px-5 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                      {p.delivery_fee_per_bag > 0 ? peso(p.delivery_fee_per_bag) : '—'}
                    </td>
                    <td className="px-5 py-2">
                      <button onClick={() => deletePrice(p.id)} className="float-right p-1 text-red-400 hover:text-red-600">
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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { theme, toggle } = useTheme();

  // Delivery fee setting
  const [deliveryFee, setDeliveryFee]         = useState('');
  const [currentDeliveryFee, setCurrentDeliveryFee] = useState<string | null>(null);
  // Price per bag for allocation
  const [pricePerBag, setPricePerBag]                 = useState('');
  const [currentPricePerBag, setCurrentPricePerBag]   = useState<string | null>(null);
  const [savingPrice, setSavingPrice]                 = useState(false);
  const [savedPrice, setSavedPrice]                   = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saving, setSaving]                   = useState(false);
  const [saved, setSaved]                     = useState(false);
  const [settingsError, setSettingsError]     = useState('');

  // Feed types
  const [feedTypes, setFeedTypes]       = useState<FeedType[]>([]);
  const [feedsLoading, setFeedsLoading] = useState(true);
  const [addFeedModal, setAddFeedModal] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        setCurrentDeliveryFee(data.delivery_fee ?? null);
        setCurrentPricePerBag(data.price_per_bag ?? null);
        setSettingsLoading(false);
      });
  }, []);

  const fetchFeedTypes = useCallback(async () => {
    const res = await fetch('/api/feed-types');
    setFeedTypes(await res.json());
    setFeedsLoading(false);
  }, []);

  useEffect(() => { fetchFeedTypes(); }, [fetchFeedTypes]);

  async function handleSavePricePerBag(e: React.FormEvent) {
    e.preventDefault();
    setSavingPrice(true);
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price_per_bag: pricePerBag ? Number(pricePerBag) : 0 }),
    });
    setSavingPrice(false);
    setCurrentPricePerBag(pricePerBag || '0');
    setPricePerBag('');
    setSavedPrice(true);
    setTimeout(() => setSavedPrice(false), 2500);
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSettingsError('');
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delivery_fee: deliveryFee ? Number(deliveryFee) : 0 }),
    });
    setSaving(false);
    if (!res.ok) { setSettingsError('Failed to save.'); return; }
    setCurrentDeliveryFee(deliveryFee || '0');
    setDeliveryFee('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">Settings</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Feed prices and app configuration</p>

      {/* ── Appearance ──────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-6">
        <div className="px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white mb-1">Appearance</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Toggle between light and dark mode</p>
          </div>
          <button
            onClick={toggle}
            className="flex items-center gap-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </div>

      {/* ── Delivery fee ────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-6">
        <div className="px-6 py-5">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white mb-1">Default Delivery Fee</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Used per bag when no delivery fee is set on a specific feed price entry.
          </p>
          {!settingsLoading && currentDeliveryFee !== null && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
              Current: <span className="font-medium text-gray-600 dark:text-gray-300">₱{currentDeliveryFee}</span>
            </p>
          )}
          {settingsLoading ? (
            <div className="h-9 w-32 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
          ) : (
            <form onSubmit={handleSaveSettings} className="flex items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">New Delivery Fee / Bag (₱)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={deliveryFee}
                  onChange={e => setDeliveryFee(e.target.value)}
                  placeholder="e.g. 80"
                  className="w-36 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
              </button>
            </form>
          )}
          {settingsError && <p className="text-sm text-red-600 mt-2">{settingsError}</p>}
        </div>
      </div>

      {/* ── Feed types & prices ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Feed Types & Prices</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Manage feed types and price history</p>
        </div>
        <button
          onClick={() => setAddFeedModal(true)}
          className="flex items-center gap-2 bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 sm:ml-auto"
        >
          <Plus className="w-4 h-4" /> Add Feed Type
        </button>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-5 py-3 mb-4 text-sm text-amber-800 dark:text-amber-300">
        Updating a price only affects <strong>new transactions</strong> on or after that date.
        All existing saved transaction amounts remain unchanged.
      </div>

      {feedsLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-green-800 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : feedTypes.length === 0 ? (
        <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-16">No feed types yet.</p>
      ) : (
        <div className="space-y-3">
          {feedTypes.map(ft => (
            <FeedTypeCard key={ft.id} feedType={ft} onRefresh={fetchFeedTypes} />
          ))}
        </div>
      )}

      {addFeedModal && (
        <AddFeedTypeModal
          onClose={() => setAddFeedModal(false)}
          onSave={() => { setAddFeedModal(false); fetchFeedTypes(); }}
        />
      )}
    </div>
  );
}
