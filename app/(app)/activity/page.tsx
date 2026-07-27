'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePoll } from '@/hooks/use-poll';

interface Log {
  id: number;
  action: 'created' | 'updated' | 'deleted';
  entity_type: string;
  entity_id: number | null;
  description: string;
  created_at: string;
}

const PAGE_SIZE = 20;

const ACTION_STYLES = {
  created: { icon: Plus,   bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'Created' },
  updated: { icon: Pencil, bg: 'bg-blue-100 dark:bg-blue-900/30',   text: 'text-blue-700 dark:text-blue-400',   label: 'Updated' },
  deleted: { icon: Trash2, bg: 'bg-red-100 dark:bg-red-900/30',     text: 'text-red-600 dark:text-red-400',     label: 'Deleted' },
};

const ENTITY_COLORS: Record<string, string> = {
  caretaker:   'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  transaction: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  batch:       'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  expense:     'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  pig_sale:    'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
};

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fullDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

export default function ActivityPage() {
  const router = useRouter();
  const [logs, setLogs]   = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<string>('all');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const fetchLogs = useCallback(async () => {
    const res = await fetch(`/api/activity?limit=200&offset=0`);
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => {
      setIsAdmin(d.isAdmin === true);
      if (d.isAdmin !== true) router.replace('/dashboard');
    });
  }, [router]);

  useEffect(() => { if (isAdmin) fetchLogs(); }, [isAdmin, fetchLogs]);
  usePoll(isAdmin ? fetchLogs : () => {}, 3000);

  const filtered = filter === 'all' ? logs : logs.filter(l =>
    filter === 'created' || filter === 'updated' || filter === 'deleted'
      ? l.action === filter
      : l.entity_type === filter
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (loading || isAdmin !== true) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-green-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="w-6 h-6 text-green-700" /> Activity Log
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{total} total actions recorded</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { key: 'all',         label: 'All' },
          { key: 'created',     label: 'Created' },
          { key: 'updated',     label: 'Updated' },
          { key: 'deleted',     label: 'Deleted' },
          { key: 'caretaker',   label: 'Caretakers' },
          { key: 'transaction', label: 'Transactions' },
          { key: 'batch',       label: 'Batches' },
          { key: 'expense',     label: 'Expenses' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => { setFilter(f.key); setPage(0); }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === f.key
                ? 'bg-green-800 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 py-20 text-center">
          <Activity className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-400 dark:text-gray-500">No activity recorded yet.</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Actions on caretakers, batches, transactions, and expenses will appear here.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {paged.map((log) => {
              const style = ACTION_STYLES[log.action] ?? ACTION_STYLES.created;
              const Icon  = style.icon;
              const entityColor = ENTITY_COLORS[log.entity_type] ?? 'bg-gray-100 text-gray-600';
              return (
                <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${style.bg}`}>
                    <Icon className={`w-4 h-4 ${style.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200">{log.description}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${entityColor}`}>
                        {log.entity_type}
                      </span>
                      <span className={`text-xs font-medium ${style.text}`}>{style.label}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap" title={fullDate(log.created_at)}>
                      {timeAgo(log.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-700">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => p - 1)} disabled={page === 0} className="p-1.5 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-600 dark:text-gray-400 px-1">{page + 1} / {totalPages}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} className="p-1.5 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
