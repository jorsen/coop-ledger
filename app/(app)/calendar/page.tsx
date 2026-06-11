'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { usePoll } from '@/hooks/use-poll';

interface HaulingRecord {
  batch_id: number;
  batch_number: string;
  date_of_hauling: string;
  heads: number | null;
  client_id: number;
  client_name: string;
  client_code: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const fmtDate = (d: string) => {
  const [y, m, day] = d.split('-');
  return `${parseInt(m)}/${parseInt(day)}/${y}`;
};

export default function CalendarPage() {
  const router = useRouter();
  const [records, setRecords] = useState<HaulingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [today] = useState(new Date());
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    const res = await fetch('/api/calendar');
    setRecords(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);
  usePoll(fetchRecords);

  // Build lookup: date string → records
  const byDate = records.reduce<Record<string, HaulingRecord[]>>((acc, r) => {
    const key = r.date_of_hauling.slice(0, 10);
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  // Calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelected(null);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelected(null);
  }

  function dateKey(day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const selectedRecords = selected ? (byDate[selected] ?? []) : [];

  // All records in current month for the list below the calendar
  const monthRecords = Object.entries(byDate)
    .filter(([k]) => k.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
    .sort(([a], [b]) => a.localeCompare(b));

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
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-green-700 dark:text-green-400" />
          Hauling Calendar
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">All caretaker hauling dates</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Calendar ── */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="font-semibold text-gray-900 dark:text-white text-base">
              {MONTHS[month]} {year}
            </h2>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 dark:text-gray-500 py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const key = dateKey(day);
              const hits = byDate[key] ?? [];
              const isToday = key === todayKey;
              const isSelected = key === selected;

              return (
                <button
                  key={key}
                  onClick={() => setSelected(isSelected ? null : key)}
                  className={`relative flex flex-col items-center justify-start pt-1.5 pb-1 rounded-lg min-h-[52px] text-sm transition-colors
                    ${isSelected ? 'bg-green-800 text-white' :
                      isToday ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-400 font-semibold' :
                      'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}
                  `}
                >
                  <span className="text-xs font-medium leading-none">{day}</span>
                  {hits.length > 0 && (
                    <div className="mt-1 flex flex-col gap-0.5 w-full px-0.5">
                      {hits.slice(0, 2).map(r => (
                        <span
                          key={r.batch_id}
                          className={`text-[9px] leading-tight truncate rounded px-0.5 font-medium
                            ${isSelected ? 'bg-white/20 text-white' : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'}`}
                        >
                          {r.client_name.split(',')[0]}
                        </span>
                      ))}
                      {hits.length > 2 && (
                        <span className={`text-[9px] leading-tight px-0.5 ${isSelected ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'}`}>
                          +{hits.length - 2} more
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Side panel ── */}
        <div className="space-y-4">
          {/* Selected day detail */}
          {selected && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
                {fmtDate(selected)}
              </h3>
              {selectedRecords.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500">No hauling on this date.</p>
              ) : (
                <div className="space-y-2">
                  {selectedRecords.map(r => (
                    <button
                      key={r.batch_id}
                      onClick={() => router.push(`/caretakers/${r.client_id}`)}
                      className="w-full text-left p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{r.client_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        ID: {r.client_code} · Batch <span className="font-medium text-green-700 dark:text-green-400">#{r.batch_number}</span>
                        {r.heads != null && <> · {r.heads} heads</>}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* This month's hauling list */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
              {MONTHS[month]} Hauling Dates
            </h3>
            {monthRecords.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">No hauling dates this month.</p>
            ) : (
              <div className="space-y-3">
                {monthRecords.map(([date, recs]) => (
                  <div key={date}>
                    <button
                      onClick={() => setSelected(selected === date ? null : date)}
                      className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1 hover:underline"
                    >
                      {fmtDate(date)}
                    </button>
                    <div className="space-y-1">
                      {recs.map(r => (
                        <button
                          key={r.batch_id}
                          onClick={() => router.push(`/caretakers/${r.client_id}`)}
                          className="w-full text-left flex items-center justify-between text-xs text-gray-700 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-400 transition-colors"
                        >
                          <span className="truncate">{r.client_name}</span>
                          <span className="text-gray-400 dark:text-gray-500 shrink-0 ml-2">Batch #{r.batch_number}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
