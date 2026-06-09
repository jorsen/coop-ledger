'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Pencil, Trash2, Printer } from 'lucide-react';
import TransactionModal from '@/components/transaction-modal';

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
}

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

  async function fetchData() {
    const res = await fetch(`/api/clients/${id}`);
    if (!res.ok) { router.push('/clients'); return; }
    const data = await res.json();
    const { transactions: txs, ...clientData } = data;
    setClient(clientData);
    setTransactions(txs);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [id]);

  async function handleDelete(txId: number) {
    if (!confirm('Delete this transaction?')) return;
    await fetch(`/api/transactions/${txId}`, { method: 'DELETE' });
    fetchData();
  }

  const totalDebit  = transactions.reduce((s, t) => s + Number(t.debit), 0);
  const totalCredit = transactions.reduce((s, t) => s + Number(t.credit), 0);
  const totalBags   = transactions.reduce((s, t) => s + Number(t.bags), 0);
  const balance     = totalDebit - totalCredit;

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
        <ArrowLeft className="w-4 h-4" /> Back to Clients
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

      {/* Summary */}
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
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Date</th>
                <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Feed</th>
                <th className="text-right text-xs font-medium text-gray-500 px-6 py-3">Bags</th>
                <th className="text-right text-xs font-medium text-gray-500 px-6 py-3">Total Price</th>
                <th className="text-right text-xs font-medium text-gray-500 px-6 py-3">Credit</th>
                <th className="px-6 py-3 print:hidden" />
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-sm text-gray-400 py-10">
                    No transactions yet.
                  </td>
                </tr>
              )}
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-6 py-3 text-sm text-blue-600 whitespace-nowrap">{fmtDate(tx.date)}</td>
                  <td className="px-6 py-3">
                    {tx.feed_type && (
                      <span className="inline-block bg-green-50 text-green-800 text-xs font-medium px-2 py-0.5 rounded">
                        {tx.feed_type}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-700 text-right">{tx.bags}</td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-900 text-right">{peso(tx.debit)}</td>
                  <td className="px-6 py-3 text-sm text-green-600 text-right">{peso(tx.credit)}</td>
                  <td className="px-6 py-3 print:hidden">
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
            </tbody>
          </table>
        </div>
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
