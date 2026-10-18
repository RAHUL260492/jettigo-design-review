import { eq } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import { jwtVerify, SignJWT } from "jose";
import type { DB } from "../db/client.js";
import { users } from "../db/schema.js";
import { forbidden, unauthorized } from "./errors.js";

export type User = typeof users.$inferSelect;

const ISSUER = "jettigo-api";
const TTL = "7d";

export async function signToken(secret: string, user: Pick<User, "id" | "role">): Promise<string> {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(TTL)
    .sign(new TextEncoder().encode(secret));
}

/** Resolve the signed-in user from the bearer token. Role and company come from the DB, not the token. */
export async function currentUser(req: FastifyRequest, db: DB, secret: string): Promise<User | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const { payload } = await jwtVerify(header.slice(7), new TextEncoder().encode(secret), { issuer: ISSUER, algorithms: ["HS256"] });
    if (!payload.sub) return null;
    const [user] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
    return user ?? null;
  } catch {
    return null;
  }
}

export async function requireUser(req: FastifyRequest, db: DB, secret: string): Promise<User> {
  const user = await currentUser(req, db, secret);
  if (!user) throw unauthorized();
  return user;
}

export function requireRole(user: User, ...roles: User["role"][]): void {
  if (!roles.includes(user.role)) throw forbidden();
}

export function publicUser(u: User) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone,
    role: u.role,
    companyId: u.companyId,
    companyRole: u.companyRole,
    operatorId: u.operatorId,
    tier: u.tier,
    referralCode: u.referralCode,
  };
}
