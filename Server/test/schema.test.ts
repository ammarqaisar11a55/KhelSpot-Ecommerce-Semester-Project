import { describe, expect, it } from "vitest";
import { poolConfig, schemaFor } from "../src/db.ts";

const base = "postgresql://u:p@host:6543/postgres";

describe("schemaFor", () => {
  it("defaults to khelspot in production when the URL names no schema", () => {
    expect(schemaFor(base, true)).toBe("khelspot");
    expect(schemaFor(`${base}?sslmode=no-verify`, true)).toBe("khelspot");
  });
  it("accepts an explicit khelspot schema in production", () => {
    expect(schemaFor(`${base}?schema=khelspot`, true)).toBe("khelspot");
  });
  it("refuses any other schema in production", () => {
    expect(() => schemaFor(`${base}?schema=public`, true)).toThrow(/only uses "khelspot"/);
    expect(() => schemaFor(`${base}?schema=pwma`, true)).toThrow(/only uses "khelspot"/);
  });
  it("leaves local development alone", () => {
    expect(schemaFor(`${base}?schema=public`, false)).toBe("public");
    expect(schemaFor(base, false)).toBeUndefined();
  });
});

describe("poolConfig", () => {
  it("turns sslmode=require into encrypted-without-verification", () => {
    const c = poolConfig(`${base}?sslmode=require&schema=khelspot`);
    expect(c.ssl).toEqual({ rejectUnauthorized: false });
    expect(c.connectionString).not.toContain("sslmode");
    expect(c.connectionString).toContain("schema=khelspot");
  });
  it("keeps a percent-encoded password intact", () => {
    expect(poolConfig("postgresql://u:p%40ss@host:6543/postgres?sslmode=require").connectionString).toContain("u:p%40ss@");
  });
  it("leaves verify-full and plain URLs alone", () => {
    expect(poolConfig(`${base}?sslmode=verify-full`)).toEqual({ connectionString: `${base}?sslmode=verify-full` });
    expect(poolConfig(base)).toEqual({ connectionString: base });
  });
});
