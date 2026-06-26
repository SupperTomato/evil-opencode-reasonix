"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..", "..");

test("collect-diagnostics writes plan, verification, and patch artifacts", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "reasonix-diag-"));
  const workspace = path.join(root, "workspace");
  const outputDir = path.join(root, "repair");
  fs.mkdirSync(workspace, { recursive: true });
  fs.writeFileSync(path.join(workspace, "bin.js"), "const REASONIX_EVIL_LAYER_MARKER = 'x';\nconst REASONIX_STABLE_PREFIX_MARKER = 'x';\nconst REASONIX_SESSION_SHAPE_MARKER = 'x';\nconst REASONIX_COMPACTION_MARKER = 'x';\nconst REASONIX_TOOL_OUTPUT_MARKER = 'x';\nconst installer='update';\n");
  fs.writeFileSync(path.join(workspace, ".reasonix-patch-log.json"), JSON.stringify({ patches: [] }));
  fs.writeFileSync(path.join(workspace, ".reasonix-release-manifest.json"), JSON.stringify({ resolution: "evil-source" }));
  const plan = path.join(root, "plan.json");
  fs.writeFileSync(plan, JSON.stringify({ evilReleaseTag: "v1.2.3" }));

  execFileSync("node", [path.join(repoRoot, "scripts", "release", "collect-diagnostics.js"), "--plan", plan, "--workspace", workspace, "--output-dir", outputDir], { stdio: "pipe" });

  assert.ok(fs.existsSync(path.join(outputDir, "release-plan.json")));
  assert.ok(fs.existsSync(path.join(outputDir, "verification.json")));
  assert.ok(fs.existsSync(path.join(outputDir, "patch-log.json")));
  assert.ok(fs.existsSync(path.join(outputDir, "source-manifest.json")));
});
