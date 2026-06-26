'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import {
  DatabaseBackup, Download, Trash2, Upload,
  CheckCircle, AlertTriangle, Package, RotateCcw,
} from 'lucide-react';

type BackupFile = {
  id: number;
  filename: string;
  created_at: string;
  size_bytes: number;
};

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function BackupPage() {
  const fileRef = useRef<HTMLInputElement>(null);

  // Export state
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<{ filename: string } | null>(null);

  // Saved backups
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Restore state
  const [confirm, setConfirm] = useState<File | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Global status (top banner)
  const [globalStatus, setGlobalStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchBackups = useCallback(async () => {
    try {
      const res = await fetch('/api/backup/files');
      if (res.ok) {
        const data = await res.json();
        setBackups(data);
      }
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { fetchBackups(); }, [fetchBackups]);

  async function handleExport() {
    setExporting(true);
    setExportStatus(null);
    setGlobalStatus(null);
    try {
      const res = await fetch('/api/backup/export', { method: 'POST' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? 'Export failed');
      }
      const saved: BackupFile = await res.json();
      setExportStatus({ filename: saved.filename });
      setGlobalStatus({ type: 'success', message: `Backup saved: ${saved.filename}` });
      await fetchBackups();
    } catch (e) {
      setGlobalStatus({ type: 'error', message: e instanceof Error ? e.message : 'Export failed' });
    } finally {
      setExporting(false);
    }
  }

  async function handleDownload(file: BackupFile) {
    setDownloadingId(file.id);
    try {
      const res = await fetch(`/api/backup/files/${file.id}`);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setGlobalStatus({ type: 'error', message: e instanceof Error ? e.message : 'Download failed' });
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/backup/files/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setBackups(prev => prev.filter(b => b.id !== id));
    } catch (e) {
      setGlobalStatus({ type: 'error', message: e instanceof Error ? e.message : 'Delete failed' });
    } finally {
      setDeletingId(null);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setConfirm(file);
    setRestoreStatus(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) { setConfirm(file); setRestoreStatus(null); }
  }

  async function handleRestore() {
    if (!confirm) return;
    setRestoring(true);
    setRestoreStatus(null);
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
      setRestoreStatus({ type: 'success', message: 'Database restored successfully. All data has been replaced.' });
    } catch (e) {
      setRestoreStatus({ type: 'error', message: e instanceof Error ? e.message : 'Restore failed' });
    } finally {
      setRestoring(false);
      setConfirm(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <DatabaseBackup className="w-6 h-6 text-green-700" />
          Backup &amp; Restore
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Export your data to cloud storage, download saved backups, or restore from a file.
        </p>
      </div>

      {/* Global status banner */}
      {globalStatus && (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-lg mb-6 text-sm ${
          globalStatus.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700'
            : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700'
        }`}>
          {globalStatus.type === 'success'
            ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
          <span>{globalStatus.message}</span>
          <button
            onClick={() => setGlobalStatus(null)}
            className="ml-auto text-current opacity-50 hover:opacity-100 text-lg leading-none"
          >×</button>
        </div>
      )}

      {/* ── SECTION 1: Export ──────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6 text-green-700 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900 dark:text-white">Export Backup</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 mb-5">
              Snapshot all data — clients, batches, transactions, feed prices, expenses, pig sales — and save it to cloud storage. You can download it anytime from the list below.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-2 bg-green-800 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {exporting ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating Backup…</>
                ) : (
                  <><DatabaseBackup className="w-4 h-4" /> Export Now</>
                )}
              </button>
              {exportStatus && !exporting && (
                <span className="flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  Saved as <span className="font-medium">{exportStatus.filename}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: Saved Backups ───────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-5 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
            <Download className="w-4 h-4 text-gray-400" />
            Saved Backups
          </h2>
          {backups.length > 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">{backups.length} backup{backups.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {loadingList ? (
          <div className="flex items-center justify-center py-12 text-gray-400 text-sm gap-2">
            <span className="w-4 h-4 border-2 border-gray-300 border-t-green-600 rounded-full animate-spin" />
            Loading…
          </div>
        ) : backups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <Package className="w-10 h-10 text-gray-200 dark:text-gray-600 mb-3" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No backups yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Click <span className="font-medium">Export Now</span> above to create your first backup.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {backups.map(file => (
              <li key={file.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center shrink-0">
                  <DatabaseBackup className="w-4 h-4 text-green-700 dark:text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{file.filename}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {formatDate(file.created_at)} · {file.size_bytes ? formatSize(file.size_bytes) : '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDownload(file)}
                    disabled={downloadingId === file.id}
                    title="Download"
                    className="flex items-center gap-1.5 text-xs font-medium bg-green-800 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {downloadingId === file.id ? (
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    Download
                  </button>
                  <button
                    onClick={() => handleDelete(file.id)}
                    disabled={deletingId === file.id}
                    title="Delete"
                    className="flex items-center justify-center w-8 h-8 rounded-lg border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
                  >
                    {deletingId === file.id ? (
                      <span className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── SECTION 3: Restore / Import ───────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
            <RotateCcw className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900 dark:text-white">Import / Restore</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 mb-5">
              Upload a backup file to restore all data.{' '}
              <span className="text-red-600 dark:text-red-400 font-medium">This will permanently replace ALL current data.</span>
            </p>

            {restoreStatus && (
              <div className={`flex items-start gap-3 px-4 py-3 rounded-lg mb-4 text-sm ${
                restoreStatus.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700'
              }`}>
                {restoreStatus.type === 'success'
                  ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
                {restoreStatus.message}
              </div>
            )}

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl px-6 py-10 text-center cursor-pointer transition-colors mb-4 ${
                confirm
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/10'
                  : 'border-gray-300 dark:border-gray-600 hover:border-green-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-500" />
              {confirm ? (
                <>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">{confirm.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{(confirm.size / 1024).toFixed(1)} KB — click to change</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Drop your backup file here, or click to browse</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Accepts .json backup files only</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />

            {confirm && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-4 py-3 mb-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    <span className="font-semibold">Warning:</span> Restoring will permanently delete all current data and replace it with the contents of{' '}
                    <span className="font-medium">{confirm.name}</span>. This cannot be undone.
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
