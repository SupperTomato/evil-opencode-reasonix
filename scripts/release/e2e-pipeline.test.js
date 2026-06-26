"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

test("end-to-end local fixture covers patch, verify, detect-build, and run-build", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "reasonix-e2e-"));
  const workspace = path.join(root, "workspace");
  const srcDir = path.join(workspace, "src");
  const artifactDir = path.join(root, "artifacts");
  const planPath = path.join(root, "plan.json");
  const buildPlanPath = path.join(root, "build-plan.json");

  fs.mkdirSync(srcDir, { recursive: true });
  writeJson(path.join(workspace, "package.json"), {
    name: "fixture",
    version: "1.0.0",
    scripts: {
      build: "node build.js",
      test: "node test.js"
    }
  });
  writeJson(path.join(workspace, "package-lock.json"), {
    name: "fixture",
    version: "1.0.0",
    lockfileVersion: 3,
    requires: true,
    packages: {
      "": {
        name: "fixture",
        version: "1.0.0"
      }
    }
  });
  fs.writeFileSync(
    path.join(workspace, "build.js"),
    "require('node:fs').mkdirSync('dist/opencode-linux-x64/bin', { recursive: true }); require('node:fs').writeFileSync('built.txt', 'ok\\n'); require('node:fs').writeFileSync('dist/opencode-linux-x64/bin/opencode', 'binary\\n');\n",
  );
  fs.writeFileSync(path.join(workspace, "test.js"), "require('node:fs').accessSync('built.txt'); require('node:fs').accessSync('dist/opencode-linux-x64/bin/opencode');\n");
  fs.writeFileSync(path.join(workspace, "src", "prompt.ts"), "export function buildSystemPrompt(parts) {\n  return parts.join(\"\\n\\n\");\n}\n");
  fs.writeFileSync(path.join(workspace, "src", "session.ts"), "export function serializeSession(value) {\n  return JSON.stringify(value);\n}\n");
  fs.writeFileSync(path.join(workspace, "src", "compact.ts"), "export function buildCompactSummary(items) {\n  return items.map((item) => item.summary).join(\"\\n\");\n}\n");
  fs.writeFileSync(path.join(workspace, "src", "tool-output.ts"), "export function rememberToolOutput(output) {\n  return output;\n}\n");
  fs.writeFileSync(path.join(workspace, "bin.js"), "export const installCommand = 'update';\n");
  writeJson(planPath, { applyMinimalEvilPatch: true, evilReleaseTag: "v1.2.3", resolution: "upstream-fallback" });

  execFileSync("node", ["/home/jacky/scripts/release/apply-patches.js", "--plan", planPath, "--workspace", workspace], { stdio: "pipe" });
  execFileSync("node", ["/home/jacky/scripts/release/verify-release.js", "--plan", planPath, "--workspace", workspace], { stdio: "pipe" });
  execFileSync("node", ["/home/jacky/scripts/release/detect-build.js", "--workspace", workspace, "--output", buildPlanPath], { stdio: "pipe" });
  execFileSync("node", ["/home/jacky/scripts/release/run-build.js", "--workspace", workspace, "--build-plan", buildPlanPath, "--output-dir", artifactDir], { stdio: "pipe" });

  assert.ok(fs.existsSync(path.join(workspace, "built.txt")));
  assert.ok(fs.existsSync(path.join(artifactDir, "build-plan.json")));
  assert.ok(fs.existsSync(path.join(artifactDir, "artifacts.json")));
  assert.ok(fs.existsSync(path.join(artifactDir, "dist", "opencode-linux-x64", "bin", "opencode")));
  assert.ok(fs.existsSync(path.join(artifactDir, "verification.json")));
});
