import { config } from "./env.ts"; // first: loads .env and sets the Lahore timezone
import { buildApp } from "./app.ts";
import { createDb } from "./db.ts";

const db = createDb();
const app = await buildApp(
  { db, now: () => new Date() },
  { corsOrigins: config.corsOrigins, logger: { level: process.env.LOG_LEVEL ?? "info" } },
);

const shutdown = async () => {
  await app.close();
  await db.$disconnect();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await app.listen({ port: config.port, host: config.host });
