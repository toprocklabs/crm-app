// Test runner entrypoint for `npm test`.
//
// Node 20's built-in runner only auto-discovers .js/.mjs/.cjs — pointing it at
// `tests/` finds zero TypeScript files and exits green, which is worse than
// failing. So we discover the .test.ts files ourselves and hand node an
// explicit list. tsx supplies TS support and resolves the `@/*` tsconfig path.
//
// Drop this in favour of `node --test tests/` once the project is on a Node
// version whose runner globs TypeScript.
import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testsDir = path.join(root, "tests");

function findTests(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return findTests(full);
    return entry.name.endsWith(".test.ts") ? [full] : [];
  });
}

let files;
try {
  files = findTests(testsDir);
} catch {
  console.error(`No tests directory at ${testsDir}`);
  process.exit(1);
}

if (files.length === 0) {
  console.error("No *.test.ts files found — refusing to report success.");
  process.exit(1);
}

const args = ["--import", "tsx", "--test", ...process.argv.slice(2), ...files];
spawn(process.execPath, args, { stdio: "inherit", cwd: root }).on("exit", (code) => {
  process.exit(code ?? 1);
});
