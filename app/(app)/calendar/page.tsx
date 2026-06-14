'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Truck, User } from 'lucide-react';
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
  const date = new Date(d + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
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

  const byDate = records.reduce<Record<string, HaulingRecord[]>>((acc, r) => {
    const key = r.date_of_hauling.slice(0, 10);
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
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
  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelected(null);
  }

  function dateKey(day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const selectedRecords = selected ? (byDate[selected] ?? []) : [];

  const monthHaulingCount = Object.keys(byDate).filter(k =>
    k.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-green-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Hauling Calendar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {monthHaulingCount > 0
              ? <><span className="font-medium text-red-600 dark:text-red-400">{monthHaulingCount} hauling date{monthHaulingCount > 1 ? 's' : ''}</span> in {MONTHS[month]}</>
              : <>No hauling dates in {MONTHS[month]}</>}
          </p>
        </div>
        <button
          onClick={goToday}
          className="self-start sm:self-auto text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Today
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Calendar panel ── */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Month navigation */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <button
              onClick={prevMonth}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <select
                value={month}
                onChange={e => { setMonth(Number(e.target.value)); setSelected(null); }}
                className="text-sm font-semibold text-gray-900 dark:text-white bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-green-800 rounded cursor-pointer dark:bg-gray-800"
              >
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <select
                value={year}
                onChange={e => { setYear(Number(e.target.value)); setSelected(null); }}
                className="text-sm font-semibold text-gray-900 dark:text-white bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-green-800 rounded cursor-pointer dark:bg-gray-800"
              >
                {Array.from({ length: today.getFullYear() - 2019 + 3 }, (_, i) => 2020 + i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <button
              onClick={nextMonth}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-700">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 dark:text-gray-500 py-2.5 tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (!day) {
                return <div key={`empty-${i}`} className="border-b border-r border-gray-50 dark:border-gray-700/50 min-h-[72px]" />;
              }
              const key = dateKey(day);
              const hits = byDate[key] ?? [];
              const isToday = key === todayKey;
              const isSelected = key === selected;
              const hasHauling = hits.length > 0;
              const isLastRow = i >= cells.length - 7;
              const isLastCol = (i + 1) % 7 === 0;

              return (
                <button
                  key={key}
                  onClick={() => setSelected(isSelected ? null : key)}
                  className={`relative flex flex-col min-h-[72px] p-1.5 text-left transition-all
                    ${!isLastRow ? 'border-b' : ''} ${!isLastCol ? 'border-r' : ''}
                    border-gray-100 dark:border-gray-700/50
                    ${isSelected
                      ? 'bg-green-800 dark:bg-green-700'
                      : hasHauling
                        ? 'bg-red-50/60 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/40'
                    }
                  `}
                >
                  {/* Day number */}
                  <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 leading-none
                    ${isSelected ? 'bg-white text-green-800' :
                      isToday ? 'bg-green-800 dark:bg-green-600 text-white' :
                      hasHauling ? 'text-red-600 dark:text-red-400' :
                      'text-gray-600 dark:text-gray-400'}
                  `}>
                    {day}
                  </span>

                  {/* Hauling chips */}
                  {hasHauling && (
                    <div className="flex flex-col gap-0.5 w-full">
                      {hits.slice(0, 2).map(r => (
                        <span
                          key={r.batch_id}
                          className={`text-[10px] leading-tight truncate rounded-sm px-1 py-0.5 font-medium
                            ${isSelected
                              ? 'bg-white/25 text-white'
                              : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                            }`}
                        >
                          {r.client_name.split(',')[0]}
                        </span>
                      ))}
                      {hits.length > 2 && (
                        <span className={`text-[10px] leading-tight px-1 font-medium
                          ${isSelected ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'}`}>
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

        {/* ── Right panel ── */}
        <div className="flex flex-col gap-4">
          {/* Selected date card */}
          <div className={`bg-white dark:bg-gray-800 rounded-2xl border overflow-hidden transition-all
            ${selected && selectedRecords.length > 0
              ? 'border-red-200 dark:border-red-800/50'
              : 'border-gray-200 dark:border-gray-700'}`}
          >
            {selected ? (
              <>
                <div className={`px-5 py-3.5 border-b flex items-center gap-2
                  ${selectedRecords.length > 0
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/50'
                    : 'border-gray-100 dark:border-gray-700'}`}
                >
                  <Truck className={`w-4 h-4 shrink-0 ${selectedRecords.length > 0 ? 'text-red-500' : 'text-gray-400'}`} />
                  <div>
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">{fmtDate(selected)}</p>
                    <p className={`text-xs mt-0.5 ${selectedRecords.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
                      {selectedRecords.length > 0
                        ? `${selectedRecords.length} caretaker${selectedRecords.length > 1 ? 's' : ''} hauling`
                        : 'No hauling scheduled'}
                    </p>
                  </div>
                </div>
                {selectedRecords.length > 0 && (
                  <div className="divide-y divide-gray-50 dark:divide-gray-700">
                    {selectedRecords.map(r => (
                      <button
                        key={r.batch_id}
                        onClick={() => router.push(`/caretakers/${r.client_id}`)}
                        className="w-full text-left px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0 mt-0.5">
                            <User className="w-3.5 h-3.5 text-green-700 dark:text-green-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors truncate">
                              {r.client_name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs text-gray-500 dark:text-gray-400">ID: {r.client_code}</span>
                              <span className="text-xs bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-medium">
                                Batch #{r.batch_number}
                              </span>
                              {r.heads != null && (
                                <span className="text-xs text-gray-400 dark:text-gray-500">{r.heads} heads</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="px-5 py-8 text-center">
                <Truck className="w-8 h-8 text-gray-200 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-400 dark:text-gray-500">Select a date to view hauling records</p>
              </div>
            )}
          </div>

          {/* Monthly summary */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{MONTHS[month]} Schedule</h3>
              {monthHaulingCount > 0 && (
                <span className="text-xs bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
                  {monthHaulingCount} date{monthHaulingCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {monthHaulingCount === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-gray-400 dark:text-gray-500">No hauling this month</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-700 max-h-72 overflow-y-auto">
                {Object.entries(byDate)
                  .filter(([k]) => k.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([date, recs]) => (
                    <button
                      key={date}
                      onClick={() => setSelected(selected === date ? null : date)}
                      className={`w-full text-left px-5 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50
                        ${selected === date ? 'bg-green-50 dark:bg-green-900/20' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                          <span className="text-xs font-semibold text-red-600 dark:text-red-400 shrink-0">
                            {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {recs.map(r => r.client_name.split(',')[0]).join(', ')}
                          </span>
                        </div>
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded shrink-0">
                          {recs.length}
                        </span>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
