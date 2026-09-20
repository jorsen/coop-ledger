'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import HeadBatchModal, { HeadBatch } from '@/components/head-batch-modal';
import ConfirmModal from '@/components/confirm-modal';
import { usePoll } from '@/hooks/use-poll';

interface HeadBatchRow extends HeadBatch {
  id: number;
  batch_no: number;
}

const fmtDate = (d: string | null) => {
  if (!d) return '—';
  const [y, m, day] = d.toString().slice(0, 10).split('-');
  return `${parseInt(m)}/${parseInt(day)}/${y}`;
};

export default function HeadBatchesPanel({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [rows, setRows] = useState<HeadBatchRow[]>([]);
  const [maxHeads, setMaxHeads] = useState(200);
  const [headsInUse, setHeadsInUse] = useState(0);
  const [headsAvailable, setHeadsAvailable] = useState(200);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ batch?: HeadBatchRow } | null>(null);
  const [dialog, setDialog] = useState<{ title: string; message: string; variant?: 'default' | 'delete'; onConfirm: () => void } | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/head-batches');
    const data = await res.json();
    setRows(data.batches ?? []);
    setMaxHeads(data.max_heads ?? 200);
    setHeadsInUse(data.heads_in_use ?? 0);
    setHeadsAvailable(data.heads_available ?? 200);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  usePoll(fetchData);

  async function toggleStatus(row: HeadBatchRow, status: 'paid' | 'not_paid') {
    setRows(rs => rs.map(r => r.id === row.id ? { ...r, status } : r));
    await fetch(`/api/head-batches/${row.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...row, status }),
    });
  }

  function handleDelete(row: HeadBatchRow) {
    setDialog({
      title: 'Delete Batch Record',
      message: `Remove the batch record for ${row.name}? This cannot be undone.`,
      variant: 'delete',
      onConfirm: async () => {
        await fetch(`/api/head-batches/${row.id}`, { method: 'DELETE' });
        fetchData();
      },
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-green-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pct = Math.min(100, Math.round((headsInUse / maxHeads) * 100));
  const overCapacity = headsInUse > maxHeads;

  return (
    <div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {headsInUse} / {maxHeads} heads in use
          </span>
          <span className={`font-semibold ${overCapacity ? 'text-red-600' : 'text-green-700 dark:text-green-400'}`}>
            {overCapacity ? `${headsInUse - maxHeads} over capacity` : `${headsAvailable} available`}
          </span>
        </div>
        <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${overCapacity ? 'bg-red-600' : 'bg-green-700'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Batches</h2>
        {isLoggedIn && (
          <button
            onClick={() => setModal({})}
            className="flex items-center gap-2 bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
          >
            <Plus className="w-4 h-4" /> Add Batch Record
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-16">No batch records yet.</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 whitespace-nowrap">BATCH #</th>
                  <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 whitespace-nowrap">NAME</th>
                  <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 whitespace-nowrap"># OF HEADS</th>
                  <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 whitespace-nowrap">DUE DATE</th>
                  <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 whitespace-nowrap">STATUS</th>
                  <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 whitespace-nowrap">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.batch_no}</td>
                    <td className="px-4 py-3 text-gray-800 dark:text-gray-200 whitespace-nowrap">{row.name}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{row.heads}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{fmtDate(row.due_date)}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {isLoggedIn ? (
                        <select
                          value={row.status}
                          onChange={(e) => toggleStatus(row, e.target.value as 'paid' | 'not_paid')}
                          className={`text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-1.5 py-0.5 outline-none cursor-pointer focus:ring-1 focus:ring-green-700 ${row.status === 'paid' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                        >
                          <option value="not_paid">Not Paid</option>
                          <option value="paid">Paid</option>
                        </select>
                      ) : (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${row.status === 'paid' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {row.status === 'paid' ? 'Paid' : 'Not Paid'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isLoggedIn && (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setModal({ batch: row })} className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(row)} className="p-1 text-red-400 hover:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <HeadBatchModal
          batch={modal.batch}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); fetchData(); }}
        />
      )}
      {dialog && (
        <ConfirmModal
          {...dialog}
          onConfirm={() => { dialog.onConfirm(); setDialog(null); }}
          onCancel={() => setDialog(null)}
        />
      )}
    </div>
  );
}
