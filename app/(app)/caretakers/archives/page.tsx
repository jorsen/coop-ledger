'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, Search } from 'lucide-react';
import { usePoll } from '@/hooks/use-poll';

interface ArchivedBatch {
  id: number;
  batch_number: string;
  status: string;
  heads: number | null;
  date_of_application: string | null;
  date_of_hauling: string | null;
  maturity_date: string | null;
  notes: string | null;
  batch_date: string | null;
  client_id: number;
  client_name: string;
  client_code: string;
  transaction_count: number;
  total_bags: number;
  total_debit: number;
}

const fmtDate = (d: string | null) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${parseInt(m)}/${parseInt(day)}/${y}`;
};

const fmtPeso = (n: number) =>
  '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ArchivesPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<ArchivedBatch[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchArchives = useCallback(async () => {
    const res = await fetch('/api/archives');
    setBatches(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchArchives(); }, [fetchArchives]);
  usePoll(fetchArchives);

  const filtered = batches.filter((b) => {
    const q = search.toLowerCase();
    return (
      b.client_name.toLowerCase().includes(q) ||
      b.client_code.toLowerCase().includes(q) ||
      b.batch_number.toLowerCase().includes(q)
    );
  });

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
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/caretakers')}
            className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Back to Caretakers"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Archives</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">All paid batches</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <span className="text-sm text-gray-500 dark:text-gray-400">{filtered.length} batch{filtered.length !== 1 ? 'es' : ''}</span>
        </div>
      </div>

      <div className="mb-6 max-w-xs">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID or batch…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-16">No archived batches found.</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 whitespace-nowrap">CARETAKER</th>
                  <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 whitespace-nowrap">ID</th>
                  <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 whitespace-nowrap">BATCH #</th>
                  <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 whitespace-nowrap">HEADS</th>
                  <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 whitespace-nowrap">APP. DATE</th>
                  <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 whitespace-nowrap">HAULING DATE</th>
                  <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 whitespace-nowrap">TX</th>
                  <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 whitespace-nowrap">TOTAL DEBIT</th>
                  <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 whitespace-nowrap">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((batch) => (
                  <tr
                    key={batch.id}
                    className="border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 cursor-pointer"
                    onClick={() => router.push(`/caretakers/${batch.client_id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{batch.client_name}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{batch.client_code}</td>
                    <td className="px-4 py-3 font-medium text-green-700 dark:text-green-400 whitespace-nowrap">#{batch.batch_number}</td>
                    <td className="px-4 py-3 text-right text-green-700 dark:text-green-400 font-semibold whitespace-nowrap">{batch.heads ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{fmtDate(batch.date_of_application)}</td>
                    <td className="px-4 py-3 text-red-600 font-medium whitespace-nowrap">{fmtDate(batch.date_of_hauling)}</td>
                    <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{batch.transaction_count}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white whitespace-nowrap">{fmtPeso(batch.total_debit)}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => router.push(`/caretakers/${batch.client_id}`)}
                          className="flex items-center gap-1 text-xs text-green-700 dark:text-green-400 hover:text-green-600 font-medium"
                        >
                          <Eye className="w-3.5 h-3.5" /> Ledger
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
