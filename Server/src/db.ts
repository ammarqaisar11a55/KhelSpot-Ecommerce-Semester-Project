import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "./env.ts";
import { PrismaClient } from "./generated/prisma/client.ts";

export type DB = PrismaClient;

export function createDb(connectionString: string = config.databaseUrl): DB {
  // Honour ?schema= in the URL (Prisma Migrate already does), so KhelSpot can live in its
  // own schema on a shared database, e.g. the Supabase project: ...?schema=khelspot
  let schema: string | undefined;
  try {
    schema = new URL(connectionString).searchParams.get("schema") ?? undefined;
  } catch {
    schema = undefined;
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }, schema ? { schema } : undefined) });
}
