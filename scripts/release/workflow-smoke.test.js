"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

test("build workflow references existing release scripts", () => {
  const workflow = read(path.join(repoRoot, ".github", "workflows", "build-and-release.yml"));
  const referenced = [
    "scripts/release/resolve-release.js",
    "scripts/release/materialize-source.js",
    "scripts/release/apply-patches.js",
    "scripts/release/integrate-codexpro.js",
    "scripts/release/verify-release.js",
    "scripts/release/detect-build.js",
    "scripts/release/run-build.js",
    "scripts/release/collect-diagnostics.js"
  ];

  for (const relativePath of referenced) {
    assert.match(workflow, new RegExp(relativePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.equal(fs.existsSync(path.join(repoRoot, relativePath)), true);
  }

  assert.match(workflow, /name: Read build plan/);
  assert.match(workflow, /name: Integrate CodexPro companion/);
  assert.match(workflow, /uses: oven-sh\/setup-bun@v2/);
  assert.match(workflow, /package_manager_version/);
});

test("poll workflow references the poll script and dispatch target", () => {
  const workflow = read(path.join(repoRoot, ".github", "workflows", "poll-evil-opencode.yml"));
  assert.match(workflow, /scripts\/release\/poll-evil-opencode\.js/);
  assert.match(workflow, /workflow_id: "build-and-release\.yml"/);
  assert.equal(fs.existsSync(path.join(repoRoot, "scripts", "release", "poll-evil-opencode.js")), true);
});
