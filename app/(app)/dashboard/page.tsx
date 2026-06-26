'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Users, FileText, TrendingUp, Package, Truck, ArrowRight } from 'lucide-react';
import StatCard from '@/components/stat-card';
import { usePoll } from '@/hooks/use-poll';

interface DashboardStats {
  active_clients: number;
  total_transactions: number;
  total_loan_amount: number;
  total_bags: number;
  total_delivery_fees: number;
}

interface RecentTransaction {
  id: number;
  date: string;
  client_name: string;
  feed_type: string;
  bags: number;
  debit: number;
  credit: number;
  price_per_bag: number | null;
}

const peso = (n: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((data) => {
        if (data?.stats) setStats(data.stats);
        if (Array.isArray(data?.recent)) setRecent(data.recent);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  usePoll(fetchData);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-green-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Feed cooperative transaction overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <StatCard label="Active Caretakers"       value={stats?.active_clients ?? 0}          icon={Users}      iconBg="bg-green-50"  iconColor="text-green-700" />
        <StatCard label="Total Transactions"      value={stats?.total_transactions ?? 0}       icon={FileText}   iconBg="bg-blue-50"   iconColor="text-blue-600" />
        <StatCard label="Total Bags"              value={stats?.total_bags ?? 0}               icon={Package}    iconBg="bg-orange-50" iconColor="text-orange-600" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <StatCard label="Total Amount of Loans"   value={peso(stats?.total_loan_amount ?? 0)}  icon={TrendingUp} iconBg="bg-green-50"  iconColor="text-green-700" />
        <StatCard label="Total Delivery Fees"     value={peso(stats?.total_delivery_fees ?? 0)} icon={Truck}      iconBg="bg-purple-50" iconColor="text-purple-600" />
      </div>

      {/* Recent transactions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">Recent Transactions</h2>
          <Link href="/transactions" className="flex items-center gap-1 text-sm text-green-700 dark:text-green-400 hover:text-green-800 font-medium">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-6 py-3">Date</th>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-6 py-3">Caretaker</th>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-6 py-3">Feed</th>
                <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 px-6 py-3">Bags</th>
                <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 px-6 py-3">Price/Bag</th>
                <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 px-6 py-3">Total Price</th>
                <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 px-6 py-3">Credit</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-sm text-gray-400 dark:text-gray-500 py-10">
                    No transactions yet.
                  </td>
                </tr>
              )}
              {recent.map((tx) => (
                <tr key={tx.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-3 text-sm text-blue-600 dark:text-blue-400 whitespace-nowrap">{fmtDate(tx.date)}</td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white">{tx.client_name}</td>
                  <td className="px-6 py-3">
                    {tx.feed_type && (
                      <span className="inline-block bg-green-50 text-green-800 text-xs font-medium px-2 py-0.5 rounded">
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
