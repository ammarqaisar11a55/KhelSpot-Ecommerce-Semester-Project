// Builds a Vercel Build Output API (v3) bundle: one Node function serving every route.
import { build } from "esbuild";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";

const out = ".vercel/output";
const fn = `${out}/functions/index.func`;
rmSync(out, { recursive: true, force: true });
mkdirSync(fn, { recursive: true });

await build({
  entryPoints: ["src/vercel.ts"],
  outfile: `${fn}/index.mjs`,
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  external: ["pg-native"],
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
});

writeFileSync(`${fn}/.vc-config.json`, JSON.stringify({ runtime: "nodejs22.x", handler: "index.mjs", launcherType: "Nodejs", shouldAddHelpers: false }, null, 2));
writeFileSync(`${out}/config.json`, JSON.stringify({ version: 3, routes: [{ src: "/(.*)", dest: "/index" }] }, null, 2));
console.log("Built .vercel/output");
