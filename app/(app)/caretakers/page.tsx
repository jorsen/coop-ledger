'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Eye, Pencil, Trash2, Search, LayoutGrid, List, StickyNote, Archive } from 'lucide-react';
import ClientModal from '@/components/client-modal';
import ConfirmModal from '@/components/confirm-modal';
import { usePoll } from '@/hooks/use-poll';

interface BatchInfo {
  batch_number: string;
  heads: number | null;
  date_of_application: string | null;
  date_of_hauling: string | null;
  status: string;
  transaction_count: number;
  total_debit: number;
}

interface Client {
  id: number;
  client_code: string;
  name: string;
  batch_number: string;
  status: string;
  heads: number;
  date_of_hauling: string;
  date_of_application: string;
  transaction_count: number;
  current_batch_number: string | null;
  current_heads: number | null;
  current_date_of_application: string | null;
  current_date_of_hauling: string | null;
  all_batches: BatchInfo[];
  notes: string | null;
  is_updated: boolean;
  updated_at: string | null;
}

const fmtDate = (d: string | null) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${parseInt(m)}/${parseInt(day)}/${y}`;
};

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'active'    ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
    status === 'on-going'  ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
    status === 'paid'      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
    status === 'completed' ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                             'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400';
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${cls}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function CaretakersPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [updatedFilter, setUpdatedFilter] = useState<'all' | 'updated' | 'not-updated'>('all');
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; client?: Client } | null>(null);
  const [dialog, setDialog] = useState<{ title: string; message: string; variant?: 'default' | 'delete'; onConfirm: () => void } | null>(null);
  const [view, setView] = useState<'card' | 'list'>('list');

  useEffect(() => {
    const saved = localStorage.getItem('caretakers-view') as 'card' | 'list' | null;
    if (saved) setView(saved);
  }, []);

  function toggleView(v: 'card' | 'list') {
    setView(v);
    localStorage.setItem('caretakers-view', v);
  }

  const fetchClients = useCallback(async () => {
    const res = await fetch('/api/clients');
    setClients(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchClients();
    fetch('/api/auth/session').then(r => r.json()).then(d => setIsLoggedIn(d.isLoggedIn));
  }, [fetchClients]);
  usePoll(fetchClients);

  const filtered = clients.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.client_code.toLowerCase().includes(search.toLowerCase());
    const matchesUpdated =
      updatedFilter === 'all' ||
      (updatedFilter === 'updated' && c.is_updated) ||
      (updatedFilter === 'not-updated' && !c.is_updated);
    return matchesSearch && matchesUpdated;
  });

  async function handleToggleUpdated(id: number, value: boolean) {
    setClients(prev => prev.map(c => c.id === id ? { ...c, is_updated: value } : c));
    await fetch(`/api/clients/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_updated: value }),
    });
  }

  function handleDelete(id: number) {
    setDialog({
      title: 'Delete Caretaker',
      message: 'This will permanently delete the caretaker and all their transactions. This cannot be undone.',
      variant: 'delete',
      onConfirm: async () => {
        await fetch(`/api/clients/${id}`, { method: 'DELETE' });
        fetchClients();
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

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Caretakers</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage cooperative members</p>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <button
            onClick={() => router.push('/caretakers/archives')}
            className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Archive className="w-4 h-4" />
            Archives
          </button>
          {isLoggedIn && (
            <button
              onClick={() => setModal({ mode: 'add' })}
              className="flex items-center gap-2 bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Caretaker
            </button>
          )}
        </div>
      </div>

      {/* Search + view toggle */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative max-w-xs flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or ID…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
          />
        </div>
        <select
          value={updatedFilter}
          onChange={(e) => setUpdatedFilter(e.target.value as 'all' | 'updated' | 'not-updated')}
          className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800 shrink-0"
        >
          <option value="all">All</option>
          <option value="updated">Updated</option>
          <option value="not-updated">Not Updated</option>
        </select>
        <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shrink-0">
          <button
            onClick={() => toggleView('card')}
            className={`p-2 transition-colors ${view === 'card' ? 'bg-green-800 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            title="Card view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => toggleView('list')}
            className={`p-2 transition-colors ${view === 'list' ? 'bg-green-800 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            title="List view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-16">No caretakers found.</p>
      )}

      {/* ── Card view ── */}
      {view === 'card' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((client) => (
            <div key={client.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-start justify-between mb-1">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{client.name}</h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ID: {client.client_code}
                {client.current_batch_number && <> · Batch <span className="font-medium text-green-700">#{client.current_batch_number}</span></>}
              </p>
              <div className="mt-1.5" onClick={e => e.stopPropagation()}>
                {isLoggedIn ? (
                  <select
                    value={client.is_updated ? 'updated' : 'not-updated'}
                    onChange={e => handleToggleUpdated(client.id, e.target.value === 'updated')}
                    className={`w-full text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-1.5 py-0.5 outline-none cursor-pointer focus:ring-1 focus:ring-green-700 ${client.is_updated ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                  >
                    <option value="updated">Updated</option>
                    <option value="not-updated">Not Updated</option>
                  </select>
                ) : (
                  <span className={`text-xs font-medium ${client.is_updated ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {client.is_updated ? 'Updated' : 'Not Updated'}
                  </span>
                )}
              </div>
              {client.notes && (
                <div className="flex items-start gap-1.5 mt-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-md px-2 py-1.5">
                  <StickyNote className="w-3 h-3 shrink-0 mt-0.5 text-amber-500" />
                  <p className="text-xs line-clamp-2 leading-tight text-amber-800 dark:text-amber-300">{client.notes}</p>
                </div>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3 mt-1">{client.transaction_count} transaction(s)</p>
              <div className="grid grid-cols-4 gap-x-3 gap-y-3 py-3 border-t border-gray-100 dark:border-gray-700 mb-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Batch / Heads</p>
                  {client.all_batches?.length > 1
                    ? <div className="space-y-0.5 mt-0.5">{client.all_batches.map(b => (
                        <div key={b.batch_number} className="flex items-center gap-1 text-xs">
                          <span className="font-semibold text-green-700 dark:text-green-400">#{b.batch_number}</span>
                          <span className="text-gray-400">·</span>
                          <span className="font-semibold text-green-700 dark:text-green-400">{b.heads ?? '—'}</span>
                        </div>
                      ))}</div>
                    : <p className="text-sm font-semibold text-green-700 dark:text-green-400">{client.current_heads ?? '—'}</p>
                  }
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">App. Date</p>
                  {client.all_batches?.length > 1
                    ? <div className="divide-y divide-gray-100 dark:divide-gray-700 mt-0.5">{client.all_batches.map(b => (
                        <div key={b.batch_number} className="py-1.5 text-xs font-semibold text-gray-900 dark:text-white">{fmtDate(b.date_of_application)}</div>
                      ))}</div>
                    : <p className="text-sm font-semibold text-gray-900 dark:text-white">{fmtDate(client.current_date_of_application)}</p>
                  }
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Hauling Date</p>
                  {client.all_batches?.length > 1
                    ? <div className="divide-y divide-gray-100 dark:divide-gray-700 mt-0.5">{client.all_batches.map(b => (
                        <div key={b.batch_number} className="py-1.5 text-xs font-semibold text-red-600">{fmtDate(b.date_of_hauling)}</div>
                      ))}</div>
                    : <p className="text-sm font-semibold text-red-600">{fmtDate(client.current_date_of_hauling)}</p>
                  }
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">TX</p>
                  {client.all_batches?.length > 1
                    ? <div className="space-y-0.5 mt-0.5">{client.all_batches.map(b => (
                        <div key={b.batch_number} className="text-xs font-semibold text-gray-700 dark:text-gray-300">{b.transaction_count}</div>
                      ))}</div>
                    : <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{client.transaction_count}</p>
                  }
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push(`/caretakers/${client.id}`)}
                  className="flex-1 flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-1.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Eye className="w-4 h-4" /> Ledger
                </button>
                {isLoggedIn && (
                  <>
                    <button
                      onClick={() => setModal({ mode: 'edit', client })}
                      className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(client.id)}
                      className="p-1.5 border border-gray-200 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── List view ── */}
      {view === 'list' && filtered.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 whitespace-nowrap">NAME</th>
                  <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 whitespace-nowrap">ID</th>
                  <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 whitespace-nowrap">NOTES</th>
                  <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 whitespace-nowrap">BATCH #</th>
                  <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 whitespace-nowrap">HEADS</th>
                  <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 whitespace-nowrap">APP. DATE</th>
                  <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 whitespace-nowrap">HAULING DATE</th>
                  <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 whitespace-nowrap">TX</th>
                  <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 whitespace-nowrap">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => (
                  <tr
                    key={client.id}
                    className="border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 cursor-pointer"
                    onClick={() => router.push(`/caretakers/${client.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{client.name}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{client.client_code}</td>
                    <td className="px-4 py-3 w-px whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      {isLoggedIn ? (
                        <select
                          value={client.is_updated ? 'updated' : 'not-updated'}
                          onChange={e => handleToggleUpdated(client.id, e.target.value === 'updated')}
                          className={`text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-1.5 py-0.5 outline-none cursor-pointer focus:ring-1 focus:ring-green-700 ${client.is_updated ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                        >
                          <option value="updated">Updated</option>
                          <option value="not-updated">Not Updated</option>
                        </select>
                      ) : (
                        <span className={`text-xs font-medium ${client.is_updated ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {client.is_updated ? 'Updated' : 'Not Updated'}
                        </span>
                      )}
                      {client.notes && (
                        <div className="flex items-start gap-1 mt-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded px-1.5 py-1" title={client.notes}>
                          <StickyNote className="w-3 h-3 shrink-0 mt-0.5 text-amber-500" />
                          <p className="text-xs truncate leading-tight text-amber-800 dark:text-amber-300">{client.notes}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {client.all_batches?.length > 1
                        ? <div className="divide-y divide-gray-200 dark:divide-gray-600 -my-3 -mx-4">{client.all_batches.map(b => (
                            <div key={b.batch_number} className="px-4 py-2 text-xs font-medium text-green-700 dark:text-green-400 whitespace-nowrap">#{b.batch_number}</div>
                          ))}</div>
                        : client.current_batch_number
                          ? <span className="font-medium text-green-700 dark:text-green-400">#{client.current_batch_number}</span>
                          : <span className="text-gray-400">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right text-green-700 dark:text-green-400 font-semibold">
                      {client.all_batches?.length > 1
                        ? <div className="divide-y divide-gray-200 dark:divide-gray-600 -my-3 -mx-4">{client.all_batches.map(b => (
                            <div key={b.batch_number} className="px-4 py-2 text-xs text-right whitespace-nowrap">{b.heads ?? '—'}</div>
                          ))}</div>
                        : (client.current_heads ?? '—')
                      }
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {client.all_batches?.length > 1
                        ? <div className="divide-y divide-gray-200 dark:divide-gray-600 -my-3 -mx-4">{client.all_batches.map(b => (
                            <div key={b.batch_number} className="px-4 py-2 text-xs whitespace-nowrap">{fmtDate(b.date_of_application)}</div>
                          ))}</div>
                        : <span className="whitespace-nowrap">{fmtDate(client.current_date_of_application)}</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-red-600 font-medium">
                      {client.all_batches?.length > 1
                        ? <div className="divide-y divide-gray-200 dark:divide-gray-600 -my-3 -mx-4">{client.all_batches.map(b => (
                            <div key={b.batch_number} className="px-4 py-2 text-xs whitespace-nowrap">{fmtDate(b.date_of_hauling)}</div>
                          ))}</div>
                        : <span className="whitespace-nowrap">{fmtDate(client.current_date_of_hauling)}</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">
                      {client.all_batches?.length > 1
                        ? <div className="divide-y divide-gray-200 dark:divide-gray-600 -my-3 -mx-4">{client.all_batches.map(b => (
                            <div key={b.batch_number} className="px-4 py-2 text-xs text-right">{b.transaction_count}</div>
                          ))}</div>
                        : client.transaction_count
                      }
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => router.push(`/caretakers/${client.id}`)}
                          className="flex items-center gap-1 text-xs text-green-700 dark:text-green-400 hover:text-green-600 font-medium"
                        >
                          <Eye className="w-3.5 h-3.5" /> Ledger
                        </button>
                        {isLoggedIn && (
                          <>
                            <button
                              onClick={() => setModal({ mode: 'edit', client })}
                              className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(client.id)}
                              className="p-1 text-red-400 hover:text-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <ClientModal
          mode={modal.mode}
          client={modal.client}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); fetchClients(); }}
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
