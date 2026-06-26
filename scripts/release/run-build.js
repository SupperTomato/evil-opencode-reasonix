"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { parseArgs } = require("./lib/args");
const { ensureDir, readJson, writeJson } = require("./lib/fs");

function runCommand(command, cwd) {
  execFileSync(command[0], command.slice(1), { cwd, stdio: "inherit" });
}

function copyArtifacts(workspace, outputDir) {
  const candidates = [
    { source: path.join(workspace, "packages", "opencode", "dist"), target: path.join(outputDir, "dist") },
    { source: path.join(workspace, "dist"), target: path.join(outputDir, "dist") },
  ];

  const copied = [];
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate.source)) continue;
    ensureDir(path.dirname(candidate.target));
    fs.cpSync(candidate.source, candidate.target, { recursive: true });
    copied.push(candidate.target);
    break;
  }

  return copied;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const workspace = args.workspace;
  const buildPlanPath = args["build-plan"];
  const outputDir = args["output-dir"];
  if (!workspace || !buildPlanPath || !outputDir) {
    throw new Error("--workspace, --build-plan, and --output-dir are required");
  }

  const buildPlan = readJson(buildPlanPath);
  runCommand(buildPlan.install, workspace);
  runCommand(buildPlan.build, workspace);
  if (buildPlan.test) runCommand(buildPlan.test, workspace);

  ensureDir(outputDir);
  const copiedArtifacts = copyArtifacts(workspace, outputDir);
  writeJson(path.join(outputDir, "build-plan.json"), buildPlan);
  writeJson(path.join(outputDir, "artifacts.json"), { copiedArtifacts });
  fs.copyFileSync(path.join(workspace, ".reasonix-verification.json"), path.join(outputDir, "verification.json"));
}

main();
