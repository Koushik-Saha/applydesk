import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

// neon-http has no transaction support at all; profile/document versioning
// and task locking need real multi-statement transactions, so this uses the
// WebSocket-based driver instead. Vercel's Node.js functions (not Edge) run
// this fine; `ws` is the documented fallback for Node runtimes without a
// native WebSocket global.
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

export const db = drizzle(pool, { schema });
