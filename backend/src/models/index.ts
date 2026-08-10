import { neon } from "@neondatabase/serverless";

// HTTP-based driver instead of a TCP pool: each query is a single fetch, no
// persistent connection to keep alive between serverless invocations, and no
// WebSocket handshake overhead - the right shape for Vercel functions.
// fullResults:true makes sql.query() return the same { rows, ... } shape
// pg.Pool.query() did, so dbQueries.ts needed no changes.
const sql = neon(process.env.DATABASE_URL as string, { fullResults: true });

export const pool = {
  query: (text: string, params: unknown[] = []) => sql.query(text, params) as Promise<{ rows: any[] }>,
};
