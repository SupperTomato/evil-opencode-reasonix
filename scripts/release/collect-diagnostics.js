"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { parseArgs } = require("./lib/args");
const { copyFileIfPresent, ensureDir, readJson, writeJson } = require("./lib/fs");
const { collectVerification } = require("./lib/verify");

function safeGitDiff(workspace) {
  try {
    return execFileSync("git", ["diff", "--", "."], { cwd: workspace, encoding: "utf8" });
  } catch {
    return "";
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputDir = args["output-dir"];
  const workspace = args.workspace;
  ensureDir(outputDir);

  if (args.plan && fs.existsSync(args.plan)) {
    writeJson(path.join(outputDir, "release-plan.json"), readJson(args.plan));
  }
  if (workspace && fs.existsSync(workspace)) {
    writeJson(path.join(outputDir, "verification.json"), collectVerification(workspace));
    fs.writeFileSync(path.join(outputDir, "workspace.diff"), safeGitDiff(workspace));
    copyFileIfPresent(path.join(workspace, ".reasonix-patch-log.json"), path.join(outputDir, "patch-log.json"));
    copyFileIfPresent(path.join(workspace, ".reasonix-release-manifest.json"), path.join(outputDir, "source-manifest.json"));
    copyFileIfPresent(path.join(workspace, ".reasonix-codexpro.json"), path.join(outputDir, "codexpro-manifest.json"));
    copyFileIfPresent(path.join(workspace, ".mcp.json"), path.join(outputDir, "mcp.json"));
  }
}

main();
