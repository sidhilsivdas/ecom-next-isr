// Builds the standalone output that the Docker image copies.
//   node scripts/build-docker.mjs redis   → shared Redis cache (default)
//   node scripts/build-docker.mjs disk    → default per-container cache
import { execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const mode = process.argv[2] ?? "redis";
const env = { ...process.env, PREBUILD: "0", NEXT_TELEMETRY_DISABLED: "1" };
if (mode === "redis") env.REDIS_URL = "redis://redis:6379";
else delete env.REDIS_URL;

// Stale files from an earlier build would otherwise end up in the image.
rmSync(".next/standalone", { recursive: true, force: true });

console.log(`Building standalone output with ${mode} cache...`);
execSync("npx next build", { stdio: "inherit", env });

// Built on Windows, the stored cache handler path uses "\" (e.g. "..\\cache-handler.js"),
// which Node on Linux can't load. Convert it to "/".
for (const file of [".next/standalone/server.js", ".next/standalone/.next/required-server-files.json"]) {
  if (!existsSync(file)) continue;
  const text = readFileSync(file, "utf8");
  writeFileSync(
    file,
    text.replace(/"cacheHandler":"([^"]*)"/g, (_, p) => `"cacheHandler":"${p.replace(/\\\\/g, "/")}"`),
  );
}
// Turbopack refers to server packages through hashed aliases such as
// .next/node_modules/pg-587764f78a6c7a9c, created as symlinks. On Windows they
// point at absolute C:\ paths that don't exist in the container, so replace
// each link with a real copy of the package.
const aliasDir = ".next/standalone/.next/node_modules";
if (existsSync(aliasDir)) {
  for (const alias of readdirSync(aliasDir)) {
    const link = path.join(aliasDir, alias);
    if (!lstatSync(link).isSymbolicLink()) continue;
    const target = readlinkSync(link);
    const pkg = target.split(/node_modules[\\/]/).pop();
    const traced = path.join(".next/standalone/node_modules", pkg);
    rmSync(link, { recursive: true, force: true });
    cpSync(existsSync(traced) ? traced : target, link, { recursive: true, dereference: true });
    console.log(`Copied ${pkg} → .next/node_modules/${alias}`);
  }
}
console.log("Standalone output ready for: docker compose up -d --build");
