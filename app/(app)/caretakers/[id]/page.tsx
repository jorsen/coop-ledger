'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Plus, Pencil, Trash2, Printer, ClipboardList, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import TransactionModal from '@/components/transaction-modal';
import ConfirmModal from '@/components/confirm-modal';
import { usePoll } from '@/hooks/use-poll';

interface Batch {
  id: number;
  batch_number: string;
  batch_date: string;
  notes: string;
  date_of_application: string | null;
  date_of_hauling: string | null;
  maturity_date: string | null;
  heads: number | null;
  transaction_count: number;
  total_bags: number;
  total_debit: number;
  pig_price_per_kg: number | null;
  status: string | null;
}

interface Client {
  id: number;
  client_code: string;
  name: string;
  batch_number: string;
  status: string;
  heads: number;
  date_of_hauling: string | null;
  date_of_application: string | null;
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
  delivery_fee: number;
  batch_no: string | null;
}

interface Expense {
  id: number;
  batch_id: number;
  item: string;
  quantity: number;
  price: number;
}

interface PigSale {
  id: number;
  batch_id: number;
  weight_kg: number;
  price_per_kg: number;
  label: string | null;
}


const PAGE_SIZE = 10;

const num = (n: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const fmtKg = (n: number | string) => parseFloat(Number(n).toFixed(2)).toString();

const fmtDate = (d: string) => {
  const [y, m, day] = d.split('-');
  return `${parseInt(m)}/${parseInt(day)}/${y}`;
};

export default function CaretakerLedgerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const batchIdParam = searchParams.get('batchId');
  const [client, setClient] = useState<Client | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [modal, setModal] = useState<{ tx?: Transaction } | null>(null);
  const [dialog, setDialog] = useState<{ title: string; message: string; variant?: 'default' | 'delete'; onConfirm: () => void } | null>(null);
  const [batchModal, setBatchModal] = useState(false);
  const [batchForm, setBatchForm] = useState({ batch_number: '', batch_date: '', notes: '', date_of_application: '', date_of_hauling: '', maturity_date: '', heads: '', status: 'active' });
  const [savingBatch, setSavingBatch] = useState(false);
  const [editBatch, setEditBatch] = useState<Batch | null>(null);
  const [editBatchForm, setEditBatchForm] = useState({ batch_number: '', batch_date: '', notes: '', date_of_application: '', date_of_hauling: '', maturity_date: '', heads: '', status: 'active' });
  const [savingEditBatch, setSavingEditBatch] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseModal, setExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ item: '', quantity: '1', price: '' });
  const [savingExpense, setSavingExpense] = useState(false);
  const [txPage, setTxPage] = useState(0);
  const [batchPage, setBatchPage] = useState(0);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [pigSales, setPigSales] = useState<PigSale[]>([]);
  const [pigSaleModal, setPigSaleModal] = useState<PigSale | 'new' | null>(null);
  const [pigSaleForm, setPigSaleForm] = useState({ weight_kg: '', price_per_kg: '170' });
  const [savingPigSale, setSavingPigSale] = useState(false);
  const [editingPigPrice, setEditingPigPrice] = useState(false);
  const [pigPriceInput, setPigPriceInput] = useState('');

  const fetchData = useCallback(async () => {
    const [clientRes, batchRes] = await Promise.all([
      fetch(`/api/clients/${id}`),
      fetch(`/api/batches?client_id=${id}`),
    ]);
    if (!clientRes.ok) { router.push('/caretakers'); return; }
    const data = await clientRes.json();
    const { transactions: txs, ...clientData } = data;
    setClient(clientData);
    setTransactions(txs);
    const batchData = await batchRes.json();
    if (Array.isArray(batchData)) {
      setBatches(batchData);
      if (batchIdParam) {
        const target = batchData.find((b: Batch) => b.id === Number(batchIdParam));
        if (target) setSelectedBatchId(prev => prev ?? target.id);
      }
    }
    setLoading(false);
  }, [id, router]);

  const fetchExpenses = useCallback(async (batchId: number) => {
    const res = await fetch(`/api/expenses?batch_id=${batchId}`);
    if (res.ok) setExpenses(await res.json());
    else setExpenses([]);
  }, []);

  const fetchPigSales = useCallback(async (batchId: number) => {
    const res = await fetch(`/api/pig-sales?batch_id=${batchId}`);
    if (res.ok) setPigSales(await res.json());
    else setPigSales([]);
  }, []);

  useEffect(() => {
    if (selectedBatchId) {
      fetchExpenses(selectedBatchId);
      fetchPigSales(selectedBatchId);
    }
  }, [selectedBatchId, fetchExpenses, fetchPigSales]);

  useEffect(() => {
    fetchData();
    fetch('/api/auth/session').then(r => r.json()).then(d => setIsLoggedIn(d.isLoggedIn));
  }, [fetchData]);
  usePoll(fetchData);

  async function handleCreateBatch() {
    setSavingBatch(true);
    await fetch('/api/batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...batchForm, client_id: id }),
    });
    setSavingBatch(false);
    setBatchModal(false);
    setBatchForm({ batch_number: '', batch_date: '', notes: '', date_of_application: '', date_of_hauling: '', maturity_date: '', heads: '', status: 'active' });
    fetchData();
  }

  async function handleUpdateBatch() {
    if (!editBatch) return;
    setSavingEditBatch(true);
    await fetch(`/api/batches/${editBatch.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editBatchForm),
    });
    setSavingEditBatch(false);
    setEditBatch(null);
    localStorage.setItem('batch_status_changed', String(Date.now()));
    fetchData();
  }

  function handleDeleteBatch(batchId: number) {
    setDialog({
      title: 'Delete Batch',
      message: 'Transactions in this batch will remain but lose their batch assignment.',
      variant: 'delete',
      onConfirm: async () => {
        await fetch(`/api/batches/${batchId}`, { method: 'DELETE' });
        fetchData();
      },
    });
  }

  function handleDelete(txId: number) {
    setDialog({
      title: 'Delete Transaction',
      message: 'This transaction will be permanently removed.',
      variant: 'delete',
      onConfirm: async () => {
        await fetch(`/api/transactions/${txId}`, { method: 'DELETE' });
        fetchData();
      },
    });
  }

  async function handleCreateExpense() {
    if (!selectedBatchId) return;
    setSavingExpense(true);
    await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch_id: selectedBatchId, item: expenseForm.item, quantity: expenseForm.quantity, price: expenseForm.price }),
    });
    setSavingExpense(false);
    setExpenseModal(false);
    setExpenseForm({ item: '', quantity: '1', price: '' });
    if (selectedBatchId) fetchExpenses(selectedBatchId);
  }

  function handleDeleteExpense(expId: number) {
    setDialog({
      title: 'Delete Expense',
      message: 'This expense will be permanently removed.',
      variant: 'delete',
      onConfirm: async () => {
        await fetch(`/api/expenses/${expId}`, { method: 'DELETE' });
        if (selectedBatchId) fetchExpenses(selectedBatchId);
      },
    });
  }

  function openAddPigSale() {
    setPigSaleForm({ weight_kg: '', price_per_kg: String(selectedBatch?.pig_price_per_kg && selectedBatch.pig_price_per_kg !== 270 ? selectedBatch.pig_price_per_kg : 170) });
    setPigSaleModal('new');
  }

  function openEditPigSale(sale: PigSale) {
    setPigSaleForm({ weight_kg: String(sale.weight_kg), price_per_kg: String(sale.price_per_kg) });
    setPigSaleModal(sale);
  }

  async function handleSavePigSale() {
    if (!selectedBatchId) return;
    setSavingPigSale(true);
    if (pigSaleModal === 'new') {
      await fetch('/api/pig-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch_id: selectedBatchId, weight_kg: Number(pigSaleForm.weight_kg), price_per_kg: Number(pigSaleForm.price_per_kg) }),
      });
    } else if (pigSaleModal && typeof pigSaleModal === 'object') {
      await fetch(`/api/pig-sales/${pigSaleModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight_kg: Number(pigSaleForm.weight_kg), price_per_kg: Number(pigSaleForm.price_per_kg) }),
      });
    }
    setSavingPigSale(false);
    setPigSaleModal(null);
    fetchPigSales(selectedBatchId);
  }

  async function saveDefaultPigPrice() {
    if (!selectedBatchId) return;
    await fetch(`/api/batches/${selectedBatchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pig_price_per_kg: Number(pigPriceInput) }),
    });
    setEditingPigPrice(false);
    fetchData();
  }

  function handleDeletePigSale(saleId: number) {
    setDialog({
      title: 'Remove Pig Sale',
      message: 'This pig sale record will be permanently removed.',
      variant: 'delete',
      onConfirm: async () => {
        await fetch(`/api/pig-sales/${saleId}`, { method: 'DELETE' });
        if (selectedBatchId) fetchPigSales(selectedBatchId);
      },
    });
  }

  const selectedBatch = batches.find(b => b.id === selectedBatchId) ?? null;
  const batchTransactions = selectedBatch
    ? transactions.filter(t => t.batch_no === selectedBatch.batch_number)
    : transactions;

  const totalDebit       = batchTransactions.reduce((s, t) => s + Number(t.debit), 0);
  const totalCredit      = batchTransactions.reduce((s, t) => s + Number(t.credit), 0);
  const totalBags        = batchTransactions.reduce((s, t) => s + Number(t.bags), 0);
  const totalDeliveryFee = batchTransactions.reduce((s, t) => s + Number(t.delivery_fee ?? 0), 0);
  const balance          = totalDebit - totalCredit;

  const maturityDate = selectedBatch?.maturity_date ?? null;

  const withComputed = batchTransactions.map((tx, i) => {
    const runningBalance = batchTransactions
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

  const totalDffs1         = withComputed.reduce((s, tx) => s + tx.dffs1, 0);
  const totalInterest      = withComputed.reduce((s, tx) => s + tx.interest, 0);
  const dffs2              = 50 * (selectedBatch?.heads ?? 0);
  const totalOtherExpenses = expenses.reduce((s, e) => s + Number(e.quantity) * Number(e.price), 0);
  const totalPigSalesAmount = pigSales.reduce((s, p) => s + Number(p.weight_kg) * Number(p.price_per_kg), 0);
  const totalPigSalesKg = pigSales.reduce((s, p) => s + Number(p.weight_kg), 0);

  const txTotalPages = Math.ceil(withComputed.length / PAGE_SIZE);
  const pagedTx = withComputed.slice(txPage * PAGE_SIZE, (txPage + 1) * PAGE_SIZE);
  const activeBatches = batches.filter(b => b.status !== 'paid' || b.id === selectedBatchId);
  const batchTotalPages = Math.ceil(activeBatches.length / PAGE_SIZE);
  const pagedBatches = activeBatches.slice(batchPage * PAGE_SIZE, (batchPage + 1) * PAGE_SIZE);

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
      {/* ── Print header ─────────────────────────────────────────────── */}
      <div className="hidden print:flex print:items-center print:justify-between mb-2 border-b border-gray-400 pb-1 text-xs">
        <div className="flex items-center gap-4">
          <span><span className="text-gray-500">NAME: </span><strong>{client.name}</strong></span>
          <span><span className="text-gray-500">BATCH #: </span><strong>{batches[0]?.batch_number || '—'}</strong></span>
          <span><span className="text-gray-500">CLIENT ID: </span><strong>{client.client_code}</strong></span>
        </div>
        <div className="flex items-center gap-4 text-right">
          <span><span className="text-gray-500"># of Heads: </span><strong>{batches[0]?.heads ?? '—'}</strong></span>
          <span className="text-gray-400">Printed: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 print:hidden">
        <button
          onClick={() => router.push('/caretakers')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 py-2 whitespace-nowrap"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Caretakers
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start print-layout-grid">
      {/* ── Info card (order 1 on mobile) ── */}
      <div className={`${batchIdParam ? 'md:col-span-3' : 'md:col-span-2'} min-w-0 order-1`}>

      {/* ── Caretaker info card ───────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-6 py-5 mb-6 print:rounded-sm print-card">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-4 text-sm print:grid-cols-4 print:gap-x-6 print:gap-y-1 print:text-xs">
          <div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">NAME</p>
            <p className="font-bold text-gray-900 dark:text-white">{client.name}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">BATCH #</p>
            <p className="font-semibold text-blue-600 dark:text-blue-400">{selectedBatch?.batch_number || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">CARETAKER ID</p>
            <p className="font-semibold text-gray-700 dark:text-gray-300">{client.client_code}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">STATUS</p>
            {(() => {
              const s = selectedBatch?.status ?? 'active';
              const cls =
                s === 'active'    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                s === 'on-going'  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                s === 'paid'      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                s === 'completed' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400';
              return <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>;
            })()}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5"># OF HEADS</p>
            <p className="font-semibold text-gray-900 dark:text-white">{selectedBatch?.heads ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">DATE OF APPLICATION</p>
            <p className="font-semibold text-gray-900 dark:text-white">{selectedBatch?.date_of_application ? fmtDate(selectedBatch.date_of_application) : '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">DATE OF HAULING</p>
            <p className="font-semibold text-red-600">{selectedBatch?.date_of_hauling ? fmtDate(selectedBatch.date_of_hauling) : '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">MATURITY DATE</p>
            <p className="font-semibold text-green-700 dark:text-green-400">{selectedBatch?.maturity_date ? fmtDate(selectedBatch.maturity_date) : '—'}</p>
          </div>
        </div>
      </div>
      </div>

      {/* ── Main content (order 3 on mobile, row 2 on desktop) ── */}
      {selectedBatch && (<div className={`${batchIdParam ? 'md:col-span-3' : 'md:col-span-2'} min-w-0 order-3`}>

      {/* ── Transactions table ───────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 print-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 whitespace-nowrap">FEEDS</th>
                <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 whitespace-nowrap">TR_DATE</th>
                <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 whitespace-nowrap">NO.OF BAGS</th>
                <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 whitespace-nowrap hidden xl:table-cell">Price/Bag</th>
                <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 whitespace-nowrap">Debit</th>
                <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 print:hidden whitespace-nowrap hidden xl:table-cell">Delivery Fee</th>
                <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 whitespace-nowrap">Balance</th>
                <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 print:hidden whitespace-nowrap hidden xl:table-cell">DFFS</th>
                <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 whitespace-nowrap hidden sm:table-cell">Interest</th>
                <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 print:hidden whitespace-nowrap hidden xl:table-cell"># of Days</th>
                <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 print:hidden whitespace-nowrap hidden xl:table-cell">Date Maturity</th>
                <th className="px-4 py-3 print:hidden" />
              </tr>
            </thead>
            <tbody>
              {withComputed.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center text-sm text-gray-400 dark:text-gray-500 py-10">
                    No transactions yet.
                  </td>
                </tr>
              )}
              {withComputed.map((tx) => (
                <tr key={tx.id} className="border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-gray-800 dark:text-gray-200 whitespace-nowrap">{tx.feed_type || '—'}</td>
                  <td className="px-4 py-3 text-blue-600 dark:text-blue-400 whitespace-nowrap">{fmtDate(tx.date)}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-right">{Number(tx.bags).toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-right hidden xl:table-cell">
                    {tx.price_per_bag ? num(Number(tx.price_per_bag)) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white text-right">{num(tx.debit)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-right print:hidden hidden xl:table-cell">{num(Number(tx.delivery_fee ?? 0))}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white text-right">{num(tx.runningBalance)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-right print:hidden hidden xl:table-cell">{num(tx.dffs1)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-right hidden sm:table-cell">{num(tx.interest)}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-right print:hidden hidden xl:table-cell">{tx.days}</td>
                  <td className="px-4 py-3 text-green-700 dark:text-green-400 text-right whitespace-nowrap print:hidden hidden xl:table-cell">{maturityDate ? fmtDate(maturityDate) : '—'}</td>
                  <td className="px-4 py-3 print:hidden">
                    {isLoggedIn && (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setModal({ tx })} className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
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
                <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 font-semibold text-sm">
                  <td colSpan={2} className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Total</td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{Number(totalBags).toFixed(2)}</td>
                  <td className="px-4 py-3 hidden xl:table-cell" />
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{num(totalDebit)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400 print:hidden hidden xl:table-cell">{num(totalDeliveryFee)}</td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{num(balance)}</td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 print:hidden hidden xl:table-cell">{num(totalDffs1)}</td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 hidden sm:table-cell">{num(totalInterest)}</td>
                  <td className="px-4 py-3 print:hidden hidden xl:table-cell" />
                  <td className="px-4 py-3 print:hidden hidden xl:table-cell" />
                  <td className="print:hidden" />
                </tr>
              )}
            </tbody>
          </table>
        </div>


        {/* Billing summary - screen only */}
        {withComputed.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 print:hidden">
            <div className="flex justify-end">
              <div className="w-72 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Principal</span>
                  <span className="font-medium text-gray-900 dark:text-white">{num(balance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Interest</span>
                  <span className="font-medium text-gray-900 dark:text-white">{num(totalInterest)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">DFFS 1</span>
                  <span className="font-medium text-gray-900 dark:text-white">{num(totalDffs1)}</span>
                </div>
                <div className="flex justify-between">
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
                <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-1.5 mt-1">
                  <span className="font-bold text-gray-900 dark:text-white">Total</span>
                  <span className="font-bold text-gray-900 dark:text-white underline">{num(balance + totalInterest + totalDffs1 + dffs2 + totalDeliveryFee + totalOtherExpenses)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Billing summary - print only, compact right-aligned */}
        {withComputed.length > 0 && (
          <div className="hidden print:block border-t border-gray-300 px-4 py-2">
            <div className="flex justify-end">
              <div className="text-xs space-y-0.5 w-48">
                <div className="flex justify-between"><span>Principal</span><span className="font-medium">{num(balance)}</span></div>
                <div className="flex justify-between"><span>Interest</span><span className="font-medium">{num(totalInterest)}</span></div>
                <div className="flex justify-between"><span>Del Fee</span><span className="font-medium">{num(totalDeliveryFee)}</span></div>
                {totalOtherExpenses > 0 && <div className="flex justify-between"><span>Other Exp</span><span className="font-medium">{num(totalOtherExpenses)}</span></div>}
                <div className="flex justify-between border-t border-gray-300 pt-0.5 font-bold"><span>Total</span><span className="underline">{num(balance + totalInterest + totalDffs1 + dffs2 + totalDeliveryFee + totalOtherExpenses)}</span></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Other Expenses + Pig Sales ── */}
      {selectedBatch && (
        <div className="mt-6 print:mt-3 grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-5 print:gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-900 dark:text-white">Other Expenses</h2>
              <span className="text-xs text-gray-400 dark:text-gray-500">Batch #{selectedBatch?.batch_number}</span>
              {expenses.length > 0 && (
                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">{expenses.length}</span>
              )}
            </div>
            {isLoggedIn && (
              <button
                onClick={() => setExpenseModal(true)}
                className="flex items-center gap-1.5 text-sm text-green-800 dark:text-green-400 font-medium hover:text-green-700 print:hidden"
              >
                <Plus className="w-4 h-4" /> Add Expense
              </button>
            )}
          </div>
          {expenses.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No other expenses recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3">ITEM</th>
                    <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3">QUANTITY</th>
                    <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3">PRICE</th>
                    <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3">TOTAL</th>
                    {isLoggedIn && <th className="px-4 py-3 print:hidden" />}
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(e => (
                    <tr key={e.id} className="border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{e.item}</td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{Number(e.quantity).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{num(Number(e.price))}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{num(Number(e.quantity) * Number(e.price))}</td>
                      {isLoggedIn && (
                        <td className="px-4 py-3 print:hidden">
                          <button onClick={() => handleDeleteExpense(e.id)} className="p-1 text-red-400 hover:text-red-600 flex items-center justify-end w-full">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 font-semibold">
                    <td colSpan={3} className="px-4 py-3 text-right text-xs text-gray-500 dark:text-gray-400">TOTAL</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{num(totalOtherExpenses)}</td>
                    {isLoggedIn && <td className="print:hidden" />}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pig Sales */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Pig Sales</h2>
                {pigSales.length > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {fmtKg(totalPigSalesKg)} kg &mdash; Total: <span className="font-semibold text-gray-700 dark:text-gray-300">₱{num(totalPigSalesAmount)}</span>
                  </p>
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Batch #{selectedBatch?.batch_number}</p>
                <div className="flex items-center gap-1.5 mt-1 print:hidden">
                  <span className="text-xs text-gray-400 dark:text-gray-500">Default price:</span>
                  {editingPigPrice ? (
                    <>
                      <span className="text-xs text-gray-500">₱</span>
                      <input
                        type="text" inputMode="decimal"
                        value={pigPriceInput}
                        onChange={e => setPigPriceInput(e.target.value)}
                        className="w-16 text-xs border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-green-800 dark:bg-gray-700 dark:text-white"
                      />
                      <span className="text-xs text-gray-500">/kg</span>
                      <button onClick={saveDefaultPigPrice} className="text-xs font-medium text-green-700 dark:text-green-400 hover:text-green-600">Save</button>
                      <button onClick={() => setEditingPigPrice(false)} className="text-xs text-gray-400 hover:text-gray-600">×</button>
                    </>
                  ) : (
                    <>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">₱{num(selectedBatch?.pig_price_per_kg && selectedBatch.pig_price_per_kg !== 270 ? selectedBatch.pig_price_per_kg : 170)}/kg</span>
                      {isLoggedIn && (
                        <button onClick={() => { setPigPriceInput(String(selectedBatch?.pig_price_per_kg && selectedBatch.pig_price_per_kg !== 270 ? selectedBatch.pig_price_per_kg : 170)); setEditingPigPrice(true); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              {isLoggedIn && (
                <button
                  onClick={openAddPigSale}
                  className="flex items-center gap-1.5 text-sm text-green-800 dark:text-green-400 font-medium hover:text-green-700 print:hidden"
                >
                  <Plus className="w-4 h-4" /> Add Pig Sale
                </button>
              )}
            </div>
            {pigSales.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No pig sales recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                      <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3">#</th>
                      <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3">Weight (kg)</th>
                      <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3">Price/kg (₱)</th>
                      <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 px-4 py-3">Total (₱)</th>
                      {isLoggedIn && <th className="px-4 py-3 print:hidden" />}
                    </tr>
                  </thead>
                  <tbody>
                    {pigSales.map((sale, i) => (
                      <tr key={sale.id} className="border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{i + 1}</td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{fmtKg(sale.weight_kg)}</td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{num(Number(sale.price_per_kg))}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{num(Number(sale.weight_kg) * Number(sale.price_per_kg))}</td>
                        {isLoggedIn && (
                          <td className="px-4 py-3 print:hidden">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => openEditPigSale(sale)} className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDeletePigSale(sale.id)} className="p-1 text-red-400 hover:text-red-600">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                    <tr className="border-t-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 font-semibold">
                      <td className="px-4 py-3 text-right text-xs text-gray-500 dark:text-gray-400">Total</td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{fmtKg(totalPigSalesKg)} kg</td>
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3 text-right text-gray-900 dark:text-white">₱{num(totalPigSalesAmount)}</td>
                      {isLoggedIn && <td />}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
        </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {expenseModal && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 pt-24 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-sm">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Add Expense</h2>
              <button onClick={() => setExpenseModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Item *</label>
                <input
                  value={expenseForm.item}
                  onChange={e => setExpenseForm(f => ({ ...f, item: e.target.value }))}
                  placeholder="e.g. Vitamins"
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={expenseForm.quantity}
                    onChange={e => setExpenseForm(f => ({ ...f, quantity: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Price *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={expenseForm.price}
                    onChange={e => setExpenseForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="0.00"
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setExpenseModal(false)}
                  className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateExpense}
                  disabled={savingExpense || !expenseForm.item || !expenseForm.price}
                  className="flex-1 bg-green-800 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {savingExpense ? 'Saving…' : 'Add Expense'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>)}

      {/* ── Batches sidebar (order 2 on mobile, spans both rows on desktop) ── */}
      {!batchIdParam && <div className="md:col-span-1 lg:sticky lg:top-[72px] order-2 print:hidden">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-gray-500" />
              <h2 className="font-semibold text-gray-900 dark:text-white">Batches</h2>
              {activeBatches.length > 0 && (
                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">{activeBatches.length}</span>
              )}
            </div>
            {isLoggedIn && (
              <button
                onClick={() => setBatchModal(true)}
                className="flex items-center gap-1.5 text-sm text-green-800 dark:text-green-400 font-medium hover:text-green-700"
              >
                <Plus className="w-4 h-4" /> New Batch
              </button>
            )}
          </div>

          {activeBatches.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No batches yet. Create one to group transactions.</p>
          ) : (
            <>
            <div className="divide-y divide-gray-50 dark:divide-gray-700 max-h-[60vh] overflow-y-auto">
              {pagedBatches.map((b) => {
                const isViewing = b.id === selectedBatchId;
                return (
                <div
                  key={b.id}
                  onClick={() => { setSelectedBatchId(b.id); setTxPage(0); }}
                  className={`px-4 sm:px-6 py-3 flex flex-col gap-1.5 cursor-pointer ${isViewing ? 'bg-green-50 dark:bg-green-900/10' : 'hover:bg-gray-50/50 dark:hover:bg-gray-700/50'}`}
                >
                  {/* Row 1: badge + date */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-green-800 text-white text-xs font-bold px-2 py-0.5 rounded">
                      {b.batch_number}
                    </span>
                    {isViewing && (
                      <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-semibold px-2 py-0.5 rounded">Viewing</span>
                    )}
                    {(() => {
                      const s = b.status ?? 'active';
                      const cls =
                        s === 'active'    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        s === 'on-going'  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        s === 'paid'      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                        s === 'completed' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                        'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400';
                      return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>;
                    })()}
                    <span className="text-sm text-gray-500 dark:text-gray-400">{fmtDate(b.batch_date)}</span>
                    {b.notes && <span className="text-xs text-gray-900 dark:text-gray-500 truncate max-w-[160px]">{b.notes}</span>}
                  </div>
                  {/* Row 2: stats + actions */}
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400" onClick={e => e.stopPropagation()}>
                    <span>{b.transaction_count} tx</span>
                    <span>{b.total_bags} bags</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{num(b.total_debit)}</span>
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/batches/${b.id}`)}
                        className="flex items-center gap-1 text-green-700 dark:text-green-400 hover:text-green-600"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                      {isLoggedIn && (
                        <>
                          <button
                            onClick={() => { setEditBatch(b); setEditBatchForm({ batch_number: b.batch_number, batch_date: b.batch_date?.toString().slice(0, 10) ?? '', notes: b.notes, date_of_application: b.date_of_application?.toString().slice(0, 10) ?? '', date_of_hauling: b.date_of_hauling?.toString().slice(0, 10) ?? '', maturity_date: b.maturity_date?.toString().slice(0, 10) ?? '', heads: b.heads ? String(b.heads) : '', status: b.status ?? 'active' }); }}
                            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteBatch(b.id)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
            </>
          )}
        </div>
      </div>}

      </div>{/* end grid */}

      {modal !== null && (
        <TransactionModal
          transaction={modal.tx}
          clients={[{ id: client.id, name: client.name }]}
          defaultClientId={client.id}
          defaultBatchId={modal.tx ? undefined : (selectedBatchId ?? undefined)}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); fetchData(); }}
        />
      )}

      {/* New Batch Modal */}
      {batchModal && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 pt-16 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-sm">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">New Batch</h2>
              <button onClick={() => setBatchModal(false)} className="text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Batch Number</label>
                <input
                  value={batchForm.batch_number}
                  onChange={(e) => setBatchForm((f) => ({ ...f, batch_number: e.target.value }))}
                  placeholder="Auto-generated if empty"
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Heads</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={batchForm.heads}
                  onChange={(e) => setBatchForm((f) => ({ ...f, heads: e.target.value }))}
                  placeholder="0"
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Application</label>
                  <input
                    type="date"
                    value={batchForm.date_of_application}
                    onChange={(e) => setBatchForm((f) => ({ ...f, date_of_application: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-800 [color-scheme:light] dark:[color-scheme:dark]"
                    style={{ height: '46px' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Hauling</label>
                  <input
                    type="date"
                    value={batchForm.date_of_hauling}
                    onChange={(e) => setBatchForm((f) => ({ ...f, date_of_hauling: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-800 [color-scheme:light] dark:[color-scheme:dark]"
                    style={{ height: '46px' }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 text-green-700 dark:text-green-400">Maturity Date</label>
                <input
                  type="date"
                  value={batchForm.maturity_date}
                  onChange={(e) => setBatchForm((f) => ({ ...f, maturity_date: e.target.value }))}
                  className="w-full border border-green-300 dark:border-green-700 dark:bg-gray-700 dark:text-white rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-800 [color-scheme:light] dark:[color-scheme:dark]"
                  style={{ height: '46px' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select
                  value={batchForm.status}
                  onChange={(e) => setBatchForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
                  style={{ height: '46px' }}
                >
                  <option value="active">Active</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea
                  value={batchForm.notes}
                  onChange={(e) => setBatchForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Optional description…"
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-800 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setBatchModal(false)}
                  className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBatch}
                  disabled={savingBatch}
                  className="flex-1 bg-green-800 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {savingBatch ? 'Creating…' : 'Create Batch'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Batch Modal */}
      {editBatch && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 pt-16 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-sm">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Edit Batch</h2>
              <button onClick={() => setEditBatch(null)} className="text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Batch Number *</label>
                <input
                  value={editBatchForm.batch_number}
                  onChange={(e) => setEditBatchForm((f) => ({ ...f, batch_number: e.target.value }))}
                  placeholder="e.g. BT-001"
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Heads</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={editBatchForm.heads}
                  onChange={(e) => setEditBatchForm((f) => ({ ...f, heads: e.target.value }))}
                  placeholder="0"
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Application</label>
                  <input
                    type="date"
                    value={editBatchForm.date_of_application}
                    onChange={(e) => setEditBatchForm((f) => ({ ...f, date_of_application: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-800 [color-scheme:light] dark:[color-scheme:dark]"
                    style={{ height: '46px' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Hauling</label>
                  <input
                    type="date"
                    value={editBatchForm.date_of_hauling}
                    onChange={(e) => setEditBatchForm((f) => ({ ...f, date_of_hauling: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-800 [color-scheme:light] dark:[color-scheme:dark]"
                    style={{ height: '46px' }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 text-green-700 dark:text-green-400">Maturity Date</label>
                <input
                  type="date"
                  value={editBatchForm.maturity_date}
                  onChange={(e) => setEditBatchForm((f) => ({ ...f, maturity_date: e.target.value }))}
                  className="w-full border border-green-300 dark:border-green-700 dark:bg-gray-700 dark:text-white rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-800 [color-scheme:light] dark:[color-scheme:dark]"
                  style={{ height: '46px' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select
                  value={editBatchForm.status}
                  onChange={(e) => setEditBatchForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
                  style={{ height: '46px' }}
                >
                  <option value="active">Active</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea
                  value={editBatchForm.notes}
                  onChange={(e) => setEditBatchForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Optional description…"
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-800 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditBatch(null)}
                  className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateBatch}
                  disabled={savingEditBatch}
                  className="flex-1 bg-green-800 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {savingEditBatch ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pig Sale Modal (Add / Edit) */}
      {pigSaleModal !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 pt-16">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-sm">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {pigSaleModal === 'new' ? 'Add Pig Sale' : 'Edit Pig Sale'}
              </h2>
              <button onClick={() => setPigSaleModal(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Weight (kg) *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pigSaleForm.weight_kg}
                  onChange={e => setPigSaleForm(f => ({ ...f, weight_kg: e.target.value.replace(/[^0-9]/g, '') }))}
                  placeholder="e.g. 85"
                  autoFocus
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-800 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Price/kg (₱)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={pigSaleForm.price_per_kg}
                  onChange={e => setPigSaleForm(f => ({ ...f, price_per_kg: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-800 dark:bg-gray-700 dark:text-white"
                />
              </div>
              {pigSaleForm.weight_kg && pigSaleForm.price_per_kg && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Total: <span className="font-semibold text-gray-700 dark:text-gray-300">₱{num(Number(pigSaleForm.weight_kg) * Number(pigSaleForm.price_per_kg))}</span>
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setPigSaleModal(null)}
                  className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePigSale}
                  disabled={savingPigSale || !pigSaleForm.weight_kg || !pigSaleForm.price_per_kg}
                  className="flex-1 bg-green-800 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {savingPigSale ? 'Saving…' : pigSaleModal === 'new' ? 'Add' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
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
