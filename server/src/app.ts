import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { sql } from "drizzle-orm";
import Fastify, { type FastifyInstance } from "fastify";
import type { Database } from "./db/client.js";
import type { Config } from "./env.js";
import { HttpError } from "./lib/errors.js";
import { authRoutes } from "./routes/auth.js";
import { bookingRoutes } from "./routes/bookings.js";
import { catalogRoutes } from "./routes/catalog.js";
import { companyRoutes } from "./routes/company.js";
import { meRoutes } from "./routes/me.js";
import { messageRoutes } from "./routes/messages.js";
import { operatorRoutes } from "./routes/operator.js";
import { searchRoutes } from "./routes/search.js";

export type Ctx = { db: Database["db"]; cfg: Config };

export async function buildApp(cfg: Config, database: Database): Promise<FastifyInstance> {
  const app = Fastify({
    logger: cfg.env === "test" ? false : { level: cfg.env === "production" ? "info" : "debug", redact: ["req.headers.authorization"] },
    trustProxy: true,
    bodyLimit: 256 * 1024,
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: (origin, cb) => cb(null, !origin || cfg.corsOrigins.includes(origin)),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
  });
  await app.register(rateLimit, { global: true, max: 300, timeWindow: "1 minute" });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof HttpError) {
      return reply.status(err.status).send({ error: { code: err.code, message: err.message, details: err.details } });
    }
    const status = (err as { statusCode?: number }).statusCode;
    if (status && status < 500) {
      const message = err instanceof Error ? err.message : "Bad request";
      return reply.status(status).send({ error: { code: status === 429 ? "rate_limited" : "bad_request", message } });
    }
    req.log.error(err);
    return reply.status(500).send({ error: { code: "internal", message: "Something went wrong" } });
  });
  app.setNotFoundHandler((_req, reply) => reply.status(404).send({ error: { code: "not_found", message: "Route not found" } }));

  const ctx: Ctx = { db: database.db, cfg };

  app.get("/health", async () => {
    await ctx.db.execute(sql`select 1`);
    return { ok: true, service: "jettigo-api" };
  });

  await app.register(async (api) => {
    await authRoutes(api, ctx);
    await catalogRoutes(api, ctx);
    await searchRoutes(api, ctx);
    await bookingRoutes(api, ctx);
    await messageRoutes(api, ctx);
    await companyRoutes(api, ctx);
    await operatorRoutes(api, ctx);
    await meRoutes(api, ctx);
  }, { prefix: "/v1" });

  return app;
}
