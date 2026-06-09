'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Pencil, Trash2, Printer } from 'lucide-react';
import TransactionModal from '@/components/transaction-modal';
import { usePoll } from '@/hooks/use-poll';

interface Client {
  id: number;
  client_code: string;
  name: string;
  loan_number: string;
  status: string;
  heads: number;
  allocation: number;
}

interface Transaction {
  id: number;
  client_id: number;
  date: string;
  feed_type: string;
  bags: number;
  debit: number;
  credit: number;
  notes: string;
  sales_invoice: string;
  price_per_bag: number | null;
}

const DFFS1_RATE = 0.0115;  // 1.15% per transaction
const DFFS2_FIXED = 500;    // fixed per billing cycle

const peso = (n: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function ClientLedgerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ tx?: Transaction } | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/clients/${id}`);
    if (!res.ok) { router.push('/clients'); return; }
    const data = await res.json();
    const { transactions: txs, ...clientData } = data;
    setClient(clientData);
    setTransactions(txs);
    setLoading(false);
  }, [id, router]);

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
  const balance     = totalDebit - totalCredit;

  // Per-row computed values
  const withComputed = transactions.map((tx, i) => {
    const runningBalance = transactions
      .slice(0, i + 1)
      .reduce((s, t) => s + Number(t.debit) - Number(t.credit), 0);
    const dffs1 = Math.round(Number(tx.debit) * DFFS1_RATE * 100) / 100;
    const interest = Math.round(dffs1 * 2 * 100) / 100;
    return { ...tx, runningBalance, dffs1, interest };
  });

  // Summary totals
  const totalDffs1    = Math.round(withComputed.reduce((s, t) => s + t.dffs1, 0) * 100) / 100;
  const totalInterest = Math.round(withComputed.reduce((s, t) => s + t.interest, 0) * 100) / 100;
  const grandTotal    = balance + totalInterest + totalDffs1 + DFFS2_FIXED;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-green-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!client) return null;

  return (
    <div>
      {/* Back + header */}
      {/* Print header — only visible when printing */}
      <div className="hidden print:block mb-6 border-b border-gray-300 pb-4">
        <p className="text-lg font-bold">Feed Cooperative — Client Ledger</p>
        <p className="text-sm mt-1">Client: <strong>{client.name}</strong> &nbsp;|&nbsp; ID: {client.client_code} &nbsp;|&nbsp; Loan #{client.loan_number}</p>
        <p className="text-sm">Heads: {client.heads} &nbsp;|&nbsp; Allocation: {peso(client.allocation)} &nbsp;|&nbsp; Printed: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </div>

      <button
        onClick={() => router.push('/clients')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 print:hidden"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Caretakers
      </button>

      <div className="flex items-start justify-between mb-6 print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">{client.name}</h1>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded ${
                client.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {client.status}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            ID: {client.client_code} · Loan #{client.loan_number} · {client.heads} heads · Allocation: {peso(client.allocation)}
          </p>
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

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Sales',  value: peso(totalDebit),  color: 'text-gray-900' },
          { label: 'Total Credit', value: peso(totalCredit), color: 'text-green-600' },
          { label: 'Balance',      value: peso(balance),     color: balance > 0 ? 'text-red-600' : 'text-green-600' },
          { label: 'Total Bags',   value: totalBags,         color: 'text-gray-900' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">{item.label}</p>
            <p className={`text-lg font-semibold ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Transactions table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Feeds</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">TR Date</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Sales Invoice</th>
                <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">No. of Bags</th>
                <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Debit</th>
                <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Credit</th>
                <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Balance</th>
                <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">DFFS 1</th>
                <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Interest</th>
                <th className="px-4 py-3 print:hidden" />
              </tr>
            </thead>
            <tbody>
              {withComputed.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center text-sm text-gray-400 py-10">
                    No transactions yet.
                  </td>
                </tr>
              )}
              {withComputed.map((tx) => (
                <tr key={tx.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-xs">
                    {tx.feed_type && (
                      <span className="inline-block bg-green-50 text-green-800 font-medium px-2 py-0.5 rounded">
                        {tx.feed_type}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-blue-600 whitespace-nowrap">{fmtDate(tx.date)}</td>
                  <td className="px-4 py-3 text-gray-500">{tx.sales_invoice || '—'}</td>
                  <td className="px-4 py-3 text-gray-700 text-right">{tx.bags}</td>
                  <td className="px-4 py-3 font-medium text-blue-700 text-right">{peso(tx.debit)}</td>
                  <td className="px-4 py-3 text-green-600 text-right">{Number(tx.credit) > 0 ? peso(tx.credit) : '0.00'}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 text-right">{peso(tx.runningBalance)}</td>
                  <td className="px-4 py-3 text-orange-600 text-right">{tx.dffs1.toFixed(2)}</td>
                  <td className="px-4 py-3 text-orange-700 text-right">{tx.interest.toFixed(2)}</td>
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
              {/* Column totals row */}
              {withComputed.length > 0 && (
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                  <td colSpan={3} className="px-4 py-3 text-xs text-gray-500" />
                  <td className="px-4 py-3 text-right text-gray-700">{totalBags}</td>
                  <td className="px-4 py-3 text-right text-blue-700">{peso(totalDebit)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{totalCredit > 0 ? peso(totalCredit) : '-'}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{peso(balance)}</td>
                  <td className="px-4 py-3 text-right text-orange-600">{totalDffs1.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-orange-700">{totalInterest.toFixed(2)}</td>
                  <td className="print:hidden" />
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Billing summary */}
        {withComputed.length > 0 && (
          <div className="border-t border-gray-200 px-6 py-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Principal</span>
                  <span className="font-medium text-gray-900">{peso(balance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Interest</span>
                  <span className="font-medium text-gray-900">{peso(totalInterest)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">DFFS 1</span>
                  <span className="font-medium text-gray-900">{peso(totalDffs1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">DFFS 2</span>
                  <span className="font-medium text-gray-900">{peso(DFFS2_FIXED)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold text-gray-900 underline">{peso(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {modal !== null && (
        <TransactionModal
          transaction={modal.tx}
          clients={[{ id: client.id, name: client.name }]}
          defaultClientId={client.id}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); fetchData(); }}
        />
      )}
    </div>
  );
}
