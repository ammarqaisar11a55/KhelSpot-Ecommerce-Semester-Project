import cors from "@fastify/cors";
import Fastify, { type FastifyServerOptions } from "fastify";
import type { DB } from "./db.ts";
import { ApiError } from "./http/errors.ts";
import { ownerRoutes } from "./routes/owner.ts";
import { publicRoutes } from "./routes/public.ts";

export interface AppDeps {
  db: DB;
  /** Injected so tests can pin the clock. */
  now: () => Date;
}

export interface AppOptions {
  corsOrigins?: string[];
  logger?: FastifyServerOptions["logger"];
}

export async function buildApp(deps: AppDeps, opts: AppOptions = {}) {
  const app = Fastify({ logger: opts.logger ?? false });

  await app.register(cors, { origin: opts.corsOrigins ?? false, methods: ["GET", "POST", "PUT"] });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ApiError) {
      const details = (err as ApiError & { details?: unknown }).details;
      return reply.code(err.statusCode).send({ error: { code: err.code, message: err.message, ...(details ? { details } : {}) } });
    }
    const status = (err as { statusCode?: number }).statusCode;
    if (status && status < 500) {
      // Fastify's own 4xx errors (bad JSON, body too large...).
      return reply.code(status).send({ error: { code: "BAD_REQUEST", message: (err as Error).message } });
    }
    req.log.error(err);
    return reply.code(500).send({ error: { code: "INTERNAL", message: "Something went wrong on our side." } });
  });

  app.setNotFoundHandler((req, reply) =>
    reply.code(404).send({ error: { code: "NOT_FOUND", message: `No route for ${req.method} ${req.url}.` } }),
  );

  app.get("/health", async () => {
    await deps.db.$queryRaw`SELECT 1`;
    return { ok: true };
  });

  await app.register(publicRoutes, deps);
  await app.register(ownerRoutes, deps);
  return app;
}
