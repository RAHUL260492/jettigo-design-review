import { z } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, details?: unknown) => new HttpError(400, "bad_request", message, details);
export const unauthorized = (message = "Sign in required") => new HttpError(401, "unauthorized", message);
export const forbidden = (message = "You do not have access to this resource") => new HttpError(403, "forbidden", message);
export const notFound = (what = "Resource") => new HttpError(404, "not_found", `${what} not found`);
export const conflict = (message: string) => new HttpError(409, "conflict", message);

/** Validate untrusted input; throws a 400 with field-level issues. */
export function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data);
  if (!r.success) {
    throw badRequest(
      "Invalid request",
      r.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    );
  }
  return r.data;
}
