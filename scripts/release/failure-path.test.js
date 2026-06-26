"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync, execFileSync } = require("node:child_process");

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

test("patch drift fails closed and diagnostics still capture the failure context", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "reasonix-failure-"));
  const workspace = path.join(root, "workspace");
  const srcDir = path.join(workspace, "src");
  const outputDir = path.join(root, "repair");
  const planPath = path.join(root, "plan.json");

  fs.mkdirSync(srcDir, { recursive: true });
  fs.writeFileSync(path.join(workspace, "bin.js"), "export const installCommand = 'update';\n");
  fs.writeFileSync(path.join(workspace, "src", "prompt.ts"), "export function buildPrompt(parts) {\n  return parts.slice().join(\"\\n\");\n}\n");
  fs.writeFileSync(path.join(workspace, "src", "session.ts"), "export function serializeSession(value) {\n  return JSON.stringify(value);\n}\n");
  fs.writeFileSync(path.join(workspace, "src", "compact.ts"), "export function buildCompactSummary(items) {\n  return items.map((item) => item.summary).join(\"\\n\");\n}\n");
  fs.writeFileSync(path.join(workspace, "src", "tool-output.ts"), "export function rememberToolOutput(output) {\n  return output;\n}\n");
  writeJson(planPath, { applyMinimalEvilPatch: true, evilReleaseTag: "v9.9.9", resolution: "upstream-fallback" });

  const result = spawnSync("node", ["/home/jacky/scripts/release/apply-patches.js", "--plan", planPath, "--workspace", workspace], {
    encoding: "utf8"
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr || result.stdout, /Reasonix prefix patch failed/);

  execFileSync("node", ["/home/jacky/scripts/release/collect-diagnostics.js", "--plan", planPath, "--workspace", workspace, "--output-dir", outputDir], { stdio: "pipe" });

  assert.equal(fs.existsSync(path.join(outputDir, "release-plan.json")), true);
  assert.equal(fs.existsSync(path.join(outputDir, "verification.json")), true);
  const verification = JSON.parse(fs.readFileSync(path.join(outputDir, "verification.json"), "utf8"));
  assert.equal(verification.ok, false);
});

test("evil-source mode fails before Reasonix patching when the evil layer is missing", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "reasonix-evil-base-"));
  const workspace = path.join(root, "workspace");
  const srcDir = path.join(workspace, "src");
  const planPath = path.join(root, "plan.json");

  fs.mkdirSync(srcDir, { recursive: true });
  fs.writeFileSync(
    path.join(workspace, "src", "prompt.ts"),
    "export function buildSystemPrompt(parts) {\n  return parts.join(\"\\n\\n\");\n}\n",
  );
  fs.writeFileSync(
    path.join(workspace, "src", "session.ts"),
    "export function serializeSession(value) {\n  return JSON.stringify(value);\n}\n",
  );
  fs.writeFileSync(
    path.join(workspace, "src", "compact.ts"),
    "export function buildCompactSummary(items) {\n  return items.map((item) => item.summary).join(\"\\n\");\n}\n",
  );
  fs.writeFileSync(
    path.join(workspace, "src", "tool-output.ts"),
    "export function rememberToolOutput(output) {\n  return output;\n}\n",
  );
  writeJson(planPath, { applyMinimalEvilPatch: false, evilReleaseTag: "v1.2.3", resolution: "evil-source" });

  const result = spawnSync("node", ["/home/jacky/scripts/release/apply-patches.js", "--plan", planPath, "--workspace", workspace], {
    encoding: "utf8"
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr || result.stdout, /Evil base check failed/);
});
