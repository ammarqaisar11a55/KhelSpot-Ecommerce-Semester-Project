import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Same clock as production: venues run on Lahore time.
    env: { TZ: "Asia/Karachi" },
    include: ["test/**/*.test.ts"],
    // API tests share one database, so run files one at a time.
    fileParallelism: false,
  },
});
