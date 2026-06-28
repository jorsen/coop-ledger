'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, Printer } from 'lucide-react';
import TransactionModal from '@/components/transaction-modal';
import ConfirmModal from '@/components/confirm-modal';
import { usePoll } from '@/hooks/use-poll';

interface Client { id: number; name: string }

interface Transaction {
  id: number;
  client_id: number;
  client_name: string;
  date: string;
  feed_type: string;
  bags: number;
  debit: number;
  credit: number;
  notes: string;
  sales_invoice: string;
  price_per_bag: number | null;
}

const peso = (n: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ tx?: Transaction } | null>(null);
  const [dialog, setDialog] = useState<{ title: string; message: string; variant?: 'default' | 'delete'; onConfirm: () => void } | null>(null);

  // Filters
  const [search, setSearch]       = useState('');
  const [fromDate, setFromDate]   = useState('');
  const [toDate, setToDate]       = useState('');
  const [clientId, setClientId]   = useState('');

  const fetchTransactions = useCallback(async () => {
    const params = new URLSearchParams();
    if (search)   params.set('search', search);
    if (fromDate) params.set('from', fromDate);
    if (toDate)   params.set('to', toDate);
    if (clientId) params.set('client_id', clientId);

    const res = await fetch(`/api/transactions?${params}`);
    setTransactions(await res.json());
    setLoading(false);
  }, [search, fromDate, toDate, clientId]);

  useEffect(() => {
    fetch('/api/clients').then((r) => r.json()).then(setClients);
  }, []);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);
  usePoll(fetchTransactions);

  function handleDelete(id: number) {
    setDialog({
      title: 'Delete Transaction',
      message: 'This transaction will be permanently removed.',
      variant: 'delete',
      onConfirm: async () => {
        await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
        fetchTransactions();
      },
    });
  }

  const totalDebit  = transactions.reduce((s, t) => s + Number(t.debit), 0);
  const totalCredit = transactions.reduce((s, t) => s + Number(t.credit), 0);
  const totalBags   = transactions.reduce((s, t) => s + Number(t.bags), 0);

  return (
    <div>
      {/* Print header */}
      <div className="hidden print:block mb-6 border-b border-gray-300 pb-4">
        <p className="text-lg font-bold">Feed Cooperative — Transactions</p>
        <p className="text-sm mt-1">
          {(search || clientId || fromDate || toDate)
            ? `Filtered: ${[search, fromDate && `From ${fromDate}`, toDate && `To ${toDate}`].filter(Boolean).join(' · ')}`
            : 'All Transactions'}
          &nbsp;|&nbsp; Printed: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Transactions</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">All cooperative transactions</p>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          <button
            onClick={() => setModal({})}
            className="flex items-center gap-2 bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4 flex flex-wrap gap-3 print:hidden">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client name…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-800 bg-white dark:bg-gray-800 dark:text-white"
          />
        </div>
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800 min-w-40 bg-white dark:bg-gray-800 dark:text-white"
        >
          <option value="">All caretakers</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800 bg-white dark:bg-gray-800 dark:text-white"
          />
          <span className="text-gray-400 dark:text-gray-500 text-sm">–</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800 bg-white dark:bg-gray-800 dark:text-white"
          />
        </div>
        {(search || fromDate || toDate || clientId) && (
          <button
            onClick={() => { setSearch(''); setFromDate(''); setToDate(''); setClientId(''); }}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-3 py-2"
          >
            Clear
          </button>
        )}
      </div>

      {/* Totals bar */}
      {transactions.length > 0 && (
        <div className="flex gap-6 text-sm mb-3 px-1">
          <span className="text-gray-500 dark:text-gray-400">{transactions.length} records</span>
          <span className="text-gray-700 dark:text-gray-300">Total Price: <strong>{peso(totalDebit)}</strong></span>
          <span className="text-gray-700 dark:text-gray-300">Credit: <strong className="text-green-600">{peso(totalCredit)}</strong></span>
          <span className="text-gray-700 dark:text-gray-300">Bags: <strong>{totalBags}</strong></span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-6 py-3">Date</th>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-6 py-3">Caretaker</th>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-6 py-3">Feed</th>
                <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 px-6 py-3">Bags</th>
                <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 px-6 py-3">Price/Bag</th>
                <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 px-6 py-3">Total Price</th>
                <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 px-6 py-3">Credit</th>
                <th className="px-6 py-3 print:hidden" />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="text-center py-10">
                    <div className="w-5 h-5 border-2 border-green-800 border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              )}
              {!loading && transactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-sm text-gray-400 dark:text-gray-500 py-10">
                    No transactions found.
                  </td>
                </tr>
              )}
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-3 text-sm text-blue-600 dark:text-blue-400 whitespace-nowrap">{fmtDate(tx.date)}</td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white">{tx.client_name}</td>
                  <td className="px-6 py-3">
                    {tx.feed_type && (
                      <span className="inline-block bg-green-50 dark:bg-green-900/40 text-green-800 dark:text-green-400 text-xs font-medium px-2 py-0.5 rounded">
                        {tx.feed_type}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300 text-right">{tx.bags}</td>
                  <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400 text-right">
                    {tx.price_per_bag ? peso(tx.price_per_bag) : '—'}
                  </td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white text-right">{peso(tx.debit)}</td>
                  <td className="px-6 py-3 text-sm text-green-600 dark:text-green-400 text-right">{peso(tx.credit)}</td>
                  <td className="px-6 py-3 print:hidden">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setModal({ tx })}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="p-1 text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal !== null && (
        <TransactionModal
          transaction={modal.tx}
          clients={clients}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); fetchTransactions(); }}
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
