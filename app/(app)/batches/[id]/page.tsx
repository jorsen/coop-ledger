'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Pencil, Trash2, Printer } from 'lucide-react';
import TransactionModal from '@/components/transaction-modal';
import { usePoll } from '@/hooks/use-poll';

interface Batch {
  id: number;
  batch_number: string;
  client_id: number | null;
  batch_date: string;
  notes: string;
}

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

export default function BatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ tx?: Transaction } | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/batches/${id}`);
    if (!res.ok) { router.push('/batches'); return; }
    const data = await res.json();
    const { transactions: txs, ...batchData } = data;
    setBatch(batchData);
    setTransactions(Array.isArray(txs) ? txs : []);
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    fetch('/api/clients').then((r) => r.json()).then(setClients);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  usePoll(fetchData);

  async function handleDelete(txId: number) {
    if (!confirm('Delete this transaction?')) return;
    await fetch(`/api/transactions/${txId}`, { method: 'DELETE' });
    fetchData();
  }

  const totalDebit  = transactions.reduce((s, t) => s + Number(t.debit), 0);
  const totalCredit = transactions.reduce((s, t) => s + Number(t.credit), 0);
  const totalBags   = transactions.reduce((s, t) => s + Number(t.bags), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-green-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!batch) return null;

  return (
    <div>
      {/* Print header */}
      <div className="hidden print:block mb-6 border-b border-gray-300 pb-4">
        <p className="text-lg font-bold">Feed Cooperative — Batch {batch.batch_number}</p>
        <p className="text-sm mt-1">Date: {fmtDate(batch.batch_date)} &nbsp;|&nbsp; Printed: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        {batch.notes && <p className="text-sm text-gray-500">{batch.notes}</p>}
      </div>

      <button
        onClick={() => batch.client_id ? router.push(`/clients/${batch.client_id}`) : router.push('/clients')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 print:hidden"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Caretaker
      </button>

      <div className="flex items-start justify-between mb-6 print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <span className="bg-green-800 text-white text-sm font-bold px-3 py-1 rounded-lg">
              {batch.batch_number}
            </span>
            <h1 className="text-xl font-semibold text-gray-900">{fmtDate(batch.batch_date)}</h1>
          </div>
          {batch.notes && <p className="text-sm text-gray-500 mt-1">{batch.notes}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
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

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Transactions', value: transactions.length },
          { label: 'Total Bags',   value: totalBags },
          { label: 'Total Amount', value: peso(totalDebit) },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">{item.label}</p>
            <p className="text-lg font-semibold text-gray-900">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Transactions table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Transactions in this batch</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Date</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Caretaker</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Feed</th>
                <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Bags</th>
                <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Price/Bag</th>
                <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Total Price</th>
                <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Credit</th>
                <th className="px-4 py-3 print:hidden" />
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-sm text-gray-400 py-10">
                    No transactions in this batch yet.
                  </td>
                </tr>
              )}
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{fmtDate(tx.date)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{tx.client_name}</td>
                  <td className="px-4 py-3">
                    {tx.feed_type && (
                      <span className="inline-block bg-green-50 text-green-800 text-xs font-medium px-2 py-0.5 rounded">
                        {tx.feed_type}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700 text-right">{tx.bags}</td>
                  <td className="px-4 py-3 text-gray-600 text-right">
                    {tx.price_per_bag ? peso(tx.price_per_bag) : '—'}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 text-right">{peso(tx.debit)}</td>
                  <td className="px-4 py-3 text-green-600 text-right">{Number(tx.credit) > 0 ? peso(tx.credit) : '0.00'}</td>
                  <td className="px-4 py-3 print:hidden">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setModal({ tx })}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="p-1 text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {transactions.length > 0 && (
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold text-sm">
                  <td colSpan={3} className="px-4 py-3 text-xs text-gray-500" />
                  <td className="px-4 py-3 text-right text-gray-700">{totalBags}</td>
                  <td />
                  <td className="px-4 py-3 text-right text-gray-900">{peso(totalDebit)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{totalCredit > 0 ? peso(totalCredit) : '-'}</td>
                  <td className="print:hidden" />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal !== null && (
        <TransactionModal
          transaction={modal.tx}
          clients={clients}
          defaultBatchId={batch.id}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); fetchData(); }}
        />
      )}
    </div>
  );
}
