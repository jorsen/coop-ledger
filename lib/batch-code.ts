import { sql } from './db';

// "Juan Dela Mejia" -> "JM" (first letter of first and last word).
// Batches without a caretaker use "B".
export function codePrefix(name: string | null | undefined): string {
  const words = (name ?? '')
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z]/g, ''))
    .filter(Boolean);
  if (words.length === 0) return 'B';
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export function formatCode(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(3, '0')}`;
}

// Smallest unused number for this prefix, so a deleted code gets reused.
export async function nextBatchCode(userId: number, prefix: string): Promise<string> {
  const rows = await sql`
    SELECT batch_number FROM batches
    WHERE user_id = ${userId} AND batch_number LIKE ${prefix + '-%'}
  `;
  const used = new Set<number>();
  for (const r of rows) {
    const m = new RegExp(`^${prefix}-(\\d+)$`).exec(r.batch_number as string);
    if (m) used.add(Number(m[1]));
  }
  let n = 1;
  while (used.has(n)) n++;
  return formatCode(prefix, n);
}
