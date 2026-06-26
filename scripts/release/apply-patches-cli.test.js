"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

test("apply-patches CLI writes patch log with module records", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "reasonix-cli-"));
  const workspace = path.join(root, "workspace");
  fs.mkdirSync(path.join(workspace, "src"), { recursive: true });
  fs.writeFileSync(path.join(workspace, "src", "prompt.ts"), "export function buildSystemPrompt(parts) {\n  return parts.join(\"\\n\\n\");\n}\n");
  fs.writeFileSync(path.join(workspace, "src", "session.ts"), "export function serializeSession(value) {\n  return JSON.stringify(value);\n}\n");
  fs.writeFileSync(path.join(workspace, "src", "compact.ts"), "export function buildCompactSummary(items) {\n  return items.map((item) => item.summary).join(\"\\n\");\n}\n");
  fs.writeFileSync(path.join(workspace, "src", "tool-output.ts"), "export function rememberToolOutput(output) {\n  return output;\n}\n");
  fs.writeFileSync(path.join(workspace, "bin.js"), "export const installCommand = 'update';\n");
  const plan = path.join(root, "plan.json");
  fs.writeFileSync(plan, JSON.stringify({ applyMinimalEvilPatch: true }));

  execFileSync("node", ["/home/jacky/scripts/release/apply-patches.js", "--plan", plan, "--workspace", workspace], { stdio: "pipe" });

  const patchLog = JSON.parse(fs.readFileSync(path.join(workspace, ".reasonix-patch-log.json"), "utf8"));
  assert.equal(Array.isArray(patchLog.modules), true);
  assert.equal(patchLog.modules.length, 5);
});
