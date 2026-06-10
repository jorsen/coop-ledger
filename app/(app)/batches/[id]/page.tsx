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
  date_of_application: string | null;
  date_of_hauling: string | null;
  maturity_date: string | null;
  heads: number | null;
  client_name: string | null;
  client_code: string | null;
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
  delivery_fee: number;
}


const num = (n: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const fmtDate = (d: string) => {
  const [y, m, day] = d.split('-');
  return `${parseInt(m)}/${parseInt(day)}/${y}`;
};

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

  const totalDebit       = transactions.reduce((s, t) => s + Number(t.debit), 0);
  const totalCredit      = transactions.reduce((s, t) => s + Number(t.credit), 0);
  const totalBags        = transactions.reduce((s, t) => s + Number(t.bags), 0);
  const totalDeliveryFee = transactions.reduce((s, t) => s + Number(t.delivery_fee ?? 0), 0);
  const balance          = totalDebit - totalCredit;

  const maturityDate = batch?.maturity_date ?? null;

  const withComputed = transactions.map((tx, i) => {
    const runningBalance = transactions
      .slice(0, i + 1)
      .reduce((s, t) => s + Number(t.debit) - Number(t.credit), 0);
    const d = Number(tx.debit);
    let days = 0;
    let dffs1 = 0;
    let interest = 0;
    if (maturityDate) {
      days     = Math.max(0, Math.round((new Date(maturityDate).getTime() - new Date(tx.date).getTime()) / (1000 * 60 * 60 * 24)));
      dffs1    = Math.round(d * 0.03 * days / 360 * 100) / 100;
      interest = Math.round(d * 0.06 * days / 360 * 100) / 100;
    }
    return { ...tx, runningBalance, days, dffs1, interest };
  });

  const totalDffs1    = withComputed.reduce((s, tx) => s + tx.dffs1, 0);
  const totalInterest = withComputed.reduce((s, tx) => s + tx.interest, 0);
  const dffs2         = 50 * (batch?.heads ?? 0);

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
      <div className="hidden print:flex print:justify-between mb-4 border-b border-gray-300 pb-3">
        <div className="space-y-1 text-sm">
          <p className="text-xs text-gray-500">BATCH</p>
          <p className="font-bold">{batch.batch_number}</p>
          <p className="text-xs text-gray-500 mt-1">DATE</p>
          <p className="font-semibold">{fmtDate(batch.batch_date)}</p>
        </div>
        <p className="text-xs text-gray-400 mt-2">Printed: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </div>

      <div className="flex items-center justify-between mb-4 print:hidden">
        <button
          onClick={() => batch.client_id ? router.push(`/caretakers/${batch.client_id}`) : router.push('/caretakers')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Caretaker
        </button>
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
            <Plus className="w-4 h-4" /> Add Transaction
          </button>
        </div>
      </div>

      {batch.client_name && (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-5 mb-4 text-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-4">
            <div>
              <p className="text-xs font-medium text-gray-400 mb-0.5">NAME</p>
              <p className="font-bold text-gray-900">{batch.client_name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 mb-0.5">BATCH #</p>
              <p className="font-semibold text-blue-600">{batch.batch_number}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 mb-0.5">CLIENT ID</p>
              <p className="font-semibold text-gray-700">{batch.client_code ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 mb-0.5">STATUS</p>
              <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800">Active</span>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 mb-0.5"># OF HEADS</p>
              <p className="font-semibold text-gray-900">{batch.heads ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 mb-0.5">DATE OF APPLICATION</p>
              <p className="font-semibold text-gray-900">{batch.date_of_application ? fmtDate(batch.date_of_application) : '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 mb-0.5">DATE OF HAULING</p>
              <p className="font-semibold text-red-600">{batch.date_of_hauling ? fmtDate(batch.date_of_hauling) : '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 mb-0.5">MATURITY DATE</p>
              <p className="font-semibold text-green-700">{batch.maturity_date ? fmtDate(batch.maturity_date) : '—'}</p>
            </div>
          </div>
        </div>
      )}

      {batch.notes && <p className="text-sm text-gray-500 mb-4">{batch.notes}</p>}

      {/* Transactions table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3">FEEDS</th>
                <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3">TR_DATE</th>
                <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3">NO.OF BAGS</th>
                <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3 print:hidden">Price/Bag</th>
                <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3">Debit</th>
                <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3 print:hidden">Delivery Fee</th>
                <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3">Balance</th>
                <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3">DFFS</th>
                <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3">Interest</th>
                <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3"># of Days</th>
                <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3">Date Maturity</th>
                <th className="px-4 py-3 print:hidden" />
              </tr>
            </thead>
            <tbody>
              {withComputed.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center text-sm text-gray-400 py-10">
                    No transactions in this batch yet.
                  </td>
                </tr>
              )}
              {withComputed.map((tx) => (
                <tr key={tx.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-gray-800">{tx.feed_type || '—'}</td>
                  <td className="px-4 py-3 text-blue-600 whitespace-nowrap">{fmtDate(tx.date)}</td>
                  <td className="px-4 py-3 text-gray-700 text-right">{Number(tx.bags).toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-600 text-right print:hidden">
                    {tx.price_per_bag ? num(Number(tx.price_per_bag)) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-900 text-right">{num(tx.debit)}</td>
                  <td className="px-4 py-3 text-gray-600 text-right print:hidden">{num(Number(tx.delivery_fee ?? 0))}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 text-right">{num(tx.runningBalance)}</td>
                  <td className="px-4 py-3 text-gray-600 text-right">{num(tx.dffs1)}</td>
                  <td className="px-4 py-3 text-gray-600 text-right">{num(tx.interest)}</td>
                  <td className="px-4 py-3 text-gray-500 text-right">{tx.days}</td>
                  <td className="px-4 py-3 text-green-700 text-right whitespace-nowrap">{maturityDate ? fmtDate(maturityDate) : '—'}</td>
                  <td className="px-4 py-3 print:hidden">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setModal({ tx })} className="p-1 text-gray-400 hover:text-gray-600">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(tx.id)} className="p-1 text-red-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {withComputed.length > 0 && (
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold text-sm">
                  <td colSpan={2} className="px-4 py-3" />
                  <td className="px-4 py-3 text-right text-gray-700">{Number(totalBags).toFixed(2)}</td>
                  <td className="px-4 py-3 print:hidden" />
                  <td className="px-4 py-3 text-right text-gray-900">{num(totalDebit)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 print:hidden">{num(totalDeliveryFee)}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{num(balance)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{num(totalDffs1)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{num(totalInterest)}</td>
                  <td colSpan={2} className="px-4 py-3" />
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
              <div className="w-72 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Principal</span>
                  <span className="font-medium text-gray-900">{num(balance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Interest</span>
                  <span className="font-medium text-gray-900">{num(totalInterest)}</span>
                </div>
                <div className="flex print:hidden justify-between">
                  <span className="text-gray-600">DFFS 1</span>
                  <span className="font-medium text-gray-900">{num(totalDffs1)}</span>
                </div>
                <div className="flex print:hidden justify-between">
                  <span className="text-gray-600">DFFS 2</span>
                  <span className="font-medium text-gray-900">{num(dffs2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Del Fee</span>
                  <span className="font-medium text-gray-900">{num(totalDeliveryFee)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-1.5 mt-1">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold text-gray-900 underline">{num(balance + totalInterest + totalDffs1 + dffs2 + totalDeliveryFee)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {modal !== null && (
        <TransactionModal
          transaction={modal.tx}
          clients={batch.client_id ? clients.filter((c) => c.id === batch.client_id) : clients}
          defaultClientId={batch.client_id ?? undefined}
          defaultBatchId={batch.id}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); fetchData(); }}
        />
      )}
    </div>
  );
}
