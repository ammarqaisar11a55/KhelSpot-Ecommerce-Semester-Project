import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "./env.ts";
import { PrismaClient } from "./generated/prisma/client.ts";

export type DB = PrismaClient;

/** KhelSpot's tables on the shared Supabase database, beside other projects' schemas. */
export const PRODUCTION_SCHEMA = "khelspot";

/**
 * Schema every query is qualified with. Honours ?schema= in the URL (Prisma Migrate does
 * too). Without one, production uses "khelspot" rather than the role's search_path: the
 * shared database has other projects' tables with the same names (public.users,
 * pwma.users), and an unqualified query must never reach them.
 */
export function schemaFor(connectionString: string, isProduction = config.isProduction): string | undefined {
  let schema: string | undefined;
  try {
    schema = new URL(connectionString).searchParams.get("schema") || undefined;
  } catch {
    schema = undefined;
  }
  if (!isProduction) return schema;
  schema ??= PRODUCTION_SCHEMA;
  if (schema !== PRODUCTION_SCHEMA) {
    throw new Error(
      `DATABASE_URL points at schema "${schema}". In production KhelSpot only uses "${PRODUCTION_SCHEMA}", so it can't touch another project's tables.`,
    );
  }
  return schema;
}

/**
 * Pool settings for node-postgres. sslmode=require/prefer keep their libpq meaning: encrypted,
 * certificate not checked. node-postgres now reads them as verify-full, which fails against
 * Supabase's pooler (its certificate chains to Supabase's own CA), so they become an explicit
 * ssl option instead. sslmode=verify-full and no sslmode are left as they are.
 */
export function poolConfig(connectionString: string): { connectionString: string; ssl?: { rejectUnauthorized: false } } {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    return { connectionString };
  }
  const mode = url.searchParams.get("sslmode");
  if (mode !== "require" && mode !== "prefer" && mode !== "no-verify") return { connectionString };
  url.searchParams.delete("sslmode");
  return { connectionString: url.toString(), ssl: { rejectUnauthorized: false } };
}

export function createDb(connectionString: string = config.databaseUrl): DB {
  const schema = schemaFor(connectionString);
  return new PrismaClient({ adapter: new PrismaPg(poolConfig(connectionString), schema ? { schema } : undefined) });
}
