/**
 * Database client. Uses libsql for a pure-JS local SQLite — no native
 * compilation, no engine downloads, just a file at ./data/greenroom.db.
 *
 * In a real product this would point at a managed Postgres. For this demo,
 * file-based SQLite is enough - and a single file means seeded data is
 * committed to git, so the project can clone-and-run.
 */

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const dbUrl = process.env.DATABASE_URL ?? "file:./data/greenroom.db";

export const client = createClient({ url: dbUrl });
export const db = drizzle(client, { schema });

export type DB = typeof db;
