import { neon, NeonQueryFunction } from '@neondatabase/serverless';

type SqlFn = NeonQueryFunction<false, false>;

let _client: SqlFn | null = null;

function getClient(): SqlFn {
  if (!_client) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    _client = neon(process.env.DATABASE_URL);
  }
  return _client;
}

export const sql = ((strings: TemplateStringsArray, ...values: unknown[]) =>
  getClient()(strings, ...values)) as unknown as SqlFn;

// Execute a raw SQL string (safe only for internal use with hardcoded queries)
export function rawQuery(query: string, params: unknown[] = []): Promise<unknown[]> {
  return (getClient() as any)(query, params) as Promise<unknown[]>;
}
