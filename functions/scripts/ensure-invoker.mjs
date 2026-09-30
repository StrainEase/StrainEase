#!/usr/bin/env node
// ensure-invoker.mjs
//
// Re-applies the `allUsers` roles/run.invoker binding on every Firebase
// Functions v2 *callable* in the configured project. `firebase deploy
// --only functions` defaults to `--allow-unauthenticated` for callables,
// but a stray `gcloud run services update --no-allow-unauthenticated`
// call (or a Console IAM change) can drop the binding without ever
// redeploying. When that happens, OPTIONS preflight fails with 403 at
// the Cloud Run layer before Firebase can attach CORS headers, and the
// SDK's POST never lands.
//
// The script is idempotent: add-iam-policy-binding is a no-op when the
// binding already exists, and we read the policy first so the run log
// stays quiet on repeat invocations.
//
// Scheduled functions are filtered out via the `deployment-callable`
// label, which Firebase applies to every callable deploy. Scheduled
// functions use the compute SA as their invoker (Cloud Scheduler), so
// adding allUsers there would be wrong.
//
// Run after `firebase deploy --only functions` (locally and in CI).

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GCLOUD_PROJECT ||
  "strainfinder-84a9b";
const REGION = process.env.FIREBASE_FUNCTIONS_REGION || "us-central1";

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
    ...opts,
  });
  if (result.status !== 0) {
    const stderr = (result.stderr || "").trim();
    console.error(
      `[ensure-invoker] ${cmd} ${args.join(" ")}\n  -> exit ${result.status}${stderr ? `: ${stderr}` : ""}`,
    );
    process.exit(result.status ?? 1);
  }
  return result.stdout;
}

function listCallableFunctions() {
  // Cloud Functions v2 has no separate list flag in `gcloud functions`
  // (it accepts both v1 and v2). v2 functions carry a
  // `deployment-callable: "true"` label that Firebase CLI sets on every
  // callable deploy. We use that label as the source of truth rather
  // than trying to parse the trigger field, which is empty for v2.
  const stdout = run("gcloud", [
    "functions",
    "list",
    "--v2",
    `--regions=${REGION}`,
    `--project=${PROJECT}`,
    "--format=json",
  ]);
  const functions = JSON.parse(stdout || "[]");
  return functions.filter(
    (fn) => fn.labels && fn.labels["deployment-callable"] === "true",
  );
}

function cloudRunService(fn) {
  // serviceConfig.service is the fully qualified Cloud Run service path;
  // the last segment is the lowercase function name.
  const service = fn.serviceConfig?.service;
  if (service) return service.split("/").pop();
  return fn.name.split("/").pop().toLowerCase();
}

function readIamPolicy(service) {
  const stdout = run("gcloud", [
    "run",
    "services",
    "get-iam-policy",
    service,
    `--region=${REGION}`,
    `--project=${PROJECT}`,
    "--format=json",
  ]);
  return JSON.parse(stdout || "{}");
}

function hasAllUsersInvoker(policy) {
  return (policy.bindings ?? []).some(
    (b) =>
      b.role === "roles/run.invoker" &&
      Array.isArray(b.members) &&
      b.members.includes("allUsers"),
  );
}

function addAllUsersInvoker(service) {
  run("gcloud", [
    "run",
    "services",
    "add-iam-policy-binding",
    service,
    `--region=${REGION}`,
    `--project=${PROJECT}`,
    "--member=allUsers",
    "--role=roles/run.invoker",
    "--quiet",
  ]);
}

function main() {
  const callables = listCallableFunctions();
  if (callables.length === 0) {
    console.log(
      `[ensure-invoker] no callable functions found in ${PROJECT}/${REGION}`,
    );
    return;
  }
  let ensured = 0;
  let alreadyOk = 0;
  for (const fn of callables) {
    const name = fn.name.split("/").pop();
    const service = cloudRunService(fn);
    const policy = readIamPolicy(service);
    if (hasAllUsersInvoker(policy)) {
      console.log(`[ensure-invoker] ${name}: ok`);
      alreadyOk += 1;
    } else {
      console.log(`[ensure-invoker] ${name}: adding allUsers invoker`);
      addAllUsersInvoker(service);
      ensured += 1;
    }
  }
  console.log(
    `[ensure-invoker] done: ${alreadyOk} already ok, ${ensured} restored`,
  );
}

main();
