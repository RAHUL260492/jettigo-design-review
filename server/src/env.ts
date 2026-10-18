import { createHash } from "node:crypto";
import { z } from "zod";

const bool = z.enum(["true", "false"]).transform((v) => v === "true");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8787),
  HOST: z.string().default("0.0.0.0"),
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
  databaseUrl?: string;
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
    if (!e.DATABASE_URL) throw new Error("DATABASE_URL is required in production");
  }
  return {
    env: e.NODE_ENV,
    port: e.PORT,
    host: e.HOST,
    databaseUrl: e.DATABASE_URL,
    pgliteDir: e.PGLITE_DIR,
    jwtSecret: e.JWT_SECRET ?? DEV_JWT,
    // Any long random secret works; it is stretched to a 32-byte AES-256 key.
    piiKey: createHash("sha256").update(e.PII_KEY ?? DEV_PII).digest(),
    corsOrigins: e.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean),
    demoOtp: e.DEMO_OTP,
    seedDemo: e.SEED_DEMO,
  };
}
