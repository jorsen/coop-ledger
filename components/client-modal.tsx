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
  date_of_hauling: string;
  date_of_application: string;
  notes?: string | null;
  is_updated?: boolean;
}

interface ClientModalProps {
  mode: 'add' | 'edit';
  client?: Client;
  onClose: () => void;
  onSave: () => void;
}

// Existing notes are stored as M-D-YY / MM-DD-YY (or already ISO); convert to/from
// the ISO format the date input needs, tolerating 1- or 2-digit month/day and
// 2- or 4-digit year, with either "-" or "/" as the separator.
function notesToISO(notes: string | null | undefined): string {
  const trimmed = notes?.trim();
  if (!trimmed) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  // Separator can be any non-digit character (-, /, en/em dash, space, dot, ...).
  const m = trimmed.match(/^(\d{1,2})\D+(\d{1,2})\D+(\d{2}|\d{4})$/);
  if (!m) return '';
  const [, mo, day, yr] = m;
  const year = yr.length === 2 ? `20${yr}` : yr;
  const iso = `${year}-${mo.padStart(2, '0')}-${day.padStart(2, '0')}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && !isNaN(new Date(iso).getTime()) ? iso : '';
}

function isoToNotes(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[2]}-${m[3]}-${m[1].slice(2)}` : '';
}

const EMPTY: Client = {
  client_code: '',
  name: '',
  batch_number: '',
  status: 'active',
  heads: '',
  date_of_hauling: '',
  date_of_application: '',
  notes: '',
  is_updated: false,
};

export default function ClientModal({ mode, client, onClose, onSave }: ClientModalProps) {
  const [form, setForm] = useState<Client>(client ?? EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pricePerBag, setPricePerBag] = useState(0);

  useEffect(() => {
    if (!client) { setForm(EMPTY); return; }
    setForm({
      ...client,
      date_of_application: client.date_of_application?.toString().slice(0, 10) ?? '',
      date_of_hauling: client.date_of_hauling?.toString().slice(0, 10) ?? '',
      notes: notesToISO(client.notes),
    });
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
    setForm((f) => ({ ...f, heads: value }));
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
        body: JSON.stringify({ ...form, notes: isoToNotes(form.notes ?? '') }),
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {mode === 'add' ? 'Add Caretaker' : 'Edit Caretaker'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Full Name — always visible */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name *</label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-800 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              placeholder="e.g. Dela Cruz, Juan M."
              required
            />
          </div>

          {/* Edit mode — show Client ID only */}
          {mode === 'edit' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Client ID</label>
                <input
                  value={form.client_code}
                  onChange={(e) => set('client_code', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-800 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
              </div>
            </>
          )}


          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
            <input
              type="date"
              value={form.notes ?? ''}
              onChange={(e) => set('notes', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-800 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            />
          </div>

          {/* Updated flag */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_updated ?? false}
              onChange={(e) => setForm(f => ({ ...f, is_updated: e.target.checked }))}
              className="w-4 h-4 accent-green-800"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Mark as Updated</span>
          </label>

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
