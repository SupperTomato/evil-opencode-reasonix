"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { detectBuildPlan } = require("./detect-build.testable");

test("detectBuildPlan selects bun build for bun projects", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "build-plan-"));
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ scripts: { build: "bun run build" } }));
  fs.writeFileSync(path.join(root, "bun.lock"), "");
  const plan = detectBuildPlan(root);
  assert.equal(plan.packageManagerVersion, null);
  assert.deepEqual(plan.install, ["bun", "install", "--frozen-lockfile"]);
  assert.deepEqual(plan.build, ["bun", "run", "build"]);
});

test("detectBuildPlan selects packages/opencode workspace build for bun monorepos", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "build-plan-monorepo-"));
  fs.mkdirSync(path.join(root, "packages", "opencode"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ packageManager: "bun@1.3.5", scripts: { test: "echo no-root-tests" } }),
  );
  fs.writeFileSync(
    path.join(root, "packages", "opencode", "package.json"),
    JSON.stringify({ scripts: { build: "bun run script/build.ts", test: "bun test", typecheck: "tsgo --noEmit" } }),
  );
  fs.writeFileSync(path.join(root, "bun.lock"), "");

  const plan = detectBuildPlan(root);
  assert.equal(plan.packageManagerVersion, "1.3.5");
  assert.deepEqual(plan.install, ["bun", "install", "--frozen-lockfile"]);
  assert.deepEqual(plan.build, ["bun", "run", "--cwd", "packages/opencode", "build"]);
  assert.deepEqual(plan.test, ["bun", "run", "--cwd", "packages/opencode", "typecheck"]);
});
