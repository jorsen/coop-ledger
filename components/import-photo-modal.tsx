'use client';

import { useState, useEffect } from 'react';
import { X, Upload, Loader2, Trash2, Plus, Clipboard } from 'lucide-react';

interface FeedType { id: number; name: string; current_price: number | null }

interface ParsedRow {
  date: string;   // YYYY-MM-DD
  feed_type: string;
  bags: string;
}

interface ImportPhotoModalProps {
  clientId: number;
  batchId: number;
  feedTypes: FeedType[];
  onClose: () => void;
  onSave: () => void;
}

// Cheap Levenshtein-ish match to snap noisy OCR words ("GTOngrow") to a real feed type name.
function closestFeedType(word: string, names: string[]): string {
  const w = word.toUpperCase().replace(/[^A-Z]/g, '');
  if (!w) return '';
  let best = '';
  let bestScore = 0;
  for (const name of names) {
    const n = name.toUpperCase().replace(/[^A-Z]/g, '');
    if (!n) continue;
    let shared = 0;
    for (const ch of Array.from(new Set(w))) if (n.includes(ch)) shared++;
    const score = shared / Math.max(w.length, n.length) + (n.startsWith(w.slice(0, 3)) ? 0.5 : 0);
    if (score > bestScore) { bestScore = score; best = name; }
  }
  return bestScore > 0.3 ? best : '';
}

// Parse OCR'd lines like "09-08 2 GROWER" into structured rows. Tolerant of
// missing year (assumes current year) and OCR noise between tokens.
function parseLines(rawText: string, feedTypeNames: string[]): ParsedRow[] {
  const year = new Date().getFullYear();
  const rows: ParsedRow[] = [];
  for (const line of rawText.split('\n')) {
    const m = line.match(/(\d{1,2})\D(\d{1,2})\D+(\d{1,2})\D+([A-Za-z]{3,})/);
    if (!m) continue;
    const [, mo, day, bags, feedWord] = m;
    const monthNum = Number(mo);
    const dayNum = Number(day);
    if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) continue;
    const feedType = closestFeedType(feedWord, feedTypeNames);
    rows.push({
      date: `${year}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`,
      feed_type: feedType,
      bags,
    });
  }
  return rows;
}

