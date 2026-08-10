import dns from "node:dns";
import { Pool, type PoolConfig } from "pg";

// Some container platforms (Railway included) advertise IPv6 but can't actually route it,
// so Node's default dual-stack lookup on Neon's hostname (which has both A and AAAA records)
// tries the IPv6 address, fails, and surfaces as an AggregateError with an empty .message -
// forcing IPv4 resolution avoids that dead route entirely. `lookup` is a real node-postgres/net
// option that @types/pg doesn't declare, hence the loose typing.
type LookupFn = (
  hostname: string,
  options: unknown,
  callback: (err: NodeJS.ErrnoException | null, address: string, family: number) => void
) => void;

const poolConfig: PoolConfig & { lookup: LookupFn } = {
  connectionString: process.env.DATABASE_URL,
  lookup: (hostname, _options, callback) => dns.lookup(hostname, { family: 4 }, callback),
};

export const pool = new Pool(poolConfig);
