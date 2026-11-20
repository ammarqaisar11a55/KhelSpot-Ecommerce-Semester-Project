// Vercel Function entry: one Fastify app and one Prisma client per warm instance.
import type { IncomingMessage, ServerResponse } from "node:http";
import { config } from "./env.ts"; // first: loads env and sets the Lahore timezone
import { buildApp } from "./app.ts";
import { createDb } from "./db.ts";

let appPromise: ReturnType<typeof buildApp> | undefined;

function getApp() {
  appPromise ??= buildApp(
    { db: createDb(), now: () => new Date() },
    { corsOrigins: config.corsOrigins, logger: { level: process.env.LOG_LEVEL ?? "info" } },
  ).then(async (app) => {
    await app.ready();
    return app;
  });
  return appPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await getApp();
  app.server.emit("request", req, res);
}