export default function ImportPhotoModal({ clientId, batchId, feedTypes, onClose, onSave }: ImportPhotoModalProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<ParsedRow[]>([]);

  function handleFile(file: File) {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setRows([]);
    setError('');
  }

  // Let Ctrl+V paste a copied screenshot/image straight in while this modal is open.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const item = Array.from(e.clipboardData?.items ?? []).find(i => i.type.startsWith('image/'));
      const file = item?.getAsFile();
      if (file) handleFile(file);
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  async function pasteFromClipboard() {
    setError('');
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find(t => t.startsWith('image/'));
        if (type) {
          const blob = await item.getType(type);
          handleFile(new File([blob], 'pasted-image.png', { type }));
          return;
        }
      }
      setError('No image found on the clipboard.');
    } catch {
      setError('Could not read the clipboard. Try Ctrl+V instead, or copy the image again.');
    }
  }

  async function runOcr() {
    if (!imageFile) return;
    setScanning(true);
    setError('');
    try {
      const Tesseract = await import('tesseract.js');
      const { data } = await Tesseract.recognize(imageFile, 'eng');
      const parsed = parseLines(data.text, feedTypes.map(f => f.name));
      if (parsed.length === 0) {
        setError('Could not find any date / bags / feed type rows in that photo. You can still add a row manually below.');
      }
      setRows(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OCR failed. Please try a clearer photo.');
    } finally {
      setScanning(false);
    }
  }

  function updateRow(i: number, patch: Partial<ParsedRow>) {
    setRows(rs => rs.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }

  function removeRow(i: number) {
    setRows(rs => rs.filter((_, idx) => idx !== i));
  }

  function addBlankRow() {
    setRows(rs => [...rs, { date: new Date().toISOString().slice(0, 10), feed_type: '', bags: '' }]);
  }

  async function handleImportAll() {
    setSaving(true);
    setError('');
    try {
      for (const row of rows) {
        if (!row.feed_type || !row.bags || Number(row.bags) <= 0) continue;

        const feedType = feedTypes.find(f => f.name === row.feed_type);
        let debit = 0;
        if (feedType) {
          const priceRes = await fetch(`/api/feed-types/${feedType.id}/price?date=${row.date}`);
          const priceData = await priceRes.json();
          if (priceData.price_per_bag) debit = Number(row.bags) * Number(priceData.price_per_bag);
        }

        await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: clientId,
            batch_id: batchId,
            date: row.date,
            feed_type: row.feed_type,
            bags: Number(row.bags),
            debit,
            credit: 0,
            notes: '',
          }),
        });
      }
      onSave();
    } catch {
      setError('Something went wrong while saving. Please check the transactions list and retry any missing rows.');
    } finally {
      setSaving(false);
    }
  }

  const readyCount = rows.filter(r => r.feed_type && r.bags && Number(r.bags) > 0).length;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 pt-12 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-2xl my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Import Transactions from Photo</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!imagePreview && (
            <div className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg py-10 text-gray-500 dark:text-gray-400">
              <Upload className="w-6 h-6" />
              <label className="text-sm cursor-pointer hover:text-green-700 dark:hover:text-green-400">
                Click to choose a photo of the ledger sheet
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </label>
              <span className="text-xs text-gray-400 dark:text-gray-500">or press Ctrl+V to paste a copied image</span>
              <button
                type="button"
                onClick={pasteFromClipboard}
                className="flex items-center gap-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Clipboard className="w-3.5 h-3.5" /> Paste from Clipboard
              </button>
            </div>
          )}

          {imagePreview && (
            <div className="flex items-start gap-4">
              <img src={imagePreview} alt="Ledger sheet" className="w-40 rounded-lg border border-gray-200 dark:border-gray-700" />
              <div className="flex-1 space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Text recognition runs free in your browser — accuracy on handwriting varies, so always check the rows below before importing.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={runOcr}
                    disabled={scanning}
                    className="flex items-center gap-2 bg-green-800 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {scanning ? 'Reading photo…' : 'Read Photo'}
                  </button>
                  <label className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                    Change photo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          {rows.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900 text-left text-xs text-gray-500 dark:text-gray-400">
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Feed Type</th>
                    <th className="px-3 py-2">Bags</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="px-3 py-2">
                        <input
                          type="date"
                          value={row.date}
                          onChange={(e) => updateRow(i, { date: e.target.value })}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm dark:bg-gray-700 dark:text-white"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={row.feed_type}
                          onChange={(e) => updateRow(i, { feed_type: e.target.value })}
                          className={`w-full border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:text-white ${row.feed_type ? 'border-gray-300 dark:border-gray-600' : 'border-amber-400'}`}
                        >
                          <option value="">Select…</option>
                          {feedTypes.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={row.bags}
                          onChange={(e) => updateRow(i, { bags: e.target.value })}
                          className="w-16 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm dark:bg-gray-700 dark:text-white"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button type="button" onClick={() => removeRow(i)} className="p-1 text-red-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                type="button"
                onClick={addBlankRow}
                className="flex items-center gap-1 px-3 py-2 text-xs text-green-700 dark:text-green-400 hover:text-green-600 border-t border-gray-100 dark:border-gray-700"
              >
                <Plus className="w-3.5 h-3.5" /> Add row
              </button>
            </div>
          )}

          {rows.length === 0 && imagePreview && !scanning && (
            <button
              type="button"
              onClick={addBlankRow}
              className="flex items-center gap-1 text-xs text-green-700 dark:text-green-400 hover:text-green-600"
            >
              <Plus className="w-3.5 h-3.5" /> Add row manually
            </button>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-700">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {readyCount > 0 ? `${readyCount} row(s) ready to import` : ''}
          </span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImportAll}
              disabled={saving || readyCount === 0}
              className="bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Importing…' : `Import ${readyCount || ''} Transaction(s)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
