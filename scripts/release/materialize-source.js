"use strict";

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { parseArgs } = require("./lib/args");
const { ensureDir, readJson, writeJson } = require("./lib/fs");

function clone(repo, ref, destination) {
  execFileSync("git", ["clone", "--depth", "1", "--branch", ref, `https://github.com/${repo}.git`, destination], {
    stdio: "inherit"
  });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const planPath = args.plan;
  const workspace = args.workspace;
  if (!planPath || !workspace) throw new Error("--plan and --workspace are required");

  const plan = readJson(planPath);
  fs.rmSync(workspace, { recursive: true, force: true });
  ensureDir(path.dirname(workspace));

  if (plan.resolution === "evil-source") {
    clone(plan.evil.repo, plan.evil.sourceRef.replace(/^refs\/(heads|tags)\//, ""), workspace);
  } else {
    clone(plan.upstream.repo, plan.upstream.sourceRef.replace(/^refs\/tags\//, ""), workspace);
  }

  writeJson(path.join(workspace, ".reasonix-release-manifest.json"), {
    resolution: plan.resolution,
    evilReleaseTag: plan.evilReleaseTag,
    sourceRepo: plan.resolution === "evil-source" ? plan.evil.repo : plan.upstream.repo,
    sourceRef: plan.resolution === "evil-source" ? plan.evil.sourceRef : plan.upstream.sourceRef
  });
}

main();
