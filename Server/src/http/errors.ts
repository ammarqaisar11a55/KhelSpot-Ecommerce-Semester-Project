import { z } from "zod";

/** An error with an HTTP status and a stable code the Frontend can switch on. */
export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new ApiError(404, "NOT_FOUND", `${what} not found.`);
export const badRequest = (code: string, message: string) => new ApiError(400, code, message);
export const conflict = (code: string, message: string) => new ApiError(409, code, message);

/** Parse with zod; a failure becomes a 400 with the field problems listed. */
export function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    throw Object.assign(badRequest("VALIDATION", "Some fields are missing or invalid."), { details });
  }
  return result.data;
}

/** Postgres exclusion_violation from the booking_no_overlap constraint, however the driver wraps it. */
export function isOverlapViolation(err: unknown): boolean {
  const seen = new Set<unknown>();
  const walk = (e: unknown): boolean => {
    if (!e || typeof e !== "object" || seen.has(e)) return false;
    seen.add(e);
    const rec = e as Record<string, unknown>;
    if (rec.code === "23P01" || rec.originalCode === "23P01") return true;
    if (typeof rec.message === "string" && rec.message.includes("booking_no_overlap")) return true;
    return Object.values(rec).some(walk) || walk(rec.cause);
  };
  return walk(err);
}
