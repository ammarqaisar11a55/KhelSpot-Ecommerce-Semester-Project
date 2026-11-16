import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "./env.ts";
import { PrismaClient } from "./generated/prisma/client.ts";

export type DB = PrismaClient;

export function createDb(connectionString: string = config.databaseUrl): DB {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}
