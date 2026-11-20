import cors from "@fastify/cors";
import Fastify, { type FastifyRequest, type FastifyServerOptions } from "fastify";
import type { DB } from "./db.ts";
import { config } from "./env.ts";
import { ApiError } from "./http/errors.ts";
import { authRoutes } from "./routes/auth.ts";
import { ownerRoutes } from "./routes/owner.ts";
import { testPaymentRoutes } from "./routes/pay-test.ts";
import { publicRoutes } from "./routes/public.ts";
import { createPaymentProvider, type PaymentProvider } from "./services/payments/provider.ts";
import { createSmsProvider, type SmsProvider } from "./services/sms.ts";

export interface AppSettings {
  otpSecret: string;
  /** Return { devCode } from POST /auth/otp (never in production). */
  otpDevEcho: boolean;
  /** Allowed payment return URLs: scheme prefixes ("khelspot://") or origins ("http://localhost:3000"). */
  paymentReturnAllow: string[];
  /** Public base URL for payment links; defaults to the request's own host. */
  publicBaseUrl?: string;
}

/** What callers pass in. Anything left out comes from the environment (src/env.ts). */
export interface AppDeps {
  db: DB;
  /** Injected so tests can pin the clock. */
  now: () => Date;
  sms?: SmsProvider;
  payments?: PaymentProvider;
  settings?: Partial<AppSettings>;
}

/** What routes receive: everything resolved. */
export interface Deps {
  db: DB;
  now: () => Date;
  sms: SmsProvider;
  payments: PaymentProvider;
  settings: AppSettings;
  /** Base URL for links back to this API, e.g. payment pages. */
  baseUrl(req: FastifyRequest): string;
}

export interface AppOptions {
  corsOrigins?: string[];
  logger?: FastifyServerOptions["logger"];
}

export async function buildApp(input: AppDeps, opts: AppOptions = {}) {
  const settings: AppSettings = {
    otpSecret: input.settings?.otpSecret ?? config.otpSecret,
    otpDevEcho: input.settings?.otpDevEcho ?? config.otpDevEcho,
    paymentReturnAllow: input.settings?.paymentReturnAllow ?? config.paymentReturnAllow,
    publicBaseUrl: input.settings?.publicBaseUrl ?? config.publicBaseUrl,
  };
  const deps: Deps = {
    db: input.db,
    now: input.now,
    sms: input.sms ?? createSmsProvider(config.smsProvider),
    payments:
      input.payments ??
      createPaymentProvider({
        name: config.paymentProvider,
        isProduction: config.isProduction,
        allowTestPaymentsInProduction: config.allowTestPaymentsInProduction,
      }),
    settings,
    baseUrl: (req) => settings.publicBaseUrl ?? `${req.protocol}://${req.host}`,
  };

  const app = Fastify({ logger: opts.logger ?? false, trustProxy: true });

  await app.register(cors, {
    origin: opts.corsOrigins ?? false,
    methods: ["GET", "POST", "PUT", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // The test payment page posts plain HTML forms.
  app.addContentTypeParser("application/x-www-form-urlencoded", { parseAs: "string" }, (_req, body, done) =>
    done(null, Object.fromEntries(new URLSearchParams(body as string))),
  );

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
    return { ok: true, payments: deps.payments.name, sms: deps.sms.name };
  });

  await app.register(publicRoutes, deps);
  await app.register(authRoutes, deps);
  await app.register(ownerRoutes, deps);
  if (deps.payments.name === "test") await app.register(testPaymentRoutes, deps);
  return app;
}
