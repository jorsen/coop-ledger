'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Pencil, Trash2, Printer, ChevronLeft, ChevronRight, ClipboardList, Eye } from 'lucide-react';
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

interface Expense {
  id: number;
  item: string;
  quantity: number;
  price: number;
}

interface BatchSummary {
  id: number;
  batch_number: string;
  batch_date: string;
  transaction_count: number;
  total_bags: number;
  total_debit: number;
}

const PAGE_SIZE = 10;

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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [modal, setModal] = useState<{ tx?: Transaction } | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseModal, setExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ item: '', quantity: '1', price: '' });
  const [savingExpense, setSavingExpense] = useState(false);
  const [allBatches, setAllBatches] = useState<BatchSummary[]>([]);
  const [txPage, setTxPage] = useState(0);
  const [expPage, setExpPage] = useState(0);
  const [batchPage, setBatchPage] = useState(0);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/batches/${id}`);
    if (!res.ok) { router.push('/batches'); return; }
    const data = await res.json();
    const { transactions: txs, ...batchData } = data;
    setBatch(batchData);
    setTransactions(Array.isArray(txs) ? txs : []);
    setTxPage(0);
    if (batchData.client_id) {
      const br = await fetch(`/api/batches?client_id=${batchData.client_id}`);
      if (br.ok) setAllBatches(await br.json());
    }
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    fetch('/api/clients').then((r) => r.json()).then(setClients);
  }, []);

  const fetchExpenses = useCallback(async () => {
    const res = await fetch(`/api/expenses?batch_id=${id}`);
    if (res.ok) setExpenses(await res.json());
  }, [id]);

  useEffect(() => {
    fetchData();
    fetchExpenses();
    fetch('/api/auth/session').then(r => r.json()).then(d => setIsLoggedIn(d.isLoggedIn));
  }, [fetchData, fetchExpenses]);

  async function handleAddExpense() {
    setSavingExpense(true);
    await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch_id: id, item: expenseForm.item, quantity: Number(expenseForm.quantity), price: Number(expenseForm.price) }),
    });
    setSavingExpense(false);
    setExpenseModal(false);
    setExpenseForm({ item: '', quantity: '1', price: '' });
    fetchExpenses();
  }

  async function handleDeleteExpense(expId: number) {
    if (!confirm('Remove this expense?')) return;
    await fetch(`/api/expenses/${expId}`, { method: 'DELETE' });
    fetchExpenses();
  }
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
  const totalOtherExpenses = expenses.reduce((s, e) => s + Number(e.quantity) * Number(e.price), 0);

  const txTotalPages = Math.ceil(withComputed.length / PAGE_SIZE);
  const pagedTx = withComputed.slice(txPage * PAGE_SIZE, (txPage + 1) * PAGE_SIZE);
  const expTotalPages = Math.ceil(expenses.length / PAGE_SIZE);
  const pagedExp = expenses.slice(expPage * PAGE_SIZE, (expPage + 1) * PAGE_SIZE);
  const batchTotalPages = Math.ceil(allBatches.length / PAGE_SIZE);
  const pagedBatches = allBatches.slice(batchPage * PAGE_SIZE, (batchPage + 1) * PAGE_SIZE);

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
      <div className="hidden print:hidden print:items-center print:justify-between mb-2 border-b border-gray-400 pb-1 text-xs">
        <div className="flex items-center gap-4">
          {batch.client_name && <span><span className="text-gray-500">NAME: </span><strong>{batch.client_name}</strong></span>}
          <span><span className="text-gray-500">BATCH #: </span><strong>{batch.batch_number}</strong></span>
          {batch.client_code && <span><span className="text-gray-500">CLIENT ID: </span><strong>{batch.client_code}</strong></span>}
          <span><span className="text-gray-500"># of Heads: </span><strong>{batch.heads ?? '—'}</strong></span>
        </div>
        <span className="text-gray-400">Printed: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
      </div>

      <div className="flex items-center justify-between mb-4 print:hidden">
        <button
          onClick={() => batch.client_id ? router.push(`/caretakers/${batch.client_id}`) : router.push('/caretakers')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Caretaker
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          {isLoggedIn && (
            <button
              onClick={() => setModal({})}
              className="flex items-center gap-2 bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
            >
              <Plus className="w-4 h-4" /> Add Transaction
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
      {/* ── Left column ── */}
      <div className="lg:col-span-2 min-w-0">

      {batch.client_name && (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-5 mb-4 text-sm print:rounded-sm print-card dark:bg-gray-800 dark:border-gray-700">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-4 print:grid-cols-4 print:gap-x-6 print:gap-y-1 print:text-xs">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-0.5 dark:text-gray-400">NAME</p>
              <p className="font-bold text-gray-900 dark:text-white">{batch.client_name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-0.5 dark:text-gray-400">BATCH #</p>
              <p className="font-semibold text-blue-600">{batch.batch_number}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-0.5 dark:text-gray-400">CLIENT ID</p>
              <p className="font-semibold text-gray-700 dark:text-gray-300">{batch.client_code ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-0.5 dark:text-gray-400">STATUS</p>
              <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800">Active</span>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-0.5 dark:text-gray-400"># OF HEADS</p>
              <p className="font-semibold text-gray-900 dark:text-white">{batch.heads ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-0.5 dark:text-gray-400">DATE OF APPLICATION</p>
              <p className="font-semibold text-gray-900 dark:text-white">{batch.date_of_application ? fmtDate(batch.date_of_application) : '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-0.5 dark:text-gray-400">DATE OF HAULING</p>
              <p className="font-semibold text-red-600">{batch.date_of_hauling ? fmtDate(batch.date_of_hauling) : '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-0.5 dark:text-gray-400">MATURITY DATE</p>
              <p className="font-semibold text-green-700">{batch.maturity_date ? fmtDate(batch.maturity_date) : '—'}</p>
            </div>
          </div>
        </div>
      )}

      {batch.notes && <p className="text-sm text-gray-500 mb-4">{batch.notes}</p>}

      {/* Transactions table */}
      <div className="bg-white rounded-xl border border-gray-200 print-card print:mb-0 dark:bg-gray-800 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
                <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 dark:text-gray-400">FEEDS</th>
                <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 dark:text-gray-400">TR_DATE</th>
                <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3 dark:text-gray-400">NO.OF BAGS</th>
                <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3 print:hidden dark:text-gray-400">Price/Bag</th>
                <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3 dark:text-gray-400">Debit</th>
                <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3 print:hidden dark:text-gray-400">Delivery Fee</th>
                <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3 dark:text-gray-400">Balance</th>
                <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3 print:hidden dark:text-gray-400">DFFS</th>
                <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3 dark:text-gray-400">Interest</th>
                <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3 print:hidden dark:text-gray-400"># of Days</th>
                <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3 print:hidden dark:text-gray-400">Date Maturity</th>
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
              {pagedTx.map((tx) => (
                <tr key={tx.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 dark:border-gray-700 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{tx.feed_type || '—'}</td>
                  <td className="px-4 py-3 text-blue-600 whitespace-nowrap">{fmtDate(tx.date)}</td>
                  <td className="px-4 py-3 text-gray-700 text-right dark:text-gray-300">{Number(tx.bags).toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-600 text-right print:hidden dark:text-gray-400">
                    {tx.price_per_bag ? num(Number(tx.price_per_bag)) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-900 text-right dark:text-white">{num(tx.debit)}</td>
                  <td className="px-4 py-3 text-gray-600 text-right print:hidden dark:text-gray-400">{num(Number(tx.delivery_fee ?? 0))}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 text-right dark:text-white">{num(tx.runningBalance)}</td>
                  <td className="px-4 py-3 text-gray-600 text-right print:hidden dark:text-gray-400">{num(tx.dffs1)}</td>
                  <td className="px-4 py-3 text-gray-600 text-right dark:text-gray-400">{num(tx.interest)}</td>
                  <td className="px-4 py-3 text-gray-500 text-right print:hidden dark:text-gray-400">{tx.days}</td>
                  <td className="px-4 py-3 text-green-700 text-right whitespace-nowrap print:hidden">{maturityDate ? fmtDate(maturityDate) : '—'}</td>
                  <td className="px-4 py-3 print:hidden">
                    {isLoggedIn && (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setModal({ tx })} className="p-1 text-gray-400 hover:text-gray-600">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(tx.id)} className="p-1 text-red-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}

              {withComputed.length > 0 && (
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold text-sm dark:bg-gray-900 dark:border-gray-700">
                  <td colSpan={2} className="px-4 py-3" />
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{Number(totalBags).toFixed(2)}</td>
                  <td className="px-4 py-3 print:hidden" />
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{num(totalDebit)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 print:hidden dark:text-gray-400">{num(totalDeliveryFee)}</td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{num(balance)}</td>
                  <td className="px-4 py-3 text-right text-gray-700 print:hidden dark:text-gray-300">{num(totalDffs1)}</td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{num(totalInterest)}</td>
                  <td colSpan={2} className="px-4 py-3 print:hidden" />
                  <td className="print:hidden" />
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Tx pagination */}
        {txTotalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700 print:hidden">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {txPage * PAGE_SIZE + 1}–{Math.min((txPage + 1) * PAGE_SIZE, withComputed.length)} of {withComputed.length}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setTxPage(p => p - 1)} disabled={txPage === 0} className="p-1.5 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-600 dark:text-gray-400 px-1">{txPage + 1} / {txTotalPages}</span>
              <button onClick={() => setTxPage(p => p + 1)} disabled={txPage >= txTotalPages - 1} className="p-1.5 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Billing summary */}
        {withComputed.length > 0 && (
          <div className="border-t border-gray-200 px-6 py-4 print:px-2 print:py-2 dark:border-gray-700">
            <div className="flex justify-end">
              <div className="w-72 space-y-1.5 text-sm print:text-xs print:w-56">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Principal</span>
                  <span className="font-medium text-gray-900 dark:text-white">{num(balance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Interest</span>
                  <span className="font-medium text-gray-900 dark:text-white">{num(totalInterest)}</span>
                </div>
                <div className="flex print:hidden justify-between">
                  <span className="text-gray-600 dark:text-gray-400">DFFS 1</span>
                  <span className="font-medium text-gray-900 dark:text-white">{num(totalDffs1)}</span>
                </div>
                <div className="flex print:hidden justify-between">
                  <span className="text-gray-600 dark:text-gray-400">DFFS 2</span>
                  <span className="font-medium text-gray-900 dark:text-white">{num(dffs2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Del Fee</span>
                  <span className="font-medium text-gray-900 dark:text-white">{num(totalDeliveryFee)}</span>
                </div>
                {totalOtherExpenses > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Other Expenses</span>
                    <span className="font-medium text-gray-900 dark:text-white">{num(totalOtherExpenses)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-200 pt-1.5 mt-1 dark:border-gray-700">
                  <span className="font-bold text-gray-900 dark:text-white">Total</span>
                  <span className="font-bold text-gray-900 underline dark:text-white">{num(balance + totalInterest + totalDffs1 + dffs2 + totalDeliveryFee + totalOtherExpenses)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Other Expenses ── */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Other Expenses</h2>
            {expenses.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Total: <span className="font-semibold text-gray-700 dark:text-gray-300">{num(totalOtherExpenses)}</span></p>
            )}
          </div>
          {isLoggedIn && (
            <button
              onClick={() => setExpenseModal(true)}
              className="flex items-center gap-1.5 text-sm text-green-800 dark:text-green-400 font-medium hover:text-green-700"
            >
              <Plus className="w-4 h-4" /> Add Expense
            </button>
          )}
        </div>

        {expenses.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No other expenses recorded.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 px-6 py-3">Item</th>
                <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 px-6 py-3">Quantity</th>
                <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 px-6 py-3">Price</th>
                <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 px-6 py-3">Total</th>
                {isLoggedIn && <th className="px-6 py-3" />}
              </tr>
            </thead>
            <tbody>
              {pagedExp.map(e => (
                <tr key={e.id} className="border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                  <td className="px-6 py-3 text-gray-800 dark:text-gray-200">{e.item}</td>
                  <td className="px-6 py-3 text-gray-700 dark:text-gray-300 text-right">{Number(e.quantity).toFixed(2)}</td>
                  <td className="px-6 py-3 text-gray-700 dark:text-gray-300 text-right">{num(Number(e.price))}</td>
                  <td className="px-6 py-3 font-semibold text-gray-900 dark:text-white text-right">{num(Number(e.quantity) * Number(e.price))}</td>
                  {isLoggedIn && (
                    <td className="px-6 py-3">
                      <button onClick={() => handleDeleteExpense(e.id)} className="float-right p-1 text-red-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              <tr className="border-t-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 font-semibold">
                <td colSpan={3} className="px-6 py-3 text-right text-xs text-gray-500 dark:text-gray-400">Total Other Expenses</td>
                <td className="px-6 py-3 text-right text-gray-900 dark:text-white">{num(totalOtherExpenses)}</td>
                {isLoggedIn && <td />}
              </tr>
            </tbody>
          </table>
        )}
        {expTotalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {expPage * PAGE_SIZE + 1}–{Math.min((expPage + 1) * PAGE_SIZE, expenses.length)} of {expenses.length}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setExpPage(p => p - 1)} disabled={expPage === 0} className="p-1.5 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-600 dark:text-gray-400 px-1">{expPage + 1} / {expTotalPages}</span>
              <button onClick={() => setExpPage(p => p + 1)} disabled={expPage >= expTotalPages - 1} className="p-1.5 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      </div>{/* end left column */}

      {/* ── Right column: batches panel ── */}
      {allBatches.length > 0 && (
        <div className="lg:col-span-1 lg:sticky lg:top-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 print:hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-gray-500" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Batches</h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">— {batch.client_name}</span>
            <span className="ml-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">{allBatches.length}</span>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {pagedBatches.map((b) => {
              const isViewing = b.id === Number(id);
              return (
                <div key={b.id} className={`px-4 sm:px-6 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 ${isViewing ? 'bg-green-50 dark:bg-green-900/10' : 'hover:bg-gray-50/50 dark:hover:bg-gray-700/50'}`}>
                  <span className="bg-green-800 text-white text-xs font-bold px-2 py-0.5 rounded shrink-0">
                    {b.batch_number}
                  </span>
                  {isViewing && (
                    <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-semibold px-2 py-0.5 rounded shrink-0">Viewing</span>
                  )}
                  <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">{fmtDate(b.batch_date)}</span>
                  <div className="ml-auto flex items-center gap-3 shrink-0 text-sm text-gray-500 dark:text-gray-400">
                    <span>{b.transaction_count} tx</span>
                    <span>{b.total_bags} bags</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">{num(Number(b.total_debit))}</span>
                    {!isViewing && (
                      <button
                        onClick={() => router.push(`/batches/${b.id}`)}
                        className="flex items-center gap-1 text-green-700 dark:text-green-400 hover:text-green-600"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {batchTotalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {batchPage * PAGE_SIZE + 1}–{Math.min((batchPage + 1) * PAGE_SIZE, allBatches.length)} of {allBatches.length}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setBatchPage(p => p - 1)} disabled={batchPage === 0} className="p-1.5 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-600 dark:text-gray-400 px-1">{batchPage + 1} / {batchTotalPages}</span>
                <button onClick={() => setBatchPage(p => p + 1)} disabled={batchPage >= batchTotalPages - 1} className="p-1.5 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      </div>{/* end grid */}

      {/* Add Expense Modal */}
      {expenseModal && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 pt-16">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-sm">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Add Expense</h2>
              <button onClick={() => setExpenseModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Item *</label>
                <input
                  value={expenseForm.item}
                  onChange={e => setExpenseForm(f => ({ ...f, item: e.target.value }))}
                  placeholder="e.g. Veterinary fee"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-800 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={expenseForm.quantity}
                    onChange={e => setExpenseForm(f => ({ ...f, quantity: e.target.value }))}
                    placeholder="1"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-800 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Price (₱) *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={expenseForm.price}
                    onChange={e => setExpenseForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="0.00"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-800 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              {expenseForm.item && expenseForm.price && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Total: <span className="font-semibold text-gray-700 dark:text-gray-300">{num(Number(expenseForm.quantity || 1) * Number(expenseForm.price || 0))}</span>
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setExpenseModal(false)}
                  className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddExpense}
                  disabled={savingExpense || !expenseForm.item || !expenseForm.price}
                  className="flex-1 bg-green-800 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {savingExpense ? 'Saving…' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
