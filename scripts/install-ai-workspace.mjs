import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const hooksDir = path.join(root, ".githooks");
const hookNames = ["pre-commit", "pre-push", "post-checkout", "post-merge"];

for (const hookName of hookNames) {
  const hookPath = path.join(hooksDir, hookName);
  if (!fs.existsSync(hookPath)) {
    throw new Error(`Missing hook: ${path.relative(root, hookPath)}`);
  }
  fs.chmodSync(hookPath, 0o755);
}

const git = spawnSync("git", ["config", "core.hooksPath", ".githooks"], {
  cwd: root,
  stdio: "inherit",
});
if (git.status !== 0) process.exit(git.status ?? 1);

const context = spawnSync(process.execPath, ["scripts/ai-context.mjs", "--quiet"], {
  cwd: root,
  stdio: "inherit",
});
if (context.status !== 0) process.exit(context.status ?? 1);

console.log("AI workspace installed: .githooks is now the local Git hooks path.");
console.log("Generated .ai/context.md. Use `bun run ai:task -- \"...\"` for a task brief.");
