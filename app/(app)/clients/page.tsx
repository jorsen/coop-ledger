'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Eye, Pencil, Trash2, Search } from 'lucide-react';
import ClientModal from '@/components/client-modal';

interface Client {
  id: number;
  client_code: string;
  name: string;
  loan_number: string;
  status: string;
  heads: number;
  allocation: number;
  transaction_count: number;
}

const peso = (n: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(n);

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; client?: Client } | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  async function fetchClients() {
    const res = await fetch('/api/clients');
    setClients(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchClients(); }, []);

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.client_code.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete(id: number) {
    if (!confirm('Delete this client and all their transactions? This cannot be undone.')) return;
    await fetch(`/api/clients/${id}`, { method: 'DELETE' });
    fetchClients();
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
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage cooperative members</p>
        </div>
        <button
          onClick={() => setModal({ mode: 'add' })}
          className="flex items-center gap-2 bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or ID…"
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
        />
      </div>

      {filtered.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-16">No clients found.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((client) => (
          <div key={client.id} className="bg-white rounded-xl border border-gray-200 p-5">
            {/* Header */}
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-semibold text-gray-900 text-sm">{client.name}</h3>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded ${
                  client.status === 'active'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {client.status}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              ID: {client.client_code} · Loan #{client.loan_number}
            </p>
            <p className="text-xs text-gray-400 mb-3">{client.transaction_count} transaction(s)</p>

            {/* Stats */}
            <div className="flex items-center gap-4 py-3 border-t border-gray-100 mb-3">
              <div>
                <p className="text-xs text-gray-500">Heads</p>
                <p className="text-sm font-semibold text-green-700">{client.heads}</p>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div>
                <p className="text-xs text-gray-500">Allocation</p>
                <p className="text-sm font-semibold text-gray-900">{peso(client.allocation)}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push(`/clients/${client.id}`)}
                className="flex-1 flex items-center justify-center gap-2 border border-gray-200 text-gray-700 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                <Eye className="w-4 h-4" />
                Ledger
              </button>
              <button
                onClick={() => setModal({ mode: 'edit', client })}
                className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(client.id)}
                className="p-1.5 border border-gray-200 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <ClientModal
          mode={modal.mode}
          client={modal.client}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); fetchClients(); }}
        />
      )}
    </div>
  );
}
