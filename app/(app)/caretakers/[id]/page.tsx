'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Pencil, Trash2, Printer, ClipboardList, Eye } from 'lucide-react';
import TransactionModal from '@/components/transaction-modal';
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


const num = (n: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const fmtDate = (d: string) => {
  const [y, m, day] = d.split('-');
  return `${parseInt(m)}/${parseInt(day)}/${y}`;
};

export default function CaretakerLedgerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ tx?: Transaction } | null>(null);
  const [batchModal, setBatchModal] = useState(false);
  const [batchForm, setBatchForm] = useState({ batch_number: '', batch_date: '', notes: '', date_of_application: '', date_of_hauling: '', maturity_date: '', heads: '' });
  const [savingBatch, setSavingBatch] = useState(false);
  const [editBatch, setEditBatch] = useState<Batch | null>(null);
  const [editBatchForm, setEditBatchForm] = useState({ batch_number: '', batch_date: '', notes: '', date_of_application: '', date_of_hauling: '', maturity_date: '', heads: '' });
  const [savingEditBatch, setSavingEditBatch] = useState(false);

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
    if (Array.isArray(batchData)) setBatches(batchData);
    setLoading(false);
  }, [id, router]);

  useEffect(() => { fetchData(); }, [fetchData]);
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
    setBatchForm({ batch_number: '', batch_date: '', notes: '', date_of_application: '', date_of_hauling: '', maturity_date: '', heads: '' });
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
    fetchData();
  }

  async function handleDeleteBatch(batchId: number) {
    if (!confirm('Delete this batch? Transactions will remain but lose their batch assignment.')) return;
    await fetch(`/api/batches/${batchId}`, { method: 'DELETE' });
    fetchData();
  }

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

  const haulDate = batches[0]?.date_of_hauling ?? null;

  const withComputed = transactions.map((tx, i) => {
    const runningBalance = transactions
      .slice(0, i + 1)
      .reduce((s, t) => s + Number(t.debit) - Number(t.credit), 0);
    const d = Number(tx.debit);
    let interest = 0;
    if (haulDate) {
      const days = (new Date(haulDate).getTime() - new Date(tx.date).getTime()) / (1000 * 60 * 60 * 24);
      interest = Math.round(d * 0.06 * Math.max(0, days) / 360 * 100) / 100;
    }
    return { ...tx, runningBalance, interest };
  });

  const totalInterest = withComputed.reduce((s, tx) => s + tx.interest, 0);

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
      <div className="hidden print:flex print:justify-between mb-4 border-b border-gray-300 pb-3">
        <div className="space-y-1 text-sm">
          <p className="text-xs text-gray-500">NAME</p>
          <p className="font-bold">{client.name}</p>
          <p className="text-xs text-gray-500 mt-1">BATCH #</p>
          <p className="font-semibold">{batches[0]?.batch_number || '—'}</p>
          <p className="text-xs text-gray-500 mt-1">CARETAKER ID</p>
          <p className="font-semibold">{client.client_code}</p>
        </div>
        <div className="space-y-1 text-sm text-right">
          <p className="text-xs text-gray-500"># of Heads</p>
          <p className="font-semibold">{batches[0]?.heads ?? '—'}</p>
          <p className="text-xs text-gray-400 mt-2">Printed: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
      </div>

      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 print:hidden">
        <button
          onClick={() => router.push('/caretakers')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Caretakers
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

      {/* ── Caretaker info card ───────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl px-6 py-5 mb-6 print:border-0 print:px-0 print:py-0 print:hidden">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-4 text-sm">
          <div>
            <p className="text-xs font-medium text-gray-400 mb-0.5">NAME</p>
            <p className="font-bold text-gray-900">{client.name}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-0.5">CURRENT BATCH #</p>
            <p className="font-semibold text-blue-600">{batches[0]?.batch_number || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-0.5">CARETAKER ID</p>
            <p className="font-semibold text-gray-700">{client.client_code}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-0.5">STATUS</p>
            <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${client.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
              {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
            </span>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-0.5"># OF HEADS</p>
            <p className="font-semibold text-gray-900">{batches[0]?.heads ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-0.5">DATE OF APPLICATION</p>
            <p className="font-semibold text-gray-900">{batches[0]?.date_of_application ? fmtDate(batches[0].date_of_application) : '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-0.5">DATE OF HAULING</p>
            <p className="font-semibold text-red-600">{batches[0]?.date_of_hauling ? fmtDate(batches[0].date_of_hauling) : '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-0.5">MATURITY DATE</p>
            <p className="font-semibold text-green-700">{batches[0]?.maturity_date ? fmtDate(batches[0].maturity_date) : '—'}</p>
          </div>
        </div>
      </div>

      {/* ── Transactions table ───────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3">FEEDS</th>
                <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3">TR_DATE</th>
                <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3">NO.OF BAGS</th>
                <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3">Price/Bag</th>
                <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3">Debit</th>
                <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3">Delivery Fee</th>
                <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3">Balance</th>
                <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3">Interest</th>
                <th className="px-4 py-3 print:hidden" />
              </tr>
            </thead>
            <tbody>
              {withComputed.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center text-sm text-gray-400 py-10">
                    No transactions yet.
                  </td>
                </tr>
              )}
              {withComputed.map((tx) => (
                <tr key={tx.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-gray-800">{tx.feed_type || '—'}</td>
                  <td className="px-4 py-3 text-blue-600 whitespace-nowrap">{fmtDate(tx.date)}</td>
                  <td className="px-4 py-3 text-gray-700 text-right">{Number(tx.bags).toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-600 text-right">
                    {tx.price_per_bag ? num(Number(tx.price_per_bag)) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-900 text-right">{num(tx.debit)}</td>
                  <td className="px-4 py-3 text-gray-600 text-right">{num(Number(tx.delivery_fee ?? 0))}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 text-right">{num(tx.runningBalance)}</td>
                  <td className="px-4 py-3 text-gray-600 text-right">{num(tx.interest)}</td>
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
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-right text-gray-900">{num(totalDebit)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{num(totalDeliveryFee)}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{num(balance)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{num(totalInterest)}</td>
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
                <div className="flex justify-between">
                  <span className="text-gray-600">Del Fee</span>
                  <span className="font-medium text-gray-900">{num(totalDeliveryFee)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-1.5 mt-1">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold text-gray-900 underline">{num(balance + totalInterest + totalDeliveryFee)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Batches section ──────────────────────────────────────────── */}
      <div className="mt-8 bg-white rounded-xl border border-gray-200 print:hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Batches</h2>
            {batches.length > 0 && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{batches.length}</span>
            )}
          </div>
          <button
            onClick={() => setBatchModal(true)}
            className="flex items-center gap-1.5 text-sm text-green-800 font-medium hover:text-green-700"
          >
            <Plus className="w-4 h-4" /> New Batch
          </button>
        </div>

        {batches.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No batches yet. Create one to group transactions.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {batches.map((b, i) => (
              <div key={b.id} className="px-4 sm:px-6 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 hover:bg-gray-50/50">
                <span className="bg-green-800 text-white text-xs font-bold px-2 py-0.5 rounded shrink-0">
                  {b.batch_number}
                </span>
                {i === 0 && (
                  <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded shrink-0">Current</span>
                )}
                <span className="text-sm text-gray-500 shrink-0">
                  {fmtDate(b.batch_date)}
                </span>
                {b.notes && <span className="text-xs text-gray-400 truncate max-w-xs">{b.notes}</span>}
                <div className="ml-auto flex items-center gap-3 shrink-0 text-sm text-gray-500">
                  <span>{b.transaction_count} tx</span>
                  <span>{b.total_bags} bags</span>
                  <span className="font-medium text-gray-700 hidden sm:inline">
                    {num(b.total_debit)}
                  </span>
                  <button
                    onClick={() => router.push(`/batches/${b.id}`)}
                    className="flex items-center gap-1 text-green-700 hover:text-green-600"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                  <button
                    onClick={() => { setEditBatch(b); setEditBatchForm({ batch_number: b.batch_number, batch_date: b.batch_date, notes: b.notes, date_of_application: b.date_of_application ?? '', date_of_hauling: b.date_of_hauling ?? '', maturity_date: b.maturity_date ?? '', heads: b.heads ? String(b.heads) : '' }); }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteBatch(b.id)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
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

      {/* New Batch Modal */}
      {batchModal && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 pt-16 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">New Batch</h2>
              <button onClick={() => setBatchModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Batch Number</label>
                <input
                  value={batchForm.batch_number}
                  onChange={(e) => setBatchForm((f) => ({ ...f, batch_number: e.target.value }))}
                  placeholder="Auto-generated if empty"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Heads</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={batchForm.heads}
                  onChange={(e) => setBatchForm((f) => ({ ...f, heads: e.target.value }))}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date of Application</label>
                  <input
                    type="date"
                    value={batchForm.date_of_application}
                    onChange={(e) => setBatchForm((f) => ({ ...f, date_of_application: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
                    style={{ backgroundColor: '#ffffff', height: '42px', WebkitAppearance: 'none', appearance: 'none' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date of Hauling</label>
                  <input
                    type="date"
                    value={batchForm.date_of_hauling}
                    onChange={(e) => setBatchForm((f) => ({ ...f, date_of_hauling: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
                    style={{ backgroundColor: '#ffffff', height: '42px', WebkitAppearance: 'none', appearance: 'none' }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 text-green-700">Maturity Date</label>
                <input
                  type="date"
                  value={batchForm.maturity_date}
                  onChange={(e) => setBatchForm((f) => ({ ...f, maturity_date: e.target.value }))}
                  className="w-full border border-green-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
                  style={{ backgroundColor: '#ffffff', height: '42px', WebkitAppearance: 'none', appearance: 'none' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={batchForm.notes}
                  onChange={(e) => setBatchForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Optional description…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-800 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setBatchModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
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
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Edit Batch</h2>
              <button onClick={() => setEditBatch(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Batch Number *</label>
                <input
                  value={editBatchForm.batch_number}
                  onChange={(e) => setEditBatchForm((f) => ({ ...f, batch_number: e.target.value }))}
                  placeholder="e.g. BT-001"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Heads</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={editBatchForm.heads}
                  onChange={(e) => setEditBatchForm((f) => ({ ...f, heads: e.target.value }))}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date of Application</label>
                  <input
                    type="date"
                    value={editBatchForm.date_of_application}
                    onChange={(e) => setEditBatchForm((f) => ({ ...f, date_of_application: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
                    style={{ backgroundColor: '#ffffff', height: '42px', WebkitAppearance: 'none', appearance: 'none' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date of Hauling</label>
                  <input
                    type="date"
                    value={editBatchForm.date_of_hauling}
                    onChange={(e) => setEditBatchForm((f) => ({ ...f, date_of_hauling: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
                    style={{ backgroundColor: '#ffffff', height: '42px', WebkitAppearance: 'none', appearance: 'none' }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 text-green-700">Maturity Date</label>
                <input
                  type="date"
                  value={editBatchForm.maturity_date}
                  onChange={(e) => setEditBatchForm((f) => ({ ...f, maturity_date: e.target.value }))}
                  className="w-full border border-green-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
                  style={{ backgroundColor: '#ffffff', height: '42px', WebkitAppearance: 'none', appearance: 'none' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editBatchForm.notes}
                  onChange={(e) => setEditBatchForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Optional description…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-800 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditBatch(null)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
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
    </div>
  );
}
