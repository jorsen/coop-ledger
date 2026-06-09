'use client';

import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';

export default function SettingsPage() {
  const [deliveryFee, setDeliveryFee] = useState('');
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [error, setError]             = useState('');

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        setDeliveryFee(data.delivery_fee ?? '');
        setLoading(false);
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delivery_fee: deliveryFee ? Number(deliveryFee) : 0 }),
    });
    setSaving(false);
    if (!res.ok) {
      setError('Failed to save settings.');
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">Settings</h1>
      <p className="text-sm text-gray-500 mb-6">App-wide configuration</p>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {/* Delivery Fee */}
        <div className="px-6 py-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-1">Default Delivery Fee</h2>
          <p className="text-xs text-gray-500 mb-4">
            Applied per bag when no delivery fee is set for a specific feed type/date in the Feeds page.
          </p>

          {loading ? (
            <div className="h-9 w-32 bg-gray-100 rounded-lg animate-pulse" />
          ) : (
            <form onSubmit={handleSave} className="flex items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Delivery Fee / Bag (₱)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={deliveryFee}
                  onChange={e => setDeliveryFee(e.target.value)}
                  placeholder="e.g. 80"
                  className="w-36 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
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

          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>
      </div>
    </div>
  );
}
