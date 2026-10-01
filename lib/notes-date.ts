// Notes are stored as M-D-YY / MM-DD-YY (or already ISO); parse tolerantly
// so we can tell whether the note is more than a week old. Shared between
// client components (caretakers page) and server routes (weekly Discord cron).
export function parseNotesDate(notes: string | null | undefined): Date | null {
  const trimmed = notes?.trim();
  if (!trimmed) return null;
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const d = new Date(`${trimmed}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }
  const m = trimmed.match(/^(\d{1,2})\D+(\d{1,2})\D+(\d{2}|\d{4})$/);
  if (!m) return null;
  const [, mo, day, yr] = m;
  const year = yr.length === 2 ? `20${yr}` : yr;
  const d = new Date(`${year}-${mo.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function isNotesStale(notes: string | null | undefined): boolean {
  const date = parseNotesDate(notes);
  if (!date) return false;
  return Date.now() - date.getTime() > WEEK_MS;
}

// Matches the MM-DD-YY convention already used in caretakers' notes.
export function formatNotesDate(date: Date = new Date()): string {
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const yr = String(date.getFullYear()).slice(-2);
  return `${mo}-${day}-${yr}`;
}

// A caretaker manually marked "Updated" reverts to "Not Updated" once their
// note is more than a week old and hasn't been refreshed.
export function isEffectivelyUpdated(client: { is_updated: boolean; notes: string | null }): boolean {
  return client.is_updated && !isNotesStale(client.notes);
}
