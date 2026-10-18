import { createHash } from "node:crypto";
import { z } from "zod";

const bool = z.enum(["true", "false"]).transform((v) => v === "true");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_SSL: bool.default(true),
  DATABASE_URL: z.string().optional(),
  PGLITE_DIR: z.string().default("./.pglite"),
  JWT_SECRET: z.string().min(32).optional(),
  PII_KEY: z.string().min(32, "PII_KEY must be at least 32 random characters").optional(),
  CORS_ORIGINS: z.string().default("http://localhost:8765,https://rahul260492.github.io"),
  DEMO_OTP: bool.default(false),
  SEED_DEMO: bool.default(false),
});

export type Config = {
  env: "development" | "test" | "production";
  port: number;
  host: string;
  trustProxyHops: number;
  databaseUrl?: string;
  databaseSsl: boolean;
  pgliteDir: string;
  jwtSecret: string;
  piiKey: Buffer;
  corsOrigins: string[];
  demoOtp: boolean;
  seedDemo: boolean;
};

// Fixed values so local development works without setup. Never used in production.
const DEV_JWT = "dev-only-jwt-secret-change-me-0123456789abcdef";
const DEV_PII = "dev-only-pii-key-change-me-0123456789abcdef";

export function loadConfig(source: Record<string, string | undefined> = process.env): Config {
  const raw = Object.fromEntries(Object.entries(source).filter(([, v]) => v !== ""));
  const e = schema.parse(raw);
  if (e.NODE_ENV === "production") {
    if (!e.JWT_SECRET || !e.PII_KEY) throw new Error("JWT_SECRET and PII_KEY are required in production");
    if (!raw.CORS_ORIGINS) throw new Error("CORS_ORIGINS is required in production");
    if (e.JWT_SECRET === DEV_JWT || e.PII_KEY === DEV_PII) throw new Error("Development secrets cannot be used in production");
    if (!e.DATABASE_URL) throw new Error("DATABASE_URL is required in production");
  }
  const corsOrigins = e.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean);
  if (!corsOrigins.length || corsOrigins.some((origin) => {
    try { const u = new URL(origin); return !["http:", "https:"].includes(u.protocol) || u.origin !== origin; } catch { return true; }
  })) throw new Error("CORS_ORIGINS must contain exact HTTP(S) origins");
  if (e.DATABASE_URL && !/^postgres(ql)?:$/.test(new URL(e.DATABASE_URL).protocol)) throw new Error("DATABASE_URL must be a PostgreSQL URL");
  return {
    env: e.NODE_ENV,
    port: e.PORT,
    host: e.HOST,
    trustProxyHops: e.TRUST_PROXY_HOPS,
    databaseUrl: e.DATABASE_URL,
    databaseSsl: e.DATABASE_SSL,
    pgliteDir: e.PGLITE_DIR,
    jwtSecret: e.JWT_SECRET ?? DEV_JWT,
    // Any long random secret works; it is stretched to a 32-byte AES-256 key.
    piiKey: createHash("sha256").update(e.PII_KEY ?? DEV_PII).digest(),
    corsOrigins,
    demoOtp: e.DEMO_OTP,
    seedDemo: e.SEED_DEMO,
  };
}
