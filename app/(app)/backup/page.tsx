'use client';

import { useRef, useState } from 'react';
import { Download, Upload, CheckCircle, AlertTriangle, DatabaseBackup, RotateCcw } from 'lucide-react';

export default function BackupPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirm, setConfirm] = useState<File | null>(null);

  async function handleDownload() {
    setDownloading(true);
    setStatus(null);
    try {
      const res = await fetch('/api/backup');
      if (!res.ok) throw new Error('Failed to create backup');
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition') ?? '';
      const match = cd.match(/filename="(.+)"/);
      const filename = match?.[1] ?? `coop-ledger-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setStatus({ type: 'success', message: `Backup downloaded: ${filename}` });
    } catch (e) {
      setStatus({ type: 'error', message: e instanceof Error ? e.message : 'Download failed' });
    } finally {
      setDownloading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setConfirm(file);
    setStatus(null);
  }

  async function handleRestore() {
    if (!confirm) return;
    setRestoring(true);
    setStatus(null);
    try {
      const text = await confirm.text();
      let data: any;
      try { data = JSON.parse(text); } catch { throw new Error('File is not valid JSON'); }
      if (data?.app !== 'coop-ledger') throw new Error('This file is not a coop-ledger backup');

      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: text,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Restore failed');
      setStatus({ type: 'success', message: 'Database restored successfully. All data has been replaced.' });
    } catch (e) {
      setStatus({ type: 'error', message: e instanceof Error ? e.message : 'Restore failed' });
    } finally {
      setRestoring(false);
      setConfirm(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) setConfirm(file);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <DatabaseBackup className="w-6 h-6 text-green-700" />
          Backup &amp; Restore
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Export all data as a JSON file or restore from a previous backup.
        </p>
      </div>

      {status && (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-lg mb-6 text-sm ${
          status.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700'
            : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700'
        }`}>
          {status.type === 'success'
            ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
          {status.message}
        </div>
      )}

      {/* Backup */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-green-700 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Download Backup</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-4">
              Exports all clients, batches, transactions, feed types, prices, and settings into a single JSON file.
            </p>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 bg-green-800 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {downloading ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Preparing…</>
              ) : (
                <><Download className="w-4 h-4" /> Download Backup</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Restore */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
            <Upload className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Restore from Backup</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-4">
              Upload a backup file to restore all data. <span className="text-red-600 dark:text-red-400 font-medium">This will replace ALL current data.</span>
            </p>

            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-lg px-6 py-8 text-center cursor-pointer transition-colors mb-4 ${
                confirm
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/10'
                  : 'border-gray-300 dark:border-gray-600 hover:border-green-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
              {confirm ? (
                <>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">{confirm.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{(confirm.size / 1024).toFixed(1)} KB — click to change</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Drop your backup file here or click to browse</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Accepts .json backup files only</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />

            {confirm && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-4 py-3 mb-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    <span className="font-semibold">Warning:</span> Restoring will permanently delete all current data and replace it with the contents of <span className="font-medium">{confirm.name}</span>. This cannot be undone.
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleRestore}
              disabled={!confirm || restoring}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
            >
              {restoring ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Restoring…</>
              ) : (
                <><RotateCcw className="w-4 h-4" /> Restore Backup</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
