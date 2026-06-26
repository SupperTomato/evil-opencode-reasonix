"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { parseArgs } = require("./lib/args");
const { ensureDir, readJson, writeJson } = require("./lib/fs");

function runCommand(command, cwd) {
  execFileSync(command[0], command.slice(1), { cwd, stdio: "inherit" });
}

function findDistRoot(workspace) {
  const candidates = [
    path.join(workspace, "packages", "opencode", "dist"),
    path.join(workspace, "dist"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function copyArtifacts(workspace, outputDir) {
  const distRoot = findDistRoot(workspace);
  const copied = [];
  if (!distRoot) return copied;

  for (const entry of fs.readdirSync(distRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const assetDir = path.join(distRoot, entry.name);
    const unixBinary = path.join(assetDir, "bin", "opencode");
    const windowsBinary = path.join(assetDir, "bin", "opencode.exe");

    if (fs.existsSync(unixBinary)) {
      const target = path.join(outputDir, entry.name);
      ensureDir(path.dirname(target));
      fs.copyFileSync(unixBinary, target);
      copied.push(target);
      continue;
    }

    if (fs.existsSync(windowsBinary)) {
      const target = path.join(outputDir, `${entry.name}.exe`);
      ensureDir(path.dirname(target));
      fs.copyFileSync(windowsBinary, target);
      copied.push(target);
    }
  }

  return copied;
}

function copySupportAssets(workspace, outputDir) {
  const supportDir = path.join(outputDir, "support");
  const candidates = [
    { source: path.join(workspace, ".mcp.json"), target: path.join(supportDir, ".mcp.json") },
    { source: path.join(workspace, ".reasonix-codexpro.json"), target: path.join(supportDir, "codexpro-manifest.json") },
    {
      source: path.join(workspace, "docs", "codexpro-ohmyopenagent.md"),
      target: path.join(supportDir, "docs", "codexpro-ohmyopenagent.md"),
    },
  ];

  const copied = [];
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate.source)) continue;
    ensureDir(path.dirname(candidate.target));
    fs.copyFileSync(candidate.source, candidate.target);
    copied.push(candidate.target);
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
  const copiedSupportAssets = copySupportAssets(workspace, outputDir);
  writeJson(path.join(outputDir, "build-plan.json"), buildPlan);
  writeJson(path.join(outputDir, "artifacts.json"), { copiedArtifacts, copiedSupportAssets });
  fs.copyFileSync(path.join(workspace, ".reasonix-verification.json"), path.join(outputDir, "verification.json"));
}

main();
