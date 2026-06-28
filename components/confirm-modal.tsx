'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'delete';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [typed, setTyped] = useState('');
  const isDelete = variant === 'delete';
  const canConfirm = !isDelete || typed === 'DELETE';
  const label = confirmLabel ?? (isDelete ? 'Delete' : 'Confirm');

  useEffect(() => { setTyped(''); }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-full shrink-0 ${isDelete ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
            {isDelete
              ? <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              : <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            }
          </div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 pl-11">{message}</p>
        {isDelete && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">
              Type <span className="font-mono font-bold text-red-600 dark:text-red-400">DELETE</span> to confirm
            </p>
            <input
              autoFocus
              value={typed}
              onChange={e => setTyped(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && canConfirm) onConfirm(); if (e.key === 'Escape') onCancel(); }}
              placeholder="DELETE"
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
            />
          </div>
        )}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              isDelete ? 'bg-red-600 hover:bg-red-700' : 'bg-green-800 hover:bg-green-700'
            }`}
          >
            {label}
          </button>
        </div>
      </div>
    </div>
  );
}
