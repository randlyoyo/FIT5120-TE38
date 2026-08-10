import dns from "node:dns";
import { Pool } from "pg";

// node-postgres calls socket.connect(port, host) directly - it doesn't expose a way to pass a
// custom `lookup` resolver through Pool/Client config, so the earlier attempt to inject one
// there was a no-op. This process-wide setting is the actual lever: it changes what Node's
// default dns.lookup() (which net.Socket.connect uses internally) returns first when a host
// has both A and AAAA records, in case Railway's IPv6 egress is the failure.
dns.setDefaultResultOrder("ipv4first");

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
