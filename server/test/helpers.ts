import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { openDatabase, type Database } from "../src/db/client.js";
import { seedDemo, seedReference } from "../src/db/seed.js";
import { loadConfig } from "../src/env.js";

export type TestCtx = { app: FastifyInstance; database: Database };

export async function setup(): Promise<TestCtx> {
  const cfg = loadConfig({ NODE_ENV: "test", PGLITE_DIR: "memory", DEMO_OTP: "true" });
  const database = await openDatabase(cfg);
  await seedReference(database.db);
  await seedDemo(database.db);
  const app = await buildApp(cfg, database);
  return { app, database };
}

export async function teardown({ app, database }: TestCtx) {
  await app.close();
  await database.close();
}

export async function login(app: FastifyInstance, email: string) {
  const otp = await app.inject({ method: "POST", url: "/v1/auth/otp", payload: { email } });
  const { demoCode } = otp.json();
  const res = await app.inject({ method: "POST", url: "/v1/auth/verify", payload: { email, code: demoCode } });
  const { token, user } = res.json();
  return { token, user, headers: { authorization: `Bearer ${token}` } };
}

export function inDays(days: number, hour = 10) {
  const d = new Date(Date.now() + days * 86_400_000);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

export const traveler = (n: number) => ({
  fullName: `Traveler Number ${n}`,
  passportNumber: `P${String(100000 + n)}`,
  nationality: "British",
  dateOfBirth: "1985-04-12",
});
